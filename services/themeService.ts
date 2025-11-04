
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
  { id: 'default', name: 'Default Light', colors: defaultColors },
  { id: 'dark', name: 'Cool Dark', colors: darkColors },
];

const LOCAL_STORAGE_KEY_CUSTOM = 'crm_custom_themes';
const LOCAL_STORAGE_KEY_ACTIVE = 'crm_active_theme_id';

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

export const applyTheme = (themeId: string): boolean => {
  const theme = getThemeById(themeId);
  if (!theme) {
    console.warn(`Theme with id "${themeId}" not found.`);
    return false;
  }

  const root = document.documentElement;
  const styleElement = document.getElementById('theme-variables');

  if (styleElement) {
    styleElement.innerHTML = `
      :root {
        --color-primary: ${theme.colors.primary};
        --color-primary-hover: ${theme.colors.primaryHover};
        --color-success: ${theme.colors.success};
        --color-success-hover: ${theme.colors.successHover};
        --color-warning: ${theme.colors.warning};
        --color-warning-hover: ${theme.colors.warningHover};
        --color-danger: ${theme.colors.danger};
        --color-danger-hover: ${theme.colors.dangerHover};
      }
    `;
  }
  
  // Manage dark mode class
  if (theme.id === 'dark') {
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