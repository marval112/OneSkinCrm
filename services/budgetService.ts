import { supabase } from './supabaseClient';
import type { Customer, User, Deal } from '../types';
import { getCustomers } from './crmService';
import { DealStage } from '../types';

export type CustomerBudget = {
  id: number;
  customer_id: number;
  year: number;
  amount: number;
  created_at: string;
  updated_at: string;
};

export async function getBudgetsForCustomers(year: number, customerIds: number[]): Promise<CustomerBudget[]> {
  if (customerIds.length === 0) return [];
  const { data, error } = await supabase
    .from('customer_budgets')
    .select('*')
    .eq('year', year)
    .in('customer_id', customerIds);
  if (error) throw error;
  return (data || []) as CustomerBudget[];
}

export async function upsertBudget(customerId: number, year: number, amount: number): Promise<CustomerBudget> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('customer_budgets')
    .upsert({ customer_id: customerId, year, amount, updated_at: now }, { onConflict: 'customer_id,year' })
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomerBudget;
}

export async function listCustomersWithBudget2026(user: User): Promise<Array<Customer & { budget2026?: number }>> {
  const customers = await getCustomers(user);
  const budgets = await getBudgetsForCustomers(2026, customers.map(c => c.id));
  const map = new Map<number, number>();
  budgets.forEach(b => map.set(b.customer_id, b.amount));
  return customers.map(c => ({ ...c, budget2026: map.get(c.id) }));
}

export async function listCustomersWithBudgets(user: User, years: number[]): Promise<Array<Customer & Record<string, number | undefined>>> {
  const customers = await getCustomers(user);
  const ids = customers.map(c => c.id);
  const yearToMap = new Map<number, Map<number, number>>();
  for (const y of years) {
    try {
      const list = await getBudgetsForCustomers(y, ids);
      const map = new Map<number, number>();
      list.forEach(b => map.set(b.customer_id, Number(b.amount || 0)));
      yearToMap.set(y, map);
    } catch {
      yearToMap.set(y, new Map());
    }
  }
  return customers.map(c => {
    const extra: Record<string, number | undefined> = {};
    for (const y of years) {
      const map = yearToMap.get(y);
      extra[`budget${y}`] = map ? map.get(c.id) : undefined;
    }
    return { ...c, ...extra };
  });
}

export async function listAchievedByCustomerForYear(user: User, year: number): Promise<Record<number, number>> {
  let dealsQuery = supabase.from('deals').select('customer_id,value,"año_closed",status,user_id');
  if (user.role === 'Commercial') {
    dealsQuery = dealsQuery.eq('user_id', user.id);
  }
  const { data, error } = await dealsQuery;
  if (error) throw error;
  const rows = (data || []) as any[];
  const totals: Record<number, number> = {};
  rows.forEach(d => {
    if (!d.customer_id) return;
    const closedYear = Number((d as any)['año_closed'] || 0);
    if (closedYear !== year) return;
    if (d.status !== DealStage.CLOSED_WON) return;
    totals[d.customer_id] = (totals[d.customer_id] || 0) + Number(d.value || 0);
  });
  return totals;
}


