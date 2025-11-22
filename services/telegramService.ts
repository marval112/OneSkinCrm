import { getSetting } from './secureSettingsService';

let cachedToken: string | null | undefined;
let cachedChatId: string | null | undefined;

async function loadConfig(): Promise<{ token: string | null; chatId: string | null }> {
  if (typeof cachedToken === 'undefined' || typeof cachedChatId === 'undefined') {
    // Try secure settings first
    try {
      const [tok, chat] = await Promise.all([
        getSetting('telegram_bot_token'),
        getSetting('telegram_chat_id'),
      ]);
      cachedToken = tok ?? (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN ?? null;
      cachedChatId = chat ?? (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID ?? null;
    } catch {
      cachedToken = ((import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN as string) || null;
      cachedChatId = ((import.meta as any).env?.VITE_TELEGRAM_CHAT_ID as string) || null;
    }
  }
  return { token: cachedToken || null, chatId: cachedChatId || null };
}

export async function sendTelegramMessage(text: string): Promise<void> {
  try {
    const { token, chatId } = await loadConfig();
    if (!token || !chatId) return; // not configured
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.warn('[telegram] failed to send message', e);
  }
}

export function clearTelegramCache(): void {
  cachedToken = undefined as any;
  cachedChatId = undefined as any;
}


