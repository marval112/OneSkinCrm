import React, { useEffect, useState, useContext } from 'react';
import { getGeminiApiKey, loadGeminiApiKey, setGeminiApiKey } from '../../services/aiSettingsService';
import { ToastContext } from '../../contexts/ToastContext';

function AISettings() {
  const [key, setKey] = useState('');
  const toast = useContext(ToastContext);
  useEffect(() => {
    const init = async () => {
      await loadGeminiApiKey();
      setKey(getGeminiApiKey() || '');
    };
    init();
  }, []);
  const save = async () => {
    const ok = await setGeminiApiKey(key);
    toast?.showToast(ok ? 'Gemini API key saved.' : 'Failed to save Gemini API key.', ok ? 'success' : 'danger');
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
      <h3 className="font-semibold mb-2">AI Settings</h3>
      <p className="text-sm text-slate-500 mb-3">Configure Google Gemini for AI features (lead scoring, insights, OCR).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gemini API Key</label>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="AIza..." className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <div className="text-right">
          <button onClick={save} className="px-4 py-2 rounded-md bg-primary text-white">Save</button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">La clave se guarda de forma centralizada en la base de datos (Supabase).</p>
    </div>
  );
}

export default AISettings;


