import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLeads, updateLead, createLead, getCountries, convertLeadToCustomer } from '../../services/crmService';
import { scanBusinessCard } from '../../services/geminiService';
import { calculateLeadScore } from '../../services/leadScoring';
import { exportToExcel } from '../../services/exportService';
import type { Lead, Country } from '../../types';
import { LeadStatus, LeadSource, Segment } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';
import { useTranslation } from '../../services/i18nService';
import LeadsKanbanView from '../common/LeadsKanbanView';
import EmailComposer from '../common/EmailComposer';
import CameraScanner from '../common/CameraScanner';
import ImportModal from '../common/ImportModal';
import { parseCSV, importLeads } from '../../services/importService';

const statusColors: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [LeadStatus.Contacted]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [LeadStatus.Qualified]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  [LeadStatus.Lost]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  [LeadStatus.Won]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);

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

const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;

type SortableLeadKeys = 'name' | 'company' | 'status' | 'score';
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortableLeadKeys;
  direction: SortDirection;
}


const LeadForm = ({
  lead,
  onSave,
  onCancel,
  isEdit = false
}: {
  lead?: Partial<Lead>,
  onSave: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
  onCancel: () => void;
  isEdit?: boolean;
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: lead?.name || '', 
        company: lead?.company || '', 
        email: lead?.email || '', 
        phone: lead?.phone || '', 
        country: lead?.country || '',
        segment: lead?.segment || Segment.INDUSTRIAL,
        status: lead?.status || LeadStatus.New, 
        source: lead?.source || LeadSource.Website, 
        score: lead?.score || 0, 
        notes: lead?.notes || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [countries, setCountries] = useState<Country[]>([]);

    useEffect(() => {
        const fetchCountriesData = async () => {
            try {
                const countryData = await getCountries();
                setCountries(countryData);
                if (!lead?.country && countryData.length > 0) {
                     setFormData(prev => ({...prev, country: countryData.find(c => c.code === 'ES')?.name || countryData[0].name }));
                }
            } catch (error) {
                console.error("Failed to fetch countries", error);
            }
        };
        fetchCountriesData();
    }, [lead]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 dark:text-slate-300">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company</label>
                        <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
                        <select id="country" name="country" value={formData.country} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="">Select country</option>
                            {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="source" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Source</label>
                        <select id="source" name="source" value={formData.source} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            {Object.values(LeadSource).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="segment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.segment')}</label>
                        <select id="segment" name="segment" value={formData.segment} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            {Object.values(Segment).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                    <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                    {isEdit ? t('common.saveChanges') : t('common.save')}
                </button>
                <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    {t('common.cancel')}
                </button>
            </div>
        </form>
    );
};

const InlineNameEdit = ({ lead, onSave }: { lead: Lead, onSave: (lead: Lead) => void }) => {
    const [name, setName] = useState(lead.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSave = () => {
        if (name.trim() && name.trim() !== lead.name) {
            onSave({ ...lead, name: name.trim() });
        } else {
            setName(lead.name);
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="w-full px-1 py-0.5 border border-primary rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white text-slate-900 dark:bg-slate-700 dark:text-white"
        />
    );
};

function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState(searchParams.get('source') || 'all');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prefilledData, setPrefilledData] = useState<Partial<Lead> | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [emailingLead, setEmailingLead] = useState<Lead | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const toastContext = useContext(ToastContext);
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const data = await getLeads(user);
        setLeads(data);
    } catch (error) {
        toastContext?.showToast('Failed to load leads.', 'danger');
    } finally {
        setLoading(false);
    }
  }, [user, toastContext]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    let sortableLeads = [...leads].filter(lead => {
        const searchMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.country && lead.country.toLowerCase().includes(searchTerm.toLowerCase()));
        const sourceMatch = filterSource === 'all' || lead.source === filterSource;
        return searchMatch && sourceMatch;
    });

    if (sortConfig !== null) {
      sortableLeads.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) {
             return 0;
        }

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

    return sortableLeads;
  }, [leads, searchTerm, filterSource, sortConfig]);

  const requestSort = (key: SortableLeadKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableLeadKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4 ml-1 inline" /> : <ChevronDownIcon className="w-4 h-4 ml-1 inline" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLeads(e.target.checked ? filteredLeads.map(l => l.id) : []);
  };

  const handleSelectOne = (id: number) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleOpenCreateModal = (data: Partial<Lead> | null = null) => {
    setPrefilledData(data);
    setIsCreateModalOpen(true);
  };
  
  const handleCloseCreateModal = () => {
    setPrefilledData(null);
    setIsCreateModalOpen(false);
  };

  const handleCreateLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) return;
    try {
        const score = calculateLeadScore(leadData as Lead);
        await createLead({ ...leadData, score }, user.id);
        toastContext?.showToast(t('leads.createSuccess'), 'success');
        handleCloseCreateModal();
        fetchLeads();
    } catch (error) {
        toastContext?.showToast(t('leads.createFailure'), 'danger');
    }
  };

  const handleUpdateLead = async (leadData: Lead) => {
    try {
        const score = calculateLeadScore(leadData);
        await updateLead({ ...leadData, score });
        toastContext?.showToast(t('leads.updateSuccess'), 'success');
        setEditingLead(null);
        setInlineEditingId(null);
        fetchLeads();
    } catch (error) {
        toastContext?.showToast(t('leads.updateFailure'), 'danger');
    }
  };
  
  const handleConfirmConvert = async () => {
    if (!leadToConvert || !user) return;
    try {
        await convertLeadToCustomer(leadToConvert, user);
        toastContext?.showToast(t('leads.convertSuccess'), 'success');
        setLeadToConvert(null);
        fetchLeads();
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            toastContext?.showToast(t('leads.convertDuplicateError'), 'danger');
        } else {
            toastContext?.showToast(t('leads.convertError'), 'danger');
        }
        setLeadToConvert(null);
    }
  };

  const handleBulkStatusChange = async (status: LeadStatus) => {
    toastContext?.showToast(t('leads.updateBulkStatus').replace('{count}', selectedLeads.length).replace('{status}', status), 'info');
    const updates = selectedLeads.map(id => {
        const lead = leads.find(l => l.id === id);
        if (lead) {
            return updateLead({ ...lead, status });
        }
        return Promise.resolve(null);
    });
    await Promise.all(updates);
    toastContext?.showToast(t('leads.updateBulkComplete'), 'success');
    setSelectedLeads([]);
    fetchLeads();
  };
  
  const handleExport = () => {
    exportToExcel(filteredLeads, 'leads_export');
    toastContext?.showToast(t('leads.exportSuccess'), 'success');
  }

  const handleScanComplete = async (base64Image: string) => {
    setIsScannerOpen(false);
    toastContext?.showToast('Scanning business card...', 'info');
    try {
        const extractedData = await scanBusinessCard(base64Image);
        toastContext?.showToast('Information extracted!', 'success');
        handleOpenCreateModal(extractedData);
    } catch (error) {
        toastContext?.showToast('Failed to scan card. Please try again.', 'danger');
    }
  };

  const handleImport = async (file: File) => {
    if (!user) return;
    try {
        const data = await parseCSV(file);
        const { successCount } = await importLeads(data, user.id);
        toastContext?.showToast(t('leads.importSuccess').replace('{count}', successCount.toString()), 'success');
        setIsImportModalOpen(false);
        fetchLeads(); // Refresh data
    } catch (error: any) {
        // re-throw to be caught by the modal
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
    </div>
  )

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
            <input type="text" placeholder={t('leads.searchPlaceholder')} className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
                <option value="all">All Sources</option>
                {Object.values(LeadSource).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ViewSwitcher />
        </div>
        <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && view === 'table' && (
                 <select onChange={(e) => handleBulkStatusChange(e.target.value as LeadStatus)} className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <option>{t('leads.bulkAction')}</option>
                    {Object.values(LeadStatus).map(s => <option key={s} value={s}>{t('leads.changeStatusTo').replace('{status}', s)}</option>)}
                </select>
            )}
            {user?.role === 'Admin' && (
                <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-hover">{t('leads.importExcel')}</button>
            )}
             <button onClick={handleExport} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">{t('leads.exportExcel')}</button>
            <button onClick={() => handleOpenCreateModal()} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover whitespace-nowrap">{t('leads.newLead')}</button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                <th className="px-6 py-3"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" onChange={handleSelectAll} checked={selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    <button onClick={() => requestSort('name')} className="flex items-center">Name {getSortIcon('name')}</button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">
                    <button onClick={() => requestSort('company')} className="flex items-center">Company {getSortIcon('company')}</button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">
                    {t('common.segment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    <button onClick={() => requestSort('status')} className="flex items-center">{t('common.status')} {getSortIcon('status')}</button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden lg:table-cell">
                    <button onClick={() => requestSort('score')} className="flex items-center">Lead Score {getSortIcon('score')}</button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('common.actions')}</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? <TableSkeleton columns={7} rows={5} /> : filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" checked={selectedLeads.includes(lead.id)} onChange={() => handleSelectOne(lead.id)} /></td>
                    <td className="px-6 py-4 whitespace-nowrap" onDoubleClick={() => setInlineEditingId(lead.id)}>
                        <div className="flex items-center gap-2">
                            {inlineEditingId === lead.id ? (
                                <InlineNameEdit lead={lead} onSave={handleUpdateLead} />
                            ) : (
                                <div>
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.name}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">{lead.email}</div>
                                </div>
                            )}
                            {lead.notes && (
                                <div className="relative group self-start">
                                    <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                        {lead.notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-slate-900 dark:text-slate-100">{lead.company}{lead.country && `, ${lead.country}`}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{lead.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {lead.segment && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300">{lead.segment}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[lead.status]}`}>{lead.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5"><div className="bg-primary h-2.5 rounded-full" style={{ width: `${lead.score}%` }}></div></div>
                            <span className="ml-2 font-semibold">{lead.score}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => setEmailingLead(lead)} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500 p-1" title="Send Email">
                            <EnvelopeIcon className="h-5 w-5" />
                        </button>
                        {lead.status !== LeadStatus.Won && (
                            <button onClick={() => setLeadToConvert(lead)} className="text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-500 p-1" title={t('leads.convertAction')}>
                                <CheckCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={() => setEditingLead(lead)} className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary p-1" title="Edit Lead"><EditIcon className="h-5 w-5" /></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      ) : (
        <LeadsKanbanView leads={filteredLeads} onUpdateLead={handleUpdateLead} onEmailLead={setEmailingLead} />
      )}

      {isMobile && (
        <button
            onClick={() => setIsScannerOpen(true)}
            className="fixed bottom-6 right-6 z-20 md:hidden flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            aria-label="Scan business card"
        >
            <CameraIcon className="w-7 h-7" />
        </button>
      )}

      {isScannerOpen && (
          <CameraScanner 
              onCapture={handleScanComplete}
              onClose={() => setIsScannerOpen(false)}
          />
      )}

      {isCreateModalOpen && (
          <Modal title={t('leads.newLead')} onClose={handleCloseCreateModal}>
              <LeadForm lead={prefilledData || undefined} onSave={handleCreateLead} onCancel={handleCloseCreateModal} />
          </Modal>
      )}

      {editingLead && (
          <Modal title={`${t('common.edit')} ${editingLead.name}`} onClose={() => setEditingLead(null)}>
              <LeadForm 
                isEdit 
                lead={editingLead} 
                onSave={(formData) => {
                  if (!editingLead) return;
                  const updatedLead = {
                    ...editingLead,
                    ...formData,
                  };
                  handleUpdateLead(updatedLead);
                }} 
                onCancel={() => setEditingLead(null)} />
          </Modal>
      )}
      
      {leadToConvert && (
          <Modal title={t('leads.convertConfirmTitle')} onClose={() => setLeadToConvert(null)}>
              <div className="p-6">
                <p>{t('leads.convertConfirmMessage').replace('{name}', leadToConvert.name)}</p>
                <div className="mt-6 flex justify-end gap-4">
                  <button onClick={() => setLeadToConvert(null)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">{t('common.cancel')}</button>
                  <button onClick={handleConfirmConvert} className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-hover">{t('leads.convertAction')}</button>
                </div>
              </div>
          </Modal>
      )}

      {emailingLead && (
        <EmailComposer
            recipient={{ name: emailingLead.name, email: emailingLead.email }}
            onClose={() => setEmailingLead(null)}
            onSent={() => toastContext?.showToast(`Email sent to ${emailingLead.name}`, 'success')}
        />
      )}

      {isImportModalOpen && (
          <ImportModal
              title="Import Leads from CSV"
              requiredHeaders={['name', 'email']}
              optionalHeaders={['id', 'company', 'phone', 'country', 'segment', 'source', 'status', 'score', 'notes', 'user_id']}
              onClose={() => setIsImportModalOpen(false)}
              onImport={handleImport}
          />
      )}
    </div>
  );
}

export default Leads;