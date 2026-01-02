import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getGeminiApiKey } from './aiSettingsService';

export interface LiveChatOptions {
    onMessage?: (text: string) => void;
    onAudio?: (audio: Int16Array) => void;
    onCommand?: (command: string, args: any) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}

class GeminiLiveService {
    private session: any = null;
    private options: LiveChatOptions = {};
    private isReady: boolean = false;
    private retryCount: number = 0;
    private maxRetries: number = 2;

    async connect(options: LiveChatOptions, candidateIndex: number = 0) {
        const CANDIDATES = [
            'models/gemini-2.5-flash-native-audio-dialog',
            'models/gemini-2.0-flash-exp',
            'models/gemini-2.0-flash',
            'models/gemini-3-flash-preview'
        ];

        if (candidateIndex === 0) {
            this.options = options;
        }

        const modelToTry = CANDIDATES[candidateIndex];
        if (!modelToTry) {
            this.options.onError?.('All Voice model candidates failed or are at quota.');
            return;
        }

        console.log(`[GeminiLive] [Attempt ${candidateIndex + 1}] Trying model: ${modelToTry}`);

        const forceOpenRouterVal = typeof window !== 'undefined' ? localStorage.getItem('oneskin_force_openrouter') : null;
        if (forceOpenRouterVal === 'true') {
            options.onError?.('MANUAL_FALLBACK');
            return;
        }

        const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined) || null;
        if (!key) {
            this.options.onError?.('Gemini API Key not found');
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: key });

            // @ts-ignore
            this.session = await (ai as any).live.connect({
                model: modelToTry,
                systemInstruction: {
                    parts: [{ text: "Eres un mentor de ventas proactivo para OneSkin." }]
                },
                responseModalities: ["audio"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' }
                    }
                },
                callbacks: {
                    onopen: () => {
                        console.log(`[GeminiLive] Connected successfully with: ${modelToTry}`);
                        this.retryCount = 0;
                    },
                    onmessage: (message: any) => {
                        if (message.setupComplete) {
                            console.log(`[GeminiLive] Setup Complete for ${modelToTry}`);
                            this.isReady = true;
                        }
                        this.handleLiveMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error(`[GeminiLive] SDK Error on ${modelToTry}:`, e);
                    },
                    onclose: (e: any) => {
                        console.warn(`[GeminiLive] Closed: ${modelToTry}. Code: ${e.code}, Reason: ${e.reason}`);
                        this.isReady = false;

                        // If quota (1011) or not supported (1008/1007), try next candidate
                        if (e.code === 1011 || e.code === 1008 || e.code === 1007) {
                            console.log(`[GeminiLive] Model ${modelToTry} unavailable. Trying next...`);
                            this.connect(options, candidateIndex + 1);
                        } else {
                            this.options.onClose?.();
                        }
                    }
                }
            });
        } catch (error: any) {
            console.error(`[GeminiLive] Handshake failed for ${modelToTry}:`, error);
            this.connect(options, candidateIndex + 1);
        }
    }

    private handleLiveMessage(message: LiveServerMessage) {
        if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                    this.options.onMessage?.(part.text);
                }
                if (part.inlineData?.mimeType?.startsWith('audio/')) {
                    const binary = atob(part.inlineData.data);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const audioData = new Int16Array(bytes.buffer);
                    this.options.onAudio?.(audioData);
                }
            }
        }

        if (message.toolCall) {
            const call = message.toolCall.functionCalls?.[0];
            if (call) {
                this.options.onCommand?.(call.name, call.args);
            }
        }
    }

    sendAudio(pcmData: Int16Array) {
        if (!this.session || !this.isReady) return;
        try {
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            this.session.send({
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Audio
                    }]
                }
            });
        } catch (err) {
            console.error('[GeminiLive] Send error:', err);
        }
    }

    sendText(text: string) {
        if (!this.session) return;
        try {
            this.session.send({
                clientContent: {
                    turns: [{
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            });
        } catch (err) {
            console.error('[GeminiLive] Error sending text:', err);
        }
    }

    disconnect() {
        if (this.session) {
            this.session.close();
            this.session = null;
            this.isReady = false;
        }
    }
}

export const geminiLiveService = new GeminiLiveService();
