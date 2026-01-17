import { supabase } from './supabaseClient';
import { getDeals, getLeads } from './crmService';
import type { User } from '../types';

export type MetricType = 'revenue_monthly' | 'deals_won_monthly' | 'win_rate' | 'new_leads_monthly';
export type AlertCondition = 'above' | 'below' | 'equals';

export interface AlertConfig {
    id: string;
    user_id: number;
    metric: MetricType;
    condition: AlertCondition;
    threshold: number;
    enabled: boolean;
    name: string;
}

export interface AlertNotification {
    id: string;
    alert_id: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
    type: 'success' | 'warning' | 'info';
}

// Mock storage for alerts (in a real app, this would be in the DB)
const LOCAL_STORAGE_KEY_ALERTS = 'oneskin_crm_alerts_config';
const LOCAL_STORAGE_KEY_NOTIFICATIONS = 'oneskin_crm_alert_notifications';

export const getAlertConfigs = (): AlertConfig[] => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_ALERTS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveAlertConfig = (config: AlertConfig) => {
    const configs = getAlertConfigs();
    const existingIndex = configs.findIndex(c => c.id === config.id);

    if (existingIndex >= 0) {
        configs[existingIndex] = config;
    } else {
        configs.push(config);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY_ALERTS, JSON.stringify(configs));
    return config;
};

export const deleteAlertConfig = (id: string) => {
    const configs = getAlertConfigs().filter(c => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY_ALERTS, JSON.stringify(configs));
};

export const getNotifications = (): AlertNotification[] => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_NOTIFICATIONS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const markNotificationRead = (id: string) => {
    const notifications = getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(LOCAL_STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
};

export const clearAllNotifications = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY_NOTIFICATIONS, JSON.stringify([]));
};

export const checkAlerts = async (user: User): Promise<AlertNotification[]> => {
    const configs = getAlertConfigs().filter(c => c.enabled);
    if (configs.length === 0) return [];

    // Fetch current metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Get Deals
    const deals = await getDeals(user);
    const wonDealsThisMonth = deals.filter(d =>
        d.status === 'Closed Won' &&
        d.updated_at >= startOfMonth
    );

    const revenueMonthly = wonDealsThisMonth.reduce((sum, d) => sum + d.value, 0);
    const dealsWonCount = wonDealsThisMonth.length;

    // Win Rate (simplistic calculation for this month)
    const closedDealsThisMonth = deals.filter(d =>
        (d.status === 'Closed Won' || d.status === 'Closed Lost') &&
        d.updated_at >= startOfMonth
    );
    const winRate = closedDealsThisMonth.length > 0
        ? Math.round((dealsWonCount / closedDealsThisMonth.length) * 100)
        : 0;

    // 2. Get Leads
    const leads = await getLeads(user);
    const newLeadsCount = leads.filter(l => l.created_at >= startOfMonth).length;

    const metrics: Record<MetricType, number> = {
        'revenue_monthly': revenueMonthly,
        'deals_won_monthly': dealsWonCount,
        'win_rate': winRate,
        'new_leads_monthly': newLeadsCount
    };

    const newNotifications: AlertNotification[] = [];
    const existingNotifications = getNotifications();

    configs.forEach(config => {
        const currentValue = metrics[config.metric];
        let triggered = false;

        switch (config.condition) {
            case 'above': triggered = currentValue > config.threshold; break;
            case 'below': triggered = currentValue < config.threshold; break;
            case 'equals': triggered = currentValue === config.threshold; break;
        }

        if (triggered) {
            // Check if we already notified about this today to avoid spam
            const todayStr = new Date().toLocaleDateString();
            const alreadyNotified = existingNotifications.some(n =>
                n.alert_id === config.id &&
                new Date(n.date).toLocaleDateString() === todayStr
            );

            if (!alreadyNotified) {
                newNotifications.push({
                    id: crypto.randomUUID(),
                    alert_id: config.id,
                    title: `Alert: ${config.name}`,
                    message: `${getMetricLabel(config.metric)} is ${config.condition} ${config.threshold} (Current: ${formatMetricValue(config.metric, currentValue)})`,
                    date: new Date().toISOString(),
                    read: false,
                    type: config.condition === 'below' ? 'warning' : 'success'
                });
            }
        }
    });

    if (newNotifications.length > 0) {
        const updatedNotifications = [...newNotifications, ...existingNotifications].slice(0, 50); // Keep last 50
        localStorage.setItem(LOCAL_STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updatedNotifications));
    }

    return newNotifications;
};

export const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
        case 'revenue_monthly': return 'Monthly Revenue';
        case 'deals_won_monthly': return 'Deals Won (Month)';
        case 'win_rate': return 'Win Rate';
        case 'new_leads_monthly': return 'New Leads (Month)';
        default: return metric;
    }
};

const formatMetricValue = (metric: MetricType, value: number): string => {
    switch (metric) {
        case 'revenue_monthly': return `€${value.toLocaleString()}`;
        case 'win_rate': return `${value}%`;
        default: return value.toString();
    }
};
