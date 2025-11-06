import { getSetting, setSetting } from './secureSettingsService';

const KEY = 'gemini_api_key';
let cachedGeminiKey: string | null = null;

export function getGeminiApiKey(): string | null {
  return cachedGeminiKey;
}

export async function loadGeminiApiKey(): Promise<string | null> {
  const v = await getSetting(KEY);
  cachedGeminiKey = v && v.trim() ? v.trim() : null;
  return cachedGeminiKey;
}

export async function setGeminiApiKey(value: string): Promise<boolean> {
  const v = (value || '').trim();
  const ok = await setSetting(KEY, v || null);
  if (ok) {
    cachedGeminiKey = v || null;
  }
  return ok;
}

