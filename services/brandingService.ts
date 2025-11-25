export function getBrandName(): string {
  try {
    const stored = localStorage.getItem('crm_brand_name');
    if (stored && stored.trim()) return stored.trim();
  } catch { }
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
  } catch { }
  return '/dashboard/logo.png';
}

export function getSidebarLogoUrl(): string {
  try {
    // Prefer uploaded data URL if present
    const dataUrl = localStorage.getItem('crm_sidebar_logo_dataurl');
    if (dataUrl && dataUrl.startsWith('data:image')) return dataUrl;
    const stored = localStorage.getItem('crm_sidebar_logo_url');
    if (stored && stored.trim()) return stored.trim();
  } catch { }
  // Fallback to main logo if sidebar logo not set
  return getBrandLogoUrl();
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
  } catch { }
}

export function setBrandLogoUrl(url: string): void {
  try {
    const value = (url || '').trim();
    if (value) localStorage.setItem('crm_brand_logo_url', value);
    else localStorage.removeItem('crm_brand_logo_url');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
}

export function setSidebarLogoUrl(url: string): void {
  try {
    const value = (url || '').trim();
    if (value) localStorage.setItem('crm_sidebar_logo_url', value);
    else localStorage.removeItem('crm_sidebar_logo_url');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
}

export function resetBranding(): void {
  try {
    localStorage.removeItem('crm_brand_name');
    localStorage.removeItem('crm_brand_logo_url');
    localStorage.removeItem('crm_brand_logo_dataurl');
    localStorage.removeItem('crm_sidebar_logo_url');
    localStorage.removeItem('crm_sidebar_logo_dataurl');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
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
  } catch { }
}

export function setSidebarLogoDataUrl(dataUrl: string): void {
  try {
    const value = (dataUrl || '').trim();
    if (!value) {
      localStorage.removeItem('crm_sidebar_logo_dataurl');
    } else if (value.startsWith('data:image')) {
      localStorage.setItem('crm_sidebar_logo_dataurl', value);
    } else {
      throw new Error('Invalid image data URL');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
}

export function clearUploadedLogo(): void {
  try {
    localStorage.removeItem('crm_brand_logo_dataurl');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
}

export function clearUploadedSidebarLogo(): void {
  try {
    localStorage.removeItem('crm_sidebar_logo_dataurl');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
    }
  } catch { }
}

export function applyBrandFavicon(): void {
  try {
    if (typeof document === 'undefined') return;
    const href = getBrandLogoUrl();
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  } catch { }
}

