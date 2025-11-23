import { supabase } from './supabaseClient';
import * as db from './databaseService';
import type { Task, TaskStatus, TaskType } from '../types';

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'> & { completed_at?: string | null }): Promise<Task> {
  return db.create<Task>('tasks', task as any);
}

export async function updateTask(task: Task): Promise<Task> {
  return db.update<Task>('tasks', task);
}

export async function deleteTask(taskId: number): Promise<void> {
  return db.remove('tasks', taskId);
}

export async function completeTask(taskId: number): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'Completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export async function listTasksForLead(leadId: number, onlyPending = true): Promise<Task[]> {
  let query = supabase.from('tasks').select('*').eq('lead_id', leadId);
  if (onlyPending) query = query.eq('status', 'Pending');
  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as Task[];
}

export async function listTasksForUser(userId: number, onlyPending = true): Promise<Task[]> {
  let query = supabase.from('tasks').select('*').eq('user_id', userId);
  if (onlyPending) query = query.eq('status', 'Pending');
  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as Task[];
}

export async function getTaskCounts(userId: number): Promise<{ pending: number; overdue: number; today: number }> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const pendingPromise = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'Pending');

  const overduePromise = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'Pending')
    .lt('due_date', startToday);

  const todayPromise = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'Pending')
    .gte('due_date', startToday)
    .lte('due_date', endToday);

  const [pendingRes, overdueRes, todayRes] = await Promise.all([pendingPromise, overduePromise, todayPromise]);

  return {
    pending: pendingRes.count || 0,
    overdue: overdueRes.count || 0,
    today: todayRes.count || 0,
  };
}

export { TaskStatus, TaskType };


