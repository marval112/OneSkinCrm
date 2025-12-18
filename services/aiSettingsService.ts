import { getSetting, setSetting } from './secureSettingsService';

const KEY = 'gemini_api_key';
const OPENROUTER_KEY = 'openrouter';
let cachedGeminiKey: string | null = null;
let cachedOpenRouterKey: string | null = null;

export function getGeminiApiKey(): string | null {
  return cachedGeminiKey;
}

export function getOpenRouterApiKey(): string | null {
  return cachedOpenRouterKey;
}

export async function loadGeminiApiKey(): Promise<string | null> {
  const v = await getSetting(KEY);
  cachedGeminiKey = v && v.trim() ? v.trim() : null;
  return cachedGeminiKey;
}

export async function loadOpenRouterApiKey(): Promise<string | null> {
  const v = await getSetting(OPENROUTER_KEY);
  cachedOpenRouterKey = v && v.trim() ? v.trim() : null;
  return cachedOpenRouterKey;
}

export async function setGeminiApiKey(value: string): Promise<boolean> {
  const v = (value || '').trim();
  const ok = await setSetting(KEY, v || null);
  if (ok) {
    cachedGeminiKey = v || null;
  }
  return ok;
}

export async function setOpenRouterApiKey(value: string): Promise<boolean> {
  const v = (value || '').trim();
  const ok = await setSetting(OPENROUTER_KEY, v || null);
  if (ok) {
    cachedOpenRouterKey = v || null;
  }
  return ok;
}

