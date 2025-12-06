import { supabase } from './supabaseClient';

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
const MIGRATION_KEY = 'workflows_migrated_to_db';

// Migrate localStorage workflows to Supabase (one-time operation)
const migrateLocalStorageWorkflows = async (): Promise<void> => {
    // Check if migration already done
    if (localStorage.getItem(MIGRATION_KEY) === 'true') {
        return;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            return;
        }

        const localWorkflows: Workflow[] = JSON.parse(stored);
        if (localWorkflows.length === 0) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            return;
        }

        // Insert workflows into database
        for (const workflow of localWorkflows) {
            const { data: existing } = await supabase
                .from('workflows')
                .select('id')
                .eq('id', workflow.id)
                .single();

            if (!existing) {
                await supabase.from('workflows').insert({
                    id: workflow.id,
                    name: workflow.name,
                    description: workflow.description,
                    trigger_type: workflow.nodes.find(n => n.type === 'trigger')?.config?.value || 'manual',
                    trigger_config: { nodes: workflow.nodes.filter(n => n.type === 'trigger').map(n => n.config) },
                    flow_definition: { nodes: workflow.nodes, connections: workflow.connections },
                    is_active: workflow.enabled,
                    created_at: workflow.createdAt,
                });
            }
        }

        console.log(`[Workflow Migration] Migrated ${localWorkflows.length} workflows to database`);
        localStorage.setItem(MIGRATION_KEY, 'true');
    } catch (error) {
        console.error('[Workflow Migration] Failed:', error);
    }
};

export const getWorkflows = async (): Promise<Workflow[]> => {
    // Run migration on first call
    await migrateLocalStorageWorkflows();

    try {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(row => ({
            id: String(row.id),
            name: row.name,
            description: row.description || '',
            nodes: row.flow_definition?.nodes || [],
            connections: row.flow_definition?.connections || [],
            enabled: row.is_active ?? true,
            createdAt: row.created_at,
            updatedAt: row.created_at, // workflows table doesn't have updated_at
        }));
    } catch (error) {
        console.error('[Workflow Service] Error fetching workflows:', error);
        return [];
    }
};

export const saveWorkflow = async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> => {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('workflows')
        .insert({
            id,
            name: workflow.name,
            description: workflow.description,
            trigger_type: workflow.nodes.find(n => n.type === 'trigger')?.config?.value || 'manual',
            trigger_config: { nodes: workflow.nodes.filter(n => n.type === 'trigger').map(n => n.config) },
            flow_definition: { nodes: workflow.nodes, connections: workflow.connections },
            is_active: workflow.enabled,
            created_at: now,
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: String(data.id),
        name: data.name,
        description: data.description || '',
        nodes: workflow.nodes,
        connections: workflow.connections,
        enabled: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.created_at,
    };
};

export const updateWorkflow = async (id: string, updates: Partial<Workflow>): Promise<Workflow | null> => {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.enabled !== undefined) updateData.is_active = updates.enabled;

    if (updates.nodes || updates.connections) {
        const { data: current } = await supabase
            .from('workflows')
            .select('flow_definition')
            .eq('id', id)
            .single();

        updateData.flow_definition = {
            nodes: updates.nodes || current?.flow_definition?.nodes || [],
            connections: updates.connections || current?.flow_definition?.connections || [],
        };

        if (updates.nodes) {
            const triggerNode = updates.nodes.find(n => n.type === 'trigger');
            if (triggerNode) {
                updateData.trigger_type = triggerNode.config?.value || 'manual';
                updateData.trigger_config = { nodes: updates.nodes.filter(n => n.type === 'trigger').map(n => n.config) };
            }
        }
    }

    const { data, error } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[Workflow Service] Error updating workflow:', error);
        return null;
    }

    return {
        id: String(data.id),
        name: data.name,
        description: data.description || '',
        nodes: data.flow_definition?.nodes || [],
        connections: data.flow_definition?.connections || [],
        enabled: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.created_at,
    };
};

export const deleteWorkflow = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[Workflow Service] Error deleting workflow:', error);
        throw error;
    }
};

export const getWorkflowById = async (id: string): Promise<Workflow | null> => {
    const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;

    return {
        id: String(data.id),
        name: data.name,
        description: data.description || '',
        nodes: data.flow_definition?.nodes || [],
        connections: data.flow_definition?.connections || [],
        enabled: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.created_at,
    };
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
