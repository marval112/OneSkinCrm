import { getOpenRouterApiKey } from './aiSettingsService';

export interface OpenRouterParams {
    model: string;
    contents: string | any;
    config?: any;
}

export async function generateWithOpenRouter(params: OpenRouterParams) {
    const apiKey = getOpenRouterApiKey();
    if (!apiKey) throw new Error('OpenRouter API Key not found');

    const systemInstruction = params.config?.systemInstruction || "";
    const userPrompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "OneSkin CRM",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": params.model,
            "messages": [
                { "role": "system", "content": systemInstruction },
                { "role": "user", "content": userPrompt }
            ],
            "response_format": params.config?.responseMimeType === 'application/json' ? { "type": "json_object" } : undefined
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return {
        text,
        response: data
    };
}
