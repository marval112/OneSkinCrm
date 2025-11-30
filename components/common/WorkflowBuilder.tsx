import React, { useState } from 'react';
import Modal from './Modal';
import { saveWorkflow, updateWorkflow, NODE_TYPES, Workflow, WorkflowNode } from '../../services/workflowService';

interface WorkflowBuilderProps {
    workflow?: Workflow | null;
    onClose: () => void;
    onSave: (workflow: Workflow) => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ workflow, onClose, onSave }) => {
    const [name, setName] = useState(workflow?.name || '');
    const [description, setDescription] = useState(workflow?.description || '');
    const [trigger, setTrigger] = useState(workflow?.nodes.find(n => n.type === 'trigger')?.config.type || '');
    const [condition, setCondition] = useState(workflow?.nodes.find(n => n.type === 'condition')?.config.type || '');
    const [conditionValue, setConditionValue] = useState(workflow?.nodes.find(n => n.type === 'condition')?.config.value || '');
    const [action, setAction] = useState(workflow?.nodes.find(n => n.type === 'action')?.config.type || '');
    const [actionParams, setActionParams] = useState(workflow?.nodes.find(n => n.type === 'action')?.config.params || '');

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please enter a workflow name');
            return;
        }
        if (!trigger) {
            alert('Please select a trigger');
            return;
        }
        if (!action) {
            alert('Please select an action');
            return;
        }

        const nodes: WorkflowNode[] = [
            {
                id: 'trigger_1',
                type: 'trigger',
                config: { type: trigger },
                position: { x: 100, y: 100 }
            }
        ];

        if (condition) {
            nodes.push({
                id: 'condition_1',
                type: 'condition',
                config: { type: condition, value: conditionValue },
                position: { x: 300, y: 100 }
            });
        }

        nodes.push({
            id: 'action_1',
            type: 'action',
            config: { type: action, params: actionParams },
            position: { x: condition ? 500 : 300, y: 100 }
        });

        const connections = condition
            ? [{ from: 'trigger_1', to: 'condition_1' }, { from: 'condition_1', to: 'action_1' }]
            : [{ from: 'trigger_1', to: 'action_1' }];

        if (workflow) {
            const updated = updateWorkflow(workflow.id, {
                name,
                description,
                nodes,
                connections
            });
            if (updated) onSave(updated);
        } else {
            const newWorkflow = saveWorkflow({
                name,
                description,
                nodes,
                connections,
                enabled: true
            });
            onSave(newWorkflow);
        }

        onClose();
    };

    return (
        <Modal title={workflow ? 'Edit Workflow' : 'Create Workflow'} onClose={onClose}>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Workflow Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Auto-assign high-value leads"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this workflow do?"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                {/* Workflow Steps */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Workflow Steps</h3>

                    {/* Step 1: Trigger */}
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Trigger (When)</span>
                        </div>
                        <select
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                        >
                            <option value="">Select a trigger...</option>
                            {NODE_TYPES.trigger.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Step 2: Condition (Optional) */}
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Condition (If) - Optional</span>
                        </div>
                        <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 mb-2"
                        >
                            <option value="">No condition (always run)</option>
                            {NODE_TYPES.condition.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {condition && (
                            <input
                                type="text"
                                value={conditionValue}
                                onChange={(e) => setConditionValue(e.target.value)}
                                placeholder="Condition value (e.g., 75 for score, 'Qualified' for status)"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                            />
                        )}
                    </div>

                    {/* Step 3: Action */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Action (Then)</span>
                        </div>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 mb-2"
                        >
                            <option value="">Select an action...</option>
                            {NODE_TYPES.action.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {action && (
                            <textarea
                                value={actionParams}
                                onChange={(e) => setActionParams(e.target.value)}
                                placeholder="Action parameters (e.g., task title, email template, field name)"
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                            />
                        )}
                    </div>
                </div>

                {/* Visual Flow Preview */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Workflow Preview</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md font-medium">
                            {trigger || 'Trigger'}
                        </div>
                        <span className="text-slate-400">→</span>
                        {condition && (
                            <>
                                <div className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-md font-medium">
                                    {condition}
                                </div>
                                <span className="text-slate-400">→</span>
                            </>
                        )}
                        <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md font-medium">
                            {action || 'Action'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover"
                    >
                        {workflow ? 'Update' : 'Create'} Workflow
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WorkflowBuilder;
