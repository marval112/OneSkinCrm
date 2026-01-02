import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { getGeminiApiKey, loadGeminiApiKey } from './aiSettingsService';
import { generateWithFallback } from './geminiService';

// --- TYPES ---

export enum Command {
    SHOW_LEADS = 'show_leads',
    CREATE_TASK = 'create_task',
    FIND_CUSTOMER = 'find_customer',
    UNKNOWN = 'unknown',
}

export interface StructuredCommand {
    command: Command;
    args: { [key: string]: any };
}

export type CommandResponse =
    | { type: 'command'; data: StructuredCommand }
    | { type: 'text'; data: string };


// --- GEMINI FUNCTION DECLARATIONS ---

const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
    {
        functionDeclarations: [
            {
                name: 'show_leads',
                description: 'Display a list of leads based on specified criteria like status, source, or date range.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, description: 'The status of the leads to show (e.g., "New", "Qualified").' },
                        source: { type: Type.STRING, description: 'The source of the leads (e.g., "Website", "Referral").' },
                        dateRange: { type: Type.STRING, description: 'A date range like "this week", "last month", or "today".' },
                    },
                },
            },
            {
                name: 'create_task',
                description: 'Create a new task and assign it to someone.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'A brief, descriptive title for the task.' },
                        assignee: { type: Type.STRING, description: 'The name of the person the task is assigned to (e.g., "Juan", "Sales Team").' },
                        dueDate: { type: Type.STRING, description: 'An optional due date for the task (e.g., "tomorrow", "next Friday").' },
                    },
                    required: ['title', 'assignee'],
                },
            },
            {
                name: 'find_customer',
                description: 'Find a specific customer by their name or company.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'The name of the customer.' },
                        company: { type: Type.STRING, description: 'The company name of the customer.' },
                    },
                },
            },
            {
                name: 'navigate',
                description: 'Navigate to a specific screen/page in the application.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        screen: { type: Type.STRING, description: 'The destination screen (e.g., "leads", "customers", "deals", "dashboard", "alerts", "calendar").' },
                    },
                    required: ['screen'],
                },
            },
            {
                name: 'create_lead',
                description: 'Create a new lead with provided information.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        company: { type: Type.STRING },
                        email: { type: Type.STRING },
                        phone: { type: Type.STRING },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'create_deal',
                description: 'Create a new business opportunity (deal).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        value: { type: Type.NUMBER },
                        lead_id: { type: Type.NUMBER },
                    },
                    required: ['title'],
                },
            },
            {
                name: 'create_alert',
                description: 'Create a reminder or alert for the user.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        message: { type: Type.STRING, description: 'The content of the alert.' },
                    },
                    required: ['message'],
                },
            },
            {
                name: 'initiate_call',
                description: 'Start an audio or video call with a team member.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        member: { type: Type.STRING, description: 'Name of the team member to call.' },
                        type: { type: Type.STRING, enum: ['audio', 'video'], description: 'Type of the call.' },
                    },
                    required: ['member', 'type'],
                },
            }
        ]
    }
];

// --- SERVICE ---

async function getClient(): Promise<GoogleGenAI | null> {
    let key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined);
    if (!key) {
        await loadGeminiApiKey();
        key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined);
    }
    return key ? new GoogleGenAI({ apiKey: key }) : null;
}

import { AI_SALES_MENTOR_PROMPT } from './aiPersona';

export const processCommand = async (prompt: string, context?: string, userName?: string, language: string = 'en'): Promise<CommandResponse> => {
    const ai = await getClient();
    if (!ai) {
        return { type: 'text', data: "AI features are disabled. Please set your Gemini API key in Settings." };
    }

    try {
        const companyName = "OneSkin";
        const sellerName = userName || "Seller";

        let systemInstruction = AI_SALES_MENTOR_PROMPT
            .replace(/{company_name}/g, companyName)
            .replace(/{seller_name}/g, sellerName)
            .replace(/{language}/g, language);

        systemInstruction += `\n\nCURRENT CONTEXT: ${context || 'None'}`;

        // Add specific CRM capabilities context
        systemInstruction += `\n\nNOTE: You also have access to CRM data and tools. If the user asks to perform an action like creating a task or finding a customer, USE THE AVAILABLE TOOLS/FUNCTIONS.
        
        CAPABILITIES:
        - Analyze leads and customers based on their information
        - Provide insights about lead quality, potential, and next steps
        - Suggest follow-up actions and strategies
        - Answer questions about CRM data and operations
        - Help with sales and business development strategies`;

        const response = await generateWithFallback(ai, {
            model: 'models/gemini-2.0-flash',
            contents: prompt,
            config: {
                systemInstruction,
                tools, // Re-enable tools for structured actions
            }
        });

        const functionCalls = response.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const command = call.name as Command;
            // Ensure command is a valid enum value
            if (Object.values(Command).includes(command)) {
                return {
                    type: 'command',
                    data: {
                        command,
                        args: call.args,
                    },
                };
            }
        }

        // If no function call, or an invalid one, return the text response
        return { type: 'text', data: response.text };

    } catch (error: any) {
        console.error("Error processing AI command:", error);

        const msg = error.message || '';
        const isQuota = msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');

        if (isQuota) {
            const warningIcon = "⏳";
            const advice = language === 'es' ? 'Puedes activar "Forzar OpenRouter" en Configuración para seguir usando la IA.' :
                language === 'pt' ? 'Você pode ativar "Forçar OpenRouter" em Configuração para continuar usando a IA.' :
                    'You can enable "Force OpenRouter" in Settings to continue using AI.';

            if (language === 'es') {
                return { type: 'text', data: `${warningIcon} **Límite de uso alcanzado**\n\nHas consumido tu cuota gratuita de Gemini por hoy. ${advice}` };
            } else if (language === 'pt') {
                return { type: 'text', data: `${warningIcon} **Limite de uso atingido**\n\nVocê atingiu sua cota gratuita do Gemini por hoje. ${advice}` };
            }
            return { type: 'text', data: `${warningIcon} **Usage limit reached**\n\nYou have used your free Gemini quota for today. ${advice}` };
        }

        return { type: 'text', data: `Error details: ${error.message || JSON.stringify(error)}` };
    }
};
