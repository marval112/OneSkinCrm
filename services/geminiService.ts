

import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey, loadGeminiApiKey, loadOpenRouterApiKey } from './aiSettingsService';
import { generateWithOpenRouter } from './openRouterService';
import type { Lead, Customer, ActivityLog, Deal } from '../types';
import { DealStage } from '../types';

// IMPORTANT: This check is for the browser environment.
// In a real application, the API key should be handled securely and not exposed on the client-side.
// We assume `process.env.API_KEY` is made available through a build process (e.g., Vite, Webpack).
// Best-effort: try to warm cache from DB once on module load
// Note: not blocking; calls may proceed without a key until it is loaded
void loadGeminiApiKey();
void loadOpenRouterApiKey();

function getClient() {
  const key = getGeminiApiKey() || (process.env.VITE_GEMINI_API_KEY as string | undefined);
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

// Model priority for automatic fallback to maximize free tier usage
const MODEL_PRIORITY = [
  'models/gemini-2.5-flash-lite',
  'models/gemini-2.5-flash',
  'models/gemini-2.0-flash-exp',
  // Removed 'models/gemini-3-flash' - model does not exist
];

/**
 * Robustly extracts and parses JSON from a string that might contain 
 * conversational filler or markdown backticks.
 */
function extractJSON<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const logFailure = (reason: string) => {
    console.error(`[extractJSON] ${reason}. Text preview: ${trimmed.substring(0, 300)}`);
  };

  const unwrap = (val: any): any => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const keys = Object.keys(val);
      if (keys.length === 0) return val;

      // If it's an object with only one key and that key is an array, return the array
      if (keys.length === 1 && Array.isArray(val[keys[0]])) {
        console.log(`[extractJSON] Unwrapped array from property: ${keys[0]}`);
        return val[keys[0]];
      }

      // Common wrapper keys
      for (const key of ['tasks', 'items', 'data', 'suggestions', 'leads', 'deals', 'result', 'response']) {
        if (Array.isArray(val[key])) {
          console.log(`[extractJSON] Found array in property: ${key}`);
          return val[key];
        }
      }
    }
    return val;
  };

  try {
    // 1. Try direct parse
    const direct = JSON.parse(trimmed);
    if (direct) {
      console.log("[extractJSON] Direct parse success.");
      return unwrap(direct);
    }
  } catch (e) { /* continue */ }

  // 2. Try to find JSON block between backticks
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch && mdMatch[1]) {
    try {
      const parsed = JSON.parse(mdMatch[1].trim());
      console.log("[extractJSON] Markdown block parse success.");
      return unwrap(parsed);
    } catch (e2) { /* continue */ }
  }

  // 3. Robust Regex Extraction
  // Find balanced { } or [ ] blocks
  const blocks = trimmed.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|\[(?:[^[\]]|\[(?:[^[\]]|\[[^[\]]*\])*\])*\]/g);
  if (blocks) {
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        console.log("[extractJSON] Regex block parse success.");
        return unwrap(parsed);
      } catch (e3) { /* continue */ }
    }
  }

  // 4. NDJSON collection (multiple { } objects in the text)
  const objectMatches = trimmed.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g);
  if (objectMatches && objectMatches.length > 1) {
    try {
      const objects = objectMatches.map(m => {
        try { return JSON.parse(m); } catch { return null; }
      }).filter(Boolean);
      if (objects.length > 1) {
        console.log(`[extractJSON] Collected ${objects.length} objects into array.`);
        return objects as any;
      }
    } catch (e4) { /* continue */ }
  }

  logFailure("Failed to extract valid JSON");
  return null;
}

// OpenRouter Free Models with metadata
export interface OpenRouterModel {
  id: string;
  name: string;
  supportsVision: boolean;
}

export const OPENROUTER_FREE_MODELS: OpenRouterModel[] = [
  // Vision-capable models ONLY (verified to support image input)
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash Exp', supportsVision: true },
];

// Default OpenRouter models when Gemini quota is exhausted
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free';
export const DEFAULT_OPENROUTER_VISION_MODEL = 'google/gemini-2.0-flash-exp:free';

// Scanner-specific models (best for OCR and business card extraction)
export const SCANNER_VISION_MODELS: string[] = [
  'google/gemini-2.0-flash-exp:free', // User requested ONLY this model for scanner fallback
];

// Legacy arrays for backward compatibility
const OPENROUTER_MODELS = OPENROUTER_FREE_MODELS.map(m => m.id);
const OPENROUTER_VISION_MODELS = OPENROUTER_FREE_MODELS.filter(m => m.supportsVision).map(m => m.id);


// Quota management helpers
const QUOTA_STORAGE_KEY = 'oneskin_gemini_quota_exhausted';
const QUOTA_TIMESTAMP_KEY = 'oneskin_gemini_quota_timestamp';
const QUOTA_RESET_HOURS = 24; // Gemini quota resets daily

function isGeminiQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;

  const exhausted = localStorage.getItem(QUOTA_STORAGE_KEY) === 'true';
  const timestamp = localStorage.getItem(QUOTA_TIMESTAMP_KEY);

  if (!exhausted || !timestamp) return false;

  // Check if quota should have reset (after 24 hours)
  const exhaustedTime = new Date(timestamp).getTime();
  const now = Date.now();
  const hoursSinceExhaustion = (now - exhaustedTime) / (1000 * 60 * 60);

  if (hoursSinceExhaustion >= QUOTA_RESET_HOURS) {
    console.log('[AI] Gemini quota should have reset. Clearing exhaustion flag.');
    clearGeminiQuotaExhaustion();
    return false;
  }

  return true;
}

function markGeminiQuotaExhausted(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(QUOTA_STORAGE_KEY, 'true');
  localStorage.setItem(QUOTA_TIMESTAMP_KEY, new Date().toISOString());
  console.warn('[AI] Gemini quota exhausted. Switching to OpenRouter permanently until reset.');

  // Show user notification if toast context is available
  if (typeof window !== 'undefined' && (window as any).showQuotaExhaustedNotification) {
    (window as any).showQuotaExhaustedNotification();
  }
}

function clearGeminiQuotaExhaustion(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(QUOTA_STORAGE_KEY);
  localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
  console.log('[AI] Gemini quota exhaustion flag cleared.');
}

// OpenRouter Model Preference Management
const PREFERRED_OPENROUTER_MODEL_KEY = 'oneskin_preferred_openrouter_model';
const PREFERRED_OPENROUTER_VISION_MODEL_KEY = 'oneskin_preferred_openrouter_vision_model';

export function getPreferredOpenRouterModel(visionTask: boolean = false): string {
  if (typeof window === 'undefined') {
    return visionTask ? DEFAULT_OPENROUTER_VISION_MODEL : DEFAULT_OPENROUTER_MODEL;
  }

  const storageKey = visionTask ? PREFERRED_OPENROUTER_VISION_MODEL_KEY : PREFERRED_OPENROUTER_MODEL_KEY;
  const defaultModel = visionTask ? DEFAULT_OPENROUTER_VISION_MODEL : DEFAULT_OPENROUTER_MODEL;
  const preferred = localStorage.getItem(storageKey);

  // Validate that the stored model still exists in our list
  if (preferred && OPENROUTER_FREE_MODELS.some(m => m.id === preferred)) {
    // For vision tasks, ensure the model supports vision
    if (visionTask) {
      const model = OPENROUTER_FREE_MODELS.find(m => m.id === preferred);
      if (model && model.supportsVision) {
        return preferred;
      }
    } else {
      return preferred;
    }
  }

  return defaultModel;
}

export function setPreferredOpenRouterModel(modelId: string, visionTask: boolean = false): void {
  if (typeof window === 'undefined') return;

  // Validate model exists
  const model = OPENROUTER_FREE_MODELS.find(m => m.id === modelId);
  if (model) {
    // For vision tasks, ensure the model supports vision
    if (visionTask && !model.supportsVision) {
      console.warn(`[AI] Model ${modelId} does not support vision. Not saving preference.`);
      return;
    }

    const storageKey = visionTask ? PREFERRED_OPENROUTER_VISION_MODEL_KEY : PREFERRED_OPENROUTER_MODEL_KEY;
    localStorage.setItem(storageKey, modelId);
    console.log(`[AI] Preferred OpenRouter ${visionTask ? 'vision ' : ''}model set to: ${modelId}`);
  } else {
    console.warn(`[AI] Invalid model ID: ${modelId}. Not saving preference.`);
  }
}

// Export for use in Settings and UI components
export { isGeminiQuotaExhausted, clearGeminiQuotaExhaustion };

export async function generateWithFallback(client: any, params: any) {
  let lastError;
  let geminiQuotaHit = false;

  // Helper to check if vision is requested
  const isVisionTask = params.contents?.parts?.some((p: any) => p.inlineData) || false;

  // Check if Gemini quota was previously exhausted
  const quotaExhausted = isGeminiQuotaExhausted();

  // Check for manual fallback override
  const forceGemini = typeof window !== 'undefined' && localStorage.getItem('oneskin_force_openrouter') === 'false';

  // Determine if we should try Gemini first
  const shouldTryGemini = !quotaExhausted && forceGemini;

  // 1. Try Gemini Models first if quota is not exhausted and user prefers Gemini
  if (shouldTryGemini && client) {
    for (const modelId of MODEL_PRIORITY) {
      try {
        // Strip 'models/' prefix for the new SDK if present
        const cleanModelId = modelId.replace('models/', '');
        console.log(`[AI] Attempting Gemini model: ${cleanModelId}`);

        // Map contents strictly for the new SDK
        let contents = params.contents;
        if (typeof contents === 'string') {
          contents = [{ role: 'user', parts: [{ text: contents }] }];
        } else if (typeof params === 'string') {
          contents = [{ role: 'user', parts: [{ text: params }] }];
        }

        const result = await client.models.generateContent({
          model: cleanModelId,
          contents: contents,
          config: params.config
        });

        return {
          text: result.text || result.response?.text() || "",
          response: result
        };
      } catch (error: any) {
        lastError = error;
        const msg = error.message || '';
        const status = error.status || (error.response ? error.response.status : 0);
        const isQuota = status === 429 || msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
        const isNotFound = status === 404 || msg.includes('404');
        const isOverloaded = status === 503 || msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE');

        if (isQuota) {
          console.warn(`[AI Fallback] Gemini Model ${modelId} quota exhausted. Marking for automatic OpenRouter fallback.`);
          geminiQuotaHit = true;
          break; // Stop trying Gemini models
        } else if (isNotFound || isOverloaded) {
          console.warn(`[AI Fallback] Gemini Model ${modelId} failed (${isNotFound ? 'Not Found' : 'Overloaded'}). Trying next Gemini...`);
          continue;
        }
        throw error;
      }
    }

    // If we hit quota, mark it for future requests
    if (geminiQuotaHit) {
      markGeminiQuotaExhausted();
    }
  }

  // 2. Try OpenRouter Models (either as primary or fallback)
  const openRouterList = isVisionTask
    ? [...OPENROUTER_VISION_MODELS, ...OPENROUTER_MODELS]
    : OPENROUTER_MODELS;

  // Prioritize user's preferred model if set (use vision-specific preference for vision tasks)
  const preferredModel = getPreferredOpenRouterModel(isVisionTask);
  const orderedOpenRouterList = [
    preferredModel,
    ...openRouterList.filter(model => model !== preferredModel)
  ];

  for (const model of orderedOpenRouterList) {
    try {
      console.log(`[AI] Attempting OpenRouter model: ${model}${quotaExhausted || geminiQuotaHit ? ' (Gemini quota exhausted)' : ''}`);
      const result = await generateWithOpenRouter({ ...params, model });
      return result;
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      console.warn(`[AI Fallback] OpenRouter Model ${model} failed. ${isRateLimit ? 'Rate limited, waiting...' : 'Trying next...'}`);

      // If rate limited, wait 2 seconds before trying next model to avoid spamming
      if (isRateLimit) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      continue;
    }
  }

  // 3. Final Last-Ditch effort with OpenRouter free model
  try {
    console.log(`[AI] Final effort: Attempting OpenRouter fallback...`);
    return await generateWithOpenRouter({ ...params, model: 'google/gemini-2.0-flash-exp:free' });
  } catch (finalError) {
    throw lastError || finalError || new Error("All AI models failed (Gemini & OpenRouter)");
  }
}

export const getLeadScore = async (lead: Lead): Promise<{ score: number; reasoning: string; }> => {
  const client = getClient();
  if (!client) {
    return { score: Math.floor(Math.random() * 40) + 60, reasoning: "This is a mock score. Please set your API_KEY to use the AI feature." };
  }

  const prompt = `
    You are a lead scoring expert for "OneSkin", a company that sells high-end decorative wall panels.
    Score the following lead on a scale of 1 to 100, where 100 is the highest potential.
    Provide a brief reasoning for your score.

    Lead Details:
    - Name: ${lead.name}
    - Company: ${lead.company}
    - Country: ${lead.country}
    - Source: ${lead.source}
    - Current Status: ${lead.status}
    - Days since creation: ${Math.round((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24))} days

    Your response must be a valid JSON object with two keys: "score" (a number) and "reasoning" (a string).
    Example: {"score": 85, "reasoning": "Strong lead from a trade show, working for a relevant company."}
  `;

  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = extractJSON<{ score: number, reasoning: string }>(response.text);
    if (result && typeof result.score === 'number' && typeof result.reasoning === 'string') {
      return result;
    }
    throw new Error("Invalid JSON response from AI");

  } catch (error) {
    console.error("Error scoring lead with AI:", error);
    return { score: 0, reasoning: "Could not score lead due to an AI service error." };
  }
};

export const getCustomerInsights = async (customer: Customer): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "This is a mock insight. Set your API_KEY to generate real insights. Suggest offering a discount on their next order of decorative panels.";
  }

  const prompt = `
    You are a CRM analyst for "OneSkin", a decorative wall panel company.
    Analyze the following customer and provide a "Next Best Action" suggestion.
    Keep the suggestion concise and actionable (1-2 sentences).

    Customer Details:
    - Name: ${customer.name}
    - Company: ${customer.company}
    - Country: ${customer.country}
    // Fix: Replaced non-existent 'lifecycle' and 'total_spent' with existing properties 'status' and 'health_score'.
    - Status: ${customer.status}
    - Health Score: ${customer.health_score}
    - Last Contact: ${customer.last_contact}

    Example response: "High-value active customer. Propose a new premium panel collection to them."
  `;

  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting customer insights:", error);
    return "Could not generate insights due to an AI service error.";
  }
};

export const summarizeLead = async (lead: Lead, activities: ActivityLog[] = []): Promise<string> => {
  const client = getClient();
  if (!client) {
    return `Resumen (mock): ${lead.name} de ${lead.company}. Estado: ${lead.status}. Últimas actividades: ${activities.slice(0, 3).map(a => a.channel).join(', ')}`;
  }
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}${a.message ? `\n  ${a.message.substring(0, 160)}...` : ''}`)
    .join('\n');
  const prompt = `
    You are a Sales Mentor for OneSkin. 
    Task: Summarize this lead for a sales colleague in 4-6 bullet points. 
    Tone: Professional, motivating, and actionable. Avoid generic advice; focus on context-specific hints to help them close.
    
    Lead Context:
    Name: ${lead.name} (${lead.company}) • Status: ${lead.status}
    Recent activity:\n${recent || '(no activity)'}
  `;
  try {
    const response = await generateWithFallback(client, { contents: prompt });
    return response.text;
  } catch (e) {
    console.error('summarizeLead error', e);
    return 'Could not generate summary.';
  }
};

export type SuggestedTask = { type: string; title: string; dueDays?: number };
export const suggestLeadTasks = async (lead: Lead, activities: ActivityLog[] = []): Promise<SuggestedTask[]> => {
  const client = getClient();
  if (!client) {
    return [
      { type: 'Follow Up Call', title: `Llamar a ${lead.name} para avanzar`, dueDays: 2 },
      { type: 'Send Information', title: 'Enviar catálogo y fichas técnicas', dueDays: 1 },
    ];
  }
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `You are a CRM assistant. Propose 1-4 concrete next tasks for this lead. Use only these types: "Follow Up Call", "Send Information", "Send Samples", "Send Quotation", "Schedule Visit". Return strict JSON array with items {"type": string, "title": string, "dueDays": number}.

Lead: ${lead.name} (${lead.company}) • Status: ${lead.status} • Country: ${lead.country}
Recent activity:\n${recent || '(none)'}
`;
  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const arr = extractJSON<SuggestedTask[]>(response.text);
    if (Array.isArray(arr)) return arr;
    throw new Error('Invalid response');
  } catch (e) {
    console.error('suggestLeadTasks error', e);
    return [];
  }
};

export const draftLeadFollowUpEmail = async (lead: Lead, activities: ActivityLog[] = []): Promise<{ subject: string; body: string; }> => {
  const client = getClient();
  if (!client) {
    return { subject: `Seguimiento ${lead.company}`, body: `Hola ${lead.name},\n\nGracias por tu interés. Adjunto catálogo y propuesta. ¿Te viene bien una llamada esta semana?\n\nSaludos,` };
  }
  const lastMsg = activities.find(a => a.channel === 'email' && a.message)?.message || '';
  const prompt = `
    You are a Sales Master and Mentor for OneSkin. 
    Task: Draft a concise, professional, and highly persuasive follow-up email in Spanish.
    Tone: Motivating, elegant, and connected to the customer's needs.
    
    Context:
    Lead: ${lead.name} (${lead.company}) • Status: ${lead.status}
    Last email snippet: ${lastMsg.substring(0, 300)}
    
    Output JSON: {"subject": string, "body": string}.
  `;
  try {
    const response = await generateWithFallback(client, { contents: prompt, config: { responseMimeType: 'application/json' } });
    const obj = extractJSON<{ subject: string; body: string }>(response.text);
    if (obj && obj.subject && obj.body) return obj;
    throw new Error('Invalid email JSON');
  } catch (e) {
    console.error('draftLeadFollowUpEmail error', e);
    return { subject: 'Seguimiento', body: 'Hola,\n\nQuería dar seguimiento a nuestra conversación. ¿Podemos agendar una llamada?\n\nSaludos,' };
  }
};
export const suggestCustomerTasks = async (customer: Customer, activities: ActivityLog[] = []): Promise<SuggestedTask[]> => {
  const client = getClient();
  if (!client) {
    return [
      { type: 'Follow Up Call', title: `Llamar a ${customer.name}`, dueDays: 1 },
      { type: 'Send Quotation', title: 'Enviar propuesta formal', dueDays: 2 },
    ];
  }
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `You are a CRM assistant. Propose 1-4 concrete next tasks for this customer. Use only these types: "Follow Up Call", "Send Information", "Send Samples", "Send Quotation", "Schedule Visit". Return strict JSON array with items {"type": string, "title": string, "dueDays": number}.

Customer: ${customer.name} (${customer.company}) • Status: ${customer.status} • Health: ${customer.health_score}
Recent activity:\n${recent || '(none)'}
`;
  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const arr = extractJSON<SuggestedTask[]>(response.text);
    if (Array.isArray(arr)) return arr;
    throw new Error('Invalid response');
  } catch (e) {
    console.error('suggestCustomerTasks error', e);
    return [];
  }
};

export type AgendaItem = { id: number; start: string };
export const proposeAgenda = async (tasks: { id: number; type: string; due_date?: string | null; title?: string }[]): Promise<AgendaItem[]> => {
  const client = getClient();
  if (!client) {
    const start = new Date(); start.setHours(9, 0, 0, 0);
    return tasks.slice(0, 8).map((t, i) => ({ id: t.id, start: new Date(start.getTime() + i * 45 * 60000).toTimeString().slice(0, 5) }));
  }
  const prompt = `Create a day agenda starting at 09:00 with 45-min slots for these tasks. Return JSON array of {"id": number, "start": "HH:MM"}. Prioritize overdue and due today tasks first.
Tasks: ${JSON.stringify(tasks.slice(0, 40))}`;
  try { const r = await generateWithFallback(client, { contents: prompt, config: { responseMimeType: 'application/json' } }); const arr = extractJSON<AgendaItem[]>(r.text); if (Array.isArray(arr)) return arr; throw new Error('bad'); } catch { return []; }
};

export const summarizeDeal = async (deal: Deal, activities: ActivityLog[] = []): Promise<string> => {
  const client = getClient();
  if (!client) return `Estrategia (mock) para ${deal.title}: enfocar en valor, proponer visita y resolver objeciones.`;
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `
    You are a Sales Strategist and Mentor. 
    Task: Provide a concise win plan for this deal in 4-6 bullets.
    Tone: Sharp, professional, and highly motivating. Highlight risks, objections, and clear next steps to win.
    
    Deal Context:
    Title: ${deal.title} • Stage: ${deal.status} • Value: €${deal.value}
    Recent activity:\n${recent || '(none)'}
  `;
  try { const r = await generateWithFallback(client, { contents: prompt }); return r.text; } catch { return 'Could not generate strategy.'; }
};

export const suggestDealTasks = async (deal: Deal, activities: ActivityLog[] = []): Promise<SuggestedTask[]> => {
  const client = getClient();
  if (!client) return [{ type: 'Send Quotation', title: 'Enviar propuesta revisada', dueDays: 1 }, { type: 'Schedule Visit', title: 'Agendar visita técnica', dueDays: 3 }];
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `Propose 1-4 concrete tasks to progress this deal. Allowed types: "Follow Up Call", "Send Information", "Send Samples", "Send Quotation", "Schedule Visit". Return strict JSON array of {"type","title","dueDays"}.
Deal: ${deal.title} • Stage: ${deal.status} • Value: €${deal.value}
Recent activity:\n${recent || '(none)'}
`;
  try { const r = await generateWithFallback(client, { contents: prompt, config: { responseMimeType: 'application/json' } }); const arr = extractJSON<SuggestedTask[]>(r.text); if (Array.isArray(arr)) return arr; throw new Error('bad'); } catch { return []; }
};

export const generateDashboardInsights = async (payload: any): Promise<string> => {
  const client = getClient();
  if (!client) return 'Insights (mock): el pipeline abierto y la tasa de éxito se mantienen estables. Prioriza leads de Website y segment Industrial.';
  const prompt = `
    You are the OneSkin Sales Mentor. 
    Task: Write 4-6 short, actionable, and highly motivating CRM insights in Spanish from this JSON data. 
    Tone: Empowering and professional. Avoid generic tips; include specific CTAs that encourage the team to act.
    
    Data: ${JSON.stringify(payload).slice(0, 5000)}
  `;
  try { const r = await generateWithFallback(client, { contents: prompt }); return r.text; } catch { return 'No se pudieron generar insights.'; }
};

export const suggestDealStage = async (deal: Deal, activities: ActivityLog[] = []): Promise<DealStage | null> => {
  const client = getClient();
  if (!client) return null;
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `Given this deal, suggest the most appropriate next stage strictly as one of: "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost". Return JSON: {"stage": string}.
Deal: ${deal.title} • Current: ${deal.status} • Value: €${deal.value}
Recent activity:\n${recent || '(none)'}
`;
  try {
    const r = await generateWithFallback(client, { contents: prompt, config: { responseMimeType: 'application/json' } });
    const obj = extractJSON<{ stage: string }>(r.text);
    const s = String(obj?.stage || '');
    const map: Record<string, DealStage> = {
      'Qualification': DealStage.QUALIFICATION,
      'Proposal': DealStage.PROPOSAL,
      'Negotiation': DealStage.NEGOTIATION,
      'Closed Won': DealStage.CLOSED_WON,
      'Closed Lost': DealStage.CLOSED_LOST,
    };
    return map[s] ?? null;
  } catch {
    return null;
  }
};

export const suggestDealFollowUp = async (deal: Deal, activities: ActivityLog[] = []): Promise<{ dueDays: number; stage?: DealStage } | null> => {
  const client = getClient();
  if (!client) return { dueDays: 2 };
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `Suggest next follow-up window in DAYS (integer) for this deal and optionally a recommended stage. Return JSON {"dueDays": number, "stage": "Qualification|Proposal|Negotiation|Closed Won|Closed Lost"}.
Deal: ${deal.title} • Stage: ${deal.status} • Value: €${deal.value}
Recent activity:\n${recent || '(none)'}
`;
  try {
    const r = await generateWithFallback(client, { model: 'gemini-2.5-flash-lite', contents: prompt, config: { responseMimeType: 'application/json' } });
    const obj = extractJSON<{ dueDays: number; stage?: string }>(r.text);
    const d = Number(obj?.dueDays);
    const s = String(obj?.stage || '');
    const map: Record<string, DealStage> = {
      'Qualification': DealStage.QUALIFICATION,
      'Proposal': DealStage.PROPOSAL,
      'Negotiation': DealStage.NEGOTIATION,
      'Closed Won': DealStage.CLOSED_WON,
      'Closed Lost': DealStage.CLOSED_LOST,
    };
    if (!isFinite(d) || d < 0) return { dueDays: 2 };
    return { dueDays: Math.round(d), stage: map[s] };
  } catch {
    return { dueDays: 2 };
  }
};

export const summarizeCustomer = async (customer: Customer, activities: ActivityLog[] = []): Promise<string> => {
  const client = getClient();
  if (!client) {
    return `Resumen (mock): ${customer.name} de ${customer.company}. Estado: ${customer.status}. Salud: ${customer.health_score}.`;
  }
  const recent = activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(a => `- [${a.created_at}] ${a.channel}${a.direction ? ` (${a.direction})` : ''}${a.subject ? `: ${a.subject}` : ''}`)
    .join('\n');
  const prompt = `Summarize customer health and upsell opportunity in 4-6 bullets with next actions.

Customer: ${customer.name} (${customer.company}) • Status: ${customer.status} • Health: ${customer.health_score} • Country: ${customer.country}
Recent activity:\n${recent || '(none)'}
`;
  try { const r = await generateWithFallback(client, { model: 'gemini-2.5-flash-lite', contents: prompt }); return r.text; } catch { return 'Could not generate summary.'; }
};

export const draftCustomerFollowUpEmail = async (customer: Customer, activities: ActivityLog[] = []): Promise<{ subject: string; body: string }> => {
  const client = getClient();
  if (!client) return { subject: `Propuesta ${customer.company}`, body: `Hola ${customer.name},\n\nAdjunto propuesta y catálogo. ¿Agendamos una llamada esta semana?\n\nSaludos,` };
  const lastMsg = activities.find(a => a.channel === 'email' && a.message)?.message || '';
  const prompt = `
    You are a Sales Master and Mentor for OneSkin.
    Task: Draft a concise, elegant, and motivating Spanish email for an existing customer.
    Goal: Nurture the relationship and propose next steps (upsell, visit, etc).
    
    Context:
    Customer: ${customer.name} (${customer.company}) • Status: ${customer.status}
    Last email: ${lastMsg.substring(0, 300)}
    
    Output JSON {"subject","body"}.
  `;
  try { const r = await generateWithFallback(client, { model: 'gemini-2.5-flash-lite', contents: prompt, config: { responseMimeType: 'application/json' } }); const obj = extractJSON<{ subject: string; body: string }>(r.text); if (obj && obj.subject && obj.body) return obj; throw new Error('bad'); } catch { return { subject: 'Seguimiento', body: 'Hola,\n\nQuería compartir novedades y coordinar próximos pasos.\n\nSaludos,' }; }
};

export const prioritizeTasks = async (tasks: { id: number; type: string; due_date?: string | null; title?: string }[]): Promise<number[]> => {
  const client = getClient();
  if (!client) {
    return [...tasks]
      .sort((a, b) => {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return ad - bd;
      })
      .map(t => t.id);
  }
  const sample = tasks.slice(0, 20).map(t => ({ id: t.id, type: t.type, due: t.due_date, title: t.title })).slice(0, 50);
  const prompt = `Rank these tasks from highest to lowest priority for a sales rep. Consider proximity of due date and potential revenue impact inferred from title/type. Return ONLY a JSON array with the ordered ids.
Tasks: ${JSON.stringify(sample)}
`;
  try { const r = await generateWithFallback(client, { model: 'gemini-2.5-flash-lite', contents: prompt, config: { responseMimeType: 'application/json' } }); const arr = extractJSON<number[]>(r.text); if (Array.isArray(arr)) return arr; throw new Error('bad'); } catch { return tasks.map(t => t.id); }
};

export const scanBusinessCard = async (base64Image: string): Promise<Partial<Lead>> => {
  const client = getClient();
  if (!client) {
    // Mock response for when API key is not set
    return {
      name: 'John Doe (Mock)',
      company: 'Mock Inc.',
      email: 'john.mock@example.co.uk',
      phone: '+44 123 456 7890',
      country: 'United Kingdom',
    };
  }

  const prompt = `
    You are an expert OCR system specialized in extracting structured data from business cards. 
    Analyze the provided image and extract the following fields: 'name', 'company', 'email', 'phone', and 'country'.

    To determine the 'country', use this priority order:
    1. Infer from the international dialing code in the phone number (e.g., +34 is Spain, +1 is United States).
    2. If no dialing code, look for the country name in the postal address.
    3. If neither is present, infer from the top-level domain of the email (e.g., '.kr' is South Korea, '.es' is Spain).

    Your response MUST be a valid JSON object with ONLY these keys. 
    If a field is not found, return an empty string for that key.
    Example: {"name": "Jane Smith", "company": "Creative Solutions", "email": "jane@creativesolutions.co.uk", "phone": "+44-555-123-4567", "country": "United Kingdom"}
  `;

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: prompt
    };

    const response = await generateWithFallback(client, {
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = extractJSON<{ name: string; company: string; email: string; phone: string; country: string }>(response.text);
    if (result) {
      return {
        name: result.name || '',
        company: result.company || '',
        email: result.email || '',
        phone: result.phone || '',
        country: result.country || '',
      };
    }
    throw new Error("Invalid JSON response from AI");

  } catch (error: any) {
    console.error("Error scanning business card with AI:", error);

    // Determine which model was attempted
    let modelAttempted = 'Unknown';
    if (isGeminiQuotaExhausted()) {
      const preferredModel = getPreferredOpenRouterModel(true); // Vision task
      const modelInfo = OPENROUTER_FREE_MODELS.find(m => m.id === preferredModel);
      modelAttempted = modelInfo?.name || preferredModel;
    } else {
      modelAttempted = 'Gemini';
    }

    // Create enhanced error with model information
    const enhancedError = new Error(`Failed to scan card with ${modelAttempted}. Please try again.`);
    (enhancedError as any).modelUsed = modelAttempted;
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
};

export const generateProspects = async (query: string): Promise<any[]> => {
  const client = getClient();
  if (!client) return [];

  const prompt = `
    You are a B2B lead generation expert.
    Generate 5-8 REALISTIC, high-quality B2B prospects for the following search query: "${query}".
    Focus on the MDF, Melamine, Furniture, and Interior Design industries if the query allows.
    
    For each prospect, provide:
    - Name: A realistic contact person name.
    - Company: A realistic company name (sounding like a real business in that region).
    - Role: A relevant job title (e.g., Purchasing Manager, CEO, Interior Designer).
    - Location: A specific city and country relevant to the query.
    - Snippet: A brief description of why they are a good match (e.g., "Large manufacturer of kitchen cabinets looking for new suppliers").
    - Website: A realistic URL (e.g., companyname.de).
    - Email: A realistic email pattern (e.g., info@company.com).
    - Source: Randomly assign "LinkedIn", "Google", or "Directory".
    - MatchScore: A number between 70 and 99 based on relevance.

    Return a strict JSON array of objects with these keys: id (random string), name, company, role, location, snippet, website, email, source, matchScore.
  `;

  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = extractJSON<any[]>(response.text);
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error("Error generating prospects with AI:", error);
    return [];
  }
};

export const draftCommercialEmail = async (
  recipientName: string,
  recipientCompany: string,
  language: string = 'English'
): Promise<{ subject: string; body: string }> => {
  const client = getClient();
  if (!client) {
    return {
      subject: `Proposal for ${recipientCompany}`,
      body: `Dear ${recipientName},\n\nI hope this email finds you well.\n\nWe are OneSkin, a premium manufacturer of lacquered boards.\n\nBest regards,\n[Your Name]`
    };
  }

  const prompt = `
    You are an expert sales representative for "OneSkin", a premium manufacturer of high-end lacquered decorative panels (MDF/Melamine) for the furniture and interior design industry.
    
    Task: Write a professional, elegant, and commercially effective email to a potential client.
    
    Recipient:
    - Name: ${recipientName}
    - Company: ${recipientCompany}
    
    Goal: Introduce OneSkin, highlight our premium quality and innovation, and politely express interest in presenting our products for their upcoming projects.
    
    Tone: Professional, Elegant, Respectful, Persuasive but not pushy.
    Language: ${language}
    
    Output: A JSON object with "subject" and "body" fields. The body should be formatted with newlines.
  `;

  try {
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = extractJSON<{ subject: string; body: string }>(response.text);
    if (result && result.subject && result.body) {
      return result;
    }
    throw new Error("Invalid JSON response");
  } catch (error) {
    console.error("Error drafting commercial email:", error);
    return {
      subject: "Introduction to OneSkin",
      body: `Dear ${recipientName},\n\nI would like to introduce you to OneSkin's premium lacquered panels.\n\nBest regards,`
    };
  }
};