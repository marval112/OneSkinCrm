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
    private isReady: boolean = false;
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

        // Diagnostic: Masked key logging
        console.log('[GeminiLive] Using Key (masked):', `${key.substring(0, 5)}...${key.substring(key.length - 4)}`);

        try {
            const genAI = new GoogleGenAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }, { apiVersion: 'v1beta' });

            console.log('[GeminiLive] Connecting to gemini-2.0-flash-exp (v1beta)...');

            // @ts-ignore - Direct connect via model instance
            this.session = await (model as any).live.connect({
                generationConfig: {
                    responseModalities: ["audio"] as any,
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Puck',
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: "Eres un mentor de ventas proactivo para OneSkin. Tu tono es profesional y motivador."
                    }]
                }
            });

            this.session.on('open', () => {
                console.log('[GeminiLive] WebSocket Connection Established');
                this.retryCount = 0;
            });

            this.session.on('message', (message: any) => {
                if (message.setupComplete) {
                    console.log('[GeminiLive] Setup Complete');
                    this.isReady = true;
                }
                this.handleLiveMessage(message);
            });

            this.session.on('error', (e: any) => {
                console.error('[GeminiLive] SDK Error:', e);
                this.options.onError?.(e);
            });

            this.session.on('close', (e: any) => {
                console.warn('[GeminiLive] WebSocket Closed:', e);
                this.isReady = false;

                const code = e.code || 0;
                const reason = e.reason || "";

                if (code === 1007 || (code === 1000 && !this.isReady)) {
                    console.error(`[GeminiLive] 1007 Precondition Error. Reason: ${reason}`);
                    this.options.onError?.({
                        type: 'config',
                        message: `Voice error 1007: ${reason || 'Precondition check failed (Check keys/region)'}`
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
        // Sending audio even if isReady is false to see if it triggers the setup
        // Some backends might wait for the first chunk to finalize

        try {
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

            this.session.send({
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: 'audio/pcm;rate=24000',
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
            this.isReady = false;
        }
    }
}

export const geminiLiveService = new GeminiLiveService();
