

import React, { useState, useEffect, useContext } from 'react';
import { getThemes, applyTheme, saveCustomTheme, getActiveTheme } from '../../services/themeService';
import type { Theme, ThemeColors } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <div className="mt-1 flex items-center gap-2">
      <input 
        type="color" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-10 p-1 border-none rounded-md cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      />
    </div>
  </div>
);

function ThemeCustomizer() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState('default');
  const [customColors, setCustomColors] = useState<ThemeColors>(getActiveTheme().colors);
  const toastContext = useContext(ToastContext);

  useEffect(() => {
    const allThemes = getThemes();
    const activeTheme = getActiveTheme();
    setThemes(allThemes);
    setActiveThemeId(activeTheme.id);
    if (activeTheme.id.startsWith('custom-')) {
        setCustomColors(activeTheme.colors);
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    applyTheme(themeId);
    setActiveThemeId(themeId);
    const selectedTheme = themes.find(t => t.id === themeId);
    if (selectedTheme && selectedTheme.id.startsWith('custom-')) {
        setCustomColors(selectedTheme.colors);
    }
    toastContext?.showToast(`Theme "${selectedTheme?.name}" applied.`, 'success');
  };

  const handleColorChange = (colorName: keyof ThemeColors, value: string) => {
    const newColors = { ...customColors, [colorName]: value };
    setCustomColors(newColors);
    
    // Live preview
    const liveTheme: Theme = {
        id: 'live-preview',
        name: 'Live Preview',
        colors: newColors
    };
    const styleElement = document.getElementById('theme-variables');
    if (styleElement) {
        styleElement.innerHTML = `
          :root {
            --color-primary: ${liveTheme.colors.primary};
            --color-primary-hover: ${liveTheme.colors.primaryHover};
            --color-success: ${liveTheme.colors.success};
            --color-success-hover: ${liveTheme.colors.successHover};
            --color-warning: ${liveTheme.colors.warning};
            --color-warning-hover: ${liveTheme.colors.warningHover};
            --color-danger: ${liveTheme.colors.danger};
            --color-danger-hover: ${liveTheme.colors.dangerHover};
          }
        `;
    }
    setActiveThemeId('custom');
  };
  
  const handleSaveChanges = () => {
    const customTheme: Theme = {
        id: `custom-${Date.now()}`,
        name: 'My Custom Theme',
        colors: customColors,
    };
    saveCustomTheme(customTheme);
    applyTheme(customTheme.id);
    setActiveThemeId(customTheme.id);
    setThemes(getThemes()); // Refresh themes list
    toastContext?.showToast('Custom theme saved and applied!', 'success');
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Theme Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {themes.map(theme => (
            <div key={theme.id} onClick={() => handleThemeChange(theme.id)} className={`p-4 rounded-lg cursor-pointer border-2 ${activeThemeId === theme.id ? 'border-primary' : 'border-transparent'}`}>
              <div className="flex space-x-2">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.colors.success }}></div>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.colors.danger }}></div>
              </div>
              <p className="mt-2 text-sm font-medium text-center">{theme.name}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
         <h2 className="text-xl font-semibold mb-4">Customizer</h2>
         <p className="text-sm text-slate-500 mb-6">Select a preset above or create your own theme here. Changes are previewed live.</p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <ColorInput label="Primary" value={customColors.primary} onChange={v => handleColorChange('primary', v)} />
            <ColorInput label="Primary (Hover)" value={customColors.primaryHover} onChange={v => handleColorChange('primaryHover', v)} />
            <ColorInput label="Success" value={customColors.success} onChange={v => handleColorChange('success', v)} />
            <ColorInput label="Success (Hover)" value={customColors.successHover} onChange={v => handleColorChange('successHover', v)} />
            <ColorInput label="Warning" value={customColors.warning} onChange={v => handleColorChange('warning', v)} />
            <ColorInput label="Warning (Hover)" value={customColors.warningHover} onChange={v => handleColorChange('warningHover', v)} />
            <ColorInput label="Danger" value={customColors.danger} onChange={v => handleColorChange('danger', v)} />
            <ColorInput label="Danger (Hover)" value={customColors.dangerHover} onChange={v => handleColorChange('dangerHover', v)} />
         </div>
         <div className="mt-6 text-right">
            <button
              onClick={handleSaveChanges}
              className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors"
            >
              Save Custom Theme
            </button>
         </div>
      </div>
    </div>
  );
}

export default ThemeCustomizer;