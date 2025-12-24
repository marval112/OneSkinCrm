import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from './aiSettingsService';
import * as crmService from './crmService';
import * as tasksService from './tasksService';
import type { User, TaskType } from '../types';
import { TaskStatus } from '../types';

// System Prompt derived from chatbot_prompt.md
const SYSTEM_INSTRUCTION = `
You are "OneSkin CRM AI", an expert Productivity Assistant embedded in the OneSkin CRM.
Your goal is to help the user be more productive by answering questions and PERFORMING ACTIONS.

You have access to the following modules:
1. LEADS: Analyze, Qualify, Convert.
2. CUSTOMERS: Retention, Upsell, Email drafting.
3. DEALS: Pipeline management, Forecasting.
4. TASKS: Daily planning, Reschedule.
5. PROSPECTING: Search for new leads.

You can execute tools. When the user asks to do something, output a JSON object describing the action.
Format for Action:
{
  "action": "function_name",
  "params": { ...parameters... }
}

Available Actions (Tools):
- summarize_lead(leadId: number): Analyze a specific lead.
- create_task(title: string, dueDate: string, type: string, leadId?: number, customerId?: number): Create a task.
- list_tasks(filter: 'today' | 'overdue' | 'all'): List tasks.
- navigate(path: string): Navigate to a page (e.g., "/leads", "/customers", "/dashboard").

If no action is needed, just reply with text.
Always be concise, professional, and proactive.
`;

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
    action?: {
        action: string;
        params: any;
        status: 'pending' | 'success' | 'error';
        result?: any;
    };
}

let chatSession: any = null;

export const initializeChat = async () => {
    const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string);
    if (!key) throw new Error("API Key not found");

    const genAI = new GoogleGenAI({ apiKey: key });
    // @ts-ignore - The SDK types might be mismatching between versions or environments.
    // We assume getGenerativeModel exists as per standard Google Generative AI usage.
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: SYSTEM_INSTRUCTION
    });

    chatSession = model.startChat({
        history: [],
    });
    return chatSession;
};

export const sendMessageToAssistant = async (
    message: string,
    user: User,
    currentPath: string
): Promise<{ text: string, action?: any }> => {
    if (!chatSession) await initializeChat();

    // Inject context
    const contextMessage = `[Context: User=${user.email}, Role=${user.role}, CurrentPage=${currentPath}] ${message}`;

    try {
        const result = await chatSession.sendMessage(contextMessage);
        const responseText = result.response.text();

        // Try to parse JSON action from response
        // The model might output text + JSON or just JSON.
        // We look for a JSON block.
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let action = null;
        let cleanText = responseText;

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.action && parsed.params) {
                    action = parsed;
                    // Remove the JSON from the text shown to user, or keep it if it's the only thing
                    cleanText = responseText.replace(jsonMatch[0], '').trim();
                    if (!cleanText) cleanText = "I'm processing that for you...";
                }
            } catch (e) {
                console.warn("Failed to parse JSON action", e);
            }
        }

        return { text: cleanText, action };
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return { text: "I'm sorry, I encountered an error connecting to the AI brain.", action: null };
    }
};

// Tool Execution Logic
export const executeAction = async (actionName: string, params: any, user: User) => {
    console.log(`Executing tool: ${actionName}`, params);

    switch (actionName) {
        case 'navigate':
            // Navigation is handled by the UI component
            return { success: true, message: `Navigating to ${params.path}` };

        case 'create_task':
            try {
                const task = await tasksService.createTask({
                    title: params.title,
                    notes: params.description || 'Created by AI Assistant',
                    due_date: params.dueDate,
                    type: params.type || 'Other',
                    status: TaskStatus.PENDING,
                    user_id: user.id,
                    lead_id: params.leadId,
                    customer_id: params.customerId
                });
                return { success: true, message: `Task "${task.title}" created!`, data: task };
            } catch (e: any) {
                return { success: false, message: e.message };
            }

        case 'list_tasks':
            // Reuse existing service
            try {
                const counts = await tasksService.getTaskCounts(user.id);
                return { success: true, message: `You have ${counts.pending} pending tasks (${counts.overdue} overdue, ${counts.today} due today).` };
            } catch (e: any) {
                return { success: false, message: e.message };
            }

        default:
            return { success: false, message: `Unknown action: ${actionName}` };
    }
};
