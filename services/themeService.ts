
import type { Theme, ThemeColors } from '../types';

const defaultColors: ThemeColors = {
  primary: '#2563eb', primaryHover: '#1d4ed8',
  success: '#10b981', successHover: '#059669',
  warning: '#f59e0b', warningHover: '#d97706',
  danger: '#ef4444', dangerHover: '#dc2626',
};

const darkColors: ThemeColors = {
  primary: '#38bdf8', primaryHover: '#0ea5e9',
  success: '#2dd4bf', successHover: '#0d9488',
  warning: '#fbbf24', warningHover: '#d97706',
  danger: '#f87171', dangerHover: '#ef4444',
};

const presetThemes: Theme[] = [
  {
    id: 'default',
    name: 'Professional Blue',
    colors: {
      primary: '#2563eb', primaryHover: '#1d4ed8',
      success: '#10b981', successHover: '#059669',
      warning: '#f59e0b', warningHover: '#d97706',
      danger: '#ef4444', dangerHover: '#dc2626',
    },
    description: 'Classic professional blue theme, perfect for business'
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    colors: {
      primary: '#0891b2', primaryHover: '#0e7490',
      success: '#14b8a6', successHover: '#0d9488',
      warning: '#f59e0b', warningHover: '#d97706',
      danger: '#f43f5e', dangerHover: '#e11d48',
    },
    description: 'Refreshing cyan and teal tones for a modern look'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      primary: '#059669', primaryHover: '#047857',
      success: '#10b981', successHover: '#059669',
      warning: '#f59e0b', warningHover: '#d97706',
      danger: '#dc2626', dangerHover: '#b91c1c',
    },
    description: 'Natural green theme for eco-friendly businesses'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      primary: '#ea580c', primaryHover: '#c2410c',
      success: '#16a34a', successHover: '#15803d',
      warning: '#eab308', warningHover: '#ca8a04',
      danger: '#dc2626', dangerHover: '#b91c1c',
    },
    description: 'Warm and energetic orange for creative teams'
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    colors: {
      primary: '#7c3aed', primaryHover: '#6d28d9',
      success: '#10b981', successHover: '#059669',
      warning: '#f59e0b', warningHover: '#d97706',
      danger: '#e11d48', dangerHover: '#be123c',
    },
    description: 'Elegant purple for premium and luxury brands'
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: {
      primary: '#1f2937', primaryHover: '#111827',
      success: '#6b7280', successHover: '#4b5563',
      warning: '#9ca3af', warningHover: '#6b7280',
      danger: '#374151', dangerHover: '#1f2937',
    },
    description: 'Minimalist grayscale for a sleek, professional look'
  },
];

const LOCAL_STORAGE_KEY_CUSTOM = 'crm_custom_themes';
const LOCAL_STORAGE_KEY_ACTIVE = 'crm_active_theme_id';
const LOCAL_STORAGE_KEY_MODE = 'crm_theme_mode';

// Helper to adjust color brightness
const adjustColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

const getCustomThemes = (): Theme[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse custom themes from localStorage", error);
    return [];
  }
};

export const getThemes = (): Theme[] => {
  return [...presetThemes, ...getCustomThemes()];
};

export const getThemeById = (id: string): Theme | undefined => {
  return getThemes().find(theme => theme.id === id);
}

export const getActiveTheme = (): Theme => {
  const activeId = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE) || 'default';
  return getThemeById(activeId) || presetThemes[0];
}

export const getThemeMode = (): 'light' | 'dark' => {
  return (localStorage.getItem(LOCAL_STORAGE_KEY_MODE) as 'light' | 'dark') || 'light';
}

export const toggleThemeMode = (): void => {
  const current = getThemeMode();
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(LOCAL_STORAGE_KEY_MODE, next);
  applyTheme(getActiveTheme().id);
}

export const applyTheme = (themeId: string): boolean => {
  const theme = getThemeById(themeId);
  if (!theme) {
    console.warn(`Theme with id "${themeId}" not found.`);
    return false;
  }

  const mode = getThemeMode();
  const root = document.documentElement;
  const styleElement = document.getElementById('theme-variables');

  // Calculate adjusted colors based on mode
  // User request: Light mode = lighter colors, Dark mode = darker colors
  const adjustment = mode === 'light' ? 20 : -20; // +20% for light, -20% for dark

  const colors = {
    primary: adjustColor(theme.colors.primary, adjustment),
    primaryHover: adjustColor(theme.colors.primaryHover, adjustment),
    success: adjustColor(theme.colors.success, adjustment),
    successHover: adjustColor(theme.colors.successHover, adjustment),
    warning: adjustColor(theme.colors.warning, adjustment),
    warningHover: adjustColor(theme.colors.warningHover, adjustment),
    danger: adjustColor(theme.colors.danger, adjustment),
    dangerHover: adjustColor(theme.colors.dangerHover, adjustment),
  };

  if (styleElement) {
    styleElement.innerHTML = `
      :root {
        --color-primary: ${colors.primary};
        --color-primary-hover: ${colors.primaryHover};
        --color-success: ${colors.success};
        --color-success-hover: ${colors.successHover};
        --color-warning: ${colors.warning};
        --color-warning-hover: ${colors.warningHover};
        --color-danger: ${colors.danger};
        --color-danger-hover: ${colors.dangerHover};
      }
    `;
  }

  // Manage dark mode class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE, themeId);
  return true;
};

export const saveCustomTheme = (theme: Theme): void => {
  let customThemes = getCustomThemes();
  const existingIndex = customThemes.findIndex(t => t.id === theme.id);

  if (existingIndex > -1) {
    customThemes[existingIndex] = theme;
  } else {
    customThemes.push(theme);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM, JSON.stringify(customThemes));
};