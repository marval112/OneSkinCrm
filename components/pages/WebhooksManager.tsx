

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getWebhooks, deleteWebhook, updateWebhook } from '../../services/webhookService';
import type { Webhook } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    type="button"
    className={`${
      enabled ? 'bg-primary' : 'bg-slate-300'
    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
    role="switch"
    aria-checked={enabled}
    onClick={onChange}
  >
    <span
      aria-hidden="true"
      className={`${
        enabled ? 'translate-x-5' : 'translate-x-0'
      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);


function WebhooksManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [hookToDelete, setHookToDelete] = useState<Webhook | null>(null);
  const toastContext = useContext(ToastContext);
  const [inboundUrl, setInboundUrl] = useState<string>('');
  const [inboundKey, setInboundKey] = useState<string>('');
  const [bucket, setBucket] = useState<string>('activities');

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (e) {
      toastContext?.showToast('Failed to load webhooks.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [toastContext]);

  useEffect(() => {
    fetchWebhooks();
    try {
      const saved = localStorage.getItem('inbound_settings');
      if (saved) {
        const s = JSON.parse(saved);
        setInboundUrl(s.url || '');
        setInboundKey(s.key || '');
        setBucket(s.bucket || 'activities');
      }
    } catch {}
  }, [fetchWebhooks]);

  const handleDelete = async () => {
    if (!hookToDelete) return;
    try {
        await deleteWebhook(hookToDelete.id);
        toastContext?.showToast('Webhook deleted.', 'success');
        setHookToDelete(null);
        fetchWebhooks();
    } catch (e) {
        toastContext?.showToast('Failed to delete webhook.', 'danger');
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    // Fix: Changed property from `isActive` to `active` to match the Webhook type.
    const updatedHook = { ...webhook, active: !webhook.active };
    try {
      await updateWebhook(updatedHook);
      setWebhooks(prev => prev.map(h => h.id === webhook.id ? updatedHook : h));
      // Fix: Changed property from `isActive` to `active` for correct toast message.
      toastContext?.showToast(`Webhook ${updatedHook.active ? 'enabled' : 'disabled'}.`, 'success');
    } catch {
       toastContext?.showToast(`Failed to update webhook.`, 'danger');
    }
  };

  const saveInboundSettings = () => {
    localStorage.setItem('inbound_settings', JSON.stringify({ url: inboundUrl.trim(), key: inboundKey.trim(), bucket: bucket.trim() }));
    toastContext?.showToast('Inbound settings saved.', 'success');
  };

  const testInbound = async () => {
    if (!inboundUrl.trim() || !inboundKey.trim()) {
      toastContext?.showToast('Set inbound URL and API key first.', 'warning');
      return;
    }
    try {
      const payload = {
        subject: 'Test inbound message',
        from: 'sender@example.com',
        to: ['you@example.com'],
        text: 'Hello! This is a test inbound message from OneSkin CRM.',
        attachments: [
          {
            filename: 'hello.txt',
            content_type: 'text/plain',
            base64: btoa('Hello from inbound test!')
          }
        ]
      };
      const resp = await fetch(inboundUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': inboundKey.trim() },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toastContext?.showToast('Inbound test sent. Check the timeline.', 'success');
    } catch (e: any) {
      toastContext?.showToast(`Inbound test failed: ${e?.message || 'Unknown error'}`, 'danger');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
       <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Webhooks & API Triggers</h2>
        <button className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors">
          Create Webhook
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">Use webhooks to send real-time data from OneSkin CRM to your other applications.</p>

      <div className="border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">Inbound Email Settings</h3>
        <p className="text-sm text-slate-500 mb-4">Configure your inbound email webhook to capture replies and attachments into the activity timeline.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Inbound URL</label>
            <input type="url" value={inboundUrl} onChange={e => setInboundUrl(e.target.value)} placeholder="https://your-app.vercel.app/api/inbound-email" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">API Key</label>
            <input type="password" value={inboundKey} onChange={e => setInboundKey(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Storage Bucket</label>
            <input type="text" value={bucket} onChange={e => setBucket(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={saveInboundSettings} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Save</button>
          <button onClick={testInbound} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Send Test</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Endpoint URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Events</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
             {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
             ) : webhooks.map(hook => (
              <tr key={hook.id}>
                <td className="px-6 py-4">
                    {/* Fix: Changed property from `isActive` to `active` for the ToggleSwitch component. */}
                    <ToggleSwitch enabled={hook.active} onChange={() => handleToggle(hook)} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono text-sm text-slate-800">{hook.url}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                        {hook.events.map(event => (
                            <span key={event} className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-md">{event}</span>
                        ))}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setHookToDelete(hook)} className="text-slate-500 hover:text-danger p-1" title="Delete"><TrashIcon className="h-5 w-5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       {hookToDelete && (
        <Modal title="Confirm Deletion" onClose={() => setHookToDelete(null)}>
            <div className="p-6">
                <p>Are you sure you want to delete the webhook for "<strong>{hookToDelete.url}</strong>"?</p>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => setHookToDelete(null)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">Delete</button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
}

export default WebhooksManager;