
import React, { useState, useEffect, useContext, useRef } from 'react';
import { getThemes, applyTheme, saveCustomTheme, getActiveTheme } from '../../services/themeService';
import type { Theme, ThemeColors } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { getBrandName, getBrandLogoUrl, getSidebarLogoUrl, setBrandName, setBrandLogoUrl, setSidebarLogoUrl, resetBranding, setBrandLogoDataUrl, setSidebarLogoDataUrl, clearUploadedLogo, clearUploadedSidebarLogo } from '../../services/brandingService';
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
  const [sidebarLogoUrl, setSidebarLogoUrlState] = useState<string>(getSidebarLogoUrl());
  const [isCropOpen, setIsCropOpen] = useState<boolean>(false);
  const [isSidebarCropOpen, setIsSidebarCropOpen] = useState<boolean>(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sidebarPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
    if (url.startsWith('data:')) return true; // allow data URLs
    try { new URL(url, window.location.origin); return true; } catch { return false; }
  };

  const handleSaveBranding = () => {
    if (!brandName.trim()) {
      toastContext?.showToast('Brand name cannot be empty.', 'warning');
      return;
    }
    if (!isValidUrl(brandLogoUrl)) {
      toastContext?.showToast('Main logo URL is not valid.', 'warning');
      return;
    }
    if (!isValidUrl(sidebarLogoUrl)) {
      toastContext?.showToast('Sidebar logo URL is not valid.', 'warning');
      return;
    }
    setBrandName(brandName.trim());
    setBrandLogoUrl(brandLogoUrl.trim());
    setSidebarLogoUrl(sidebarLogoUrl.trim());
    toastContext?.showToast('Branding saved successfully.', 'success');
  };

  const handleResetBranding = () => {
    resetBranding();
    setBrandNameState(getBrandName());
    setBrandLogoUrlState(getBrandLogoUrl());
    setSidebarLogoUrlState(getSidebarLogoUrl());
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

  const handleSidebarLogoFileChange = async (file?: File | null) => {
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
        setIsSidebarCropOpen(true);
        // Prepare image for drawing
        const img = new Image();
        img.onload = () => {
          loadedImageRef.current = img;
          drawSidebarCropPreview();
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

    // Clear background (transparent)
    ctx.clearRect(0, 0, targetSize, targetSize);

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

  const drawSidebarCropPreview = () => {
    const canvas = sidebarPreviewCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate aspect ratio and set canvas size to match image
    // Max dimension 300px to keep it manageable in the UI
    const MAX_DIM = 300;
    const aspect = img.naturalWidth / img.naturalHeight;

    let targetWidth = MAX_DIM;
    let targetHeight = MAX_DIM;

    if (aspect > 1) {
      // Landscape
      targetWidth = MAX_DIM;
      targetHeight = MAX_DIM / aspect;
    } else {
      // Portrait or Square
      targetHeight = MAX_DIM;
      targetWidth = MAX_DIM * aspect;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear background (transparent)
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Calculate scaling
    // Base scale 1 means image fits perfectly in canvas
    const scaledWidth = targetWidth * cropZoom;
    const scaledHeight = targetHeight * cropZoom;

    // Center position
    const centerDx = (targetWidth - scaledWidth) / 2;
    const centerDy = (targetHeight - scaledHeight) / 2;

    // Calculate overflow for panning
    const overflowX = Math.max(0, scaledWidth - targetWidth);
    const overflowY = Math.max(0, scaledHeight - targetHeight);

    // Apply offset based on overflow
    const dx = centerDx - (overflowX / 2) * cropOffsetX;
    const dy = centerDy - (overflowY / 2) * cropOffsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high' as any;
    ctx.drawImage(img, dx, dy, scaledWidth, scaledHeight);

    // Optional crop frame overlay
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.strokeRect(0, 0, targetWidth, targetHeight);
  };

  useEffect(() => {
    if (isCropOpen) {
      drawCropPreview();
    }
    if (isSidebarCropOpen) {
      drawSidebarCropPreview();
    }
  }, [cropZoom, cropOffsetX, cropOffsetY, isCropOpen, isSidebarCropOpen]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Theme Presets</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose a pre-designed color scheme for your CRM. Click any theme to apply it instantly.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map(theme => (
            <div
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`group relative p-5 rounded-xl cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${activeThemeId === theme.id
                ? 'border-primary bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
            >
              {/* Active indicator */}
              {activeThemeId === theme.id && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Theme name */}
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">{theme.name}</h3>

              {/* Description */}
              {theme.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{theme.description}</p>
              )}

              {/* Color preview */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex gap-1.5">
                  <div
                    className="w-8 h-8 rounded-md shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Primary"
                  ></div>
                  <div
                    className="w-8 h-8 rounded-md shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    style={{ backgroundColor: theme.colors.success }}
                    title="Success"
                  ></div>
                  <div
                    className="w-8 h-8 rounded-md shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    style={{ backgroundColor: theme.colors.warning }}
                    title="Warning"
                  ></div>
                  <div
                    className="w-8 h-8 rounded-md shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    style={{ backgroundColor: theme.colors.danger }}
                    title="Danger"
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Custom Theme Creator</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Create your own unique color scheme. Adjust the colors below and see changes in real-time. Don't forget to save your custom theme!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <ColorInput label="Primary Color" value={customColors.primary} onChange={v => handleColorChange('primary', v)} />
          <ColorInput label="Primary Hover" value={customColors.primaryHover} onChange={v => handleColorChange('primaryHover', v)} />
          <ColorInput label="Success Color" value={customColors.success} onChange={v => handleColorChange('success', v)} />
          <ColorInput label="Success Hover" value={customColors.successHover} onChange={v => handleColorChange('successHover', v)} />
          <ColorInput label="Warning Color" value={customColors.warning} onChange={v => handleColorChange('warning', v)} />
          <ColorInput label="Warning Hover" value={customColors.warningHover} onChange={v => handleColorChange('warningHover', v)} />
          <ColorInput label="Danger Color" value={customColors.danger} onChange={v => handleColorChange('danger', v)} />
          <ColorInput label="Danger Hover" value={customColors.dangerHover} onChange={v => handleColorChange('dangerHover', v)} />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Changes preview instantly. Click "Save" to keep your custom theme.
          </p>
          <button
            onClick={handleSaveChanges}
            className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors shadow-sm"
          >
            Save Custom Theme
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Branding</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Configure company name and logos. You can set different logos for the sidebar and main header/PDFs.</p>

        {/* Company Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandNameState(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            placeholder="Your company"
          />
        </div>

        {/* Logos Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Logo */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Main Logo (Header & PDFs)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={brandLogoUrl.startsWith('data:') ? '' : brandLogoUrl}
                  onChange={e => setBrandLogoUrlState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder={brandLogoUrl.startsWith('data:') ? "(Image uploaded - Clear to use URL)" : "/dashboard/logo.png or https://..."}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Relative or absolute URL</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Upload Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoFileChange(e.target.files?.[0])}
                  className="block w-full text-xs text-slate-700 dark:text-slate-200 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <button
                onClick={() => { clearUploadedLogo(); setBrandLogoUrlState(getBrandLogoUrl()); }}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 text-xs"
              >
                Remove uploaded logo
              </button>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Preview</p>
                <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-slate-50 dark:bg-slate-900">
                  <img src={brandLogoUrl || '/dashboard/logo.png'} alt="Main logo preview" className="h-10 w-auto object-contain" onError={({ currentTarget }) => { currentTarget.src = '/dashboard/logo.png'; }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Logo */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Sidebar Logo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sidebar Logo URL</label>
                <input
                  type="text"
                  value={sidebarLogoUrl.startsWith('data:') ? '' : sidebarLogoUrl}
                  onChange={e => setSidebarLogoUrlState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder={sidebarLogoUrl.startsWith('data:') ? "(Image uploaded - Clear to use URL)" : "/dashboard/sidebar-logo.png or https://..."}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Falls back to main logo if empty</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Upload Sidebar Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleSidebarLogoFileChange(e.target.files?.[0])}
                  className="block w-full text-xs text-slate-700 dark:text-slate-200 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <button
                onClick={() => { clearUploadedSidebarLogo(); setSidebarLogoUrlState(getSidebarLogoUrl()); }}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 text-xs"
              >
                Remove uploaded logo
              </button>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Preview</p>
                <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-gradient-to-br from-primary/90 to-primary">
                  <img src={sidebarLogoUrl || brandLogoUrl || '/dashboard/logo.png'} alt="Sidebar logo preview" className="h-10 w-auto object-contain" onError={({ currentTarget }) => { currentTarget.src = '/dashboard/logo.png'; }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleResetBranding} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">Reset</button>
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

      {isSidebarCropOpen && (
        <Modal title="Crop Sidebar Logo" onClose={() => setIsSidebarCropOpen(false)}>
          <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <canvas ref={sidebarPreviewCanvasRef} className="border rounded-md bg-white" width={256} height={256} />
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
              <button onClick={() => setIsSidebarCropOpen(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
              <button onClick={() => {
                try {
                  const canvas = sidebarPreviewCanvasRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL('image/png');
                  setSidebarLogoDataUrl(dataUrl);
                  setSidebarLogoUrlState(getSidebarLogoUrl());
                  setIsSidebarCropOpen(false);
                  toastContext?.showToast('Cropped sidebar logo saved.', 'success');
                } catch (e) {
                  toastContext?.showToast('Failed to save cropped sidebar logo.', 'danger');
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