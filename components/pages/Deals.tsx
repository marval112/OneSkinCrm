import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getDeals, createDeal, updateDeal, getCustomers, getLeads, bulkDeleteDeals } from '../../services/crmService';
import { getUsers } from '../../services/userService';
import { exportToExcel } from '../../services/exportService';
import type { Deal, Customer, User, Lead } from '../../types';
import { DealStage } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';
import { useTranslation } from '../../services/i18nService';
import { listActivitiesForDeal, logActivity } from '../../services/activityService';
import { summarizeDeal, suggestDealTasks, draftLeadFollowUpEmail, draftCustomerFollowUpEmail, suggestDealStage, suggestDealFollowUp } from '../../services/geminiService';
import { createTask } from '../../services/tasksService';
import type { ActivityLog } from '../../types';
import { TaskStatus, TaskType } from '../../types';
import DealKanbanBoard from '../deals/DealKanbanBoard';

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


type NewDealInput = {
  title: string;
  customer_id?: number;
  lead_id?: number;
  value: number;
  status: DealStage;
  probability: number;
  expected_close_date: string;
  notes?: string;
};

const DealForm = ({
  deal, customers, leads = [], onSave, onCancel, isEdit = false, initialCustomerId, initialLeadId
}: {
  deal?: Deal | null,
  customers: Customer[],
  leads?: Lead[],
  onSave: (data: NewDealInput) => void,
  onCancel: () => void,
  isEdit?: boolean,
  initialCustomerId?: number,
  initialLeadId?: number
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<NewDealInput>(deal ? {
    title: deal.title,
    customer_id: deal.customer_id || undefined,
    lead_id: deal.lead_id || undefined,
    value: deal.value,
    status: deal.status,
    probability: deal.probability,
    expected_close_date: deal.expected_close_date,
    notes: deal.notes,
  } : {
    title: '',
    customer_id: initialCustomerId || customers[0]?.id || 0,
    lead_id: initialLeadId,
    value: 0,
    status: DealStage.QUALIFICATION,
    probability: 10,
    expected_close_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [association, setAssociation] = useState<'customer' | 'lead'>(() => {
    if (deal) return deal.lead_id ? 'lead' : 'customer';
    if (initialLeadId) return 'lead';
    return 'customer';
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Deal title is required.';
    if (!formData.expected_close_date) newErrors.expected_close_date = 'Expected close date is required.';
    if (formData.value === undefined || formData.value === null || formData.value <= 0) newErrors.value = 'Value must be a positive number.';
    if (association === 'customer') {
      if (!formData.customer_id) newErrors.customer_id = 'A customer must be selected.';
    } else {
      if (!formData.lead_id) newErrors.lead_id = 'A lead must be selected.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (name === 'customer_id' || name === 'lead_id') {
      parsedValue = value === '' ? (undefined as any) : (parseInt(value, 10) || (undefined as any));
    } else if (name === 'value' || name === 'probability') {
      parsedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const cleanData = { ...formData };
      if (association === 'customer') {
        cleanData.lead_id = undefined;
      } else {
        cleanData.customer_id = undefined;
      }
      onSave(cleanData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-4">
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="assoc" checked={association === 'customer'} onChange={() => { setAssociation('customer'); setFormData(prev => ({ ...prev, lead_id: undefined })); }} />
            <span>{t('common.customer')}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="assoc" checked={association === 'lead'} onChange={() => { setAssociation('lead'); setFormData(prev => ({ ...prev, customer_id: undefined })); }} />
            <span>{t('common.lead')}</span>
          </label>
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.dealTitle')}</label>
          <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>
        {association === 'customer' ? (
          <div>
            <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.customer')}</label>
            <select name="customer_id" id="customer_id" value={formData.customer_id ?? ''} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <option value="">{t('deals.form.selectCustomer')}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
            </select>
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
          </div>
        ) : (
          <div>
            <label htmlFor="lead_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.lead')}</label>
            <select name="lead_id" id="lead_id" value={formData.lead_id ?? ''} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <option value="">{t('deals.form.selectLead')}</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} - {l.company}</option>)}
            </select>
            {errors.lead_id && <p className="text-red-500 text-xs mt-1">{errors.lead_id}</p>}
          </div>
        )}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.stage')}</label>
          <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.valueEuro')}</label>
            <input type="number" step="100" name="value" id="value" value={formData.value} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
          </div>
          <div>
            <label htmlFor="expected_close_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.expectedCloseDate')}</label>
            <input type="date" name="expected_close_date" id="expected_close_date" value={formData.expected_close_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            {errors.expected_close_date && <p className="text-red-500 text-xs mt-1">{errors.expected_close_date}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="probability" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.probability')} ({formData.probability}%)</label>
          <input type="range" min="0" max="100" step="5" name="probability" id="probability" value={formData.probability} onChange={handleChange} className="mt-1 block w-full accent-primary" />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.notes')}</label>
          <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm">
          {isEdit ? t('deals.form.saveChanges') : t('deals.form.saveDeal')}
        </button>
        <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">{t('common.cancel')}</button>
      </div>
    </form>
  );
};

type SortableDealKeys = keyof Deal | 'partyName' | 'closed_at' | 'owner';
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortableDealKeys;
  direction: SortDirection;
}

function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState(searchParams.get('status') || 'all');
  const [filterUser, setFilterUser] = useState(searchParams.get('userId') || 'all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const toastContext = useContext(ToastContext);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'timeline'>('info');
  const [timelineItems, setTimelineItems] = useState<ActivityLog[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiEmail, setAiEmail] = useState<{ subject: string; body: string } | null>(null);
  const [aiSuggested, setAiSuggested] = useState<{ type: string; title: string; dueDays?: number }[]>([]);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const [aiFollowUp, setAiFollowUp] = useState<{ dueDays: number; stage?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const openTimeline = async (deal: Deal) => {
    setTimelineLoading(true);
    try { setTimelineItems(await listActivitiesForDeal(deal.id, 50)); } catch (e) { console.warn('Activities table missing?', e); }
    setTimelineLoading(false);
  };
  const addTimelineNote = async () => {
    if (!detailDeal || !timelineNote.trim()) return;
    setTimelineSaving(true);
    try {
      await logActivity({ user_id: user?.id || null, channel: 'note', message: timelineNote, deal_id: detailDeal.id });
      setTimelineNote('');
      setTimelineItems(await listActivitiesForDeal(detailDeal.id, 50));
    } catch (e) { console.error(e); } finally { setTimelineSaving(false); }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const promises: any[] = [getDeals(user), getCustomers(user), getLeads(user)];
      if (user.role === 'Admin' || user.role === 'BackOffice') {
        promises.push(getUsers());
      }
      const [dealsData, customersData, leadsData, usersData] = await Promise.all(promises);
      setDeals(dealsData);
      setCustomers(customersData);
      setLeads(leadsData);
      if (usersData) {
        setUsers(usersData);
      }
    } catch (e) {
      toastContext?.showToast('Failed to load deals data.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [toastContext, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open create modal if create=true parameter is present
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    console.log('Deals page loaded, create param:', shouldCreate, 'modal open:', isCreateModalOpen);

    if (shouldCreate && !isCreateModalOpen) {
      console.log('Opening create modal automatically');
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);


  const getCustomerName = useCallback((customerId: number) => {
    return customers.find(c => c.id === customerId)?.name || '';
  }, [customers]);
  const getLeadName = useCallback((leadId: number) => {
    return leads.find(l => l.id === leadId)?.name || '';
  }, [leads]);

  const processedDeals = useMemo(() => {
    const dealsWithPartyNames = deals.map(deal => ({
      ...deal,
      partyName: deal.customer_id ? getCustomerName(deal.customer_id) : (deal.lead_id ? getLeadName(deal.lead_id) : '—'),
      closed_at: (deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST) ? deal.updated_at : null,
      owner: users.find(u => u.id === deal.user_id)?.email || ''
    }));

    let filtered = dealsWithPartyNames.filter(deal => {
      const searchMatch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deal.partyName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const stageMatch = filterStage === 'all' || deal.status === filterStage;
      const userMatch = user?.role !== 'Admin' || filterUser === 'all' || deal.user_id?.toString() === filterUser;
      return searchMatch && stageMatch && userMatch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        // @ts-ignore
        const aValue = a[sortConfig.key];
        // @ts-ignore
        const bValue = b[sortConfig.key];

        // Handle null/undefined values - push them to the end
        if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [deals, customers, searchTerm, filterStage, filterUser, sortConfig, getCustomerName, user]);


  const requestSort = (key: SortableDealKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableDealKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4 ml-1 inline" /> : <ChevronDownIcon className="w-4 h-4 ml-1 inline" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDeals(processedDeals.filter(d => d.status !== DealStage.CLOSED_WON && d.status !== DealStage.CLOSED_LOST).map(d => d.id));
    } else {
      setSelectedDeals([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedDeals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const stageColors: Record<DealStage, string> = {
    [DealStage.QUALIFICATION]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [DealStage.PROPOSAL]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    [DealStage.NEGOTIATION]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    [DealStage.CLOSED_WON]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [DealStage.CLOSED_LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  const handleCreateDeal = async (dealData: { title: string; customer_id?: number; lead_id?: number; value: number; status: DealStage; probability: number; expected_close_date: string; notes?: string }) => {
    if (!user) return;
    try {
      await createDeal(dealData, user.id);
      toastContext?.showToast('New deal created successfully!', 'success');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      toastContext?.showToast('Failed to create deal.', 'danger');
    }
  };

  const handleUpdateDeal = async (dealData: Deal) => {
    try {
      const { customerName, partyName, ...dealToUpdate } = dealData as any;
      await updateDeal(dealToUpdate);
      toastContext?.showToast('Deal updated successfully!', 'success');
      setEditingDeal(null);
      fetchData();
    } catch (error) {
      toastContext?.showToast('Failed to update deal.', 'danger');
    }
  };

  const handleExport = () => {
    const dataToExport = processedDeals.map(deal => ({
      ...deal,
      customer_name: getCustomerName(deal.customer_id)
    }));
    exportToExcel(dataToExport, 'deals_export');
    toastContext?.showToast(t('deals.exportSuccess'), 'success');
  };

  const renderDealCard = (deal: Deal & { partyName?: string }) => {
    return (
      <div key={deal.id} className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
        <div className="flex justify-between items-start mb-2">
          <div
            className="font-semibold text-primary cursor-pointer hover:underline"
            onClick={() => { setDetailDeal(deal as Deal); setDetailTab('info'); openTimeline(deal as Deal); }}
          >
            {deal.title}
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${stageColors[deal.status]}`}>
            {deal.status}
          </span>
        </div>

        <div className="flex justify-between items-end mb-3">
          <div className="text-sm">
            <div className="text-slate-900 dark:text-white font-bold text-lg">€{(deal.value || 0).toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Prob: {deal.probability}%</div>
          </div>
          <div className="text-right text-xs">
            <div className="text-slate-600 dark:text-slate-300 font-medium">{(deal as any).partyName || '—'}</div>
            <div className="text-slate-400">Exp: {deal.expected_close_date}</div>
            <div className="text-slate-400 mt-1">
              Ref: {new Date(deal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {(deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST) && (
                <> • Cls: {new Date(deal.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={selectedDeals.includes(deal.id)} onChange={() => handleSelectOne(deal.id)} disabled={deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setDetailDeal(deal as Deal); setDetailTab('timeline'); openTimeline(deal as Deal); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded dark:bg-slate-600 dark:text-slate-200"
            >
              <ClockIcon className="h-3 w-3" />
            </button>
            {!(deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST) && (
              <button
                onClick={() => setEditingDeal(deal as Deal)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded"
              >
                <EditIcon className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
          <input
            type="text"
            placeholder={t('deals.list.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="all">{t('deals.list.allStages')}</option>
            {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {user?.role === 'Admin' && users.length > 0 && (
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="all">{t('deals.list.allUsers')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-md p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'table'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>

          <button onClick={handleExport} className="px-2 py-1 text-xs bg-slate-600 text-white rounded-md hover:bg-slate-700 hidden sm:inline-block">{t('deals.exportExcel')}</button>
          <button onClick={() => setIsCreateModalOpen(true)} className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors">
            New Deal
          </button>
          {user?.role === 'Admin' && selectedDeals.length > 0 && (
            <button onClick={() => setConfirmDelete(true)} className="px-2 py-1 text-xs bg-danger text-white rounded-md hover:bg-danger-hover">{t('common.delete')}</button>
          )}
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <DealKanbanBoard
          deals={processedDeals}
          onStageChange={async (dealId, newStage) => {
            try {
              const deal = deals.find(d => d.id === dealId);
              if (deal) {
                await updateDeal({ ...deal, status: newStage });
                toastContext?.showToast('Deal stage updated', 'success');
                fetchData();
              }
            } catch (error) {
              toastContext?.showToast('Failed to update deal stage', 'danger');
            }
          }}
          onDealClick={(deal) => {
            setDetailDeal(deal);
            setDetailTab('info');
            openTimeline(deal);
          }}
          getCustomerName={(customerId) => {
            const customer = customers.find(c => c.id === customerId);
            return customer ? customer.name : 'Unknown';
          }}
          getLeadName={(leadId) => {
            const lead = leads.find(l => l.id === leadId);
            return lead ? lead.name : 'Unknown';
          }}
        />
      ) : (
        /* Table View */
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" onChange={handleSelectAll} checked={selectedDeals.length > 0 && selectedDeals.length === processedDeals.length} /></th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('title')} className="flex items-center">Deal Title {getSortIcon('title')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">
                    <button onClick={() => requestSort('partyName')} className="flex items-center">Contact {getSortIcon('partyName')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('value')} className="flex items-center">Value {getSortIcon('value')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('probability')} className="flex items-center">Probability {getSortIcon('probability')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('created_at')} className="flex items-center">Created {getSortIcon('created_at')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('closed_at')} className="flex items-center">Closed {getSortIcon('closed_at')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('status')} className="flex items-center">Stage {getSortIcon('status')}</button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    <button onClick={() => requestSort('owner')} className="flex items-center">Owner {getSortIcon('owner')}</button>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? <TableSkeleton columns={8} rows={4} /> : processedDeals.map(deal => (
                  <tr key={deal.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={selectedDeals.includes(deal.id)} onChange={() => handleSelectOne(deal.id)} disabled={deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST} /></td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-900 cursor-pointer hover:underline max-w-[200px] truncate" onDoubleClick={() => { if (deal.status !== DealStage.CLOSED_WON && deal.status !== DealStage.CLOSED_LOST) setEditingDeal(deal as Deal); }} onClick={() => { setDetailDeal(deal as Deal); setDetailTab('info'); openTimeline(deal as Deal); }} title={deal.title}>{deal.title}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-xs text-slate-600 max-w-[150px] truncate" title={(deal as any).partyName || ''}>{(deal as any).partyName || ''}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-800 font-semibold">€{(deal.value || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell text-xs text-slate-600">{deal.probability}%</td>
                    <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell text-xs text-slate-600">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell text-xs text-slate-600">
                      {(deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST) ? new Date(deal.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stageColors[deal.status]}`}>{deal.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 max-w-[150px] truncate" title={(deal as any).owner || '-'}>
                      {(deal as any).owner || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => { setDetailDeal(deal as Deal); setDetailTab('timeline'); openTimeline(deal as Deal); }} className="text-slate-500 hover:text-indigo-600 p-1" title={t('deals.actions.timeline')}><ClockIcon className="h-5 w-5" /></button>
                      {!(deal.status === DealStage.CLOSED_WON || deal.status === DealStage.CLOSED_LOST) && (
                        <button onClick={() => setEditingDeal(deal as Deal)} className="text-slate-500 hover:text-primary p-1" title={t('deals.actions.editDeal')}><EditIcon className="h-5 w-5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {loading && <div className="text-center py-4">Loading...</div>}
            {!loading && processedDeals.length === 0 && <div className="text-center text-slate-500 py-4">No deals found.</div>}
            {!loading && processedDeals.map(deal => renderDealCard(deal))}
          </div>
        </>
      )}

      {isCreateModalOpen && (
        <Modal title={t('deals.form.createTitle')} onClose={() => setIsCreateModalOpen(false)}>
          <DealForm
            customers={customers}
            leads={leads}
            onSave={handleCreateDeal}
            onCancel={() => setIsCreateModalOpen(false)}
            initialCustomerId={searchParams.get('customer_id') ? parseInt(searchParams.get('customer_id')!) : undefined}
            initialLeadId={searchParams.get('lead_id') ? parseInt(searchParams.get('lead_id')!) : undefined}
          />
        </Modal>
      )}

      {editingDeal && (
        <Modal title={`${t('deals.form.editTitlePrefix')} ${editingDeal.title}`} onClose={() => setEditingDeal(null)}>
          <DealForm
            isEdit
            deal={editingDeal}
            customers={customers}
            leads={leads}
            onSave={(data) => handleUpdateDeal({ ...(editingDeal as Deal), ...(data as any) })}
            onCancel={() => setEditingDeal(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={t('common.confirmDeletion')} onClose={() => setConfirmDelete(false)}>
          <div className="p-6">
            <p>Delete {selectedDeals.length} selected deals?</p>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">{t('common.cancel')}</button>
              <button onClick={async () => { try { await bulkDeleteDeals(selectedDeals); toastContext?.showToast('Deals deleted.', 'success'); setSelectedDeals([]); fetchData(); } catch { toastContext?.showToast('Failed to delete deals.', 'danger'); } finally { setConfirmDelete(false); } }} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">{t('common.delete')}</button>
            </div>
          </div>
        </Modal>
      )}

      {detailDeal && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailDeal(null)}></div>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-slate-800 shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{detailDeal.title}</h3>
              <button onClick={() => setDetailDeal(null)} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600">Close</button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setDetailTab('info')} className={`px-3 py-1.5 rounded-md ${detailTab === 'info' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Info</button>
              <button onClick={() => setDetailTab('timeline')} className={`px-3 py-1.5 rounded-md ${detailTab === 'timeline' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Timeline</button>
            </div>
            {detailTab === 'info' && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">{detailDeal.customer_id ? `${t('common.customer')}:` : `${t('common.lead')}:`}</span>
                  <span className="font-medium ml-1">{detailDeal.customer_id ? getCustomerName(detailDeal.customer_id) : (detailDeal.lead_id ? getLeadName(detailDeal.lead_id) : '')}</span>
                </div>
                <div><span className="text-slate-500">Value:</span> <span className="font-medium">€{(detailDeal.value || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-500">Stage:</span> <span className={`ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stageColors[detailDeal.status]}`}>{detailDeal.status}</span></div>
                <div><span className="text-slate-500">Probability:</span> <span className="font-medium">{detailDeal.probability}%</span></div>
                <div><span className="text-slate-500">Expected Close:</span> <span className="font-medium">{detailDeal.expected_close_date}</span></div>
                {detailDeal.notes && <div><span className="text-slate-500">Notes:</span> <span className="font-medium">{detailDeal.notes}</span></div>}
              </div>
            )}
            {detailTab === 'timeline' && (
              <div className="space-y-4">
                {timelineLoading ? (
                  <div className="py-8 text-center">Loading...</div>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {timelineItems.length === 0 && <li className="py-4 text-slate-500">No activity yet.</li>}
                    {timelineItems.map(item => (
                      <li key={item.id} className="py-3">
                        <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} • {item.channel}{item.direction ? ` (${item.direction})` : ''}</div>
                        {item.subject && <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.subject}</div>}
                        {item.message && <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.message}</div>}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.attachments.map((att, idx) => (
                              <a key={idx} href={att.base64 ? `data:${att.content_type};base64,${att.base64}` : (att.url || '#')} download={att.filename} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                                {att.filename}
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">{t('header.aiAssistant')}</div>
                    <div className="flex items-center gap-3">
                      <button className="text-xs underline text-slate-600" onClick={() => navigate('/settings/documentation')}>{t('common.howAiHelps')}</button>
                      {aiLoading && <div className="text-xs text-slate-500">...</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading || !detailDeal} onClick={async () => { if (!detailDeal) return; setAiLoading(true); try { const text = await summarizeDeal(detailDeal, timelineItems); setAiSummary(text); } finally { setAiLoading(false); } }}>{t('aiAssistant.winStrategy')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading || !detailDeal} onClick={async () => { if (!detailDeal) return; setAiLoading(true); try { const tasks = await suggestDealTasks(detailDeal, timelineItems); setAiSuggested(tasks || []); } finally { setAiLoading(false); } }}>{t('aiAssistant.suggestDealTasks')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading || !detailDeal} onClick={async () => { if (!detailDeal) return; setAiLoading(true); try { const f = await suggestDealFollowUp(detailDeal, timelineItems); setAiFollowUp(f ? { dueDays: f.dueDays, stage: f.stage as any } : null); } finally { setAiLoading(false); } }}>{t('aiAssistant.suggestFollowUp')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading || !detailDeal} onClick={async () => { if (!detailDeal) return; setAiLoading(true); try { const s = await suggestDealStage(detailDeal, timelineItems); setAiStage(s || null); } finally { setAiLoading(false); } }}>{t('aiAssistant.suggestStage')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading || !detailDeal} onClick={async () => { if (!detailDeal) return; setAiLoading(true); try { const email = detailDeal.lead_id ? await draftLeadFollowUpEmail({ name: getLeadName(detailDeal.lead_id), company: '', country: '', source: '' as any, status: '' as any, created_at: '' } as any, timelineItems) : await draftCustomerFollowUpEmail({ name: getCustomerName(detailDeal.customer_id), company: '', country: '', status: '' as any, health_score: 0, last_contact: '' } as any, timelineItems); setAiEmail(email); } finally { setAiLoading(false); } }}>{t('aiAssistant.draftEmail')}</button>
                  </div>
                  {aiSummary && <div className="mb-3 text-sm whitespace-pre-wrap bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">{aiSummary}</div>}
                  {aiFollowUp && (
                    <div className="mb-3 flex items-center gap-2 text-sm">
                      <span>Follow-up in <span className="font-medium">{aiFollowUp.dueDays}d</span>{aiFollowUp.stage ? `, stage: ${aiFollowUp.stage}` : ''}</span>
                      <button className="px-2 py-1 text-xs bg-success text-white rounded" onClick={async () => {
                        if (!detailDeal || !user) return;
                        const due = new Date(Date.now() + aiFollowUp.dueDays * 24 * 3600 * 1000).toISOString();
                        const target = { lead_id: detailDeal.lead_id, customer_id: detailDeal.customer_id } as any;
                        await createTask({ user_id: user.id, ...target, type: TaskType.FOLLOW_UP_CALL, status: TaskStatus.PENDING, title: `Seguimiento de oportunidad: ${detailDeal.title}`, due_date: due });
                        if (aiFollowUp.stage && aiFollowUp.stage !== detailDeal.status) {
                          try { await updateDeal({ ...detailDeal, status: aiFollowUp.stage as any }); } catch { }
                        }
                        toastContext?.showToast('Follow-up scheduled.', 'success');
                        setAiFollowUp(null);
                        fetchData();
                      }}>Apply</button>
                      <button className="px-2 py-1 text-xs border rounded" onClick={() => setAiFollowUp(null)}>Dismiss</button>
                    </div>
                  )}
                  {aiStage && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm">Suggested stage: <span className="font-medium">{aiStage}</span></span>
                      <button className="px-2 py-1 text-xs bg-success text-white rounded" onClick={async () => {
                        if (!detailDeal) return;
                        try {
                          await updateDeal({ ...detailDeal, status: aiStage as any });
                          toastContext?.showToast('Stage updated.', 'success');
                          setAiStage(null);
                          fetchData();
                        } catch {
                          toastContext?.showToast('Failed to update stage.', 'danger');
                        }
                      }}>Apply</button>
                      <button className="px-2 py-1 text-xs border rounded" onClick={() => setAiStage(null)}>Dismiss</button>
                    </div>
                  )}
                  {aiSuggested.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">{t('aiAssistant.suggestedTasks')}</div>
                      <ul className="text-sm list-disc pl-5">
                        {aiSuggested.map((s, idx) => (<li key={idx}>{s.type} • {s.title}{typeof s.dueDays === 'number' ? ` • in ${s.dueDays}d` : ''}</li>))}
                      </ul>
                      <button className="mt-2 px-2 py-1 text-sm bg-success text-white rounded" onClick={async () => {
                        if (!detailDeal || !user) return;
                        const target = { lead_id: detailDeal.lead_id, customer_id: detailDeal.customer_id } as any;
                        for (const s of aiSuggested) {
                          const due = typeof s.dueDays === 'number' ? new Date(Date.now() + s.dueDays * 24 * 3600 * 1000).toISOString() : undefined;
                          const map: Record<string, TaskType> = {
                            'Follow Up Call': TaskType.FOLLOW_UP_CALL,
                            'Send Information': TaskType.SEND_INFORMATION,
                            'Send Samples': TaskType.SEND_SAMPLES,
                            'Send Quotation': TaskType.SEND_QUOTATION,
                            'Schedule Visit': TaskType.SCHEDULE_VISIT,
                          };
                          const ttype = map[s.type] || TaskType.FOLLOW_UP_CALL;
                          await createTask({ user_id: user.id, ...target, type: ttype, status: TaskStatus.PENDING, title: s.title, due_date: due } as any);
                        }
                        toastContext?.showToast('Suggested tasks added.', 'success');
                      }}>{t('aiAssistant.addSuggestedTasks')}</button>
                    </div>
                  )}
                  {aiEmail && (
                    <div className="mb-1 text-sm">
                      <div className="text-xs text-slate-500 mb-1">{t('aiAssistant.draftEmail')}</div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                        <div className="font-medium">Asunto: {aiEmail.subject}</div>
                        <pre className="whitespace-pre-wrap text-sm mt-1">{aiEmail.body}</pre>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('customers.timeline.addNote')}</label>
                  <textarea value={timelineNote} onChange={e => setTimelineNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                  <div className="text-right mt-2">
                    <button disabled={timelineSaving} onClick={addTimelineNote} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{timelineSaving ? '...' : t('customers.timeline.save')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Deals;
