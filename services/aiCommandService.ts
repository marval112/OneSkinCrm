import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { getGeminiApiKey, loadGeminiApiKey } from './aiSettingsService';

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
            }
        ]
    }
];

// --- SERVICE ---

async function getClient(): Promise<GoogleGenAI | null> {
    let key = getGeminiApiKey() || (process.env.API_KEY as string | undefined);
    if (!key) {
        await loadGeminiApiKey();
        key = getGeminiApiKey() || (process.env.API_KEY as string | undefined);
    }
    return key ? new GoogleGenAI({ apiKey: key }) : null;
}

export const processCommand = async (prompt: string, context?: string): Promise<CommandResponse> => {
    const ai = await getClient();
    if (!ai) {
        return { type: 'text', data: "AI features are disabled. Please set your Gemini API key in Settings." };
    }

    try {
        const systemInstruction = `You are an AI assistant for the OneSkin CRM, a premium manufacturer of high-end lacquered decorative panels (MDF/Melamine) for the furniture and interior design industry.
        
        CURRENT CONTEXT: ${context || 'None'}
        
        CAPABILITIES:
        - Analyze leads and customers based on their information
        - Provide insights about lead quality, potential, and next steps
        - Suggest follow-up actions and strategies
        - Answer questions about CRM data and operations
        - Help with sales and business development strategies
        
        When analyzing a lead, consider:
        - Company name and industry relevance
        - Lead source and quality indicators
        - Potential for business in the decorative panels/furniture sector
        - Suggested next steps for engagement
        - Timeline recommendations
        
        Be helpful, professional, and provide actionable insights. Use the context to give relevant answers.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Removed tools to prevent function calling loop
                // AI will respond with text analysis instead
                systemInstruction
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

    } catch (error) {
        console.error("Error processing AI command:", error);
        return { type: 'text', data: "Sorry, I encountered an error trying to understand that. Please try again." };
    }
};
