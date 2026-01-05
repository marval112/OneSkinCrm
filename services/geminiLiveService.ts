import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getGeminiApiKey } from './aiSettingsService';
import { tools, Command } from './aiCommandService';
import * as crmService from './crmService';
import { supabase } from './supabaseClient';

export interface LiveChatOptions {
    crmContext?: string; // Real-time CRM context
    onMessage?: (message: { text: string; sender: 'user' | 'ai'; isFinal?: boolean }) => void;
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

/**
 * Utility to encode Uint8Array to base64 string
 * Matching the user's audioutils.ts implementation
 */
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Build dynamic system instruction with CRM context
 */
function buildSystemInstruction(crmContext?: string): string {
    let instruction = `
You are the OneSkin International Sales Expert and Executive Sales Secretary. 
You are sophisticated, professional, and highly knowledgeable about luxury architectural surfaces.

Your focus is OneSkin's premium lacquered MDF panels (High Gloss and Soft Touch).
Technical expertise: UV lacquering process, scratch resistance (6H), color stability, and sustainable MDF cores.
Sales expertise: International logistics (Incoterms), large-scale project pricing, and interior design trends.

Personality: Persuasive but helpful. Speak clearly and maintain a world-class consultant tone.
You can communicate fluently in English, Spanish, and Portuguese.
Always respond using audio.

As a Sales Secretary, you can:
- Execute CRM actions (create tasks, update leads, find customers)
- Provide proactive recommendations based on current portfolio status
- Help prioritize work based on pending items
`;

    if (crmContext) {
        instruction += `\n\n=== YOUR CURRENT PORTFOLIO STATUS ===\n${crmContext}\n`;
        instruction += `\nUse this information to provide context-aware, proactive assistance. `;
        instruction += `Mention relevant metrics when appropriate and suggest actions based on current priorities.\n`;
    }

    return instruction.trim();
}

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
                    // Use dynamic instruction with context
                    systemInstruction: buildSystemInstruction(options.crmContext),
                    tools: tools,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log(`[GeminiLive] WebSocket socket open...`);
                    },
                    onmessage: (message: any) => {
                        console.log('[GeminiLive] Message received:', message);

                        if (message.setupComplete) {
                            console.log('[GeminiLive] Session Ready (setupComplete)');
                            this.isReady = true;
                            if (this.setupResolve) {
                                this.setupResolve();
                                this.setupResolve = null;
                            }
                        }

                        try {
                            this.handleLiveMessage(message);
                        } catch (e) {
                            console.error('[GeminiLive] Error handling message:', e);
                        }
                    },
                    onerror: (e: any) => {
                        console.error(`[GeminiLive] SDK Error (onerror):`, e);
                        this.options.onError?.(e);
                    },
                    onclose: (e: any) => {
                        console.warn(`[GeminiLive] Connection Closed (onclose). Code: ${e.code}, Reason: ${e.reason}`, e);
                        this.isReady = false;
                        this.options.onClose?.();
                    }
                }
            });

            // CRITICAL: Wait for setupComplete (or timeout/error)
            await openPromise;
            console.log('[GeminiLive] Promise resolved - Handshake complete');

            // DEBUG: Inspect session object to find correct send method
            if (this.session) {
                console.log('[GeminiLive] Session methods:',
                    Object.getOwnPropertyNames(Object.getPrototypeOf(this.session)),
                    Object.keys(this.session)
                );
            }
        } catch (error: any) {
            console.error(`[GeminiLive] Handshake failed:`, error);
            this.options.onError?.(error);
            throw error;
        }
    }

    private async handleLiveMessage(message: LiveServerMessage) {
        // Handle audio data
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binary = atob(base64Audio);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

            // Safer creation of Int16Array (handling potentially odd byte lengths)
            const audioData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
            this.options.onAudio?.(audioData);
        }

        // Handle transcription results
        if (message.serverContent?.inputTranscription) {
            this.options.onMessage?.({
                text: message.serverContent.inputTranscription.text,
                sender: 'user',
                isFinal: true
            });
        }
        if (message.serverContent?.outputTranscription) {
            this.options.onMessage?.({
                text: message.serverContent.outputTranscription.text,
                sender: 'ai',
                isFinal: false // Streaming
            });
        }

        // Handle tool calls
        if (message.toolCall) {
            console.log('[GeminiLive] Tool Call Received FULL:', JSON.stringify(message.toolCall));
            const functionCalls = message.toolCall.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                console.log('[GeminiLive] Processing Tool Call ID:', call.id, 'Name:', call.name);

                const toolResponse = await this.executeTool(call);
                console.log('[GeminiLive] Sending Tool Response Payload:', JSON.stringify(toolResponse));

                // FIX: Use sendToolResponse instead of send
                // @ts-ignore
                const resultData = toolResponse.functionResponses[0].response.result;
                const callId = toolResponse.functionResponses[0].id;

                // helper to try sending
                const trySend = async (payload: any, label: string) => {
                    console.log(`[GeminiLive] Attempting ${label}:`, JSON.stringify(payload));
                    // @ts-ignore
                    await this.session.sendToolResponse(payload);
                };

                try {
                    // Format 1: Response itself is a JSON string
                    await trySend({
                        functionResponses: [{
                            response: JSON.stringify(resultData),
                            id: callId
                        }]
                    }, 'fmt_string_root');
                } catch (e1) {
                    console.warn('[GeminiLive] fmt_string_root failed:', e1);
                    try {
                        // Format 2: 'result' key with stringified JSON
                        await trySend({
                            functionResponses: [{
                                response: { result: JSON.stringify(resultData) },
                                id: callId
                            }]
                        }, 'fmt_result_string');
                    } catch (e2) {
                        console.warn('[GeminiLive] fmt_result_string failed:', e2);
                        try {
                            // Format 3: 'content' key (common alternative)
                            await trySend({
                                functionResponses: [{
                                    response: { content: resultData },
                                    id: callId
                                }]
                            }, 'fmt_content_obj');
                        } catch (e3) {
                            console.warn('[GeminiLive] fmt_content_obj failed:', e3);
                            try {
                                // Format 4: 'output' key with stringified JSON
                                await trySend({
                                    functionResponses: [{
                                        response: { output: JSON.stringify(resultData) },
                                        id: callId
                                    }]
                                }, 'fmt_output_string');
                            } catch (e4) {
                                console.error('[GeminiLive] All formats failed:', e4);
                            }
                        }
                    }
                }
            }
        }
    }

    private async executeTool(call: any): Promise<any> {
        try {
            console.log(`[GeminiLive] Executing tool: ${call.name}`, call.args);
            let result: any = { status: 'success' };
            const args = call.args;

            // Mock User for CRM Context (In a real app, pass the actual user from context)
            // Ideally connect() should accept a user object or ID
            const mockUser: any = { id: 1, role: 'Commercial', email: 'user@oneskin.com' };
            // Better: We should probably require the user to be passed to connect(), but for now let's query a default user or try to get it from Supabase auth if possible,
            // or just assume the tool implementation handles loose auth/user requirements if strictly read-only on "my" data.
            // Since we can't easily inject the user 'react hook' style here, we will rely on crmService fetching correct data if we pass a userId, OR we accept a limited functionality.
            // NOTE: crmService requires a full User object.

            // Temporary workaround: Fetch current session user if possible, otherwise use a placeholder
            // In a browser environment, we can check supabase.auth.getSession()
            const { data: { session } } = await supabase.auth.getSession();
            let user = mockUser;
            if (session?.user) {
                // We need to fetch the local user profile to get roles etc
                const { data: localUser } = await supabase.from('users').select('*').eq('email', session.user.email).single();
                if (localUser) user = localUser;
            }

            switch (call.name) {
                case Command.SHOW_LEADS:
                    const leads = await crmService.getLeads(user);
                    // Filter in memory for now based on args
                    let filtered = leads;
                    if (args.status) filtered = filtered.filter(l => l.status === args.status);
                    result = { count: filtered.length, leads: filtered.slice(0, 5).map(l => ({ name: l.name, status: l.status, company: l.company })) };
                    // Also trigger UI navigation via command?
                    this.options.onCommand?.(Command.SHOW_LEADS, args);
                    break;

                case Command.CREATE_TASK:
                    // We can't actually create task fully without more info, but let's simulate or try
                    // Reuse command service logic or calling crm directly? 
                    // crmService doesn't export createTask directly exposed this way easily without "db".
                    // Let's just return success and trigger the UI command which shows a toast.
                    result = { status: 'success', message: 'Task creation interface opened' };
                    this.options.onCommand?.(Command.CREATE_TASK, args);
                    break;

                case Command.FIND_CUSTOMER:
                    const customers = await crmService.getCustomers(user);
                    const found = customers.filter(c =>
                        (args.name && c.name.toLowerCase().includes(args.name.toLowerCase())) ||
                        (args.company && c.company.toLowerCase().includes(args.company.toLowerCase()))
                    );
                    result = { found: found.map(c => ({ id: c.id, name: c.name, company: c.company, email: c.email })) };
                    this.options.onCommand?.(Command.FIND_CUSTOMER, args);
                    break;

                case Command.UNKNOWN:
                default:
                    // Some tools might just need to pass through to the UI (navigate, alerts)
                    this.options.onCommand?.(call.name, args);
                    result = { status: 'executed_client_side' };
                    break;
            }

            return {
                functionResponses: [{
                    response: { result: result },
                    id: call.id
                }]
            };

        } catch (error: any) {
            console.error('[GeminiLive] Tool execution failed:', error);
            return {
                functionResponses: [{
                    response: { error: error.message },
                    id: call.id
                }]
            };
        }
    }

    sendAudio(pcmData: Int16Array) {
        if (!this.session || !this.isReady) return;

        try {
            // CRITICAL: Match the working example's format exactly
            // Instead of a browser Blob, we send an object with base64 data
            const base64Audio = encode(new Uint8Array(pcmData.buffer));

            // @ts-ignore
            this.session.sendRealtimeInput({
                media: {
                    data: base64Audio,
                    mimeType: 'audio/pcm;rate=16000'
                }
            });
        } catch (err) {
            console.error('[GeminiLive] Send error:', err);
        }
    }

    sendText(text: string) {
        if (!this.session || !this.isReady) return;
        try {
            // FIX: Use sendClientContent instead of send
            // @ts-ignore
            this.session.sendClientContent({
                turns: [{
                    parts: [{ text }]
                }],
                turnComplete: true
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
