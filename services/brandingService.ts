export function getBrandName(): string {
  try {
    const stored = localStorage.getItem('crm_brand_name');
    if (stored && stored.trim()) return stored.trim();
  } catch {}
  if (typeof document !== 'undefined' && document.title) return document.title;
  return 'OneSkin CRM';
}

export function getBrandLogoUrl(): string {
  try {
    // Prefer uploaded data URL if present
    const dataUrl = localStorage.getItem('crm_brand_logo_dataurl');
    if (dataUrl && dataUrl.startsWith('data:image')) return dataUrl;
    const stored = localStorage.getItem('crm_brand_logo_url');
    if (stored && stored.trim()) return stored.trim();
  } catch {}
  return '/dashboard/logo.png';
}

export const BRANDING_UPDATED_EVENT = 'branding:updated';

export function setBrandName(name: string): void {
  try {
    const value = (name || '').trim();
    if (value) localStorage.setItem('crm_brand_name', value);
    else localStorage.removeItem('crm_brand_name');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch {}
}

export function setBrandLogoUrl(url: string): void {
  try {
    const value = (url || '').trim();
    if (value) localStorage.setItem('crm_brand_logo_url', value);
    else localStorage.removeItem('crm_brand_logo_url');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch {}
}

export function resetBranding(): void {
  try {
    localStorage.removeItem('crm_brand_name');
    localStorage.removeItem('crm_brand_logo_url');
    localStorage.removeItem('crm_brand_logo_dataurl');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch {}
}

export function setBrandLogoDataUrl(dataUrl: string): void {
  try {
    const value = (dataUrl || '').trim();
    if (!value) {
      localStorage.removeItem('crm_brand_logo_dataurl');
    } else if (value.startsWith('data:image')) {
      localStorage.setItem('crm_brand_logo_dataurl', value);
    } else {
      throw new Error('Invalid image data URL');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch {}
}

export function clearUploadedLogo(): void {
  try {
    localStorage.removeItem('crm_brand_logo_dataurl');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch {}
}

