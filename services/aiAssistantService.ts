
import { getClient, generateWithFallback } from './geminiService';
import * as crmService from './crmService';
import * as tasksService from './tasksService';
import { TaskStatus } from '../types';
import type { User, TaskType } from '../types';

// System Prompt: High-Performance Sales Assistant
const SYSTEM_INSTRUCTION = `
You are "OneSkin Executive AI", a High-Performance Sales Assistant.
Your ONLY goal is to maximize the user's sales velocity and revenue.

PERSONA:
- Professional, sharp, and data-driven.
- NO small talk. NO "How can I help you?".
- Proactive: Suggest actions before being asked.
- Efficient: Responses must be under 15 words when possible.

CAPABILITIES:
1. LEADS: Analyze fit, suggest next steps.
2. DEALS: Identify stalls, suggest closing tactics.
3. TASKS: Enforce daily execution.

FORMAT FOR ACTIONS (JSON):
{
    "action": "function_name",
    "params": { ... }
}

TOOLS:
- summarize_lead(leadId): Deep analysis.
- create_task(title, dueDate, etc): Log work.
- list_tasks(filter): Review workload.
- navigate(path): Jump to screens.

If no specific tool is needed, give a short, punchy sales nudge.
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

export const generateProactiveGreeting = async (
    user: User,
    currentPath: string
): Promise<string> => {
    try {
        // Fetch real-time context
        const taskCounts = await tasksService.getTaskCounts(user);

        const context = `
User: ${user.email} (${user.role})
Current Page: ${currentPath}
Real-time Stats:
- Overdue Tasks: ${taskCounts.overdue}
- Pending Tasks: ${taskCounts.pending}
- Tasks Due Today: ${taskCounts.today}

INSTRUCTION:
Generate a single, high-impact proactive sales nudge (Max 15 words).
- If Overdue > 0: Demand they be cleared.
- If on /leads: Suggest calling high-value leads.
- If on /dashboard: Focus on pipeline velocity.
- START IMMEDIATELY. NO "Hello".
`;

        const client = getClient();
        const result = await generateWithFallback(client, {
            contents: [{ role: 'user', parts: [{ text: SYSTEM_INSTRUCTION + '\n\n' + context }] }]
        });

        return result.text || "Let's close some deals today.";
    } catch (e) {
        console.error("Proactive Greeting Failed", e);
        return "Ready to crush your targets?";
    }
};

export const sendMessageToAssistant = async (
    message: string,
    history: ChatMessage[],
    user: User,
    currentPath: string
): Promise<{ text: string, action?: any }> => {

    // Construct a stateless prompt
    const historyText = history.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content} `).join('\n');
    const contextMessage = `
[System]
${SYSTEM_INSTRUCTION}

[Context]
User: ${user.email} (${user.role})
Current Page: ${currentPath}

[Conversation History]
${historyText}

[User Input]
${message}
`;

    try {
        const client = getClient();
        const result = await generateWithFallback(client, {
            contents: contextMessage
        });

        const responseText = result.text;

        // Try to parse JSON action from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let action = null;
        let cleanText = responseText;

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.action && parsed.params) {
                    action = parsed;
                    cleanText = responseText.replace(jsonMatch[0], '').trim();
                }
            } catch (e) {
                console.warn("Failed to parse JSON action", e);
            }
        }

        // Fallback for empty text (AI might only return JSON)
        if (!cleanText && action) cleanText = "Executing that now.";
        if (!cleanText && !action) cleanText = "I'm listening.";

        return { text: cleanText, action };
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return { text: "Connection error. Check your network.", action: null };
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
                    notes: params.notes || 'Created by AI Assistant',
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
            try {
                const counts = await tasksService.getTaskCounts(user);
                return { success: true, message: `You have ${counts.pending} pending tasks (${counts.overdue} overdue, ${counts.today} due today).` };
            } catch (e: any) {
                return { success: false, message: e.message };
            }

        case 'summarize_lead':
            return { success: true, message: "Lead analysis feature is ready." };

        default:
            return { success: false, message: `Unknown action: ${actionName}` };
    }
};
