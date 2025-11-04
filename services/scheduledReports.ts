
import type { ScheduledReport } from '../types';
import * as db from './databaseService';

export const getScheduledReports = async (): Promise<ScheduledReport[]> => {
    return db.getAll<ScheduledReport>('scheduled_reports');
};

export const createScheduledReport = async (reportData: Omit<ScheduledReport, 'id' | 'last_run' | 'next_run'>): Promise<ScheduledReport> => {
    const newReportData = {
        ...reportData,
        last_run: null,
        next_run: new Date().toISOString(), // Simplified next run calculation
    };
    return db.create<ScheduledReport>('scheduled_reports', newReportData as Omit<ScheduledReport, 'id'>);
};

export const updateScheduledReport = async (updatedReport: ScheduledReport): Promise<ScheduledReport> => {
    return db.update<ScheduledReport>('scheduled_reports', updatedReport);
};

export const deleteScheduledReport = async (reportId: number): Promise<void> => {
    return db.remove('scheduled_reports', reportId);
};

export const runReportNow = async (reportId: number): Promise<{ success: boolean; message: string }> => {
    const report = await db.getById<ScheduledReport>('scheduled_reports', reportId);
    if (!report) return { success: false, message: 'Report not found' };

    console.log(`[REPORTS] Simulating run for "${report.name}"...`);
    // In a real app, this would generate the file and email it.
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`[REPORTS] Report "${report.name}" generated and sent to ${report.recipients.join(', ')}.`);

    // Update last run time
    report.last_run = new Date().toISOString();
    await updateScheduledReport(report);
    
    return { success: true, message: `Report "${report.name}" has been generated and sent.`};
};
