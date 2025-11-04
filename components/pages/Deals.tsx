import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeals, createDeal, updateDeal, getCustomers } from '../../services/crmService';
import { getUsers } from '../../services/userService';
import { exportToExcel } from '../../services/exportService';
import type { Deal, Customer, User } from '../../types';
import { DealStage } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';
import { useTranslation } from '../../services/i18nService';

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;


const DealForm = ({
  deal, customers, onSave, onCancel, isEdit = false
}: {
  deal?: Deal | null,
  customers: Customer[],
  onSave: (data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void,
  onCancel: () => void,
  isEdit?: boolean
}) => {
    const [formData, setFormData] = useState(deal || {
        title: '',
        customer_id: customers[0]?.id || 0,
        value: 0,
        status: DealStage.QUALIFICATION,
        probability: 10,
        expected_close_date: new Date().toISOString().split('T')[0],
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string,string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Deal title is required.';
        if (!formData.expected_close_date) newErrors.expected_close_date = 'Expected close date is required.';
        if (formData.value === undefined || formData.value === null || formData.value <= 0) newErrors.value = 'Value must be a positive number.';
        if (!formData.customer_id) newErrors.customer_id = 'A customer must be selected.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let parsedValue: string | number = value;
        if (name === 'customer_id' || name === 'value' || name === 'probability') {
            parsedValue = parseFloat(value) || 0;
        }
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Deal Title</label>
                    <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>
                <div>
                    <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer</label>
                    <select name="customer_id" id="customer_id" value={formData.customer_id} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
                    </select>
                    {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stage</label>
                    <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="value" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Value (€)</label>
                        <input type="number" step="100" name="value" id="value" value={formData.value} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
                    </div>
                     <div>
                        <label htmlFor="expected_close_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expected Close Date</label>
                        <input type="date" name="expected_close_date" id="expected_close_date" value={formData.expected_close_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                         {errors.expected_close_date && <p className="text-red-500 text-xs mt-1">{errors.expected_close_date}</p>}
                    </div>
                </div>
                 <div>
                    <label htmlFor="probability" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Probability ({formData.probability}%)</label>
                    <input type="range" min="0" max="100" step="5" name="probability" id="probability" value={formData.probability} onChange={handleChange} className="mt-1 block w-full accent-primary" />
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                    <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm">
                    {isEdit ? 'Save Changes' : 'Save Deal'}
                </button>
                <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
            </div>
        </form>
    );
};

type SortableDealKeys = keyof Deal | 'customerName';
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortableDealKeys;
  direction: SortDirection;
}

function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState(searchParams.get('status') || 'all');
  const [filterUser, setFilterUser] = useState(searchParams.get('userId') || 'all');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const toastContext = useContext(ToastContext);
  const { t } = useTranslation();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const promises: any[] = [getDeals(user), getCustomers(user)];
      if (user.role === 'Admin') {
        promises.push(getUsers());
      }
      const [dealsData, customersData, usersData] = await Promise.all(promises);
      setDeals(dealsData);
      setCustomers(customersData);
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

  const getCustomerName = useCallback((customerId: number) => {
    return customers.find(c => c.id === customerId)?.name || 'Unknown Customer';
  }, [customers]);

  const processedDeals = useMemo(() => {
    const dealsWithCustomerNames = deals.map(deal => ({
        ...deal,
        customerName: getCustomerName(deal.customer_id)
    }));

    let filtered = dealsWithCustomerNames.filter(deal => {
      const searchMatch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          deal.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const stageMatch = filterStage === 'all' || deal.status === filterStage;
      const userMatch = user?.role !== 'Admin' || filterUser === 'all' || deal.user_id?.toString() === filterUser;
      return searchMatch && stageMatch && userMatch;
    });

    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) return 0;

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

  const handleCreateDeal = async (dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
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
        const { customerName, ...dealToUpdate } = dealData as any;
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
       <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <input
                    type="text"
                    placeholder="Search deals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                    <option value="all">All Stages</option>
                    {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {user?.role === 'Admin' && users.length > 0 && (
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                        <option value="all">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onClick={handleExport} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">{t('deals.exportExcel')}</button>
                <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors">
                    New Deal
                </button>
            </div>
        </div>


      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                <button onClick={() => requestSort('title')} className="flex items-center">Deal Title {getSortIcon('title')}</button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden md:table-cell">
                 <button onClick={() => requestSort('customerName')} className="flex items-center">Customer {getSortIcon('customerName')}</button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                 <button onClick={() => requestSort('value')} className="flex items-center">Value {getSortIcon('value')}</button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">
                 <button onClick={() => requestSort('probability')} className="flex items-center">Probability {getSortIcon('probability')}</button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                 <button onClick={() => requestSort('status')} className="flex items-center">Stage {getSortIcon('status')}</button>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? <TableSkeleton columns={6} rows={4} /> : processedDeals.map(deal => (
              <tr key={deal.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{deal.title}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell text-slate-600">{deal.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-800 font-semibold">€{(deal.value || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell text-slate-600">{deal.probability}%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{deal.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setEditingDeal(deal as Deal)} className="text-slate-500 hover:text-primary p-1" title="Edit Deal"><EditIcon className="h-5 w-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
          <Modal title="Create New Deal" onClose={() => setIsCreateModalOpen(false)}>
              <DealForm customers={customers} onSave={handleCreateDeal} onCancel={() => setIsCreateModalOpen(false)} />
          </Modal>
      )}

       {editingDeal && (
          <Modal title={`Edit Deal: ${editingDeal.title}`} onClose={() => setEditingDeal(null)}>
              <DealForm isEdit deal={editingDeal} customers={customers} onSave={handleUpdateDeal as any} onCancel={() => setEditingDeal(null)} />
          </Modal>
      )}
    </div>
  );
}

export default Deals;
