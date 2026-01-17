import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeads, getCustomers, getDeals } from '../../services/crmService';
import { generateAlertRecommendations } from '../../services/predictiveAlerts';
import { getAutomationAlerts, removeAutomationAlert } from '../../services/alertsService';
import { checkAlerts, getNotifications, markNotificationRead, AlertNotification } from '../../services/alertService';
import type { Alert } from '../../types';
import { AlertPriority } from '../../types';
import { useAuth } from '../../contexts/AuthContext.tsx';
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const InformationCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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
  const navigate = useNavigate();

  const handleViewEntity = () => {
    const typeStr = String(alert.type).toLowerCase();
    if (typeStr.includes('lead') || typeStr === 'hot_lead' || typeStr === 'follow_up_needed') {
      navigate(`/leads`);
    } else if (typeStr.includes('customer') || typeStr === 'churn_risk') {
      navigate(`/customers`);
    } else if (typeStr.includes('deal') || typeStr === 'stale_deal') {
      navigate(`/deals`);
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${styles.border}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg}`}>{styles.icon}</div>
        <div className="ml-4 flex-grow">
          <h3 className={`text-sm font-semibold ${styles.text}`}>{alert.type.replace(/_/g, ' ').toUpperCase()} on {alert.relatedEntityName}</h3>
          <p className="text-sm text-slate-800 mt-1">{alert.message}</p>
          <div className="mt-3 bg-slate-50 p-3 rounded-md">
            <h4 className="text-sm font-semibold text-slate-600">Next Best Action:</h4>
            <p className="text-sm text-slate-600 mt-1">{alert.recommendation}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={handleViewEntity} className="text-sm font-medium text-primary hover:text-primary-hover">View Entity</button>
        <button onClick={() => onDismiss(alert.id)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Dismiss</button>
      </div>
    </div>
  )
}

const NotificationCard: React.FC<{ notification: AlertNotification; onRead: (id: string) => void }> = ({ notification, onRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'warning': return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      default: return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()} flex items-start gap-3`}>
      <div className="flex-shrink-0 mt-1">{getIcon()}</div>
      <div className="flex-grow">
        <h4 className="text-sm font-semibold text-slate-900">{notification.title}</h4>
        <p className="text-sm text-slate-700">{notification.message}</p>
        <p className="text-xs text-slate-500 mt-1">{new Date(notification.date).toLocaleString()}</p>
      </div>
      {!notification.read && (
        <button onClick={() => onRead(notification.id)} className="text-xs text-primary hover:underline whitespace-nowrap">
          Mark as Read
        </button>
      )}
    </div>
  );
};

function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAndGenerateAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Predictive Alerts
      const [leads, customers, deals, automation] = await Promise.all([getLeads(user), getCustomers(user), getDeals(user), getAutomationAlerts()]);
      const generatedAlerts = await generateAlertRecommendations(leads, customers, deals);
      setAlerts([...automation, ...generatedAlerts]);

      // 2. Check & Fetch Intelligent Alerts (Notifications)
      await checkAlerts(user); // Run check
      setNotifications(getNotifications().filter(n => !n.read)); // Only show unread

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
    try { removeAutomationAlert(alertId); } catch { }
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Alerts Center</h1>
          <p className="text-sm text-slate-500">Monitor predictive insights and metric notifications.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/settings/alerts')} className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-white">
            Configure Alerts
          </button>
          <button onClick={fetchAndGenerateAlerts} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover">
            Refresh
          </button>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            New Notifications
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {notifications.map(n => (
              <NotificationCard key={n.id} notification={n} onRead={handleMarkRead} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Predictive Insights</h2>
        {activeAlerts.length > 0 ? (
          <div className="space-y-4">
            {activeAlerts.map(alert => <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />)}
          </div>
        ) : (
          <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500">No predictive alerts at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;