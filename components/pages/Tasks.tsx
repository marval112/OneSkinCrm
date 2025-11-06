import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { listTasksForUser, completeTask } from '../../services/tasksService';
import type { Task } from '../../types';
import { useTranslation } from '../../services/i18nService';
import { prioritizeTasks } from '../../services/geminiService';
import { getLeads, getCustomers } from '../../services/crmService';

function Tasks() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [aiOrdering, setAiOrdering] = useState<number[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [groupByType, setGroupByType] = useState(false);
  const [agenda, setAgenda] = useState<{ id:number; start:string }[] | null>(null);
  const [leadNames, setLeadNames] = useState<Record<number, string>>({});
  const [customerNames, setCustomerNames] = useState<Record<number, string>>({});

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try { setTasks(await listTasksForUser(user.id, !showCompleted)); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [showCompleted, user]);

  // Load display names for related leads/customers
  useEffect(() => {
    if (!user || tasks.length === 0) { setLeadNames({}); setCustomerNames({}); return; }
    const leadIds = Array.from(new Set(tasks.map(t => t.lead_id).filter((v): v is number => typeof v === 'number')));
    const customerIds = Array.from(new Set(tasks.map(t => t.customer_id).filter((v): v is number => typeof v === 'number')));
    if (leadIds.length === 0 && customerIds.length === 0) { setLeadNames({}); setCustomerNames({}); return; }
    (async () => {
      try {
        const [allLeads, allCustomers] = await Promise.all([getLeads(user), getCustomers(user)]);
        const ln: Record<number, string> = {};
        const cn: Record<number, string> = {};
        if (leadIds.length > 0) {
          for (const l of allLeads) { if (leadIds.includes(l.id)) ln[l.id] = l.name; }
        }
        if (customerIds.length > 0) {
          for (const c of allCustomers) { if (customerIds.includes(c.id)) cn[c.id] = c.name; }
        }
        setLeadNames(ln);
        setCustomerNames(cn);
      } catch (e) {
        // non-blocking; keep IDs as fallback
      }
    })();
  }, [tasks, user]);

  // Browser notifications for today's and overdue tasks
  useEffect(() => {
    if (!('Notification' in window)) return; // not supported
    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdue = tasks.filter(t => t.status === 'Pending' && t.due_date && new Date(t.due_date) < startToday);
    const today = tasks.filter(t => t.status === 'Pending' && t.due_date && new Date(t.due_date) >= startToday && new Date(t.due_date) <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

    const key = 'tasks_notify_snapshot';
    const snapshot = { d: startToday.toDateString(), overdue: overdue.length, today: today.length };
    try {
      const prev = JSON.parse(localStorage.getItem(key) || 'null');
      const changed = !prev || prev.d !== snapshot.d || prev.overdue !== snapshot.overdue || prev.today !== snapshot.today;
      if (changed && Notification.permission === 'granted') {
        const parts: string[] = [];
        if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
        if (today.length > 0) parts.push(`${today.length} for today`);
        if (parts.length > 0) {
          const n = new Notification('My Tasks', { body: parts.join(' • ') });
          setTimeout(() => n.close && n.close(), 5000);
        }
      }
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }, [loading, tasks]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const passRange = (t: Task) => {
      if (!t.due_date) return rangeFilter === 'all';
      const due = new Date(t.due_date);
      switch (rangeFilter) {
        case 'overdue': return t.status === 'Pending' && due < startToday;
        case 'today': return due >= startToday && due <= endToday;
        case 'upcoming': return due > endToday;
        default: return true;
      }
    };
    const base = tasks
      .filter(t => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter(passRange);
    if (aiOrdering && aiOrdering.length > 0) {
      const orderMap = new Map(aiOrdering.map((id, idx) => [id, idx]));
      return [...base].sort((a,b)=> (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
    }
    return base;
  }, [tasks, typeFilter, rangeFilter, aiOrdering]);

  const renderLeadCustomer = (task: Task) => {
    if (task.lead_id) return `${t('tasks.ui.lead')} • ${leadNames[task.lead_id] || '#' + task.lead_id}`;
    if (task.customer_id) return `${t('tasks.ui.customer')} • ${customerNames[task.customer_id] || '#' + task.customer_id}`;
    return '';
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold">{t('tasks.title')}</h2>
        <div className="flex items-center gap-2">
          <button disabled={aiLoading || !user} onClick={async ()=>{ setAiLoading(true); try { const ids = await prioritizeTasks(tasks.map(t=>({ id:t.id, type:t.type, due_date:t.due_date as any, title:t.title as any }))); setAiOrdering(ids); } finally { setAiLoading(false);} }} className="px-3 py-1 text-sm bg-primary text-white rounded-md">
            {aiLoading ? '...' : t('tasks.ui.prioritizeWithAi')}
          </button>
          {aiOrdering && (<button onClick={()=> setAiOrdering(null)} className="px-3 py-1 text-sm border rounded-md">{t('tasks.ui.resetOrder')}</button>)}
          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
            <button onClick={() => setRangeFilter('all')} className={`px-3 py-1 text-sm ${rangeFilter==='all'?'bg-primary text-white':'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.all')}</button>
            <button onClick={() => setRangeFilter('overdue')} className={`px-3 py-1 text-sm ${rangeFilter==='overdue'?'bg-primary text-white':'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.overdue')}</button>
            <button onClick={() => setRangeFilter('today')} className={`px-3 py-1 text-sm ${rangeFilter==='today'?'bg-primary text-white':'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.today')}</button>
            <button onClick={() => setRangeFilter('upcoming')} className={`px-3 py-1 text-sm ${rangeFilter==='upcoming'?'bg-primary text-white':'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.upcoming')}</button>
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600">
            <option value="all">{t('tasks.ui.allTypes')}</option>
            <option value="Follow Up Call">{t('tasks.types.followUpCall')}</option>
            <option value="Send Information">{t('tasks.types.sendInformation')}</option>
            <option value="Send Samples">{t('tasks.types.sendSamples')}</option>
            <option value="Send Quotation">{t('tasks.types.sendQuotation')}</option>
            <option value="Schedule Visit">{t('tasks.types.scheduleVisit')}</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /> {t('tasks.ui.showCompleted')}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : groupByType ? (
        <div className="space-y-6">
          {['Follow Up Call','Send Information','Send Samples','Send Quotation','Schedule Visit'].map(type => {
            const items = filtered.filter(task => task.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <h4 className="text-sm font-semibold mb-2">{type}</h4>
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {items.map(task => {
                      const badge = task.status === 'Completed' ? 'text-green-700 bg-green-100' : (task.due_date && new Date(task.due_date) < new Date() ? 'text-red-700 bg-red-100' : 'text-slate-700 bg-slate-100');
                      return (
                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-3 text-sm w-2/3">{task.title || type} {task.lead_id || task.customer_id ? `• ${renderLeadCustomer(task)}` : ''}</td>
                          <td className="px-6 py-3 text-sm w-1/3 text-right">{task.due_date ? (<span className={`px-2 py-0.5 rounded ${badge}`}>{new Date(task.due_date).toLocaleString()}</span>) : '-'}</td>
                          <td className="px-6 py-3 text-right text-sm">
                            {task.status !== 'Completed' ? (
                              <button onClick={async () => { await completeTask(task.id); refresh(); }} className="px-3 py-1 bg-success text-white rounded-md">{t('tasks.ui.complete')}</button>
                            ) : (
                              <span className="px-2 py-1 text-green-700 bg-green-100 rounded-md">{t('tasks.ui.completed')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('tasks.ui.type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('tasks.ui.leadCustomer')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('tasks.ui.due')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('tasks.ui.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.length === 0 && (
              <tr><td className="px-6 py-4 text-slate-500" colSpan={4}>{t('tasks.ui.noTasks')}</td></tr>
            )}
            {filtered.map(task => {
              const badge = task.status === 'Completed' ? 'text-green-700 bg-green-100' : (task.due_date && new Date(task.due_date) < new Date() ? 'text-red-700 bg-red-100' : 'text-slate-700 bg-slate-100');
              return (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-3 text-sm">{
                    task.type === 'Follow Up Call' ? t('tasks.types.followUpCall') :
                    task.type === 'Send Information' ? t('tasks.types.sendInformation') :
                    task.type === 'Send Samples' ? t('tasks.types.sendSamples') :
                    task.type === 'Send Quotation' ? t('tasks.types.sendQuotation') :
                    t('tasks.types.scheduleVisit')
                  }</td>
                  <td className="px-6 py-3 text-sm">{renderLeadCustomer(task)}</td>
                  <td className="px-6 py-3 text-sm">
                    {task.due_date ? (
                      <span className={`px-2 py-0.5 rounded ${badge}`}>{new Date(task.due_date).toLocaleString()}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-sm">
                    {task.status !== 'Completed' ? (
                      <button onClick={async () => { await completeTask(task.id); refresh(); }} className="px-3 py-1 bg-success text-white rounded-md">{t('tasks.ui.complete')}</button>
                    ) : (
                      <span className="px-2 py-1 text-green-700 bg-green-100 rounded-md">{t('tasks.ui.completed')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {/* Controls row */}
      <div className="mt-4 flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={groupByType} onChange={e=> setGroupByType(e.target.checked)} /> {t('tasks.ui.groupByType')}
        </label>
        <button disabled={aiLoading || !user} onClick={async ()=>{ setAiLoading(true); try{ const items = await prioritizeTasks(tasks.map(t=>({ id:t.id, type:t.type, due_date:t.due_date as any, title:t.title as any }))); const agendaResp = await (await import('../../services/geminiService')).proposeAgenda(tasks.map(t=>({ id:t.id, type:t.type, due_date:t.due_date as any, title:t.title as any }))); setAiOrdering(items); setAgenda(agendaResp); } finally { setAiLoading(false);} }} className="px-3 py-1 text-sm bg-slate-700 text-white rounded-md">
          {aiLoading ? '...' : t('tasks.ui.proposeAgenda')}
        </button>
      </div>
      {agenda && agenda.length>0 && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded border border-slate-200 dark:border-slate-600">
          <div className="text-sm font-semibold mb-2">{t('tasks.ui.proposedAgenda')}</div>
          <ul className="text-sm list-disc pl-5">
            {agenda.map(a => {
              const task = tasks.find(t=> t.id === a.id);
              if (!task) return null;
              return <li key={a.id}>{a.start} • {task.type}{task.title?`: ${task.title}`:''}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Tasks;


