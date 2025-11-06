import * as db from './databaseService';
import type { ActivityLog } from '../types';
import { supabase } from './supabaseClient';

export async function logActivity(activity: Omit<ActivityLog, 'id' | 'created_at'> & { created_at?: string }): Promise<ActivityLog> {
  const payload = { ...activity, created_at: activity.created_at || new Date().toISOString() } as any;
  return db.create<ActivityLog>('activities', payload);
}

export async function listActivities(limit = 50): Promise<ActivityLog[]> {
  // Note: databaseService.getAll orders by id desc
  const items = await db.getAll<ActivityLog>('activities');
  return items.slice(0, limit);
}

export async function listActivitiesForCustomer(customerId: number, limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityLog[];
}

export async function listActivitiesForLead(leadId: number, limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityLog[];
}

export async function listActivitiesForDeal(dealId: number, limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityLog[];
}


