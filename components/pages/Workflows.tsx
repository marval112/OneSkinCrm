import React, { useState, useEffect } from 'react';
import { getWorkflows, deleteWorkflow, updateWorkflow, Workflow } from '../../services/workflowService';
import WorkflowBuilder from '../common/WorkflowBuilder';

export default function Workflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        const data = await getWorkflows();
        setWorkflows(data);
    };

    const handleSave = (workflow: Workflow) => {
        loadWorkflows();
    };

    const handleEdit = (workflow: Workflow) => {
        setEditingWorkflow(workflow);
        setIsBuilderOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this workflow?')) {
            await deleteWorkflow(id);
            loadWorkflows();
        }
    };

    const handleToggleEnabled = async (workflow: Workflow) => {
        await updateWorkflow(workflow.id, { enabled: !workflow.enabled });
        loadWorkflows();
    };

    const handleCloseBuilder = () => {
        setIsBuilderOpen(false);
        setEditingWorkflow(null);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Visual Workflows</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Automate your CRM processes with visual workflows
                    </p>
                </div>
                <button
                    onClick={() => setIsBuilderOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover font-medium"
                >
                    + Create Workflow
                </button>
            </div>

            {/* Workflows List */}
            {workflows.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No workflows</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by creating a new workflow.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workflows.map(workflow => (
                        <div
                            key={workflow.id}
                            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{workflow.name}</h3>
                                    {workflow.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{workflow.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleToggleEnabled(workflow)}
                                    className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${workflow.enabled
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    {workflow.enabled ? 'Active' : 'Inactive'}
                                </button>
                            </div>

                            {/* Workflow Flow */}
                            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                    {workflow.nodes.map((node, idx) => (
                                        <React.Fragment key={node.id}>
                                            <div
                                                className="px-2 py-1 rounded"
                                                style={{
                                                    backgroundColor: node.type === 'trigger' ? '#d1fae5' : node.type === 'condition' ? '#fef3c7' : '#dbeafe',
                                                    color: node.type === 'trigger' ? '#065f46' : node.type === 'condition' ? '#92400e' : '#1e40af'
                                                }}
                                            >
                                                {node.config.type || node.type}
                                            </div>
                                            {idx < workflow.nodes.length - 1 && (
                                                <span className="text-slate-400">→</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(workflow)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(workflow.id)}
                                    className="px-3 py-1.5 text-sm text-red-600 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Delete
                                </button>
                            </div>

                            <div className="mt-2 text-xs text-slate-400">
                                Created {new Date(workflow.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Workflow Builder Modal */}
            {isBuilderOpen && (
                <WorkflowBuilder
                    workflow={editingWorkflow}
                    onClose={handleCloseBuilder}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
