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

            const model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

            // Restructured config with generationConfig for proper audio setup
            // Flattened config structure as required by the latest SDK versions
            // to avoid "Precondition check failed" (1007) errors.
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

            console.log('[GeminiLive] Connecting to:', model);
            console.log('[GeminiLive] Using API version: v1beta');

            // @ts-ignore - Using the live property from the SDK
            this.session = await ai.live.connect({
                model,
                config,
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiLive] Native Session Opened Successfully');
                        this.retryCount = 0; // Reset retry count on successful connection
                    },
                    onmessage: (message: any) => {
                        console.log('[GeminiLive] Message received:', JSON.stringify(message).substring(0, 200));
                        this.handleLiveMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiLive] SDK Error detail:', e);
                        if (e.message) console.error('[GeminiLive] SDK Error Message:', e.message);

                        // Classify error type
                        const errorStr = JSON.stringify(e).toLowerCase();
                        const isQuotaError = errorStr.includes('quota') ||
                            errorStr.includes('429') ||
                            errorStr.includes('1011') ||
                            errorStr.includes('resource_exhausted');
                        const isConfigError = errorStr.includes('1007') ||
                            errorStr.includes('precondition');

                        if (isQuotaError) {
                            console.warn('[GeminiLive] Quota exhausted - triggering fallback');
                            this.options.onError?.({ type: 'quota', message: 'Voice quota exceeded' });
                        } else if (isConfigError) {
                            console.error('[GeminiLive] Configuration error - check API settings');
                            this.options.onError?.({ type: 'config', message: 'Voice configuration error' });
                        } else {
                            this.options.onError?.(e);
                        }
                    },
                    onclose: (e: any) => {
                        console.warn('[GeminiLive] Session Closed detail:', e);
                        if (e.code) console.warn('[GeminiLive] Close Code:', e.code);
                        if (e.reason) console.warn('[GeminiLive] Close Reason:', e.reason);

                        // Handle specific close codes
                        if (e.code === 1007) {
                            console.error('[GeminiLive] Precondition check failed - verify API configuration');
                            this.options.onError?.({ type: 'config', message: 'Voice feature unavailable. Please check settings.' });
                        } else if (e.code === 1011) {
                            console.warn('[GeminiLive] Server error - quota or internal issue');
                            this.options.onError?.({ type: 'quota', message: 'Voice quota exceeded' });
                        }

                        this.options.onClose?.();
                    }
                }
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

        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        this.session.sendClientContent({
            turns: [
                {
                    parts: [{
                        inlineData: {
                            mimeType: 'audio/pcm;rate=24000', // Updated from 16000 to 24000
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
