import type { Lead, Customer } from '../types';
import { LeadStatus, LeadSource, CustomerStatus, TaskType, TaskStatus } from '../types';
import { createTask } from './tasksService';
import * as db from './databaseService';
import { addAutomationAlert } from './alertsService';

// --- TYPES ---

export enum TriggerType {
  LEAD_CREATED = 'lead_created',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  CUSTOMER_LIFECYCLE_CHANGED = 'customer_lifecycle_changed',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
}

export interface Condition {
  field: string; // e.g., 'status', 'score', 'company'
  operator: ConditionOperator;
  value: any; // e.g., 'Qualified', 80, 'Archviz Studios'
}

export enum ActionType {
  SEND_EMAIL = 'send_email',
  CREATE_TASK = 'create_task',
  UPDATE_FIELD = 'update_field',
  SHOW_NOTIFICATION = 'show_notification',
}

export interface Action {
  type: ActionType;
  params: { [key: string]: any }; // e.g., { to: '{{email}}', subject: 'Welcome' } or { field: 'status', value: 'Contacted' }
}

export interface Rule {
  id: number;
  name: string;
  trigger: TriggerType;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
}

// --- METADATA FOR RULE BUILDER UI ---

export const TRIGGER_METADATA = {
    [TriggerType.LEAD_CREATED]: {
        name: 'Lead is Created',
        fields: {
            source: { label: 'Source', type: 'enum', options: Object.values(LeadSource) },
            score: { label: 'Score', type: 'number' },
            company: { label: 'Company', type: 'string' },
            country: { label: 'Country', type: 'string' },
        }
    },
    [TriggerType.LEAD_STATUS_CHANGED]: {
        name: 'Lead Status Changes',
        fields: {
            status: { label: 'New Status', type: 'enum', options: Object.values(LeadStatus) },
            score: { label: 'Score', type: 'number' }
        }
    },
    [TriggerType.CUSTOMER_LIFECYCLE_CHANGED]: {
        name: 'Customer Status Changes',
        fields: {
            status: { label: 'New Status', type: 'enum', options: Object.values(CustomerStatus) },
            health_score: { label: 'Health Score', type: 'number' }
        }
    }
};

export const ACTION_METADATA = {
    [ActionType.SEND_EMAIL]: {
        name: 'Send Email',
        params: {
            to: { label: 'Recipient Email', type: 'string', placeholder: 'e.g., {{email}} or team@example.com' },
            template: { label: 'Email Template ID', type: 'string', placeholder: 'e.g., welcome_high_value_lead' }
        }
    },
    [ActionType.CREATE_TASK]: {
        name: 'Create Task',
        params: {
            taskType: { label: 'Task Type', type: 'enum', options: Object.values(TaskType) },
            title: { label: 'Task Title', type: 'string', placeholder: 'e.g., Call new lead {{name}}' },
            assignedTo: { label: 'Assigned To', type: 'string', placeholder: 'e.g., sales_manager' }
        }
    },
    [ActionType.UPDATE_FIELD]: {
        name: 'Update Field',
        params: {
            field: { label: 'Field to Update', type: 'string' },
            value: { label: 'New Value', type: 'string' }
        }
    },
    [ActionType.SHOW_NOTIFICATION]: {
        name: 'Show Notification',
        params: {
            message: { label: 'Notification Message', type: 'string', placeholder: 'e.g., Lead {{name}} has been won!' }
        }
    }
};

// --- PERSISTENCE (Supabase) ---

const seedRules: Rule[] = [
  {
    id: 1,
    name: 'Follow up on new high-value website leads',
    trigger: TriggerType.LEAD_CREATED,
    conditions: [
      { field: 'source', operator: ConditionOperator.EQUALS, value: 'Website' },
      { field: 'score', operator: ConditionOperator.GREATER_THAN, value: 75 }
    ],
    actions: [
      { type: ActionType.CREATE_TASK, params: { title: 'High-priority: Call new lead {{name}}', assignedTo: 'sales_manager' } },
      { type: ActionType.SEND_EMAIL, params: { to: '{{email}}', template: 'welcome_high_value_lead' } }
    ],
    enabled: true,
  },
  {
    id: 2,
    name: 'Notify team when a lead is won',
    trigger: TriggerType.LEAD_STATUS_CHANGED,
    conditions: [
      { field: 'status', operator: ConditionOperator.EQUALS, value: 'Won' },
    ],
    actions: [
      { type: ActionType.SHOW_NOTIFICATION, params: { message: '🎉 Lead {{name}} from {{company}} has been won!' } },
    ],
    enabled: true,
  },
  {
    id: 3,
    name: 'Lead Creation generic automation',
    trigger: TriggerType.LEAD_CREATED,
    conditions: [],
    actions: [
      { type: ActionType.CREATE_TASK, params: { taskType: 'Send Information', title: 'Send information requested', assignedTo: 'owner' } },
      { type: ActionType.CREATE_TASK, params: { taskType: 'Send Quotation',  title: 'Send prices', assignedTo: 'owner' } },
      { type: ActionType.CREATE_TASK, params: { taskType: 'Send Samples',    title: 'Send samples', assignedTo: 'owner' } },
      { type: ActionType.CREATE_TASK, params: { taskType: 'Schedule Visit',  title: 'Visit scheduled', assignedTo: 'owner' } },
    ],
    enabled: true,
  }
];
// Simulate network delay for UI consistency

// Simulate API delay
const delay = <T,>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));


// --- LOGIC ---

/**
 * Evaluates if a single condition is met by the data object.
 */
const evaluateCondition = (dataValue: any, operator: ConditionOperator, conditionValue: any): boolean => {
  switch (operator) {
    case ConditionOperator.EQUALS:
      // Using == for loose comparison (e.g., 50 == "50") which can be useful here.
      return dataValue == conditionValue;
    case ConditionOperator.NOT_EQUALS:
      return dataValue != conditionValue;
    case ConditionOperator.GREATER_THAN:
      return dataValue > conditionValue;
    case ConditionOperator.LESS_THAN:
      return dataValue < conditionValue;
    case ConditionOperator.CONTAINS:
      if (typeof dataValue === 'string' && typeof conditionValue === 'string') {
        return dataValue.toLowerCase().includes(conditionValue.toLowerCase());
      }
      return false;
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
};

/**
 * Checks if a data object (Lead or Customer) meets all specified conditions.
 */
const evaluateConditions = (data: Lead | Customer, conditions: Condition[]): boolean => {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means the rule should always run.
  }
  // 'every' ensures all conditions must be true (AND logic).
  return conditions.every(condition => {
    // Allows accessing nested properties if needed in the future, e.g., 'details.address'
    const dataValue = condition.field.split('.').reduce((o, i) => o?.[i], data);
    if (dataValue === undefined) {
      return false; // Field does not exist on the object.
    }
    return evaluateCondition(dataValue, condition.operator, condition.value);
  });
};

/**
 * Executes a single action, simulating side-effects like sending emails or creating tasks.
 */
const executeAction = (action: Action, data: Lead | Customer): void => {
  console.log(`[AUTOMATION] Executing action: ${action.type} for ${data.name}`);

  // Replace placeholders like {{name}} or {{company}} with actual data.
  const resolveParams = (params: { [key: string]: any }) => {
    const resolved: { [key: string]: any } = {};
    for (const key in params) {
        let value = params[key];
        if (typeof value === 'string') {
            const matches = value.match(/{{(.*?)}}/g);
            if (matches) {
                matches.forEach(match => {
                    const path = match.replace(/{{|}}/g, '');
                    const resolvedValue = path.split('.').reduce((o, i) => o?.[i], data);
                    value = value.replace(match, resolvedValue !== undefined ? String(resolvedValue) : '');
                });
            }
        }
        resolved[key] = value;
    }
    return resolved;
  };
  
  const resolvedParams = resolveParams(action.params);

  switch (action.type) {
    case ActionType.SEND_EMAIL:
      console.log(`[AUTOMATION] Simulating sending email to ${resolvedParams.to} with template: ${resolvedParams.template}`);
      // In a real app, this would integrate with an email service API.
      break;
    case ActionType.CREATE_TASK:
      console.log(`[AUTOMATION] Simulating creating task: "${resolvedParams.title}" for user ${resolvedParams.assignedTo}`);
      // In a real app, this would call a task management service API.
      break;
    case ActionType.UPDATE_FIELD:
      console.log(`[AUTOMATION] Simulating update of field "${resolvedParams.field}" to "${resolvedParams.value}" on ${data.name}`);
      // In a real implementation, this would likely return the required update
      // for the calling service to apply and persist.
      break;
    case ActionType.SHOW_NOTIFICATION:
      console.log(`[AUTOMATION] Simulating showing notification: "${resolvedParams.message}"`);
      // This would require integration with a UI notification system.
      break;
    default:
      console.warn(`[AUTOMATION] Unknown action type: ${action.type}`);
  }
};


// --- EXPORTED API ---

/**
 * Retrieves all automation rules.
 */
export const getRules = async (): Promise<Rule[]> => {
    const list = await db.getAll<Rule>('automation_rules' as any);
    if (list.length === 0) {
        // Seed initial rules
        await db.upsert<Rule>('automation_rules' as any, seedRules.map(r => ({
            name: r.name,
            trigger: r.trigger,
            conditions: r.conditions,
            actions: r.actions,
            enabled: r.enabled,
        }) as any));
        return await db.getAll<Rule>('automation_rules' as any);
    }
    return list;
};

/**
 * Retrieves a single rule by ID.
 */
export const getRuleById = async (id: number): Promise<Rule | undefined> => {
    const r = await db.getById<Rule>('automation_rules' as any, id);
    return r ?? undefined;
};

/**
 * Creates a new automation rule.
 */
export const createRule = async (ruleData: Omit<Rule, 'id'>): Promise<Rule> => {
    return db.create<Rule>('automation_rules' as any, ruleData as any);
};

/**
 * Updates an existing automation rule.
 */
export const updateRule = async (updatedRule: Rule): Promise<Rule> => {
    return db.update<Rule>('automation_rules' as any, updatedRule as any);
};

/**
 * Deletes an automation rule by its ID.
 */
export const deleteRule = async (ruleId: number): Promise<void> => {
    return db.remove('automation_rules' as any, ruleId);
};

/**
 * Clones an existing rule creating a new one with a new id and "(Copy)" suffix.
 * The clone is created disabled by default to avoid unintended execution.
 */
export const cloneRule = async (ruleId: number): Promise<Rule> => {
    const original = await getRuleById(ruleId);
    if (!original) throw new Error('Rule not found');
    const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));
    return db.create<Rule>('automation_rules' as any, {
        name: `${original.name} (Copy)`,
        trigger: original.trigger,
        conditions: deepClone(original.conditions),
        actions: deepClone(original.actions),
        enabled: false,
    } as any);
};

/**
 * Executes a single rule against a data object.
 * Checks if the rule is enabled and if its conditions are met before executing actions.
 */
export const executeRule = async (rule: Rule, data: Lead | Customer): Promise<void> => {
    if (!rule.enabled) {
        console.log(`[AUTOMATION] Rule "${rule.name}" is disabled. Skipping.`);
        return;
    }
    
    if (evaluateConditions(data, rule.conditions)) {
        console.log(`[AUTOMATION] Rule "${rule.name}" conditions met for ${data.name}. Executing actions.`);
        for (const action of rule.actions) {
            executeAction(action, data);
        }
    } else {
         console.log(`[AUTOMATION] Rule "${rule.name}" conditions not met for ${data.name}.`);
    }
};

/**
 * Run all Lead-Created rules and execute side effects (e.g., create tasks).
 * This bridges the in-memory automation rules with actual app actions.
 */
export const runLeadCreatedAutomations = async (lead: Lead): Promise<void> => {
    try {
        const all = await getRules();
        const matching = all.filter(r => r.trigger === TriggerType.LEAD_CREATED && r.enabled && evaluateConditions(lead, r.conditions));
        if (matching.length === 0) return;
        for (const rule of matching) {
            for (const action of rule.actions) {
                const resolve = (tpl: string) => {
                    if (typeof tpl !== 'string') return tpl;
                    return tpl.replace(/{{(.*?)}}/g, (_, path) => {
                        const v = path.split('.').reduce((o, i) => (o as any)?.[i], lead as any);
                        return v !== undefined ? String(v) : '';
                    });
                };
                if (action.type === ActionType.CREATE_TASK) {
                    const title = resolve(action.params.title || 'Follow up');
                    const wanted = String(action.params.taskType || '').trim();
                    const type = (Object.values(TaskType) as string[]).includes(wanted) ? (wanted as TaskType) : TaskType.FOLLOW_UP_CALL;
                    await createTask({ user_id: lead.user_id, lead_id: lead.id, type, status: TaskStatus.PENDING, title, rule_title: rule.name } as any);
                } else if (action.type === ActionType.SHOW_NOTIFICATION) {
                    const message = resolve(action.params.message || '');
                    await addAutomationAlert({
                        type: 'follow_up_needed' as any,
                        priority: 'Low' as any,
                        message,
                        recommendation: '',
                        relatedEntityId: lead.id,
                        relatedEntityName: lead.name,
                        rule_title: rule.name,
                    } as any);
                } else {
                    // noop for SEND_EMAIL / UPDATE_FIELD in this lightweight client implementation
                }
            }
        }
    } catch (e) {
        console.warn('[automation] runLeadCreatedAutomations failed', e);
    }
};