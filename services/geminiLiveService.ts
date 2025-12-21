import { getGeminiApiKey } from './aiSettingsService';

export interface LiveChatOptions {
    onMessage?: (text: string) => void;
    onAudio?: (audio: Int16Array) => void;
    onCommand?: (command: string, args: any) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
}

class GeminiLiveService {
    private ws: WebSocket | null = null;
    private options: LiveChatOptions = {};
    async connect(options: LiveChatOptions) {
        this.options = options;
        const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined) || null;

        if (!key) {
            this.options.onError?.('Gemini API Key not found');
            return;
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;

        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log('[GeminiLive] Connected');
            this.sendSetup();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
            console.error('[GeminiLive] Error:', error);
            this.options.onError?.(error);
        };

        this.ws.onclose = (event) => {
            console.log(`[GeminiLive] Closed. Code: ${event.code}, Reason: ${event.reason}`);
            if (event.code === 1011 || event.reason.includes('quota') || event.reason.includes('plan')) {
                this.options.onError?.(`Quota exceeded: ${event.reason}`);
            }
            this.options.onClose?.();
        };
    }

    private sendSetup() {
        const setup = {
            setup: {
                model: 'models/gemini-2.0-flash-exp',
                generationConfig: {
                    responseModalities: ['AUDIO']
                }
            }
        };
        console.log('[GeminiLive] Sending setup:', JSON.stringify(setup, null, 2));
        this.ws?.send(JSON.stringify(setup));
    }

    sendAudio(pcmData: Int16Array) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        const message = {
            realtime_input: {
                media_chunks: [
                    {
                        mime_type: 'audio/pcm;rate=16000',
                        data: base64Audio
                    }
                ]
            }
        };
        this.ws.send(JSON.stringify(message));
    }

    sendText(text: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const message = {
            realtime_input: {
                text_chunks: [text]
            }
        };
        this.ws.send(JSON.stringify(message));
    }

    private handleMessage(event: MessageEvent) {
        try {
            const response = JSON.parse(event.data);
            console.log('[GeminiLive] Response:', response);

            if (response.serverContent?.modelTurn?.parts) {
                for (const part of response.serverContent.modelTurn.parts) {
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

            if (response.toolCall) {
                // Handle tool calls here if needed
            }
        } catch (e) {
            console.error('[GeminiLive] Parse error:', e);
        }
    }

    disconnect() {
        this.ws?.close();
        this.ws = null;
    }
}

export const geminiLiveService = new GeminiLiveService();
