import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { setGeminiApiKey, getGeminiApiKey, loadGeminiApiKey } from '../../services/aiSettingsService';
import { ToastContext } from '../../contexts/ToastContext';

function Settings() {
  const navigate = useNavigate();
  const [geminiKey, setKey] = useState('');
  const toast = useContext(ToastContext);

  useEffect(() => {
    const init = async () => {
      await loadGeminiApiKey();
      setKey(getGeminiApiKey() || '');
    };
    init();
  }, []);

  const saveAI = async () => {
    const ok = await setGeminiApiKey(geminiKey);
    toast?.showToast(ok ? 'Gemini API key saved.' : 'Failed to save Gemini API key.', ok ? 'success' : 'danger');
  };

  const Card = ({ title, description, onClick }: { title: string; description: string; onClick: () => void }) => (
    <button onClick={onClick} className="text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 hover:shadow transition">
      <div className="text-lg font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
    </button>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Settings</h2>
        <p className="text-sm text-slate-500">Admin-only configuration hub for OneSkin CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Theme" description="Colors and appearance" onClick={() => navigate('/settings/theme')} />
        <Card title="Reports" description="Scheduled reports and delivery" onClick={() => navigate('/settings/reports')} />
        <Card title="Integrations" description="Connect third-party services" onClick={() => navigate('/settings/integrations')} />
        <Card title="Webhooks" description="Outbound and inbound webhooks" onClick={() => navigate('/settings/webhooks')} />
        <Card title="Documentation" description="Guides and references" onClick={() => navigate('/settings/documentation')} />
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="font-semibold mb-2">AI Settings</h3>
        <p className="text-sm text-slate-500 mb-3">Configure Google Gemini for AI features (lead scoring, insights, OCR).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gemini API Key</label>
            <input type="password" value={geminiKey} onChange={e => setKey(e.target.value)} placeholder="AIza..." className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="text-right">
            <button onClick={saveAI} className="px-4 py-2 rounded-md bg-primary text-white">Save</button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">La clave se guarda de forma centralizada en la base de datos (Supabase).</p>
      </div>
    </div>
  );
}

export default Settings;


