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

    let messages: any[] = [];
    if (systemInstruction) {
        messages.push({ "role": "system", "content": systemInstruction });
    }

    if (typeof params.contents === 'string') {
        messages.push({ "role": "user", "content": params.contents });
    } else if (params.contents && Array.isArray(params.contents.parts)) {
        const contentParts = params.contents.parts.map((part: any) => {
            if (part.text) {
                return { type: "text", text: part.text };
            }
            if (part.inlineData && part.inlineData.data) {
                return {
                    type: "image_url",
                    image_url: {
                        url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`
                    }
                };
            }
            return null;
        }).filter(Boolean);
        messages.push({ "role": "user", "content": contentParts });
    } else {
        messages.push({ "role": "user", "content": JSON.stringify(params.contents) });
    }

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
            "messages": messages,
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
