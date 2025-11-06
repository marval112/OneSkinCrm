

import React, { useState, useEffect, useContext, useRef } from 'react';
import { getThemes, applyTheme, saveCustomTheme, getActiveTheme } from '../../services/themeService';
import type { Theme, ThemeColors } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { getBrandName, getBrandLogoUrl, setBrandName, setBrandLogoUrl, resetBranding, setBrandLogoDataUrl, clearUploadedLogo } from '../../services/brandingService';
import Modal from '../common/Modal';

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
  const [brandName, setBrandNameState] = useState<string>(getBrandName());
  const [brandLogoUrl, setBrandLogoUrlState] = useState<string>(getBrandLogoUrl());
  const [isCropOpen, setIsCropOpen] = useState<boolean>(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
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

  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // allow empty to reset default
    try { new URL(url, window.location.origin); return true; } catch { return false; }
  };

  const handleSaveBranding = () => {
    if (!brandName.trim()) {
      toastContext?.showToast('Brand name cannot be empty.', 'warning');
      return;
    }
    if (!isValidUrl(brandLogoUrl)) {
      toastContext?.showToast('Logo URL is not valid.', 'warning');
      return;
    }
    setBrandName(brandName.trim());
    setBrandLogoUrl(brandLogoUrl.trim());
    toastContext?.showToast('Branding saved.', 'success');
  };

  const handleResetBranding = () => {
    resetBranding();
    setBrandNameState(getBrandName());
    setBrandLogoUrlState(getBrandLogoUrl());
    toastContext?.showToast('Branding reset to defaults.', 'info');
  };

  const MAX_IMAGE_BYTES = 512 * 1024; // 512 KB
  const handleLogoFileChange = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastContext?.showToast('Please select an image file.', 'warning');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toastContext?.showToast('Image too large (max 512KB).', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = String(reader.result || '');
        setCropSrc(dataUrl);
        setCropZoom(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
        setIsCropOpen(true);
        // Prepare image for drawing
        const img = new Image();
        img.onload = () => {
          loadedImageRef.current = img;
          drawCropPreview();
        };
        img.src = dataUrl;
      } catch (e) {
        toastContext?.showToast('Failed to open image.', 'danger');
      }
    };
    reader.onerror = () => {
      toastContext?.showToast('Failed to read the image file.', 'danger');
    };
    reader.readAsDataURL(file);
  };

  const drawCropPreview = () => {
    const canvas = previewCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetSize = 256;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetSize, targetSize);

    const baseScale = Math.max(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
    const scale = baseScale * cropZoom;
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    // Centered position plus offset based on remaining overflow
    const overflowX = Math.max(0, scaledWidth - targetSize);
    const overflowY = Math.max(0, scaledHeight - targetSize);
    const centerDx = (targetSize - scaledWidth) / 2;
    const centerDy = (targetSize - scaledHeight) / 2;
    const dx = centerDx - (overflowX / 2) * cropOffsetX;
    const dy = centerDy - (overflowY / 2) * cropOffsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high' as any;
    ctx.drawImage(img, dx, dy, scaledWidth, scaledHeight);
    // Optional crop frame overlay
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.strokeRect(0, 0, targetSize, targetSize);
  };

  useEffect(() => { drawCropPreview(); }, [cropZoom, cropOffsetX, cropOffsetY]);

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

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Branding</h2>
        <p className="text-sm text-slate-500 mb-6">Configure company name and logo used in headers, PDFs y el sidebar.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company name</label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandNameState(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="Your company"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Logo URL</label>
            <input
              type="url"
              value={brandLogoUrl}
              onChange={e => setBrandLogoUrlState(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="/dashboard/logo.png or https://..."
            />
            <p className="text-xs text-slate-500 mt-1">Se admite URL relativa o absoluta.</p>
            <div className="mt-3 flex items-center gap-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Upload logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleLogoFileChange(e.target.files?.[0])}
                className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { clearUploadedLogo(); setBrandLogoUrlState(getBrandLogoUrl()); }} className="px-3 py-1.5 bg-slate-200 rounded-md hover:bg-slate-300 text-sm">Remove uploaded logo</button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Preview</label>
          <div className="flex items-center gap-3 border rounded-md p-3">
            <img src={brandLogoUrl || '/dashboard/logo.png'} alt="Logo preview" className="h-10 w-auto object-contain" onError={({ currentTarget }) => { currentTarget.src = '/dashboard/logo.png'; }} />
            <span className="text-slate-700 dark:text-slate-200 font-medium">{brandName || 'OneSkin CRM'}</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleResetBranding} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Reset</button>
          <button onClick={handleSaveBranding} className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover">Save Branding</button>
        </div>
      </div>

      {isCropOpen && (
        <Modal title="Crop Logo" onClose={() => setIsCropOpen(false)}>
          <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <canvas ref={previewCanvasRef} className="border rounded-md bg-white" width={256} height={256} />
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Zoom</label>
                  <input type="range" min={1} max={3} step={0.01} value={cropZoom} onChange={e => setCropZoom(parseFloat(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Horizontal position</label>
                  <input type="range" min={-1} max={1} step={0.01} value={cropOffsetX} onChange={e => setCropOffsetX(parseFloat(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vertical position</label>
                  <input type="range" min={-1} max={1} step={0.01} value={cropOffsetY} onChange={e => setCropOffsetY(parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCropOpen(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
              <button onClick={() => {
                try {
                  const canvas = previewCanvasRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL('image/png');
                  setBrandLogoDataUrl(dataUrl);
                  setBrandLogoUrlState(getBrandLogoUrl());
                  setIsCropOpen(false);
                  toastContext?.showToast('Cropped logo saved.', 'success');
                } catch (e) {
                  toastContext?.showToast('Failed to save cropped logo.', 'danger');
                }
              }} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ThemeCustomizer;