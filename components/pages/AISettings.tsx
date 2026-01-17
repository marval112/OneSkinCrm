import React, { useEffect, useState, useContext } from 'react';
import { getGeminiApiKey, loadGeminiApiKey, setGeminiApiKey } from '../../services/aiSettingsService';
import { useTranslation } from '../../services/i18nService';
import { ToastContext } from '../../contexts/ToastContext';

function AISettings() {
  const [key, setKey] = useState('');
  const [forceOpenRouter, setForceOpenRouter] = useState(false);
  const toast = useContext(ToastContext);

  const { language } = useTranslation();

  useEffect(() => {
    const init = async () => {
      await loadGeminiApiKey();
      setKey(getGeminiApiKey() || '');
      setForceOpenRouter(localStorage.getItem('oneskin_force_openrouter') === 'true');
    };
    init();
  }, []);

  const save = async () => {
    console.log('[AISettings] Saving configuration...', { forceOpenRouter });
    const ok = await setGeminiApiKey(key);
    localStorage.setItem('oneskin_force_openrouter', forceOpenRouter.toString());
    console.log('[AISettings] localStorage updated:', localStorage.getItem('oneskin_force_openrouter'));

    toast?.showToast(
      language === 'es' ? 'Configuración de IA guardada.' : 'AI settings saved.',
      ok ? 'success' : 'danger'
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
      <h3 className="font-semibold mb-2">{language === 'es' ? 'Configuración de IA' : 'AI Settings'}</h3>
      <p className="text-sm text-slate-500 mb-4">{language === 'es' ? 'Configura Google Gemini para funciones inteligentes (puntuación de leads, insights, OCR).' : 'Configure Google Gemini for AI features (lead scoring, insights, OCR).'}</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gemini API Key</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="AIza..."
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
          <div className="flex items-center h-5">
            <input
              id="force-openrouter"
              type="checkbox"
              checked={forceOpenRouter}
              onChange={e => setForceOpenRouter(e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
            />
          </div>
          <div className="ml-2 text-sm">
            <label htmlFor="force-openrouter" className="font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              {language === 'es' ? 'Forzar OpenRouter (Modo Manual)' : 'Force OpenRouter (Manual Mode)'}
            </label>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {language === 'es'
                ? 'Ignora Gemini y usa modelos de OpenRouter. Nota: La función de VOZ dejará de funcionar.'
                : 'Bypass Gemini and use OpenRouter models. Note: VOICE features will stop working.'}
            </p>
          </div>
        </div>

        <div className="text-right pt-2">
          <button onClick={save} className="px-6 py-2 rounded-md bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-sm">
            {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
        {language === 'es' ? 'La clave se guarda de forma segura en la base de datos.' : 'The key is securely stored in the database.'}
      </p>
    </div>
  );
}

export default AISettings;


