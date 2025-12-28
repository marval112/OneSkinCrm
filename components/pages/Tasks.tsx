import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { listTasksForUser, completeTask, createTask, updateTask, deleteTask, toggleTaskTimer } from '../../services/tasksService';
import type { Task, Lead, Customer, User } from '../../types';
import { getUsers } from '../../services/userService';
import { TaskType, TaskStatus } from '../../types';
import { useTranslation } from '../../services/i18nService';
import { prioritizeTasks } from '../../services/geminiService';
import { getLeads, getCustomers } from '../../services/crmService';
import Modal from '../common/Modal';
import TaskCalendar from '../common/TaskCalendar';

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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [agenda, setAgenda] = useState<{ id: number; start: string }[] | null>(null);
  const [leadNames, setLeadNames] = useState<Record<number, string>>({});
  const [customerNames, setCustomerNames] = useState<Record<number, string>>({});
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [leadOptions, setLeadOptions] = useState<Lead[]>([]);
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [builder, setBuilder] = useState<{ entityType: 'lead' | 'customer'; entityId: number | null; type: TaskType; title: string; notes: string; due: string }>(
    { entityType: 'lead', entityId: null, type: TaskType.FOLLOW_UP_CALL, title: '', notes: '', due: '' }
  );
  const [, setTick] = useState(0); // Force re-render for live timer

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allTasks, allUsers] = await Promise.all([
        listTasksForUser(user as any, !showCompleted),
        (user.role === 'Admin' || user.role === 'BackOffice') ? getUsers() : Promise.resolve([])
      ]);
      setTasks(allTasks);
      setUsers(allUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [showCompleted, user]);

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => {
      if (tasks.some(t => t.timer_start)) {
        setTick(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const openBuilder = useCallback(async () => {
    if (!user) return;
    setIsBuilderOpen(true);
    setBuilderLoading(true);
    try {
      const [ls, cs] = await Promise.all([getLeads(user as any), getCustomers(user as any)]);
      setLeadOptions(ls);
      setCustomerOptions(cs);
      setEditingTask(null);
      setBuilder(prev => ({ ...prev, entityType: 'lead', entityId: ls[0]?.id ?? null, title: '', notes: '', type: TaskType.FOLLOW_UP_CALL, due: '' }));
    } finally {
      setBuilderLoading(false);
    }
  }, [user]);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setIsBuilderOpen(true);
    setBuilder({
      entityType: task.lead_id ? 'lead' : 'customer',
      entityId: task.lead_id || task.customer_id || null,
      type: task.type as TaskType,
      title: task.title || '',
      notes: task.notes || '',
      due: task.due_date ? task.due_date.substring(0, 16) : '',
    });
  }, []);

  // Load display names for related leads/customers
  useEffect(() => {
    if (!user || tasks.length === 0) { setLeadNames({}); setCustomerNames({}); return; }
    const leadIds = Array.from(new Set(tasks.map(t => t.lead_id).filter((v): v is number => typeof v === 'number')));
    const customerIds = Array.from(new Set(tasks.map(t => t.customer_id).filter((v): v is number => typeof v === 'number')));
    if (leadIds.length === 0 && customerIds.length === 0) { setLeadNames({}); setCustomerNames({}); return; }
    (async () => {
      try {
        const [allLeads, allCustomers] = await Promise.all([getLeads(user as any), getCustomers(user as any)]);
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
      try { Notification.requestPermission(); } catch { }
    }
  }, []);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

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
    let base = tasks
      .filter(t => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter(passRange);

    if (sortConfig) {
      base = [...base].sort((a, b) => {
        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];

        if (sortConfig.key === 'owner') {
          aValue = users.find(u => u.id === a.user_id)?.email || '';
          bValue = users.find(u => u.id === b.user_id)?.email || '';
        } else if (sortConfig.key === 'association') {
          aValue = renderLeadCustomer(a);
          bValue = renderLeadCustomer(b);
        }

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const result = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    if (aiOrdering && aiOrdering.length > 0) {
      const orderMap = new Map(aiOrdering.map((id, idx) => [id, idx]));
      return [...base].sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
    }
    return base;
  }, [tasks, typeFilter, rangeFilter, aiOrdering, sortConfig, users]);

  const renderLeadCustomer = (task: Task) => {
    if (task.lead_id) return `${t('tasks.ui.lead')} • ${leadNames[task.lead_id] || '#' + task.lead_id}`;
    if (task.customer_id) return `${t('tasks.ui.customer')} • ${customerNames[task.customer_id] || '#' + task.customer_id}`;
    return '';
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTaskDuration = (task: Task) => {
    let total = task.time_spent || 0;
    if (task.timer_start) {
      const elapsed = Math.floor((Date.now() - new Date(task.timer_start).getTime()) / 1000);
      total += elapsed;
    }
    return total;
  };

  const handleToggleTimer = async (task: Task) => {
    try {
      await toggleTaskTimer(task.id, !!task.timer_start);
      refresh();
    } catch (e) {
      console.error('Failed to toggle timer', e);
    }
  };

  const renderTaskCard = (task: Task) => {
    const badge = task.status === 'Completed' ? 'text-green-700 bg-green-100' : (task.due_date && new Date(task.due_date) < new Date() ? 'text-red-700 bg-red-100' : 'text-slate-700 bg-slate-100');
    return (
      <div key={task.id} className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 flex flex-col gap-3">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {task.type === 'Follow Up Call' ? t('tasks.types.followUpCall') :
                task.type === 'Send Information' ? t('tasks.types.sendInformation') :
                  task.type === 'Send Samples' ? t('tasks.types.sendSamples') :
                    task.type === 'Send Quotation' ? t('tasks.types.sendQuotation') :
                      t('tasks.types.scheduleVisit')}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{task.title || t('tasks.ui.noTitle')}</span>
          </div>
          {task.due_date && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${badge}`}>
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Association */}
        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {renderLeadCustomer(task) || t('tasks.ui.noAssociation')}
        </div>

        {/* Auto Rule Badge */}
        {task.rule_title && (
          <div className="text-xs text-slate-500 italic bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
            🤖 {task.rule_title}
          </div>
        )}

        {/* Timer & Actions row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-600 mt-1">
          {/* Timer Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleTimer(task)}
              className={`p-1.5 rounded-full transition-colors ${task.timer_start ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-600'}`}
              title={task.timer_start ? 'Stop timer' : 'Start timer'}
            >
              {task.timer_start ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <span className={`text-xs font-mono font-medium ${task.timer_start ? 'text-green-600 animate-pulse' : 'text-slate-500'}`}>
              {formatDuration(getTaskDuration(task))}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button onClick={() => openEdit(task)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button
              onClick={async () => { if (!user) return; const payload: any = { user_id: user.id, lead_id: task.lead_id, customer_id: task.customer_id, type: task.type, status: TaskStatus.PENDING, title: task.title, notes: task.notes, due_date: task.due_date, rule_title: 'Cloned manually' }; await createTask(payload); refresh(); }}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded"
              title="Clone"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V5" /></svg>
            </button>
            <button onClick={async () => { await deleteTask(task.id); refresh(); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>

            {task.status !== 'Completed' ? (
              <button onClick={async () => { await completeTask(task.id); refresh(); }} className="px-3 py-1 bg-success text-white text-xs font-medium rounded shadow-sm hover:shadow active:scale-95 transition-all ml-1">
                {t('tasks.ui.complete')}
              </button>
            ) : (
              <span className="px-3 py-1 text-green-700 bg-green-100 text-xs font-medium rounded border border-green-200">
                {t('tasks.ui.completed')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600 mr-2">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-slate-200 dark:bg-slate-600 font-medium' : 'bg-white dark:bg-slate-800'}`}>List</button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm ${viewMode === 'calendar' ? 'bg-slate-200 dark:bg-slate-600 font-medium' : 'bg-white dark:bg-slate-800'}`}>Calendar</button>
          </div>
          <button onClick={openBuilder} className="px-2 py-1 text-xs bg-primary text-white rounded-md">New Task</button>
          <button disabled={aiLoading || !user} onClick={async () => { setAiLoading(true); try { const ids = await prioritizeTasks(tasks.map(t => ({ id: t.id, type: t.type, due_date: t.due_date as any, title: t.title as any }))); setAiOrdering(ids); } finally { setAiLoading(false); } }} className="px-2 py-1 text-xs bg-primary text-white rounded-md">
            {aiLoading ? '...' : t('tasks.ui.prioritizeWithAi')}
          </button>
          {aiOrdering && (<button onClick={() => setAiOrdering(null)} className="px-2 py-1 text-xs border rounded-md">{t('tasks.ui.resetOrder')}</button>)}
          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
            <button onClick={() => setRangeFilter('all')} className={`px-2 py-1 text-xs ${rangeFilter === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.all')}</button>
            <button onClick={() => setRangeFilter('overdue')} className={`px-2 py-1 text-xs ${rangeFilter === 'overdue' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.overdue')}</button>
            <button onClick={() => setRangeFilter('today')} className={`px-2 py-1 text-xs ${rangeFilter === 'today' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.today')}</button>
            <button onClick={() => setRangeFilter('upcoming')} className={`px-2 py-1 text-xs ${rangeFilter === 'upcoming' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-700 dark:text-slate-200'}`}>{t('tasks.ui.upcoming')}</button>
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600">
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
      ) : viewMode === 'calendar' ? (
        <TaskCalendar tasks={filtered} onEditTask={openEdit} />
      ) : groupByType ? (
        <div className="space-y-6">
          {['Follow Up Call', 'Send Information', 'Send Samples', 'Send Quotation', 'Schedule Visit'].map(type => {
            const items = filtered.filter(task => task.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <h4 className="text-sm font-semibold mb-2">{type}</h4>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                      {items.map(task => {
                        const badge = task.status === 'Completed' ? 'text-green-700 bg-green-100' : (task.due_date && new Date(task.due_date) < new Date() ? 'text-red-700 bg-red-100' : 'text-slate-700 bg-slate-100');
                        return (
                          <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-6 py-3 text-xs w-2/3">{task.title || type} {task.lead_id || task.customer_id ? `• ${renderLeadCustomer(task)}` : ''}</td>
                            <td className="px-6 py-3 text-xs w-1/3 text-right">{task.due_date ? (<span className={`px-2 py-0.5 rounded ${badge}`}>{new Date(task.due_date).toLocaleString()}</span>) : '-'}</td>
                            <td className="px-6 py-3 text-right text-xs">
                              {task.status !== 'Completed' ? (
                                <button onClick={async () => { await completeTask(task.id); refresh(); }} className="px-2 py-1 bg-success text-white rounded-md">{t('tasks.ui.complete')}</button>
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {items.map(task => renderTaskCard(task))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => requestSort('type')}>{t('tasks.ui.type')}{getSortIcon('type')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => requestSort('title')}>Title{getSortIcon('title')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => requestSort('association')}>{t('tasks.ui.leadCustomer')}{getSortIcon('association')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => requestSort('due_date')}>{t('tasks.ui.due')}{getSortIcon('due_date')}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Owner</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('tasks.ui.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.length === 0 && (
                  <tr><td className="px-3 py-2 text-slate-500" colSpan={6}>{t('tasks.ui.noTasks')}</td></tr>
                )}
                {filtered.map(task => {
                  const badge = task.status === 'Completed' ? 'text-green-700 bg-green-100' : (task.due_date && new Date(task.due_date) < new Date() ? 'text-red-700 bg-red-100' : 'text-slate-700 bg-slate-100');
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-3 py-2 text-xs">
                        {
                          task.type === 'Follow Up Call' ? t('tasks.types.followUpCall') :
                            task.type === 'Send Information' ? t('tasks.types.sendInformation') :
                              task.type === 'Send Samples' ? t('tasks.types.sendSamples') :
                                task.type === 'Send Quotation' ? t('tasks.types.sendQuotation') :
                                  t('tasks.types.scheduleVisit')
                        }
                        {task.rule_title && (
                          <div className="text-xs text-slate-500 mt-0.5">{task.rule_title}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{task.title || '-'}</td>
                      <td className="px-3 py-2 text-xs">{renderLeadCustomer(task)}</td>
                      <td className="px-3 py-2 text-xs">
                        {task.due_date ? (
                          <span className={`px-2 py-0.5 rounded ${badge}`}>{new Date(task.due_date).toLocaleString()}</span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {(user.role === 'Admin' || user.role === 'BackOffice') ? (users.find(u => u.id === task.user_id)?.email || '-') : t('tasks.ui.myself') || 'Myself'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleTimer(task)}
                            className={`p-1.5 rounded-md ${task.timer_start ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                            title={task.timer_start ? 'Stop timer' : 'Start timer'}
                          >
                            {task.timer_start ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-xs font-mono ${task.timer_start ? 'text-green-600 font-semibold' : 'text-slate-600'}`}>
                            {formatDuration(getTaskDuration(task))}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <div className="flex gap-2 justify-end items-center">
                          {task.status !== 'Completed' ? (
                            <button onClick={async () => { await completeTask(task.id); refresh(); }} className="px-2 py-1 bg-success text-white rounded-md">{t('tasks.ui.complete')}</button>
                          ) : (
                            <span className="px-2 py-1 text-green-700 bg-green-100 rounded-md">{t('tasks.ui.completed')}</span>
                          )}
                          <button onClick={() => openEdit(task)} className="px-2 py-1 border rounded-md">Edit</button>
                          <button onClick={async () => { if (!user) return; const payload: any = { user_id: user.id, lead_id: task.lead_id, customer_id: task.customer_id, type: task.type, status: TaskStatus.PENDING, title: task.title, notes: task.notes, due_date: task.due_date, rule_title: 'Cloned manually' }; await createTask(payload); refresh(); }} className="px-2 py-1 border rounded-md">Clone</button>
                          <button onClick={async () => { await deleteTask(task.id); refresh(); }} className="px-2 py-1 border rounded-md text-danger">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="text-center text-slate-500 py-4 text-sm">{t('tasks.ui.noTasks')}</div>
            )}
            {filtered.map(task => renderTaskCard(task))}
          </div>
        </>
      )}
      {/* Controls row */}
      <div className="mt-4 flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={groupByType} onChange={e => setGroupByType(e.target.checked)} /> {t('tasks.ui.groupByType')}
        </label>
        <button disabled={aiLoading || !user} onClick={async () => { setAiLoading(true); try { const items = await prioritizeTasks(tasks.map(t => ({ id: t.id, type: t.type, due_date: t.due_date as any, title: t.title as any }))); const agendaResp = await (await import('../../services/geminiService')).proposeAgenda(tasks.map(t => ({ id: t.id, type: t.type, due_date: t.due_date as any, title: t.title as any }))); setAiOrdering(items); setAgenda(agendaResp); } finally { setAiLoading(false); } }} className="px-2 py-1 text-xs bg-slate-700 text-white rounded-md">
          {aiLoading ? '...' : t('tasks.ui.proposeAgenda')}
        </button>
      </div>
      {agenda && agenda.length > 0 && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded border border-slate-200 dark:border-slate-600">
          <div className="text-sm font-semibold mb-2">{t('tasks.ui.proposedAgenda')}</div>
          <ul className="text-sm list-disc pl-5">
            {agenda.map(a => {
              const task = tasks.find(t => t.id === a.id);
              if (!task) return null;
              return <li key={a.id}>{a.start} • {task.type}{task.title ? `: ${task.title}` : ''}</li>;
            })}
          </ul>
        </div>
      )}

      {isBuilderOpen && (
        <Modal title="Create Task" onClose={() => setIsBuilderOpen(false)}>
          <div className="p-6 space-y-4">
            {builderLoading ? (
              <div className="py-6 text-center">...</div>
            ) : (
              <form onSubmit={async (e) => { e.preventDefault(); if (!user || !builder.entityId) return; if (editingTask) { const updated = { ...editingTask, type: builder.type, title: builder.title || undefined, notes: builder.notes || undefined, due_date: builder.due || undefined, lead_id: builder.entityType === 'lead' ? builder.entityId : null, customer_id: builder.entityType === 'customer' ? builder.entityId : null }; await updateTask(updated as any); } else { const payload: any = { user_id: user.id, type: builder.type, status: TaskStatus.PENDING, title: builder.title || undefined, notes: builder.notes || undefined, due_date: builder.due || undefined, rule_title: 'Created manually' }; if (builder.entityType === 'lead') payload.lead_id = builder.entityId; else payload.customer_id = builder.entityId; await createTask(payload); } setIsBuilderOpen(false); setEditingTask(null); setBuilder({ entityType: 'lead', entityId: null, type: TaskType.FOLLOW_UP_CALL, title: '', notes: '', due: '' }); refresh(); }}>
                <div>
                  <label className="block text-sm font-medium mb-1">Assign to</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={builder.entityType} onChange={e => setBuilder(prev => ({ ...prev, entityType: e.target.value as 'lead' | 'customer', entityId: null }))} className="border-slate-300 rounded-md p-2">
                      <option value="lead">{t('tasks.ui.lead')}</option>
                      <option value="customer">{t('tasks.ui.customer')}</option>
                    </select>
                    {builder.entityType === 'lead' ? (
                      <select value={builder.entityId ?? ''} onChange={e => setBuilder(prev => ({ ...prev, entityId: Number(e.target.value) || null }))} className="border-slate-300 rounded-md p-2">
                        <option value="">Select Lead</option>
                        {leadOptions.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                    ) : (
                      <select value={builder.entityId ?? ''} onChange={e => setBuilder(prev => ({ ...prev, entityId: Number(e.target.value) || null }))} className="border-slate-300 rounded-md p-2">
                        <option value="">Select Customer</option>
                        {customerOptions.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={builder.type} onChange={e => setBuilder(prev => ({ ...prev, type: e.target.value as TaskType }))} className="border-slate-300 rounded-md p-2 w-full">
                    <option value={TaskType.FOLLOW_UP_CALL}>{t('tasks.types.followUpCall')}</option>
                    <option value={TaskType.SEND_INFORMATION}>{t('tasks.types.sendInformation')}</option>
                    <option value={TaskType.SEND_SAMPLES}>{t('tasks.types.sendSamples')}</option>
                    <option value={TaskType.SEND_QUOTATION}>{t('tasks.types.sendQuotation')}</option>
                    <option value={TaskType.SCHEDULE_VISIT}>{t('tasks.types.scheduleVisit')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={builder.title} onChange={e => setBuilder(prev => ({ ...prev, title: e.target.value }))} className="border-slate-300 rounded-md p-2 w-full" placeholder="e.g., Call {{name}}" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea rows={3} value={builder.notes} onChange={e => setBuilder(prev => ({ ...prev, notes: e.target.value }))} className="border-slate-300 rounded-md p-2 w-full" placeholder="Details about this task..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due</label>
                  <input type="datetime-local" value={builder.due} onChange={e => setBuilder(prev => ({ ...prev, due: e.target.value }))} className="border-slate-300 rounded-md p-2 w-full" />
                </div>
                <div className="pt-2 text-right">
                  <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-md">{editingTask ? 'Save' : 'Create'}</button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Tasks;


