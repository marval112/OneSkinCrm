import React, { useState, useEffect, useCallback } from 'react';
import { getLeads, getCustomers, getDeals } from '../../services/crmService';
import { generateAlertRecommendations } from '../../services/predictiveAlerts';
import type { Alert } from '../../types';
import { AlertPriority } from '../../types';
import { useAuth } from '../../contexts/AuthContext.tsx';

const priorityStyles: Record<AlertPriority, { border: string, iconBg: string, text: string, icon: React.ReactElement }> = {
    [AlertPriority.HIGH]: {
        border: 'border-danger', iconBg: 'bg-red-100', text: 'text-red-800',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
    [AlertPriority.MEDIUM]: {
        border: 'border-warning', iconBg: 'bg-yellow-100', text: 'text-yellow-800',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    [AlertPriority.LOW]: {
        border: 'border-blue-500', iconBg: 'bg-blue-100', text: 'text-blue-800',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
}

interface AlertCardProps { alert: Alert; onDismiss: (id: string) => void; }

const AlertCard: React.FC<AlertCardProps> = ({ alert, onDismiss }) => {
    const styles = priorityStyles[alert.priority];
    return (
        <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${styles.border}`}>
            <div className="flex items-start">
                <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg}`}>{styles.icon}</div>
                <div className="ml-4 flex-grow">
                    <h3 className={`text-sm font-semibold ${styles.text}`}>{alert.type.replace(/_/g, ' ').toUpperCase()} on {alert.relatedEntityName}</h3>
                    <p className="text-slate-800 mt-1">{alert.message}</p>
                    <div className="mt-3 bg-slate-50 p-3 rounded-md">
                        <h4 className="text-sm font-semibold text-slate-600">Next Best Action:</h4>
                        <p className="text-sm text-slate-600 mt-1">{alert.recommendation}</p>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
                 <button className="text-sm font-medium text-primary hover:text-primary-hover">View Entity</button>
                 <button onClick={() => onDismiss(alert.id)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Dismiss</button>
            </div>
        </div>
    )
}

function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem('dismissedAlerts');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  // Fix: Get the current user from the authentication context to fetch their data.
  const { user } = useAuth();

  const fetchAndGenerateAlerts = useCallback(async () => {
    // Fix: Ensure user exists before fetching data.
    if (!user) return;
    setLoading(true);
    try {
      // Fix: Pass the user object to the data fetching functions as required.
      const [leads, customers, deals] = await Promise.all([getLeads(user), getCustomers(user), getDeals(user)]);
      const generatedAlerts = await generateAlertRecommendations(leads, customers, deals);
      setAlerts(generatedAlerts);
    } catch (error) {
      console.error("Failed to generate alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAndGenerateAlerts();
  }, [fetchAndGenerateAlerts]);

  const handleDismiss = (alertId: string) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
  };

  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-slate-600">Analyzing data for alerts...</p>
        </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Predictive Alerts</h1>
            <button onClick={fetchAndGenerateAlerts} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200">Refresh</button>
        </div>
        {activeAlerts.length > 0 ? (
            <div className="space-y-4">
                {activeAlerts.map(alert => <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />)}
            </div>
        ) : (
            <div className="text-center bg-white p-12 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-800">All Clear!</h2>
                <p className="mt-2 text-slate-500">There are no new predictive alerts at this time.</p>
            </div>
        )}
    </div>
  );
}

export default AlertsPanel;