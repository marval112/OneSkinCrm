export interface CustomReport {
    id: string;
    name: string;
    dataSource: 'leads' | 'customers' | 'deals';
    fields: string[]; // Selected columns to display
    groupBy?: string; // Optional grouping field
    aggregations?: Record<string, 'count' | 'sum' | 'avg'>; // Optional aggregations for numeric fields
    filters?: Record<string, any>;
    createdAt: string;
}

const STORAGE_KEY = 'custom_reports';

export const getCustomReports = (): CustomReport[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load custom reports', e);
        return [];
    }
};

export const saveCustomReport = (report: Omit<CustomReport, 'id' | 'createdAt'>): CustomReport => {
    const reports = getCustomReports();
    const newReport: CustomReport = {
        ...report,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return newReport;
};

export const deleteCustomReport = (id: string): void => {
    const reports = getCustomReports();
    const filtered = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getCustomReportById = (id: string): CustomReport | null => {
    const reports = getCustomReports();
    return reports.find(r => r.id === id) || null;
};

// Available fields for each data source
export const AVAILABLE_FIELDS = {
    leads: ['id', 'name', 'email', 'phone', 'company', 'country', 'segment', 'source', 'status', 'score', 'created_at', 'updated_at'],
    customers: ['id', 'name', 'email', 'phone', 'company', 'country', 'segment', 'status', 'health_score', 'last_contact', 'created_at'],
    deals: ['id', 'title', 'customer_id', 'lead_id', 'value', 'status', 'probability', 'expected_close_date', 'created_at', 'updated_at']
};

// Numeric fields that can be aggregated
export const NUMERIC_FIELDS = {
    leads: ['score'],
    customers: ['health_score'],
    deals: ['value', 'probability']
};
