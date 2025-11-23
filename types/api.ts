
export enum ReportFrequency { DAILY = 'Daily', WEEKLY = 'Weekly', MONTHLY = 'Monthly' }
export enum ReportFormat { PDF = 'PDF', CSV = 'CSV', EXCEL = 'Excel' }
export enum ReportType { LEADS = 'Leads Data', DEALS = 'Deals Pipeline', REVENUE = 'Revenue Summary' }

export interface ScheduledReport {
    id: number;
    name: string;
    report_type: ReportType;
    frequency: ReportFrequency;
    recipients: string[];
    format: ReportFormat;
    last_run: string | null;
    next_run: string;
    include_charts?: boolean;
}

export enum ReportRunStatus { RUNNING = 'running', SUCCESS = 'success', FAILED = 'failed' }

export interface ReportRun {
    id: number;
    report_id: number;
    status: ReportRunStatus;
    started_at: string;
    finished_at: string | null;
    message?: string;
    file_size_bytes?: number;
}

export enum WebhookEvent {
    LEAD_CREATED = 'lead.created',
    LEAD_UPDATED = 'lead.updated',
    CUSTOMER_CREATED = 'customer.created',
    DEAL_STAGE_CHANGED = 'deal.stage_changed',
}

export interface Webhook {
    id: number;
    name: string;
    url: string;
    events: WebhookEvent[];
    active: boolean;
    last_triggered?: string | null;
}

export interface Integration {
    id: string;
    name: string;
    status: 'connected' | 'disconnected';
    config: Record<string, any>;
    logo?: string;
    description?: string;
}

export enum AlertType {
    CHURN_RISK = 'churn_risk',
    HOT_LEAD = 'hot_lead',
    STALE_DEAL = 'stale_deal',
    FOLLOW_UP_NEEDED = 'follow_up_needed',
}

export enum AlertPriority { HIGH = 'High', MEDIUM = 'Medium', LOW = 'Low' }

export interface Alert {
    id: string;
    type: AlertType;
    priority: AlertPriority;
    message: string;
    recommendation: string;
    relatedEntityId: number;
    relatedEntityName: string;
}
