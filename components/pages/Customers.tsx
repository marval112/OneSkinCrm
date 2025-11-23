import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCustomers, bulkDeleteCustomers, createCustomer, updateCustomer, getCountries, createDeal } from '../../services/crmService';
import { exportToExcel } from '../../services/exportService';
import type { Customer, Country } from '../../types';
import { DealStage } from '../../types';
import { CustomerStatus, Segment } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';
import { useTranslation } from '../../services/i18nService';
import CustomersKanbanView from '../common/CustomersKanbanView';
import EmailComposer from '../common/EmailComposer';
import ImportModal from '../common/ImportModal';
import { parseCSV, importCustomers } from '../../services/importService';
import { listActivitiesForCustomer, logActivity } from '../../services/activityService';
import { summarizeCustomer, draftCustomerFollowUpEmail, suggestCustomerTasks } from '../../services/geminiService';
import { createTask } from '../../services/tasksService';
import type { ActivityLog } from '../../types';
import { TaskStatus, TaskType } from '../../types';

const statusColors: Record<CustomerStatus, string> = {
  [CustomerStatus.Prospect]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
  [CustomerStatus.Active]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [CustomerStatus.Churned]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;

type SortableCustomerKeys = 'name' | 'company' | 'status' | 'health_score' | 'created_at';
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortableCustomerKeys;
  direction: SortDirection;
}

const CustomerForm = ({
  customer, onSave, onCancel, isEdit = false
}: {
  customer?: Customer,
  onSave: (payload: {
    customer: Omit<Customer, 'id' | 'created_at' | 'user_id'>,
    deal?: {
      title: string;
      value: number;
      status: DealStage;
      expected_close_date: string;
      probability: number;
      notes?: string;
    }
  }) => void;
  onCancel: () => void;
  isEdit?: boolean;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(customer || {
    name: '', company: '', email: '', phone: '', country: '',
    segment: Segment.INDUSTRIAL, status: CustomerStatus.Prospect, health_score: 75,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createDealFlag, setCreateDealFlag] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState<number>(0);
  const [dealStatus, setDealStatus] = useState<DealStage>(DealStage.QUALIFICATION);
  const [dealProbability, setDealProbability] = useState<number>(50);
  const [dealExpectedClose, setDealExpectedClose] = useState<string>(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [dealNotes, setDealNotes] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    const fetchCountriesData = async () => {
      try {
        const countryData = await getCountries();
        setCountries(countryData);
        if (!customer && countryData.length > 0) {
          setFormData(prev => ({ ...prev, country: countryData.find(c => c.code === 'ES')?.name || countryData[0].name }));
        }
      } catch (error) {
        console.error("Failed to fetch countries", error);
      }
    };
    fetchCountriesData();
  }, [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required.';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email is not valid.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const payload: any = { customer: isEdit ? formData as Customer : { ...formData, last_contact: new Date().toISOString() } };
      if (!isEdit && createDealFlag) {
        payload.deal = {
          title: dealTitle || `${formData.name} • ${formData.company || 'Deal'}`,
          value: Number(dealValue) || 0,
          status: dealStatus,
          expected_close_date: new Date(dealExpectedClose).toISOString(),
          probability: Number(dealProbability) || 0,
          notes: dealNotes || undefined,
        };
      }
      onSave(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
          <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company</label>
            <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
            <select id="country" name="country" value={formData.country} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <option value="">Select country</option>
              {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label htmlFor="segment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.segment')}</label>
            <select id="segment" name="segment" value={formData.segment} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              {Object.values(Segment).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            {Object.values(CustomerStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {!isEdit && (
        <div className="mt-4 p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/40">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={createDealFlag} onChange={(e) => setCreateDealFlag(e.target.checked)} />
            <span className="text-sm font-medium">{t('customers.createDeal') || 'Create associated Deal'}</span>
          </label>
          {createDealFlag && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.dealTitle')}</label>
                <input type="text" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.valueEuro')}</label>
                <input type="number" min="0" value={dealValue} onChange={(e) => setDealValue(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.stage')}</label>
                <select value={dealStatus} onChange={(e) => setDealStatus(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600">
                  {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.expectedCloseDate')}</label>
                <input type="datetime-local" value={dealExpectedClose} onChange={(e) => setDealExpectedClose(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.probability')}</label>
                <input type="number" min="0" max="100" value={dealProbability} onChange={(e) => setDealProbability(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.notes')}</label>
                <textarea rows={2} value={dealNotes} onChange={(e) => setDealNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm">
          {isEdit ? t('common.saveChanges') : t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
          {t('common.cancel')}
        </button>
        <button type="button" onClick={() => navigate('/budget')} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
          {t('budget.title') || 'Budget'}
        </button>
      </div>
    </form>
  );
};


function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [emailingCustomer, setEmailingCustomer] = useState<Customer | null>(null);
  const [view, setView] = useState<'table' | 'kanban' | 'segment'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const toastContext = useContext(ToastContext);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [timelineCustomer, setTimelineCustomer] = useState<Customer | null>(null);
  const [timelineItems, setTimelineItems] = useState<ActivityLog[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'timeline' | 'email'>('info');
  const navigate = useNavigate();
  // Quick create deal
  const [dealForCustomer, setDealForCustomer] = useState<Customer | null>(null);
  const [qDealTitle, setQDealTitle] = useState('');
  const [qDealValue, setQDealValue] = useState<number>(0);
  const [qDealStage, setQDealStage] = useState<DealStage>(DealStage.QUALIFICATION);
  const [qDealProbability, setQDealProbability] = useState<number>(50);
  const [qDealExpectedClose, setQDealExpectedClose] = useState<string>(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [qDealNotes, setQDealNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiEmail, setAiEmail] = useState<{ subject: string; body: string } | null>(null);
  const [aiSuggested, setAiSuggested] = useState<{ type: string; title: string; dueDays?: number }[]>([]);

  const openTimeline = async (customer: Customer) => {
    setTimelineCustomer(customer);
    setTimelineLoading(true);
    try { setTimelineItems(await listActivitiesForCustomer(customer.id, 50)); } catch (e) { console.warn('Activities table missing?', e); }
    setTimelineLoading(false);
  };

  const addTimelineNote = async () => {
    if (!timelineCustomer || !timelineNote.trim()) return;
    setTimelineSaving(true);
    try {
      await logActivity({ user_id: user?.id || null, channel: 'note', message: timelineNote, customer_id: timelineCustomer.id });
      setTimelineNote('');
      setTimelineItems(await listActivitiesForCustomer(timelineCustomer.id, 50));
    } catch (e) { console.error(e); } finally { setTimelineSaving(false); }
  };

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCustomers(user);
      setCustomers(data);
    } catch (e) {
      toastContext?.showToast('Failed to load customers.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [user, toastContext]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const sortedCustomers = useMemo(() => {
    const qsStatus = searchParams.get('status');
    const qsSegment = searchParams.get('segment');
    const qsCountry = searchParams.get('country');
    const qsUserId = searchParams.get('userId');
    let sortableCustomers = customers.filter(c => {
      const statusMatch = !qsStatus || qsStatus === 'all' || String(c.status) === qsStatus;
      const segmentMatch = !qsSegment || qsSegment === 'All' || String(c.segment) === qsSegment;
      const countryMatch = !qsCountry || String(c.country) === qsCountry;
      const ownerMatch = !qsUserId || String(c.user_id) === qsUserId;
      const searchMatch = !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));
      return statusMatch && segmentMatch && countryMatch && ownerMatch && searchMatch;
    });
    if (sortConfig !== null) {
      sortableCustomers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (aValue.toLowerCase() < bValue.toLowerCase()) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue.toLowerCase() > bValue.toLowerCase()) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        } else {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        }
        return 0;
      });
    }
    return sortableCustomers;
  }, [customers, sortConfig, searchParams, searchTerm]);

  const requestSort = (key: SortableCustomerKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableCustomerKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4 ml-1 inline" /> : <ChevronDownIcon className="w-4 h-4 ml-1 inline" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCustomers(e.target.checked ? sortedCustomers.map(c => c.id) : []);
  };

  const handleSelectOne = (id: number) => {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async () => {
    try {
      await bulkDeleteCustomers(selectedCustomers);
      toastContext?.showToast(`${selectedCustomers.length} ${t('customers.deleteSuccess')}`, 'success');
      setSelectedCustomers([]);
      setConfirmDelete(false);
      fetchCustomers();
    } catch (error) {
      toastContext?.showToast(t('customers.deleteFailure'), 'danger');
    }
  };

  const handleCreateCustomer = async (payload: { customer: Omit<Customer, 'id' | 'created_at' | 'user_id'>, deal?: { title: string; value: number; status: DealStage; expected_close_date: string; probability: number; notes?: string } }) => {
    if (!user) return;
    try {
      const created = await createCustomer(payload.customer, user.id);
      if (payload.deal) {
        await createDeal({ ...payload.deal, customer_id: created.id }, user.id);
      }
      toastContext?.showToast(t('customers.createSuccess'), 'success');
      setIsCreateModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toastContext?.showToast(t('customers.createFailure'), 'danger');
    }
  };

  const handleUpdateCustomer = async (customerData: Customer) => {
    try {
      await updateCustomer(customerData);
      toastContext?.showToast(t('customers.updateSuccess'), 'success');
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      toastContext?.showToast(t('customers.updateFailure'), 'danger');
    }
  };

  const handleExport = () => {
    exportToExcel(sortedCustomers, 'customers_export');
    toastContext?.showToast(t('customers.exportSuccess'), 'success');
  }

  const handleImport = async (file: File) => {
    if (!user) return;
    try {
      const data = await parseCSV(file);
      const { successCount } = await importCustomers(data, user.id);
      toastContext?.showToast(t('customers.importSuccess').replace('{count}', successCount.toString()), 'success');
      setIsImportModalOpen(false);
      fetchCustomers(); // Refresh data
    } catch (error: any) {
      throw error;
    }
  };

  const ViewSwitcher = () => (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
      <button
        onClick={() => setView('table')}
        className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'table' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
      >
        {t('common.table')}
      </button>
      <button
        onClick={() => setView('kanban')}
        className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'kanban' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
      >
        {t('common.kanban')}
      </button>
      <button
        onClick={() => setView('segment')}
        className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'segment' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
      >
        Segment
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-white"
          />
          {selectedCustomers.length > 0 && view === 'table' ? (
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm bg-danger text-white rounded-md hover:bg-danger-hover">
              {t('customers.deleteSelected').replace('{count}', selectedCustomers.length.toString())}
            </button>
          ) : null}
          <ViewSwitcher />
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'Admin' && (
            <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-1.5 text-sm bg-success text-white rounded-md hover:bg-success-hover">Import</button>
          )}
          <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700">Export</button>
          <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary-hover whitespace-nowrap">
            Create New
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-2 py-3 w-8"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" onChange={handleSelectAll} checked={selectedCustomers.length > 0 && selectedCustomers.length === sortedCustomers.length} /></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase" style={{ maxWidth: '180px' }}>
                  <button onClick={() => requestSort('name')} className="flex items-center">Name {getSortIcon('name')}</button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell" style={{ maxWidth: '160px' }}>
                  <button onClick={() => requestSort('company')} className="flex items-center">Company {getSortIcon('company')}</button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300">
                  Segment
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                  <button onClick={() => requestSort('status')} className="flex items-center">{t('common.status')} {getSortIcon('status')}</button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden lg:table-cell">
                  <button onClick={() => requestSort('health_score')} className="flex items-center">Health {getSortIcon('health_score')}</button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">
                  <button onClick={() => requestSort('created_at')} className="flex items-center">Created {getSortIcon('created_at')}</button>
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? <TableSkeleton columns={8} rows={5} /> : sortedCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-2 py-2 w-8"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" checked={selectedCustomers.includes(customer.id)} onChange={() => handleSelectOne(customer.id)} /></td>
                  <td className="px-3 py-2" style={{ maxWidth: '180px' }}>
                    <div className="cursor-pointer hover:underline overflow-hidden" onDoubleClick={() => setEditingCustomer(customer)} onClick={() => { setDetailCustomer(customer); setDetailTab('info'); openTimeline(customer); }}>
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{customer.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{customer.email}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell" style={{ maxWidth: '160px' }}>
                    <div className="text-xs text-slate-900 dark:text-slate-100 truncate">{customer.company}{customer.country && `, ${customer.country}`}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                    {customer.segment && <span className="px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300">{customer.segment}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${statusColors[customer.status]}`}>{customer.status}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-2"><div className="bg-success h-2 rounded-full" style={{ width: `${customer.health_score}%` }}></div></div>
                      <span className="text-xs font-semibold">{customer.health_score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell text-xs text-slate-900 dark:text-slate-100">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-right text-xs font-medium space-x-1">
                    <button onClick={() => { setDealForCustomer(customer); setQDealTitle(`${customer.name} • ${customer.company || 'Deal'}`); setQDealValue(0); setQDealStage(DealStage.QUALIFICATION); setQDealProbability(50); setQDealExpectedClose(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16)); setQDealNotes(''); }} className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary p-0.5" title={t('deals.actions.createDeal')}>
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEmailingCustomer(customer)} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500 p-0.5" title="Send Email">
                      <EnvelopeIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => openTimeline(customer)} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 p-0.5" title="Timeline">
                      <ClockIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingCustomer(customer)} className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary p-0.5" title="Edit Customer"><EditIcon className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'kanban' ? (
        <CustomersKanbanView customers={customers} onUpdateCustomer={handleUpdateCustomer} onEmailCustomer={setEmailingCustomer} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(Segment).map(segment => {
            const segmentCustomers = sortedCustomers.filter(customer => customer.segment === segment);
            return (
              <div key={segment} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{segment}</h3>
                  <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{segmentCustomers.length}</span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {segmentCustomers.map(customer => (
                    <div key={customer.id} className="bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setDetailCustomer(customer); setDetailTab('info'); openTimeline(customer); }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{customer.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{customer.company}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{customer.email}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${statusColors[customer.status]}`}>{customer.status}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5"><div className="bg-success h-1.5 rounded-full" style={{ width: `${customer.health_score}%` }}></div></div>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400">{customer.health_score}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEmailingCustomer(customer); }} className="p-0.5 text-slate-400 hover:text-blue-600" title="Email">
                            <EnvelopeIcon className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openTimeline(customer); }} className="p-0.5 text-slate-400 hover:text-indigo-600" title="Timeline">
                            <ClockIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {segmentCustomers.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-4">No customers in this segment</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dealForCustomer && (
        <Modal title={`${t('deals.actions.createDeal')} • ${dealForCustomer.name}`} onClose={() => setDealForCustomer(null)}>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.dealTitle')}</label>
                <input type="text" value={qDealTitle} onChange={(e) => setQDealTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.valueEuro')}</label>
                <input type="number" min="0" value={qDealValue} onChange={(e) => setQDealValue(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.stage')}</label>
                <select value={qDealStage} onChange={(e) => setQDealStage(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600">
                  {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.expectedCloseDate')}</label>
                <input type="datetime-local" value={qDealExpectedClose} onChange={(e) => setQDealExpectedClose(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.probability')}</label>
                <input type="number" min="0" max="100" value={qDealProbability} onChange={(e) => setQDealProbability(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('deals.form.notes')}</label>
                <textarea rows={2} value={qDealNotes} onChange={(e) => setQDealNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600" />
              </div>
            </div>
            <div className="text-right">
              <button className="px-4 py-2 bg-primary text-white rounded-md" onClick={async () => {
                if (!user || !dealForCustomer) return;
                try {
                  await createDeal({
                    title: qDealTitle || `${dealForCustomer.name} • ${dealForCustomer.company || 'Deal'}`,
                    value: Number(qDealValue) || 0,
                    status: qDealStage,
                    expected_close_date: new Date(qDealExpectedClose).toISOString(),
                    probability: Number(qDealProbability) || 0,
                    notes: qDealNotes || undefined,
                    customer_id: dealForCustomer.id,
                  }, user.id);
                  toastContext?.showToast('Deal created.', 'success');
                  setDealForCustomer(null);
                } catch (e) {
                  toastContext?.showToast('Failed to create deal.', 'danger');
                }
              }}>{t('deals.form.saveDeal')}</button>
            </div>
          </div>
        </Modal>
      )}
      {isCreateModalOpen && (
        <Modal title={t('customers.newCustomer')} onClose={() => setIsCreateModalOpen(false)}>
          <CustomerForm onSave={handleCreateCustomer} onCancel={() => setIsCreateModalOpen(false)} />
        </Modal>
      )}

      {editingCustomer && (
        <Modal title={`${t('common.edit')} ${editingCustomer.name}`} onClose={() => setEditingCustomer(null)}>
          <CustomerForm isEdit customer={editingCustomer} onSave={(payload) => handleUpdateCustomer(payload.customer as any)} onCancel={() => setEditingCustomer(null)} />
        </Modal>
      )}

      {emailingCustomer && (
        <EmailComposer
          recipient={{ name: emailingCustomer.name, email: emailingCustomer.email }}
          onClose={() => setEmailingCustomer(null)}
          onSent={() => toastContext?.showToast(`Email sent to ${emailingCustomer.name}`, 'success')}
        />
      )}

      {detailCustomer && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailCustomer(null)}></div>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-slate-800 shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{detailCustomer.name}</h3>
              <button onClick={() => setDetailCustomer(null)} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600">{t('common.cancel')}</button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setDetailTab('info')} className={`px-3 py-1.5 rounded-md ${detailTab === 'info' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Info</button>
              <button onClick={() => setDetailTab('timeline')} className={`px-3 py-1.5 rounded-md ${detailTab === 'timeline' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{t('customers.timeline.title')}</button>
              <button onClick={() => setDetailTab('email')} className={`px-3 py-1.5 rounded-md ${detailTab === 'email' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Email</button>
            </div>
            {detailTab === 'info' && (
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-500">Email:</span> <span className="font-medium">{detailCustomer.email}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{detailCustomer.phone || '-'}</span></div>
                <div><span className="text-slate-500">Company:</span> <span className="font-medium">{detailCustomer.company}</span></div>
                <div><span className="text-slate-500">Country:</span> <span className="font-medium">{detailCustomer.country}</span></div>
                <div><span className="text-slate-500">Segment:</span> <span className="font-medium">{detailCustomer.segment}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className="font-medium">{detailCustomer.status}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-500">Health:</span> <div className="w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5"><div className="bg-success h-2.5 rounded-full" style={{ width: `${detailCustomer.health_score}%` }}></div></div> <span className="font-semibold">{detailCustomer.health_score}</span></div>
              </div>
            )}
            {detailTab === 'timeline' && (
              <div className="space-y-4">
                {timelineLoading ? (
                  <div className="py-8 text-center">{t('customers.timeline.loading')}</div>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {timelineItems.length === 0 && <li className="py-4 text-slate-500">{t('customers.timeline.noActivity')}</li>}
                    {timelineItems.map(item => (
                      <li key={item.id} className="py-3">
                        <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} • {item.channel}{item.direction ? ` (${item.direction})` : ''}</div>
                        {item.subject && <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.subject}</div>}
                        {item.message && <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.message}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">{t('header.aiAssistant')}</div>
                    {aiLoading && <div className="text-xs text-slate-500">...</div>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3 items-center">
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                      if (!timelineCustomer) return; setAiLoading(true); try { const text = await summarizeCustomer(timelineCustomer, timelineItems); setAiSummary(text); } finally { setAiLoading(false); }
                    }}>{t('aiAssistant.summarizeCustomer')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                      if (!timelineCustomer) return; setAiLoading(true); try { const email = await draftCustomerFollowUpEmail(timelineCustomer, timelineItems); setAiEmail(email); } finally { setAiLoading(false); }
                    }}>{t('aiAssistant.draftFollowUpEmail')}</button>
                    <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                      if (!timelineCustomer) return; setAiLoading(true); try { const tasks = await suggestCustomerTasks(timelineCustomer, timelineItems); setAiSuggested(tasks || []); } finally { setAiLoading(false); }
                    }}>{t('aiAssistant.suggestTasks')}</button>
                    <button className="ml-auto text-xs underline text-slate-600" onClick={() => navigate('/settings/documentation')}>{t('common.howAiHelps')}</button>
                  </div>
                  {aiSummary && (
                    <div className="mb-3 text-sm whitespace-pre-wrap bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">{aiSummary}</div>
                  )}
                  {aiSuggested.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">{t('aiAssistant.suggestedTasks')}</div>
                      <ul className="text-sm list-disc pl-5">
                        {aiSuggested.map((s, idx) => (<li key={idx}>{s.type} • {s.title}{typeof s.dueDays === 'number' ? ` • in ${s.dueDays}d` : ''}</li>))}
                      </ul>
                      <button className="mt-2 px-2 py-1 text-sm bg-success text-white rounded" onClick={async () => {
                        if (!timelineCustomer || !user) return;
                        for (const s of aiSuggested) {
                          const due = typeof s.dueDays === 'number' ? new Date(Date.now() + s.dueDays * 24 * 3600 * 1000).toISOString() : undefined;
                          const map: Record<string, TaskType> = {
                            'Follow Up Call': TaskType.FOLLOW_UP_CALL,
                            'Send Information': TaskType.SEND_INFORMATION,
                            'Send Samples': TaskType.SEND_SAMPLES,
                            'Send Quotation': TaskType.SEND_QUOTATION,
                            'Schedule Visit': TaskType.SCHEDULE_VISIT,
                          } as any;
                          const ttype = map[s.type] || TaskType.FOLLOW_UP_CALL;
                          await createTask({ user_id: user.id, customer_id: timelineCustomer.id, type: ttype, status: TaskStatus.PENDING, title: s.title, due_date: due } as any);
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
                      <button className="mt-2 px-2 py-1 text-sm bg-slate-600 text-white rounded" onClick={() => { setDetailCustomer(timelineCustomer); setDetailTab('email'); setTimelineCustomer(null); setAiEmail(null); }}>{t('aiAssistant.openInEmailComposer')}</button>
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
            {detailTab === 'email' && (
              <EmailComposer recipient={{ name: detailCustomer.name, email: detailCustomer.email }} onClose={() => setDetailTab('timeline')} onSent={() => { toastContext?.showToast(`Email sent to ${detailCustomer.name}`, 'success'); setDetailTab('timeline'); }} />
            )}
          </div>
        </div>
      )}

      {timelineCustomer && (
        <Modal title={`${t('customers.timeline.title')} • ${timelineCustomer.name}`} onClose={() => setTimelineCustomer(null)}>
          <div className="p-6 space-y-4">
            {timelineLoading ? (
              <div className="py-8 text-center">{t('customers.timeline.loading')}</div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {timelineItems.length === 0 && <li className="py-4 text-slate-500">{t('customers.timeline.noActivity')}</li>}
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
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('customers.timeline.addNote')}</label>
              <textarea value={timelineNote} onChange={e => setTimelineNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
              <div className="text-right mt-2">
                <button disabled={timelineSaving} onClick={addTimelineNote} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{timelineSaving ? '...' : t('customers.timeline.save')}</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={t('common.confirmDeletion')} onClose={() => setConfirmDelete(false)}>
          <div className="p-6">
            <p>{t('customers.deleteConfirm').replace('{count}', selectedCustomers.length.toString())}</p>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">{t('common.cancel')}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">{t('common.delete')}</button>
            </div>
          </div>
        </Modal>
      )}

      {isImportModalOpen && (
        <ImportModal
          title="Import Customers from CSV"
          requiredHeaders={['name', 'email']}
          optionalHeaders={['id', 'company', 'phone', 'country', 'segment', 'status', 'health_score', 'user_id']}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

export default Customers;