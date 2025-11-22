import { supabase } from './supabaseClient';
import * as db from './databaseService';
import type { Task, TaskStatus, TaskType } from '../types';

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'> & { completed_at?: string | null }): Promise<Task> {
  // @ts-expect-error generic typing of db.create
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

export { TaskStatus, TaskType };


