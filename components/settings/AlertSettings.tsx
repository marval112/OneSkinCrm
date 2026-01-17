import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
    getAlertConfigs,
    saveAlertConfig,
    deleteAlertConfig,
    AlertConfig,
    MetricType,
    AlertCondition,
    getMetricLabel
} from '../../services/alertService';
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const AlertSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useContext(ToastContext);
    const [alerts, setAlerts] = useState<AlertConfig[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [metric, setMetric] = useState<MetricType>('revenue_monthly');
    const [condition, setCondition] = useState<AlertCondition>('below');
    const [threshold, setThreshold] = useState<number>(10000);
    const [name, setName] = useState('');

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = () => {
        setAlerts(getAlertConfigs());
    };

    const handleDelete = (id: string) => {
        deleteAlertConfig(id);
        loadAlerts();
        toast?.showToast('Alert deleted', 'success');
    };

    const handleSave = () => {
        if (!user) return;
        if (!name.trim()) {
            toast?.showToast('Please provide a name for the alert', 'danger');
            return;
        }

        const newAlert: AlertConfig = {
            id: crypto.randomUUID(),
            user_id: user.id,
            metric,
            condition,
            threshold,
            enabled: true,
            name
        };

        saveAlertConfig(newAlert);
        loadAlerts();
        setIsModalOpen(false);
        resetForm();
        toast?.showToast('Alert created successfully', 'success');
    };

    const resetForm = () => {
        setName('');
        setMetric('revenue_monthly');
        setCondition('below');
        setThreshold(10000);
    };

    const toggleAlert = (alert: AlertConfig) => {
        saveAlertConfig({ ...alert, enabled: !alert.enabled });
        loadAlerts();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/settings')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                    <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Intelligent Alerts</h2>
                    <p className="text-slate-500 dark:text-slate-400">Get notified when key metrics hit specific thresholds.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Your Alerts</h3>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Create Alert
                    </button>
                </div>

                {alerts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No alerts configured yet. Create one to get started!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={alert.enabled}
                                            onChange={() => toggleAlert(alert)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-white">{alert.name}</h4>
                                        <p className="text-sm text-slate-500">
                                            Notify when <strong>{getMetricLabel(alert.metric)}</strong> is <strong>{alert.condition}</strong> {alert.threshold}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(alert.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
                        <h3 className="text-xl font-bold mb-4">Create New Alert</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Alert Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g., Low Revenue Warning"
                                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Metric</label>
                                <select
                                    value={metric}
                                    onChange={e => setMetric(e.target.value as MetricType)}
                                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                                >
                                    <option value="revenue_monthly">Monthly Revenue</option>
                                    <option value="deals_won_monthly">Deals Won (Month)</option>
                                    <option value="win_rate">Win Rate</option>
                                    <option value="new_leads_monthly">New Leads (Month)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Condition</label>
                                    <select
                                        value={condition}
                                        onChange={e => setCondition(e.target.value as AlertCondition)}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value="above">Above</option>
                                        <option value="below">Below</option>
                                        <option value="equals">Equals</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Threshold</label>
                                    <input
                                        type="number"
                                        value={threshold}
                                        onChange={e => setThreshold(Number(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
                            >
                                Create Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertSettings;
