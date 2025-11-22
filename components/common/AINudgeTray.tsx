import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Nudge { leadId: number; name: string; message: string; id: string; }

export default function AINudgeTray() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce.detail || {};
      const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      setNudges(prev => [{ id, leadId: detail.leadId, name: detail.name, message: detail.message }, ...prev].slice(0,3));
    };
    window.addEventListener('ai:nudge', handler as EventListener);
    return () => window.removeEventListener('ai:nudge', handler as EventListener);
  }, []);

  if (nudges.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-3">
      {nudges.map(n => (
        <div key={n.id} className="w-80 bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="text-xs text-slate-500">AI Nurture</div>
          <div className="text-sm font-semibold mt-1">{n.name}</div>
          <div className="text-sm mt-1 text-slate-700 dark:text-slate-300">{n.message}</div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setNudges(prev => prev.filter(x => x.id !== n.id))} className="px-2 py-1 text-sm border rounded-md">Dismiss</button>
            <button onClick={() => { navigate('/alerts'); setNudges(prev => prev.filter(x => x.id !== n.id)); }} className="px-2 py-1 text-sm bg-primary text-white rounded-md">View Alerts</button>
          </div>
        </div>
      ))}
    </div>
  );
}


