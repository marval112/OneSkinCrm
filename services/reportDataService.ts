import { supabase } from './supabaseClient';
import type { Deal, Lead } from '../types';
import { DealStage, ReportType } from '../types';

type ReportRow = Record<string, any>;
export interface ReportFilters {
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

export async function getReportData(reportType: ReportType, filters?: ReportFilters): Promise<ReportRow[]> {
  switch (reportType) {
    case ReportType.LEADS:
      return fetchLeadsReport(filters);
    case ReportType.DEALS:
      return fetchDealsReport(filters);
    case ReportType.REVENUE:
      return fetchRevenueSummaryReport(filters);
    default:
      return [];
  }
}

async function fetchLeadsReport(filters?: ReportFilters): Promise<ReportRow[]> {
  let query = supabase
    .from('leads')
    .select('id,name,email,phone,company,country,segment,source,status,score,created_at');
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Lead[]).map(l => ({
    ID: l.id,
    Name: l.name,
    Email: l.email,
    Phone: l.phone,
    Company: l.company,
    Country: l.country,
    Segment: l.segment,
    Source: l.source,
    Status: l.status,
    Score: l.score,
    CreatedAt: l.created_at,
  }));
}

async function fetchDealsReport(filters?: ReportFilters): Promise<ReportRow[]> {
  let query = supabase
    .from('deals')
    .select('id,title,customer_id,value,status,probability,expected_close_date,created_at,updated_at');
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Deal[]).map(d => ({
    ID: d.id,
    Title: d.title,
    CustomerID: d.customer_id,
    Value: d.value,
    Stage: d.status,
    Probability: d.probability,
    ExpectedCloseDate: d.expected_close_date,
    CreatedAt: d.created_at,
    UpdatedAt: d.updated_at,
  }));
}

async function fetchRevenueSummaryReport(filters?: ReportFilters): Promise<ReportRow[]> {
  let query = supabase
    .from('deals')
    .select('value,status,expected_close_date');
  if (filters?.from) query = query.gte('expected_close_date', filters.from);
  if (filters?.to) query = query.lte('expected_close_date', filters.to);
  const { data, error } = await query;
  if (error) throw error;

  const closedWon = (data as Pick<Deal, 'value' | 'status' | 'expected_close_date'>[])
    .filter(d => d.status === DealStage.CLOSED_WON);

  const monthKey = (iso: string | null | undefined): string => {
    if (!iso) return 'Unknown';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Unknown';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const totals = new Map<string, number>();
  for (const deal of closedWon) {
    const key = monthKey(deal.expected_close_date as any);
    totals.set(key, (totals.get(key) || 0) + (Number(deal.value) || 0));
  }

  // Sort by month ascending
  const sortedKeys = Array.from(totals.keys()).sort();
  return sortedKeys.map(k => ({ Month: k, Revenue: totals.get(k) || 0 }));
}


