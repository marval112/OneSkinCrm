import * as db from './databaseService';
import type { ReportRun } from '../types';
import { ReportRunStatus } from '../types';

export async function logRunStart(reportId: number): Promise<ReportRun> {
  const payload: Omit<ReportRun, 'id'> = {
    report_id: reportId,
    status: ReportRunStatus.RUNNING,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  // @ts-expect-error generic typing: db.create infers return
  return db.create<ReportRun>('report_runs', payload as any);
}

export async function logRunSuccess(run: ReportRun, message: string, fileSizeBytes?: number): Promise<ReportRun> {
  const updated: ReportRun = {
    ...run,
    status: ReportRunStatus.SUCCESS,
    finished_at: new Date().toISOString(),
    message,
    file_size_bytes: fileSizeBytes,
  };
  return db.update<ReportRun>('report_runs', updated);
}

export async function logRunFailure(run: ReportRun, errorMessage: string): Promise<ReportRun> {
  const updated: ReportRun = {
    ...run,
    status: ReportRunStatus.FAILED,
    finished_at: new Date().toISOString(),
    message: errorMessage,
  };
  return db.update<ReportRun>('report_runs', updated);
}

export async function getRunsForReport(reportId: number, limit = 20): Promise<ReportRun[]> {
  // Direct query via Supabase: order by started_at desc and limit
  // Falling back to getAll and filter would be inefficient; this relies on DB capability.
  // We'll use supabase client through databaseService constraints are limited; do manual fetch:
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('./supabaseClient');
  const { data, error } = await supabase
    .from('report_runs')
    .select('*')
    .eq('report_id', reportId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ReportRun[];
}


