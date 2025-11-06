
import type { ScheduledReport } from '../types';
import { ReportFrequency } from '../types';
import * as db from './databaseService';
import { getDeliverySettings, sendReportWithRetries } from './reportDeliveryService';
import { logRunStart, logRunSuccess, logRunFailure } from './reportRunsService';

function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
}

function calculateNextRun(from: Date, frequency: ReportFrequency): string {
    const base = new Date(from.getTime());
    let next: Date;
    switch (frequency) {
        case ReportFrequency.DAILY:
            next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
            break;
        case ReportFrequency.WEEKLY:
            next = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case ReportFrequency.MONTHLY:
            next = addMonths(base, 1);
            break;
        default:
            next = new Date(base.getTime() + 24 * 60 * 60 * 1000);
    }
    return next.toISOString();
}

export const getScheduledReports = async (): Promise<ScheduledReport[]> => {
    return db.getAll<ScheduledReport>('scheduled_reports');
};

export const createScheduledReport = async (reportData: Omit<ScheduledReport, 'id' | 'last_run' | 'next_run'>): Promise<ScheduledReport> => {
    const newReportData = {
        ...reportData,
        last_run: null,
        next_run: calculateNextRun(new Date(), reportData.frequency),
        include_charts: reportData.include_charts !== false,
    };
    return db.create<ScheduledReport>('scheduled_reports', newReportData as Omit<ScheduledReport, 'id'>);
};

export const updateScheduledReport = async (updatedReport: ScheduledReport): Promise<ScheduledReport> => {
    const payload = { ...updatedReport };
    if (!payload.next_run) {
        payload.next_run = calculateNextRun(new Date(), payload.frequency as ReportFrequency);
    }
    return db.update<ScheduledReport>('scheduled_reports', payload);
};

export const deleteScheduledReport = async (reportId: number): Promise<void> => {
    return db.remove('scheduled_reports', reportId);
};

export const runReportNow = async (reportId: number): Promise<{ success: boolean; message: string }> => {
    const report = await db.getById<ScheduledReport>('scheduled_reports', reportId);
    if (!report) return { success: false, message: 'Report not found' };

    const run = await logRunStart(reportId);
    try {
        const settings = getDeliverySettings();
        let sent = false;
        let anyDelivered = false;
        if (settings.sendOnRun && settings.webhookUrl) {
            const res = await sendReportWithRetries(report, undefined, settings.retryCount, settings.backoffMs);
            if (res.ok) anyDelivered = true; else await logRunFailure(run, res.error || `Webhook failed (${res.status ?? ''})`);
        }
        if (settings.emailEnabled && settings.sendgridApiKey && settings.fromEmail) {
            // reuse retry wrapper by adapting function? Simple loop here
            let attempt = 0; let ok = false; let lastErr: string | undefined;
            while (attempt <= settings.retryCount && !ok) {
                const r = await (await import('./reportDeliveryService')).sendReportViaEmail(report, undefined);
                if (r.ok) { ok = true; anyDelivered = true; break; }
                lastErr = r.error || `Email failed (${r.status ?? ''})`;
                attempt++; if (attempt <= settings.retryCount) await new Promise(res => setTimeout(res, settings.backoffMs));
            }
            if (!ok) await logRunFailure(run, lastErr || 'Email failed');
        }

        report.last_run = new Date().toISOString();
        // also advance next_run
        // @ts-ignore frequency exists in ScheduledReport
        report.next_run = calculateNextRun(new Date(), report.frequency as ReportFrequency);
        await db.update<ScheduledReport>('scheduled_reports', report);
        await logRunSuccess(run, sent ? 'Delivered via webhook' : 'Generated without delivery');
        return { success: true, message: sent ? 'Report generated and delivered.' : 'Report generated.' };
    } catch (e: any) {
        await logRunFailure(run, e?.message || 'Unexpected error');
        return { success: false, message: 'Run failed' };
    }
};

export const getDueReports = async (): Promise<ScheduledReport[]> => {
    const all = await db.getAll<ScheduledReport>('scheduled_reports');
    const nowIso = new Date().toISOString();
    return all.filter(r => r.next_run && r.next_run <= nowIso);
};

export const runDueReports = async (): Promise<{ processed: number }> => {
    const due = await getDueReports();
    for (const r of due) {
        try { await runReportNow(r.id); } catch {}
    }
    return { processed: due.length };
};
