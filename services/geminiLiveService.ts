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
    private session: any = null; // Typing as any to avoid strict versioning issues in browser
    private options: LiveChatOptions = {};

    async connect(options: LiveChatOptions) {
        this.options = options;
        const forceOpenRouter = typeof window !== 'undefined' && localStorage.getItem('oneskin_force_openrouter') === 'true';
        if (forceOpenRouter) {
            options.onError?.('MANUAL_FALLBACK');
            return;
        }

        const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined) || null;
        if (!key) {
            this.options.onError?.('Gemini API Key not found');
            return;
        }

        try {
            const ai = new GoogleGenAI(key);
            const model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

            const config = {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Charon',
                        }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: "Eres un mentor de ventas proactivo y secretario ejecutivo para OneSkin. Tu tono es profesional, motivador y elegante. Responde siempre de forma audaz para ayudar a cerrar ventas."
                    }]
                }
            };

            // @ts-ignore - Using the live property from the snippet
            this.session = await ai.live.connect({
                model,
                config,
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiLive] Native Session Opened');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        this.handleLiveMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiLive] SDK Error:', e);
                        this.options.onError?.(e);
                    },
                    onclose: (e: any) => {
                        console.log('[GeminiLive] Session Closed');
                        this.options.onClose?.();
                    }
                }
            });
        } catch (error) {
            console.error('[GeminiLive] Connection Error:', error);
            this.options.onError?.(error);
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
        if (!this.session) return;

        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        this.session.sendClientContent({
            turns: [
                {
                    parts: [{
                        inlineData: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Audio
                        }
                    }]
                }
            ]
        });
    }

    sendText(text: string) {
        if (!this.session) return;
        this.session.sendClientContent({
            turns: [text]
        });
    }

    disconnect() {
        if (this.session) {
            this.session.close();
            this.session = null;
        }
    }
}

export const geminiLiveService = new GeminiLiveService();
