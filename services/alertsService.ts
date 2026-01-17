import type { Alert } from '../types';
import * as db from './databaseService';

// Persisted alerts in Supabase
export const getAutomationAlerts = async (): Promise<Alert[]> => {
  try {
    return await db.getAll<Alert>('automation_alerts' as any);
  } catch {
    return [];
  }
};

export const addAutomationAlert = async (alert: Omit<Alert, 'id'> & { id?: string, rule_title?: string }): Promise<Alert> => {
  const payload: any = {
    type: alert.type,
    priority: alert.priority,
    message: alert.message,
    recommendation: alert.recommendation || '',
    related_entity_id: alert.relatedEntityId,
    related_entity_name: alert.relatedEntityName,
    rule_title: (alert as any).rule_title || null,
  };
  return await db.create<Alert>('automation_alerts' as any, payload);
};

export const removeAutomationAlert = async (id: string | number): Promise<void> => {
  await db.remove('automation_alerts' as any, id);
};


