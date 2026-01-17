import { getOpenRouterApiKey } from './aiSettingsService';

export interface OpenRouterParams {
    model: string;
    contents: string | any;
    config?: any;
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    maxRetries: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
};

// Track rate limit state per model
const rateLimitState: Map<string, {
    lastAttempt: number;
    consecutiveFailures: number;
    nextRetryAfter?: number;
}> = new Map();

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
        RATE_LIMIT_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt),
        RATE_LIMIT_CONFIG.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
}

/**
 * Parse Retry-After header (can be seconds or HTTP date)
 */
function parseRetryAfter(retryAfter: string | null): number | null {
    if (!retryAfter) return null;

    // Try parsing as seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
    }

    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
    }

    return null;
}

/**
 * Check if we should wait before attempting a request
 */
function shouldWaitBeforeRequest(model: string): number {
    const state = rateLimitState.get(model);
    if (!state) return 0;

    const now = Date.now();

    // Check if we have a specific retry-after time
    if (state.nextRetryAfter && state.nextRetryAfter > now) {
        return state.nextRetryAfter - now;
    }

    // Check if we should apply exponential backoff
    if (state.consecutiveFailures > 0) {
        const timeSinceLastAttempt = now - state.lastAttempt;
        const requiredDelay = calculateBackoffDelay(state.consecutiveFailures - 1);

        if (timeSinceLastAttempt < requiredDelay) {
            return requiredDelay - timeSinceLastAttempt;
        }
    }

    return 0;
}

/**
 * Update rate limit state after a request
 */
function updateRateLimitState(model: string, success: boolean, retryAfter?: number) {
    const state = rateLimitState.get(model) || {
        lastAttempt: 0,
        consecutiveFailures: 0
    };

    state.lastAttempt = Date.now();

    if (success) {
        state.consecutiveFailures = 0;
        state.nextRetryAfter = undefined;
    } else {
        state.consecutiveFailures++;
        if (retryAfter) {
            state.nextRetryAfter = Date.now() + retryAfter;
        }
    }

    rateLimitState.set(model, state);
}

/**
 * Enhanced error with rate limiting information
 */
class OpenRouterError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public body: string,
        public retryAfter?: number,
        public isRateLimited: boolean = false
    ) {
        super(`OpenRouter API error (${status}): ${statusText}`);
        this.name = 'OpenRouterError';
    }
}

export async function generateWithOpenRouter(params: OpenRouterParams) {
    const apiKey = getOpenRouterApiKey();
    if (!apiKey) {
        throw new Error('OpenRouter API Key not found. Please configure your API key in Settings.');
    }

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

    const requestBody = {
        "model": params.model,
        "messages": messages,
        "response_format": params.config?.responseMimeType === 'application/json' ? { "type": "json_object" } : undefined
    };

    // Check if we need to wait before making the request
    const waitTime = shouldWaitBeforeRequest(params.model);
    if (waitTime > 0) {
        console.log(`[OpenRouter] Rate limit backoff: waiting ${Math.round(waitTime / 1000)}s before retrying ${params.model}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    let lastError: OpenRouterError | null = null;

    for (let attempt = 0; attempt < RATE_LIMIT_CONFIG.maxRetries; attempt++) {
        try {
            console.log(`[OpenRouter] Request attempt ${attempt + 1}/${RATE_LIMIT_CONFIG.maxRetries} for model: ${params.model}`);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "OneSkin CRM",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            // Handle successful response
            if (response.ok) {
                updateRateLimitState(params.model, true);

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content || "";

                console.log(`[OpenRouter] ✓ Success with model: ${params.model}`);

                return {
                    text,
                    functionCalls: [],
                    response: data
                };
            }

            // Handle error responses
            const errorBody = await response.text();
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfter = parseRetryAfter(retryAfterHeader);

            const error = new OpenRouterError(
                response.status,
                response.statusText,
                errorBody,
                retryAfter || undefined,
                response.status === 429
            );

            lastError = error;

            // Handle different error types
            if (response.status === 429) {
                // Rate limited
                const waitMs = retryAfter || calculateBackoffDelay(attempt);
                updateRateLimitState(params.model, false, waitMs);

                console.warn(
                    `[OpenRouter] ⚠ Rate limited (429) on ${params.model}. ` +
                    `Retry ${attempt + 1}/${RATE_LIMIT_CONFIG.maxRetries}. ` +
                    `Waiting ${Math.round(waitMs / 1000)}s...`
                );

                if (attempt < RATE_LIMIT_CONFIG.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }
            } else if (response.status === 503 || response.status === 502) {
                // Service unavailable or bad gateway - temporary issues
                updateRateLimitState(params.model, false);

                console.warn(
                    `[OpenRouter] ⚠ Service temporarily unavailable (${response.status}) for ${params.model}. ` +
                    `Retry ${attempt + 1}/${RATE_LIMIT_CONFIG.maxRetries}`
                );

                if (attempt < RATE_LIMIT_CONFIG.maxRetries - 1) {
                    const waitMs = calculateBackoffDelay(attempt);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }
            } else if (response.status === 401 || response.status === 403) {
                // Authentication errors - don't retry
                updateRateLimitState(params.model, false);
                console.error(`[OpenRouter] ✗ Authentication error (${response.status}): Invalid API key`);
                throw error;
            } else if (response.status === 400) {
                // Bad request - don't retry
                updateRateLimitState(params.model, false);
                console.error(`[OpenRouter] ✗ Bad request (400): ${errorBody.substring(0, 200)}`);
                throw error;
            } else {
                // Other errors
                updateRateLimitState(params.model, false);
                console.error(`[OpenRouter] ✗ Error (${response.status}): ${errorBody.substring(0, 200)}`);
                throw error;
            }

        } catch (error: any) {
            // Network errors or other exceptions
            if (error instanceof OpenRouterError) {
                lastError = error;
            } else {
                console.error(`[OpenRouter] ✗ Network or unexpected error:`, error);
                lastError = new OpenRouterError(
                    0,
                    'Network Error',
                    error.message || 'Unknown error',
                    undefined,
                    false
                );
            }

            // Retry on network errors
            if (attempt < RATE_LIMIT_CONFIG.maxRetries - 1 && !(error instanceof OpenRouterError && error.status === 401)) {
                const waitMs = calculateBackoffDelay(attempt);
                console.warn(`[OpenRouter] Retrying after network error in ${Math.round(waitMs / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
            }
        }
    }

    // All retries exhausted
    if (lastError) {
        if (lastError.isRateLimited) {
            console.error(
                `[OpenRouter] ✗ Rate limit exceeded for ${params.model} after ${RATE_LIMIT_CONFIG.maxRetries} attempts. ` +
                `Please try again later or switch to a different model.`
            );
        }
        throw lastError;
    }

    throw new Error(`OpenRouter request failed after ${RATE_LIMIT_CONFIG.maxRetries} attempts`);
}
