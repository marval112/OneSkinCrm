import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getLeads, updateLead, createLead, getCountries, convertLeadToCustomer, bulkDeleteLeads } from '../../services/crmService';
import { getUsers } from '../../services/userService';
import { scanBusinessCard } from '../../services/geminiService';
import { calculateLeadScore } from '../../services/leadScoringService';
import { exportToExcel } from '../../services/exportService';
import type { Lead, Country, User } from '../../types';
import { LeadStatus, LeadSource, Segment, DealStage } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useChat } from '../../contexts/ChatContext';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';
import { useTranslation } from '../../services/i18nService';
import LeadsKanbanView from '../common/LeadsKanbanView';
import EmailComposer from '../common/EmailComposer';
import CameraScanner from '../common/CameraScanner';
import ImportModal from '../common/ImportModal';
import { parseCSV, importLeads } from '../../services/importService';
import { listActivitiesForLead, logActivity } from '../../services/activityService';
import { summarizeLead, suggestLeadTasks, draftLeadFollowUpEmail } from '../../services/geminiService';
import { createDeal } from '../../services/crmService';
import { createTask, listTasksForLead, completeTask, updateTask } from '../../services/tasksService';
import { TaskType, TaskStatus, Task } from '../../types';
import type { ActivityLog } from '../../types';
import ScoreBadge from '../common/ScoreBadge';
import QuickDealModal from '../common/QuickDealModal';

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

const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
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

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.47-1.472L13 18.25l1.188-.648a2.25 2.25 0 011.47 1.472L16.25 20l.648-.102a2.25 2.25 0 011.47 1.472l.648 1.188-.648 1.188a2.25 2.25 0 01-1.47-1.472L16.25 20z" />
  </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;

type SortableLeadKeys = 'name' | 'company' | 'source' | 'status' | 'score' | 'created_at';
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
  onSave: (payload: {
    lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id: number },
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
  const { user } = useAuth();
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
    user_id: lead?.user_id || user?.id || 0,
  });
  const [createDealFlag, setCreateDealFlag] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState<number>(0);
  const [dealStatus, setDealStatus] = useState<DealStage>(DealStage.QUALIFICATION);
  const [dealProbability, setDealProbability] = useState<number>(50);
  const [dealExpectedClose, setDealExpectedClose] = useState<string>(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [dealNotes, setDealNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<Country[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countryData, usersData] = await Promise.all([
          getCountries(),
          getUsers() // Assuming getUsers is imported from userService
        ]);
        setCountries(countryData);
        setUsers(usersData);

        if (!lead?.country && countryData.length > 0) {
          setFormData(prev => ({ ...prev, country: countryData.find(c => c.code === 'ES')?.name || countryData[0].name }));
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
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
    setFormData(prev => ({ ...prev, [name]: name === 'user_id' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const payload: any = { lead: formData };
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
            <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="user_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Owner (Vendedor)</label>
            <select id="user_id" name="user_id" value={formData.user_id} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              {users.map(u => <option key={u.id} value={u.id}>{u.email} {u.id === user?.id ? '(You)' : ''}</option>)}
            </select>
          </div>
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
      {!isEdit && (
        <div className="mt-4 p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/40">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={createDealFlag} onChange={(e) => setCreateDealFlag(e.target.checked)} />
            <span className="text-sm font-medium">{t('leads.createDeal') || 'Create associated Deal'}</span>
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
      <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [selectedLeadForDeal, setSelectedLeadForDeal] = useState<Lead | null>(null);

  const handleSaveLeadDeal = async (dealData: any) => {
    if (!user || !selectedLeadForDeal) return;
    try {
      await createDeal({
        ...dealData,
        lead_id: selectedLeadForDeal.id
      }, user.id);
      toastContext?.showToast('Deal created successfully!', 'success');
      setDealModalOpen(false);
      setSelectedLeadForDeal(null);
    } catch (error) {
      toastContext?.showToast('Failed to create deal', 'danger');
    }
  };

  const handleAISummary = async (lead: Lead) => {
    toastContext?.showToast('Generating AI summary...', 'info');
    try {
      const summary = await summarizeLead(lead);
      toastContext?.showToast('AI summary generated!', 'success');
      console.log('AI Summary:', summary);
    } catch (error) {
      toastContext?.showToast('Failed to generate AI summary', 'danger');
    }
  };

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [emailingLead, setEmailingLead] = useState<Lead | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [view, setView] = useState<'table' | 'kanban' | 'segment'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const toastContext = useContext(ToastContext);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openChat } = useChat();
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [timelineItems, setTimelineItems] = useState<ActivityLog[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'timeline' | 'email'>('info');
  const [leadTasks, setLeadTasks] = useState<Task[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiEmail, setAiEmail] = useState<{ subject: string; body: string } | null>(null);
  const [aiSuggested, setAiSuggested] = useState<{ type: string; title: string; dueDays?: number }[]>([]);
  const [aiEmailLanguage, setAiEmailLanguage] = useState<string>('English');
  const [aiEmailDraft, setAiEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [stepInfoSent, setStepInfoSent] = useState(false);
  const [stepSamplesSent, setStepSamplesSent] = useState(false);
  const [stepPricesSent, setStepPricesSent] = useState(false);
  const [stepVisitPlanned, setStepVisitPlanned] = useState(false);
  const [visitDate, setVisitDate] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();
  // Quick create deal modal state
  const [dealForLead, setDealForLead] = useState<Lead | null>(null);
  const [qDealTitle, setQDealTitle] = useState('');
  const [qDealValue, setQDealValue] = useState<number>(0);
  const [qDealStage, setQDealStage] = useState<DealStage>(DealStage.QUALIFICATION);
  const [qDealProbability, setQDealProbability] = useState<number>(50);
  const [qDealExpectedClose, setQDealExpectedClose] = useState<string>(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [qDealNotes, setQDealNotes] = useState('');
  const [scanError, setScanError] = useState<{ message: string; modelUsed: string; imageData: string } | null>(null);

  const openTimeline = async (lead: Lead) => {
    setTimelineLead(lead);
    setTimelineLoading(true);
    try { setTimelineItems(await listActivitiesForLead(lead.id, 50)); } catch (e) { console.warn('Activities table missing?', e); }
    try {
      const tasks = await listTasksForLead(lead.id, false);
      setLeadTasks(tasks);
      setStepInfoSent(tasks.some(t => t.type === TaskType.SEND_INFORMATION && t.status === TaskStatus.COMPLETED));
      setStepSamplesSent(tasks.some(t => t.type === TaskType.SEND_SAMPLES && t.status === TaskStatus.COMPLETED));
      setStepPricesSent(tasks.some(t => t.type === TaskType.SEND_QUOTATION && t.status === TaskStatus.COMPLETED));
      setStepVisitPlanned(tasks.some(t => t.type === TaskType.SCHEDULE_VISIT));
    } catch (e) { console.warn('Tasks table missing?', e); }
    setTimelineLoading(false);
  };

  const addTimelineNote = async () => {
    if (!timelineLead || !timelineNote.trim()) return;
    setTimelineSaving(true);
    try {
      await logActivity({ user_id: user?.id || null, channel: 'note', message: timelineNote, lead_id: timelineLead.id });
      setTimelineNote('');
      setTimelineItems(await listActivitiesForLead(timelineLead.id, 50));
      toastContext?.showToast(t('leads.timeline.noteSaved'), 'success');
    } catch (e) { console.error(e); } finally { setTimelineSaving(false); }
  };

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

  // Calculate scores for all leads with breakdown
  const leadsWithScores = useMemo(() => {
    return leads.map(lead => {
      const scoreBreakdown = calculateLeadScore(lead);
      return {
        ...lead,
        calculatedScore: scoreBreakdown.total,
        scoreBreakdown
      };
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const qsStatus = searchParams.get('status');
    const qsSegment = searchParams.get('segment');
    const qsCountry = searchParams.get('country');
    const qsUserId = searchParams.get('userId');
    let sortableLeads = [...leadsWithScores].filter(lead => {
      const searchMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.country && lead.country.toLowerCase().includes(searchTerm.toLowerCase()));
      const sourceMatch = filterSource === 'all' || lead.source === filterSource;
      const statusMatch = !qsStatus || qsStatus === 'all' || String(lead.status) === qsStatus;
      const segmentMatch = !qsSegment || qsSegment === 'All' || String(lead.segment) === qsSegment;
      const countryMatch = !qsCountry || String(lead.country) === qsCountry;
      const ownerMatch = !qsUserId || String(lead.user_id) === qsUserId;
      return searchMatch && sourceMatch && statusMatch && segmentMatch && countryMatch && ownerMatch;
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
  }, [leadsWithScores, searchTerm, filterSource, sortConfig, searchParams]);

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

  const handleCreateLead = async (payload: { lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id'>, deal?: { title: string; value: number; status: DealStage; expected_close_date: string; probability: number; notes?: string } }) => {
    if (!user) return;
    try {
      const scoreBreakdown = calculateLeadScore(payload.lead as Lead);
      const created = await createLead({ ...payload.lead, score: scoreBreakdown.total }, user.id);
      if (payload.deal) {
        await createDeal({ ...payload.deal, lead_id: created.id }, user.id);
      }
      toastContext?.showToast(t('leads.createSuccess'), 'success');
      handleCloseCreateModal();
      fetchLeads();
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        toastContext?.showToast(t('leads.duplicateError'), 'warning');
      } else {
        toastContext?.showToast(t('leads.createFailure'), 'danger');
      }
    }
  };

  const handleUpdateLead = async (leadData: Lead) => {
    try {
      const scoreBreakdown = calculateLeadScore(leadData);
      // Remove computed frontend properties before sending to database
      const { calculatedScore, scoreBreakdown: _, ...dbLeadData } = leadData as any;
      await updateLead({ ...dbLeadData, score: scoreBreakdown.total });
      toastContext?.showToast(t('leads.updateSuccess'), 'success');
      setEditingLead(null);
      setInlineEditingId(null);
      fetchLeads();
    } catch (error: any) {
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
      setScanError(null); // Clear any previous errors
    } catch (error: any) {
      // Show enhanced error dialog with model info
      const modelUsed = error?.modelUsed || 'Unknown Model';
      const errorMessage = error?.message || 'Failed to scan card. Please try again.';
      setScanError({
        message: errorMessage,
        modelUsed: modelUsed,
        imageData: base64Image
      });
    }
  };

  const handleRetryScan = async () => {
    if (!scanError) return;

    toastContext?.showToast('Retrying scan...', 'info');
    try {
      const extractedData = await scanBusinessCard(scanError.imageData);
      toastContext?.showToast('Information extracted!', 'success');
      handleOpenCreateModal(extractedData);
      setScanError(null);
    } catch (error: any) {
      const modelUsed = error?.modelUsed || 'Unknown Model';
      const errorMessage = error?.message || 'Failed to scan card. Please try again.';
      setScanError({
        message: errorMessage,
        modelUsed: modelUsed,
        imageData: scanError.imageData
      });
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
      <button
        onClick={() => setView('segment')}
        className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'segment' ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
      >
        Segment
      </button>
    </div>
  )

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder={t('leads.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-white"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
          >
            <option value="all">{t('leads.allSources')}</option>
            {Object.values(LeadSource).map(source => <option key={source} value={source}>{source}</option>)}
          </select>
          <ViewSwitcher />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedLeads.length > 0 && view === 'table' && (
            <select onChange={(e) => handleBulkStatusChange(e.target.value as LeadStatus)} className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white">
              <option>{t('leads.bulkAction')}</option>
              {Object.values(LeadStatus).map(s => <option key={s} value={s}>{t('leads.changeStatusTo').replace('{status}', s)}</option>)}
            </select>

          )}
          {user?.role === 'Admin' && selectedLeads.length > 0 && view === 'table' && (
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm bg-danger text-white rounded-md hover:bg-danger-hover">{t('common.delete')}</button>
          )}
          <button onClick={() => setIsScannerOpen(true)} className="px-2 py-1 text-xs bg-slate-600 text-white rounded-md hover:bg-slate-700 flex items-center gap-1 hidden sm:flex">
            <CameraIcon className="h-3.5 w-3.5" /> Scan
          </button>
          {user?.role === 'Admin' && (
            <>
              <button onClick={() => setIsImportModalOpen(true)} className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 hidden md:inline-block">
                Import
              </button>
              <button onClick={handleExport} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden md:inline-block">
                Export
              </button>
              <button onClick={() => handleOpenCreateModal()} className="px-2 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-hover">
                Create New
              </button>
            </>
          )}
        </div>
      </div>

      {
        view === 'table' ? (
          <>
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-2 py-3 w-8"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" onChange={handleSelectAll} checked={selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length} /></th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase" style={{ maxWidth: '180px' }}>
                      <button onClick={() => requestSort('name')} className="flex items-center">Name {getSortIcon('name')}</button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell" style={{ maxWidth: '160px' }}>
                      <button onClick={() => requestSort('company')} className="flex items-center">Company {getSortIcon('company')}</button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">
                      <button onClick={() => requestSort('source')} className="flex items-center">Source {getSortIcon('source')}</button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300">
                      Segment
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                      <button onClick={() => requestSort('status')} className="flex items-center">{t('common.status')} {getSortIcon('status')}</button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden lg:table-cell">
                      <button onClick={() => requestSort('score')} className="flex items-center">Score {getSortIcon('score')}</button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">
                      <button onClick={() => requestSort('created_at')} className="flex items-center">Created {getSortIcon('created_at')}</button>
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? <TableSkeleton columns={8} rows={5} /> : filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-2 py-2 w-8"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" checked={selectedLeads.includes(lead.id)} onChange={() => handleSelectOne(lead.id)} /></td>
                      <td className="px-3 py-2" style={{ maxWidth: '180px' }} onDoubleClick={() => setEditingLead(lead)}>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {inlineEditingId === lead.id ? (
                            <InlineNameEdit lead={lead} onSave={handleUpdateLead} />
                          ) : (
                            <div className="cursor-pointer hover:underline overflow-hidden" onClick={() => { setDetailLead(lead); setDetailTab('info'); openTimeline(lead); }}>
                              <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lead.email}</div>
                            </div>
                          )}
                          {lead.notes && (
                            <div className="relative group self-start flex-shrink-0">
                              <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                {lead.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell" style={{ maxWidth: '160px' }}>
                        <div className="text-xs text-slate-900 dark:text-slate-100 truncate">{lead.company}{lead.country && `, ${lead.country}`}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell text-xs text-slate-900 dark:text-slate-100">
                        {lead.source}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                        {lead.segment && <span className="px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300">{lead.segment}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${statusColors[lead.status]}`}>{lead.status}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                        <ScoreBadge
                          score={lead.calculatedScore || 0}
                          breakdown={lead.scoreBreakdown}
                          size="sm"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell text-xs text-slate-900 dark:text-slate-100">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right text-xs font-medium space-x-1">
                        {/** Disable all lead actions when the lead is already converted (Won) */}
                        <button
                          disabled={lead.status === LeadStatus.Won}
                          onClick={() => { setDealForLead(lead); setQDealTitle(`${lead.name} • ${lead.company || 'Deal'}`); setQDealValue(0); setQDealStage(DealStage.QUALIFICATION); setQDealProbability(50); setQDealExpectedClose(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 16)); setQDealNotes(''); }}
                          className={`p-0.5 ${lead.status === LeadStatus.Won ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary'}`}
                          title={t('deals.actions.createDeal')}>
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          disabled={lead.status === LeadStatus.Won}
                          onClick={() => setEmailingLead(lead)}
                          className={`p-0.5 ${lead.status === LeadStatus.Won ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500'}`}
                          title="Send Email">
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                        <button
                          disabled={lead.status === LeadStatus.Won}
                          onClick={() => { openTimeline(lead); }}
                          className={`p-0.5 ${lead.status === LeadStatus.Won ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'}`}
                          title="Timeline">
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        {lead.status !== LeadStatus.Won && (
                          <button onClick={() => setLeadToConvert(lead)} className="text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-500 p-0.5" title={t('leads.convertAction')}>
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openChat(`Analyze this lead: ${lead.name} from ${lead.company || 'Unknown Company'}`)}
                          className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-500 p-1"
                          title="AI Insight">
                          <SparklesIcon className="h-5 w-5" />
                        </button>
                        <button
                          disabled={lead.status === LeadStatus.Won}
                          onClick={() => setEditingLead(lead)}
                          className={`p-1 ${lead.status === LeadStatus.Won ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary'}`}
                          title="Edit Lead"><EditIcon className="h-5 w-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? <TableSkeleton columns={1} rows={5} /> : filteredLeads.map(lead => (
                <div key={lead.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" onClick={() => { setDetailLead(lead); setDetailTab('info'); openTimeline(lead); }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 dark:text-white">{lead.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{lead.company}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[lead.status]}`}>
                        {lead.status}
                      </span>
                      <ScoreBadge score={lead.calculatedScore || 0} breakdown={lead.scoreBreakdown} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-slate-400" />
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>{lead.phone}</a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                    {lead.segment && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {lead.segment}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                        title="Call"
                      >
                        <PhoneIcon className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEmailingLead(lead); }}
                      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                      disabled={lead.status === LeadStatus.Won}
                      title="Send Email"
                    >
                      <EnvelopeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                      disabled={lead.status === LeadStatus.Won}
                      title="Edit"
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigate(`/deals?lead_id=${lead.id}&lead_name=${encodeURIComponent(lead.name)}&create=true`);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                      title="Create Deal"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                    {lead.status !== LeadStatus.Won && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLeadToConvert(lead); }}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full"
                        title="Convert to Customer"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAISummary(lead); }}
                      className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full"
                      title="AI Insights"
                    >
                      <SparklesIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : view === 'kanban' ? (
          <LeadsKanbanView leads={filteredLeads} onUpdateLead={handleUpdateLead} onEmailLead={setEmailingLead} />
        ) : (
          <div className="flex flex-wrap gap-4 w-full">
            {Object.values(Segment).map(segment => {
              const segmentLeads = filteredLeads.filter(lead => lead.segment === segment);
              return (
                <div key={segment} className="flex-1 min-w-[300px] bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{segment}</h3>
                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{segmentLeads.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {segmentLeads.map(lead => (
                      <div key={lead.id} className="bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setDetailLead(lead); setDetailTab('info'); openTimeline(lead); }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lead.company}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{lead.email}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${statusColors[lead.status]}`}>{lead.status}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-12 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${lead.score}%` }}></div></div>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400">{lead.score}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setEmailingLead(lead); }} className="p-0.5 text-slate-400 hover:text-blue-600" title="Email">
                              <EnvelopeIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openTimeline(lead); }} className="p-0.5 text-slate-400 hover:text-indigo-600" title="Timeline">
                              <ClockIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {segmentLeads.length === 0 && (
                      <div className="text-center text-xs text-slate-400 py-4">No leads in this segment</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {
        isMobile && (
          <button
            onClick={() => setIsScannerOpen(true)}
            className="fixed bottom-6 right-6 z-20 md:hidden flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            aria-label="Scan business card"
          >
            <CameraIcon className="w-7 h-7" />
          </button>
        )
      }

      {
        isScannerOpen && (
          <CameraScanner
            onCapture={handleScanComplete}
            onClose={() => setIsScannerOpen(false)}
          />
        )
      }

      {
        confirmDelete && (
          <Modal title={t('common.confirmDeletion')} onClose={() => setConfirmDelete(false)}>
            <div className="p-6">
              <p>Delete {selectedLeads.length} selected leads?</p>
              <div className="mt-6 flex justify-end gap-4">
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">{t('common.cancel')}</button>
                <button onClick={async () => { try { await bulkDeleteLeads(selectedLeads); toastContext?.showToast('Leads deleted.', 'success'); setSelectedLeads([]); fetchLeads(); } catch { toastContext?.showToast('Failed to delete leads.', 'danger'); } finally { setConfirmDelete(false); } }} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">{t('common.delete')}</button>
              </div>
            </div>
          </Modal>
        )
      }

      {
        isCreateModalOpen && (
          <Modal title={t('leads.newLead')} onClose={handleCloseCreateModal}>
            <LeadForm lead={prefilledData || undefined} onSave={handleCreateLead} onCancel={handleCloseCreateModal} />
          </Modal>
        )
      }

      {
        editingLead && (
          <Modal title={`${t('common.edit')} ${editingLead.name}`} onClose={() => setEditingLead(null)}>
            <LeadForm
              isEdit
              lead={editingLead}
              onSave={(payload) => {
                if (!editingLead) return;
                const updatedLead = {
                  ...editingLead,
                  ...(payload.lead as any),
                };
                handleUpdateLead(updatedLead);
              }}
              onCancel={() => setEditingLead(null)} />
          </Modal>
        )
      }

      {
        leadToConvert && (
          <Modal title={t('leads.convertConfirmTitle')} onClose={() => setLeadToConvert(null)}>
            <div className="p-6">
              <p>{t('leads.convertConfirmMessage').replace('{name}', leadToConvert.name)}</p>
              <div className="mt-6 flex justify-end gap-4">
                <button onClick={() => setLeadToConvert(null)} className="px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300">{t('common.cancel')}</button>
                <button onClick={handleConfirmConvert} className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-hover">{t('leads.convertAction')}</button>
              </div>
            </div>
          </Modal>
        )
      }

      {
        emailingLead && (
          <EmailComposer
            recipient={{ name: emailingLead.name, email: emailingLead.email }}
            leadData={emailingLead}
            onClose={() => setEmailingLead(null)}
            onSent={() => toastContext?.showToast(`Email sent to ${emailingLead.name}`, 'success')}
          />
        )
      }

      {
        detailLead && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetailLead(null)}></div>
            <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-slate-800 shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{detailLead.name}</h3>
                <button onClick={() => setDetailLead(null)} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600">Close</button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setDetailTab('info')} className={`px-3 py-1.5 rounded-md ${detailTab === 'info' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Info</button>
                <button onClick={() => setDetailTab('timeline')} className={`px-3 py-1.5 rounded-md ${detailTab === 'timeline' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Timeline</button>
                <button onClick={() => setDetailTab('email')} className={`px-3 py-1.5 rounded-md ${detailTab === 'email' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Email</button>
              </div>
              {detailTab === 'info' && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-slate-500">Email:</span> <span className="font-medium">{detailLead.email}</span></div>
                  <div><span className="text-slate-500">Phone:</span> {detailLead.phone ? <a href={`tel:${detailLead.phone}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">{detailLead.phone}</a> : <span className="font-medium">-</span>}</div>
                  <div><span className="text-slate-500">Company:</span> <span className="font-medium">{detailLead.company}</span></div>
                  <div><span className="text-slate-500">Country:</span> <span className="font-medium">{detailLead.country}</span></div>
                  <div><span className="text-slate-500">Source:</span> <span className="font-medium">{detailLead.source}</span></div>
                  <div><span className="text-slate-500">Segment:</span> <span className="font-medium">{detailLead.segment}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className="font-medium">{detailLead.status}</span></div>
                  <div className="flex items-center gap-2"><span className="text-slate-500">Score:</span> <div className="w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5"><div className="bg-primary h-2.5 rounded-full" style={{ width: `${detailLead.score}%` }}></div></div> <span className="font-semibold">{detailLead.score}</span></div>
                </div>
              )}
              {detailTab === 'timeline' && (
                <div className="space-y-4">
                  {/* Mandatory steps */}
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-sm font-semibold mb-2">Mandatory Steps</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={stepInfoSent} onChange={async (e) => {
                            const checked = e.target.checked; setStepInfoSent(checked);
                            if (detailLead && user && checked) {
                              const existing = leadTasks.find(t => t.type === TaskType.SEND_INFORMATION && t.status === TaskStatus.PENDING);
                              if (existing) {
                                await completeTask(existing.id);
                                setLeadTasks(await listTasksForLead(detailLead.id, false));
                              } else {
                                toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                              }
                            }
                          }} /> {t('leads.timeline.sendInfo')}
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={stepPricesSent} onChange={async (e) => {
                            const checked = e.target.checked; setStepPricesSent(checked);
                            if (detailLead && user && checked) {
                              const existing = leadTasks.find(t => t.type === TaskType.SEND_QUOTATION && t.status === TaskStatus.PENDING);
                              if (existing) {
                                await completeTask(existing.id);
                                setLeadTasks(await listTasksForLead(detailLead.id, false));
                              } else {
                                toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                              }
                            }
                          }} /> {t('leads.timeline.sendPrices')}
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={stepSamplesSent} onChange={async (e) => {
                            const checked = e.target.checked; setStepSamplesSent(checked);
                            if (detailLead && user && checked) {
                              const existing = leadTasks.find(t => t.type === TaskType.SEND_SAMPLES && t.status === TaskStatus.PENDING);
                              if (existing) {
                                await completeTask(existing.id);
                                setLeadTasks(await listTasksForLead(detailLead.id, false));
                              } else {
                                toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                              }
                            }
                          }} /> {t('leads.timeline.sendSamples')}
                        </label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <input type="checkbox" checked={stepVisitPlanned} onChange={(e) => setStepVisitPlanned(e.target.checked)} /> {t('leads.timeline.visitPlanned')}
                          {stepVisitPlanned && (
                            <input type="datetime-local" value={visitDate} onFocus={(e) => { try { e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { } }} onChange={e => setVisitDate(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                          )}
                          {stepVisitPlanned && visitDate && (
                            <button className="px-2 py-1 bg-primary text-white rounded-md" onClick={async () => {
                              if (!detailLead || !user) return;
                              const existing = leadTasks.find(t => t.type === TaskType.SCHEDULE_VISIT && t.status === TaskStatus.PENDING);
                              if (existing) {
                                await updateTask({ ...existing, due_date: new Date(visitDate).toISOString() } as any);
                                setLeadTasks(await listTasksForLead(detailLead.id));
                                setVisitDate('');
                              } else {
                                toastContext?.showToast('No automation task found for scheduling. Configure an automation rule.', 'info');
                              }
                            }}>{t('leads.timeline.save')}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pending tasks list */}
                  <div className="p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                    <div className="text-sm font-semibold mb-2">{t('leads.timeline.pendingTasks')}</div>
                    <ul className="text-sm list-disc pl-5">
                      {leadTasks.filter(t => t.status === TaskStatus.PENDING).length === 0 && <li className="list-none text-slate-500">Sin tareas pendientes</li>}
                      {leadTasks.filter(t => t.status === TaskStatus.PENDING).map(t => (
                        <li key={t.id}>{t.type}{t.due_date ? ` • ${new Date(t.due_date).toLocaleString()}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                  {timelineLoading ? (
                    <div className="py-8 text-center">{t('leads.timeline.loading')}</div>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {timelineItems.length === 0 && <li className="py-4 text-slate-500">No activity yet.</li>}
                      {timelineItems.map(item => (
                        <li key={item.id} className="py-3">
                          <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} • {item.channel}{item.direction ? ` (${item.direction})` : ''}</div>
                          {item.subject && <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.subject}</div>}
                          {item.message && <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.message}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('leads.timeline.addNote')}</label>
                    <textarea value={timelineNote} onChange={e => setTimelineNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                    <div className="text-right mt-2">
                      <button disabled={timelineSaving} onClick={async () => { await addTimelineNote(); setDetailTab('timeline'); }} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{timelineSaving ? '...' : t('leads.timeline.save')}</button>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'email' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-sm font-semibold mb-2">AI Email Assistant</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={aiEmailLanguage}
                        onChange={(e) => setAiEmailLanguage(e.target.value)}
                        className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Portuguese">Portuguese</option>
                        <option value="Italian">Italian</option>
                      </select>
                      <button
                        className="px-3 py-1 text-sm bg-primary text-white rounded-md disabled:bg-slate-400"
                        disabled={aiLoading}
                        onClick={async () => {
                          if (!detailLead) return;
                          setAiLoading(true);
                          try {
                            const { draftCommercialEmail } = await import('../../services/geminiService');
                            const draft = await draftCommercialEmail(detailLead.name, detailLead.company, aiEmailLanguage);
                            setAiEmailDraft(draft);
                            toastContext?.showToast('Email draft generated! Scroll down to see it in the composer.', 'success');
                          } catch (error) {
                            console.error('AI email draft error:', error);
                            toastContext?.showToast('Failed to generate email draft', 'danger');
                          } finally {
                            setAiLoading(false);
                          }
                        }}
                      >
                        {aiLoading ? 'Generating...' : 'Draft with AI'}
                      </button>
                    </div>
                    {aiEmailDraft && (
                      <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Generated Draft:</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                          <div><strong>Subject:</strong> {aiEmailDraft.subject}</div>
                          <div className="mt-2">
                            <strong>Body:</strong>
                            <div className="mt-1 text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600">
                              {aiEmailDraft.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <EmailComposer
                      recipient={{ name: detailLead.name, email: detailLead.email }}
                      initialSubject={aiEmailDraft?.subject}
                      initialBody={aiEmailDraft?.body}
                      inline={true}
                      onClose={() => { setDetailTab('timeline'); setAiEmailDraft(null); }}
                      onSent={() => { toastContext?.showToast(`Email sent to ${detailLead.name}`, 'success'); setDetailTab('timeline'); setAiEmailDraft(null); }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        dealForLead && (
          <Modal title={`${t('deals.actions.createDeal')} • ${dealForLead.name}`} onClose={() => setDealForLead(null)}>
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
                  if (!user || !dealForLead) return;
                  try {
                    await createDeal({
                      title: qDealTitle || `${dealForLead.name} • ${dealForLead.company || 'Deal'}`,
                      value: Number(qDealValue) || 0,
                      status: qDealStage,
                      expected_close_date: new Date(qDealExpectedClose).toISOString(),
                      probability: Number(qDealProbability) || 0,
                      notes: qDealNotes || undefined,
                      lead_id: dealForLead.id,
                    }, user.id);
                    toastContext?.showToast('Deal created.', 'success');
                    setDealForLead(null);
                  } catch (e) {
                    toastContext?.showToast('Failed to create deal.', 'danger');
                  }
                }}>{t('deals.form.saveDeal')}</button>
              </div>
            </div>
          </Modal>
        )
      }
      {
        timelineLead && (
          <Modal title={`Timeline • ${timelineLead.name}`} onClose={() => setTimelineLead(null)}>
            <div className="p-6 space-y-4">
              {/* Mandatory steps */}
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                <div className="text-sm font-semibold mb-2">{t('leads.timeline.mandatorySteps')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={stepInfoSent} onChange={async (e) => {
                        const checked = e.target.checked; setStepInfoSent(checked);
                        if (timelineLead && user && checked) {
                          const existing = leadTasks.find(t => t.type === TaskType.SEND_INFORMATION && t.status === TaskStatus.PENDING);
                          if (existing) {
                            await completeTask(existing.id);
                            setLeadTasks(await listTasksForLead(timelineLead.id, false));
                          } else {
                            toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                          }
                        }
                      }} /> {t('leads.timeline.sendInfo')}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={stepPricesSent} onChange={async (e) => {
                        const checked = e.target.checked; setStepPricesSent(checked);
                        if (timelineLead && user && checked) {
                          const existing = leadTasks.find(t => t.type === TaskType.SEND_QUOTATION && t.status === TaskStatus.PENDING);
                          if (existing) {
                            await completeTask(existing.id);
                            setLeadTasks(await listTasksForLead(timelineLead.id, false));
                          } else {
                            toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                          }
                        }
                      }} /> {t('leads.timeline.sendPrices')}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={stepSamplesSent} onChange={async (e) => {
                        const checked = e.target.checked; setStepSamplesSent(checked);
                        if (timelineLead && user && checked) {
                          const existing = leadTasks.find(t => t.type === TaskType.SEND_SAMPLES && t.status === TaskStatus.PENDING);
                          if (existing) {
                            await completeTask(existing.id);
                            setLeadTasks(await listTasksForLead(timelineLead.id, false));
                          } else {
                            toastContext?.showToast('No automation task found for this step. Configure an automation rule.', 'info');
                          }
                        }
                      }} /> {t('leads.timeline.sendSamples')}
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <input type="checkbox" checked={stepVisitPlanned} onChange={(e) => setStepVisitPlanned(e.target.checked)} /> {t('leads.timeline.visitPlanned')}
                      {stepVisitPlanned && (
                        <input aria-label={t('leads.timeline.pickDate')} type="datetime-local" value={visitDate} onFocus={(e) => { try { e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { } }} onChange={e => setVisitDate(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                      )}
                      {stepVisitPlanned && visitDate && (
                        <button type="button" className="px-2 py-1 bg-primary text-white rounded-md" onClick={async () => {
                          if (!timelineLead || !user) return;
                          try {
                            const existing = leadTasks.find(t => t.type === TaskType.SCHEDULE_VISIT && t.status === TaskStatus.PENDING);
                            if (existing) {
                              await updateTask({ ...existing, due_date: new Date(visitDate).toISOString() } as any);
                              setLeadTasks(await listTasksForLead(timelineLead.id));
                              setVisitDate('');
                              setStepVisitPlanned(false);
                              toastContext?.showToast(t('leads.timeline.scheduledToast'), 'success');
                            } else {
                              toastContext?.showToast('No automation task found for scheduling. Configure an automation rule.', 'info');
                            }
                          } catch (e) {
                            toastContext?.showToast(t('leads.timeline.scheduleError'), 'danger');
                          }
                        }}>{t('leads.timeline.save')}</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending tasks list */}
              <div className="p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                <div className="text-sm font-semibold mb-2">{t('leads.timeline.pendingTasks')}</div>
                <ul className="text-sm list-disc pl-5">
                  {leadTasks.filter(t => t.status === TaskStatus.PENDING).length === 0 && <li className="list-none text-slate-500">Sin tareas pendientes</li>}
                  {leadTasks.filter(t => t.status === TaskStatus.PENDING).map(t => (
                    <li key={t.id}>{t.type}{t.due_date ? ` • ${new Date(t.due_date).toLocaleString()}` : ''}</li>
                  ))}
                </ul>
              </div>

              {/* AI Assistant */}
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{t('header.aiAssistant')}</div>
                  <button className="text-xs underline text-slate-600" onClick={() => navigate('/settings/documentation')}>{t('common.howAiHelps')}</button>
                  {aiLoading && <div className="text-xs text-slate-500">...</div>}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                    if (!timelineLead) return; setAiLoading(true); try { const text = await summarizeLead(timelineLead, timelineItems); setAiSummary(text); } finally { setAiLoading(false); }
                  }}>{t('aiAssistant.summarizeLead')}</button>
                  <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                    if (!timelineLead) return; setAiLoading(true); try { const tasks = await suggestLeadTasks(timelineLead, timelineItems); setAiSuggested(tasks || []); } finally { setAiLoading(false); }
                  }}>{t('aiAssistant.suggestTasks')}</button>
                  <button className="px-2 py-1 text-sm bg-primary text-white rounded" disabled={aiLoading} onClick={async () => {
                    if (!timelineLead) return; setAiLoading(true); try { const email = await draftLeadFollowUpEmail(timelineLead, timelineItems); setAiEmail(email); } finally { setAiLoading(false); }
                  }}>{t('aiAssistant.draftFollowUpEmail')}</button>
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
                      if (!timelineLead || !user) return;
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
                        await createTask({ user_id: user.id, lead_id: timelineLead.id, type: ttype, status: TaskStatus.PENDING, title: s.title, due_date: due } as any);
                      }
                      setLeadTasks(await listTasksForLead(timelineLead.id));
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
                    <button className="mt-2 px-2 py-1 text-sm bg-slate-600 text-white rounded" onClick={() => { setDetailLead(timelineLead); setDetailTab('email'); setTimelineLead(null); setAiEmail(null); }}>{t('aiAssistant.openInEmailComposer')}</button>
                  </div>
                )}
              </div>

              {timelineLoading ? (
                <div className="py-8 text-center">{t('leads.timeline.loading')}</div>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {timelineItems.length === 0 && <li className="py-4 text-slate-500">{t('leads.timeline.noActivity')}</li>}
                  {timelineItems.map(item => (
                    <li key={item.id} className="py-3">
                      <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} • {item.channel}{item.direction ? ` (${item.direction})` : ''}</div>
                      {item.subject && <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.subject}</div>}
                      {item.message && <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.message}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('leads.timeline.addNote')}</label>
                <textarea value={timelineNote} onChange={e => setTimelineNote(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                <div className="text-right mt-2">
                  <button disabled={timelineSaving} onClick={addTimelineNote} className="px-4 py-2 rounded-md bg-primary text-white disabled:bg-slate-400">{timelineSaving ? '...' : t('leads.timeline.save')}</button>
                </div>
              </div>
            </div>
          </Modal>
        )
      }

      {
        isImportModalOpen && (
          <ImportModal
            title="Import Leads from CSV"
            requiredHeaders={['name', 'email']}
            optionalHeaders={['id', 'company', 'phone', 'country', 'segment', 'source', 'status', 'score', 'notes', 'user_id']}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImport}
          />
        )
      }

      <QuickDealModal
        isOpen={dealModalOpen}
        onClose={() => {
          setDealModalOpen(false);
          setSelectedLeadForDeal(null);
        }}
        onSave={handleSaveLeadDeal}
        lead={selectedLeadForDeal || undefined}
      />

      {/* Scan Error Dialog with Model Selector and Retry */}
      {
        scanError && (
          <Modal title={t('leads.scanError') || 'Scan Error'} onClose={() => setScanError(null)}>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    {t('leads.scanFailed') || 'Failed to extract information'}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {scanError.message}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {t('leads.modelUsed') || 'Model used'}: <span className="font-mono font-semibold">{scanError.modelUsed}</span>
                  </p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('leads.tryDifferentModel') || 'Try with a different AI model'}
                </label>
                <ModelSelector visionOnly />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setScanError(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={handleRetryScan}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('common.retry') || 'Retry Scan'}
                </button>
              </div>
            </div>
          </Modal>
        )
      }
    </div >
  );
}

export default Leads;