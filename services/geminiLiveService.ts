import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getGeminiApiKey } from './aiSettingsService';

export interface LiveChatOptions {
    onMessage?: (text: string) => void;
    onAudio?: (audio: Int16Array) => void;
    onCommand?: (command: string, args: any) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}

// EXACTLY as in the working example (no models/ prefix)
const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

// EXACTLY as in the working example
const SYSTEM_INSTRUCTION = `
You are the OneSkin International Sales Expert. You are sophisticated, professional, and highly knowledgeable about luxury architectural surfaces.
Your focus is OneSkin's premium lacquered MDF panels (High Gloss and Soft Touch).
Technical expertise: UV lacquering process, scratch resistance (6H), color stability, and sustainable MDF cores.
Sales expertise: International logistics (Incoterms), large-scale project pricing, and interior design trends.
Personality: Persuasive but helpful. Speak clearly and maintain a world-class consultant tone.
You can communicate fluently in English, Spanish, and Portuguese.
Always respond using audio.
`;

class GeminiLiveService {
    private session: any = null;
    private options: LiveChatOptions = {};
    private isReady: boolean = false;
    private setupResolve: (() => void) | null = null;

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

            const openPromise = new Promise<void>((resolve) => {
                this.setupResolve = resolve;
            });

            // @ts-ignore
            this.session = await (ai as any).live.connect({
                model: GEMINI_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    // Direct string as provided in the working example
                    systemInstruction: SYSTEM_INSTRUCTION,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log(`[GeminiLive] Connected successfully with: ${GEMINI_MODEL}`);
                        this.isReady = true;
                        if (this.setupResolve) this.setupResolve();
                    },
                    onmessage: (message: any) => {
                        this.handleLiveMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error(`[GeminiLive] SDK Error:`, e);
                        this.options.onError?.(e);
                    },
                    onclose: (e: any) => {
                        console.warn(`[GeminiLive] Connection Closed. Code: ${e.code}, Reason: ${e.reason}`, e);
                        this.isReady = false;
                        this.options.onClose?.();
                    }
                }
            });

            await openPromise;
        } catch (error: any) {
            console.error(`[GeminiLive] Handshake failed:`, error);
            this.options.onError?.(error);
            throw error;
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

        // Handle transcription results
        if (message.serverContent?.inputTranscription) {
            this.options.onMessage?.(`[User] ${message.serverContent.inputTranscription.text}`);
        }
        if (message.serverContent?.outputTranscription) {
            this.options.onMessage?.(`[AI] ${message.serverContent.outputTranscription.text}`);
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
            // Using a Uint8Array view for the Blob constructor
            const pcmBlob = new Blob([new Uint8Array(pcmData.buffer)], { type: 'audio/pcm;rate=16000' });

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
