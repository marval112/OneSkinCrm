export interface WorkflowNode {
    id: string;
    type: 'trigger' | 'condition' | 'action';
    config: Record<string, any>;
    position: { x: number; y: number };
}

export interface WorkflowConnection {
    from: string;
    to: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'visual_workflows';

export const getWorkflows = (): Workflow[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load workflows', e);
        return [];
    }
};

export const saveWorkflow = (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow => {
    const workflows = getWorkflows();
    const newWorkflow: Workflow = {
        ...workflow,
        id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    workflows.push(newWorkflow);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    return newWorkflow;
};

export const updateWorkflow = (id: string, updates: Partial<Workflow>): Workflow | null => {
    const workflows = getWorkflows();
    const index = workflows.findIndex(w => w.id === id);

    if (index === -1) return null;

    workflows[index] = {
        ...workflows[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    return workflows[index];
};

export const deleteWorkflow = (id: string): void => {
    const workflows = getWorkflows();
    const filtered = workflows.filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getWorkflowById = (id: string): Workflow | null => {
    const workflows = getWorkflows();
    return workflows.find(w => w.id === id) || null;
};

// Node type definitions
export const NODE_TYPES = {
    trigger: {
        label: 'Trigger',
        color: '#10b981', // green
        options: [
            { value: 'lead_created', label: 'New Lead Created' },
            { value: 'deal_won', label: 'Deal Won' },
            { value: 'customer_inactive', label: 'Customer Inactive' }
        ]
    },
    condition: {
        label: 'Condition',
        color: '#f59e0b', // amber
        options: [
            { value: 'score_above', label: 'Score Above' },
            { value: 'status_equals', label: 'Status Equals' },
            { value: 'value_greater', label: 'Value Greater Than' }
        ]
    },
    action: {
        label: 'Action',
        color: '#3b82f6', // blue
        options: [
            { value: 'create_task', label: 'Create Task' },
            { value: 'send_email', label: 'Send Email' },
            { value: 'update_field', label: 'Update Field' },
            { value: 'show_notification', label: 'Show Notification' }
        ]
    }
};
