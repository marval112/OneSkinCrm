import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getRules, createRule, updateRule, deleteRule, TRIGGER_METADATA, ACTION_METADATA } from '../../services/automationService';
import type { Rule, Condition, Action } from '../../services/automationService';
import { TriggerType, ConditionOperator, ActionType } from '../../services/automationService';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';

// --- ICONS ---
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

// --- HELPER COMPONENTS ---

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button type="button" className={`${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled} onClick={onChange}>
    <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
  </button>
);

const getNewRuleTemplate = (): Omit<Rule, 'id'> => ({
    name: '',
    trigger: TriggerType.LEAD_CREATED,
    conditions: [],
    actions: [],
    enabled: true,
});

// --- RULE BUILDER MODAL ---

const RuleBuilder = ({ rule, onSave, onCancel }: { rule: Omit<Rule, 'id'> | Rule, onSave: (rule: Omit<Rule, 'id'> | Rule) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState(rule);

    const handleConditionChange = (index: number, field: keyof Condition, value: any) => {
        const newConditions = [...formData.conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setFormData({ ...formData, conditions: newConditions });
    };

    const handleActionChange = (index: number, param: string, value: any) => {
        const newActions = [...formData.actions];
        newActions[index].params[param] = value;
        setFormData({ ...formData, actions: newActions });
    };
    
    const triggerFields = TRIGGER_METADATA[formData.trigger].fields;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
                {/* General */}
                <div>
                    <label className="block text-sm font-medium">Rule Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2" required />
                </div>

                {/* Trigger */}
                <div className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2 text-lg">WHEN... (Trigger)</h3>
                    <select value={formData.trigger} onChange={e => setFormData({ ...formData, trigger: e.target.value as TriggerType, conditions: [], actions: [] })} className="w-full border-slate-300 dark:border-slate-600 rounded-md p-2">
                        {Object.entries(TRIGGER_METADATA).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
                    </select>
                </div>

                {/* Conditions */}
                <div className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2 text-lg">IF... (Conditions)</h3>
                    {formData.conditions.map((cond, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center mb-2 p-2 bg-white dark:bg-slate-800 rounded">
                            <select value={cond.field} onChange={e => handleConditionChange(i, 'field', e.target.value)} className="col-span-1 border-slate-300 dark:border-slate-600 rounded-md p-2">
                                {Object.entries(triggerFields).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                            </select>
                            <select value={cond.operator} onChange={e => handleConditionChange(i, 'operator', e.target.value)} className="col-span-1 border-slate-300 dark:border-slate-600 rounded-md p-2">
                                {Object.values(ConditionOperator).map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                            {triggerFields[cond.field]?.type === 'enum' ? (
                                <select value={cond.value} onChange={e => handleConditionChange(i, 'value', e.target.value)} className="col-span-1 border-slate-300 dark:border-slate-600 rounded-md p-2">
                                    {triggerFields[cond.field].options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input type={triggerFields[cond.field]?.type || 'text'} value={cond.value} onChange={e => handleConditionChange(i, 'value', e.target.value)} className="col-span-1 border border-slate-300 dark:border-slate-600 rounded-md p-2" />
                            )}
                            <button type="button" onClick={() => setFormData({...formData, conditions: formData.conditions.filter((_, idx) => idx !== i)})} className="text-danger hover:text-danger-hover"><TrashIcon className="h-5 w-5 mx-auto" /></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setFormData({...formData, conditions: [...formData.conditions, {field: Object.keys(triggerFields)[0], operator: ConditionOperator.EQUALS, value: ''}]})} className="text-sm text-primary font-semibold mt-2">Add Condition</button>
                </div>

                {/* Actions */}
                 <div className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2 text-lg">THEN... (Actions)</h3>
                    {formData.actions.map((act, i) => (
                        <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded mb-2">
                            <div className="flex justify-between items-center mb-2">
                                <select value={act.type} onChange={e => {
                                    const newActions = [...formData.actions];
                                    newActions[i] = { type: e.target.value as ActionType, params: {} };
                                    setFormData({...formData, actions: newActions});
                                }} className="border-slate-300 dark:border-slate-600 rounded-md p-2 font-medium">
                                    {Object.entries(ACTION_METADATA).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setFormData({...formData, actions: formData.actions.filter((_, idx) => idx !== i)})} className="text-danger hover:text-danger-hover"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                            <div className="space-y-2 pl-2 border-l-2">
                                {Object.entries(ACTION_METADATA[act.type].params).map(([key, param]: [string, any]) => (
                                    <div key={key}>
                                        <label className="text-xs">{param.label}</label>
                                        <input type={param.type} value={act.params[key] || ''} onChange={e => handleActionChange(i, key, e.target.value)} placeholder={param.placeholder} className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-md p-1 mt-1" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                     <button type="button" onClick={() => setFormData({...formData, actions: [...formData.actions, {type: ActionType.SEND_EMAIL, params: {}}]})} className="text-sm text-primary font-semibold mt-2">Add Action</button>
                </div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md ml-3">Save Rule</button>
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border rounded-md">Cancel</button>
            </div>
        </form>
    );
};

// --- MAIN COMPONENT ---

function Automation() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Omit<Rule, 'id'> | Rule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const toastContext = useContext(ToastContext);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
    } catch (error) {
      toastContext?.showToast('Failed to fetch automation rules.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [toastContext]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (rule: Rule) => {
    const updatedRule = { ...rule, enabled: !rule.enabled };
    try {
      await updateRule(updatedRule);
      setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
      toastContext?.showToast(`Rule "${rule.name}" ${updatedRule.enabled ? 'enabled' : 'disabled'}.`, 'success');
    } catch (error) {
      toastContext?.showToast('Failed to update rule status.', 'danger');
    }
  };
  
  const handleDelete = async () => {
    if (!ruleToDelete) return;
    try {
        await deleteRule(ruleToDelete.id);
        setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
        toastContext?.showToast(`Rule "${ruleToDelete.name}" deleted.`, 'success');
    } catch (error) {
        toastContext?.showToast('Failed to delete rule.', 'danger');
    } finally {
        setRuleToDelete(null);
    }
  };

  const handleOpenBuilder = (rule?: Rule) => {
    setCurrentRule(rule || getNewRuleTemplate());
    setIsBuilderOpen(true);
  };
  
  const handleSaveRule = async (rule: Omit<Rule, 'id'> | Rule) => {
    try {
        if ('id' in rule) {
            await updateRule(rule);
            toastContext?.showToast('Rule updated successfully!', 'success');
        } else {
            await createRule(rule);
            toastContext?.showToast('New rule created!', 'success');
        }
        setIsBuilderOpen(false);
        setCurrentRule(null);
        fetchRules();
    } catch (e) {
        toastContext?.showToast('Failed to save rule.', 'danger');
    }
  };
  
  const formatDetail = (item: Condition | Action) => {
    if ('field' in item) { // It's a Condition
      return <><span className="font-semibold">{item.field}</span> {item.operator} <span className="font-semibold">{item.value}</span></>;
    } else { // It's an Action
      return <><span className="font-semibold">{ACTION_METADATA[item.type].name}</span>: {JSON.stringify(item.params)}</>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Automation Rules</h1>
        <button onClick={() => handleOpenBuilder()} className="w-full sm:w-auto px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors whitespace-nowrap flex items-center justify-center">
          <PlusIcon className="h-5 w-5 mr-2" /> New Rule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <h3 className="text-xl font-semibold">No rules yet</h3>
            <p className="text-slate-500 mt-2">Click "New Rule" to create your first automation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rules.map(rule => (
                <div key={rule.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-700 shadow-sm p-4 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{rule.name}</h2>
                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full inline-block">
                                WHEN: {TRIGGER_METADATA[rule.trigger].name}
                            </p>
                        </div>
                         <ToggleSwitch enabled={rule.enabled} onChange={() => handleToggle(rule)} />
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 flex-grow">
                        <div>
                            <h4 className="font-semibold text-xs uppercase text-slate-500">If</h4>
                             <ul className="pl-4 list-disc list-inside">
                                {rule.conditions.map((c, i) => <li key={i}>{formatDetail(c)}</li>)}
                             </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-xs uppercase text-slate-500">Then</h4>
                             <ul className="pl-4 list-disc list-inside">
                                {rule.actions.map((a, i) => <li key={i}>{formatDetail(a)}</li>)}
                             </ul>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t dark:border-slate-700 text-right space-x-2">
                        <button onClick={() => handleOpenBuilder(rule)} className="text-slate-500 dark:text-slate-400 hover:text-primary p-1" title="Edit Rule"><EditIcon className="h-5 w-5" /></button>
                        <button onClick={() => setRuleToDelete(rule)} className="text-slate-500 dark:text-slate-400 hover:text-danger p-1" title="Delete Rule"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {isBuilderOpen && currentRule && (
        <Modal title={'id' in currentRule ? 'Edit Automation Rule' : 'Create New Rule'} onClose={() => setIsBuilderOpen(false)}>
            <RuleBuilder rule={currentRule} onSave={handleSaveRule} onCancel={() => setIsBuilderOpen(false)} />
        </Modal>
      )}

      {ruleToDelete && (
        <Modal title="Confirm Deletion" onClose={() => setRuleToDelete(null)}>
            <div className="p-6">
                <p>Are you sure you want to delete the rule "<strong>{ruleToDelete.name}</strong>"? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => setRuleToDelete(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger-hover">Delete</button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
}

export default Automation;