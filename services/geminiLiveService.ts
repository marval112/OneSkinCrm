import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getGeminiApiKey } from './aiSettingsService';

export interface LiveChatOptions {
    onMessage?: (text: string) => void;
    onAudio?: (audio: Int16Array) => void;
    onCommand?: (command: string, args: any) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}

const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

const SYSTEM_INSTRUCTION = `
Eres el experto en ventas internacionales de OneSkin. Eres sofisticado, profesional y tienes un conocimiento profundo de las superficies arquitectónicas de lujo.
Tu enfoque son los paneles de MDF lacados premium de OneSkin (High Gloss y Soft Touch).
Experiencia técnica: proceso de lacado UV, resistencia al rayado (6H), estabilidad del color y núcleos de MDF sostenibles.
Experiencia en ventas: logística internacional (Incoterms), precios para proyectos a gran escala y tendencias en diseño de interiores.
Personalidad: Persuasivo pero servicial. Habla con claridad y mantén un tono de consultor de clase mundial.
Puedes comunicarte fluidamente en español.
Responde siempre usando audio.
`;

class GeminiLiveService {
    private session: any = null;
    private options: LiveChatOptions = {};
    private isReady: boolean = false;

    async connect(options: LiveChatOptions) {
        this.options = options;
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

            console.log(`[GeminiLive] Connecting to ${GEMINI_MODEL}...`);

            // @ts-ignore
            this.session = await (ai as any).live.connect({
                model: GEMINI_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                },
                callbacks: {
                    onopen: () => {
                        console.log(`[GeminiLive] Connected successfully with: ${GEMINI_MODEL}`);
                        this.isReady = true;
                    },
                    onmessage: (message: any) => {
                        this.handleLiveMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error(`[GeminiLive] SDK Error:`, e);
                        this.options.onError?.(e);
                    },
                    onclose: (e: any) => {
                        console.warn(`[GeminiLive] Connection Closed. Code: ${e.code}, Reason: ${e.reason}`);
                        this.isReady = false;
                        this.options.onClose?.();
                    }
                }
            });
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to connect:`, error);
            this.options.onError?.(error);
        }
    }

    private handleLiveMessage(message: LiveServerMessage) {
        // Handle audio data
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binary = atob(base64Audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const audioData = new Int16Array(bytes.buffer);
            this.options.onAudio?.(audioData);
        }

        // Handle text message if available (transcriptions)
        const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
        if (text) {
            this.options.onMessage?.(text);
        }

        // Handle tool calls
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
            // Using a Blob as expected by sendRealtimeInput helper
            const pcmBlob = new Blob([pcmData], { type: 'audio/pcm' });

            // @ts-ignore
            this.session.sendRealtimeInput({
                media: pcmBlob
            });
        } catch (err) {
            console.error('[GeminiLive] Send error:', err);
        }
    }

    sendText(text: string) {
        if (!this.session || !this.isReady) return;
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
            try {
                this.session.close();
            } catch (e) { }
            this.session = null;
            this.isReady = false;
        }
    }
}

export const geminiLiveService = new GeminiLiveService();
