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
    private retryCount: number = 0;
    private maxRetries: number = 2;

    async connect(options: LiveChatOptions) {
        this.options = options;
        const forceOpenRouterVal = typeof window !== 'undefined' ? localStorage.getItem('oneskin_force_openrouter') : null;
        console.log('[GeminiLive] Checking Manual Mode (Force OpenRouter):', forceOpenRouterVal);

        if (forceOpenRouterVal === 'true') {
            console.warn('[GeminiLive] Manual Mode is ACTIVE. Blocking voice connection.');
            options.onError?.('MANUAL_FALLBACK');
            return;
        }

        const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined) || null;
        if (!key) {
            this.options.onError?.('Gemini API Key not found');
            return;
        }

        try {
            // Use v1beta for better stability with native audio preview
            const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });

            const modelName = 'gemini-2.0-flash-exp';

            console.log('[GeminiLive] Connecting to:', modelName);
            console.log('[GeminiLive] Using API version: v1beta');

            // @ts-ignore - Using the live property from the SDK
            // In @google/genai 1.28.0+, we connect and use .on() for events
            // We use 'gemini-2.0-flash-exp' without 'models/' prefix as the SDK adds it
            this.session = await ai.live.connect({
                model: modelName,
                config: {
                    systemInstruction: {
                        parts: [{
                            text: "Eres un mentor de ventas proactivo y secretario ejecutivo para OneSkin. Tu tono es profesional, motivador y elegante. Responde siempre de forma audaz para ayudar a cerrar ventas."
                        }]
                    },
                    generationConfig: {
                        responseModalities: ["audio" as any],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: 'Charon',
                                }
                            }
                        }
                    }
                }
            });

            this.session.on('open', () => {
                console.log('[GeminiLive] Native Session Opened Successfully');
                this.retryCount = 0;
            });

            this.session.on('message', (message: any) => {
                // Diagnostic log for message types
                if (message.serverContent) {
                    // Normal content
                } else if (message.setupComplete) {
                    console.log('[GeminiLive] Setup Complete received');
                }
                this.handleLiveMessage(message);
            });

            this.session.on('error', (e: any) => {
                console.error('[GeminiLive] SDK Error detail:', e);
                // If the error object has more info, log it
                if (e.message) console.error('[GeminiLive] Error Message:', e.message);
                this.options.onError?.(e);
            });

            this.session.on('close', (e: any) => {
                console.warn('[GeminiLive] Session Closed:', e);
                const code = e.code || (e as any).reason_code;
                const reason = e.reason || (e as any).reason_phrase;

                if (code === 1007) {
                    console.error('[GeminiLive] Precondition check failed (1007). Reason:', reason);
                    this.options.onError?.({
                        type: 'config',
                        message: `Voice config error (1007): ${reason || 'Check model/parameters'}`
                    });
                }
                this.options.onClose?.();
            });
        } catch (error: any) {
            console.error('[GeminiLive] Connection Error:', error);

            // Retry logic for transient failures
            if (this.retryCount < this.maxRetries && !error.message?.includes('quota')) {
                this.retryCount++;
                console.log(`[GeminiLive] Retrying connection (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount)); // Exponential backoff
                return this.connect(options);
            }

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

        try {
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

            // Multimodal Live API expects realtimeInput for audio streams
            this.session.send({
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: 'audio/pcm;rate=24000',
                        data: base64Audio
                    }]
                }
            });
        } catch (err) {
            console.error('[GeminiLive] Error sending audio:', err);
        }
    }

    sendText(text: string) {
        if (!this.session) return;

        try {
            // Multimodal Live API expects clientContent for text
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
        }
    }
}

export const geminiLiveService = new GeminiLiveService();
