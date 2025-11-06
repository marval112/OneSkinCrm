import { supabase } from './supabaseClient';

const TABLE = 'secure_settings';

export async function getSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn(`[SecureSettings] getSetting failed for key="${key}":`, error);
      return null;
    }
    return (data?.value as string | null) ?? null;
  } catch (e) {
    console.warn(`[SecureSettings] getSetting exception for key="${key}":`, e);
    return null;
  }
}

export async function setSetting(key: string, value: string | null): Promise<boolean> {
  try {
    if (value == null || String(value).trim() === '') {
      const { error } = await supabase.from(TABLE).delete().eq('key', key);
      if (error) {
        console.warn(`[SecureSettings] deleteSetting failed for key="${key}":`, error);
        return false;
      }
      return true;
    }
    const payload = { key, value } as any;
    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'key' });
    if (error) {
      console.warn(`[SecureSettings] setSetting failed for key="${key}":`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[SecureSettings] setSetting exception for key="${key}":`, e);
    return false;
  }
}


