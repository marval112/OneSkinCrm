import React, { useState } from 'react';
import Modal from './Modal';
import { DealStage } from '../../types';
import type { Lead, Customer } from '../../types';

interface QuickDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dealData: {
        title: string;
        value: number;
        status: DealStage;
        probability: number;
        expected_close_date: string;
        notes?: string;
    }) => void;
    lead?: Lead;
    customer?: Customer;
}

const QuickDealModal: React.FC<QuickDealModalProps> = ({
    isOpen,
    onClose,
    onSave,
    lead,
    customer
}) => {
    const entityName = lead ? lead.name : (customer ? customer.name : '');
    const entityCompany = lead ? lead.company : (customer ? customer.company : '');

    const [formData, setFormData] = useState({
        title: `Deal - ${entityName}`,
        value: 0,
        status: DealStage.QUALIFICATION,
        probability: 50,
        expected_close_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'value' || name === 'probability' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal title={`Create Deal for ${entityName}`} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                        <div className="text-sm font-medium">{entityName}</div>
                        {entityCompany && <div className="text-xs text-slate-600 dark:text-slate-400">{entityCompany}</div>}
                    </div>

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Deal Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="value" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Value (€)
                            </label>
                            <input
                                type="number"
                                id="value"
                                name="value"
                                value={formData.value}
                                onChange={handleChange}
                                step="100"
                                min="0"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Stage
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            >
                                {Object.values(DealStage).map(stage => (
                                    <option key={stage} value={stage}>{stage}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="probability" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Probability ({formData.probability}%)
                            </label>
                            <input
                                type="range"
                                id="probability"
                                name="probability"
                                value={formData.probability}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="5"
                                className="mt-1 block w-full accent-primary"
                            />
                        </div>

                        <div>
                            <label htmlFor="expected_close_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Expected Close
                            </label>
                            <input
                                type="date"
                                id="expected_close_date"
                                name="expected_close_date"
                                value={formData.expected_close_date}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:w-auto sm:text-sm"
                    >
                        Create Deal
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickDealModal;
