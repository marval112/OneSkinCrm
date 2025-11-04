

import React from 'react';

// Icons for different node types
const TriggerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const ActionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
const ConditionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DelayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


// Placeholder Draggable Node Component
const DraggableNode = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center p-3 mb-2 bg-white border border-slate-200 rounded-md shadow-sm cursor-grab active:cursor-grabbing">
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </div>
);

// Placeholder canvas content
const CanvasContent = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
            <h2 className="text-xl font-semibold">Workflow Canvas</h2>
            <p>Drag nodes from the left panel to build your automation.</p>
            <div className="mt-8 p-8 border-2 border-dashed border-slate-300 rounded-lg">
                <div className="font-mono text-left text-sm">
                    <div className="flex items-center bg-purple-100 p-2 rounded">
                        <TriggerIcon /><p>When a <strong>Lead</strong> is created</p>
                    </div>
                    <div className="h-8 w-px bg-slate-300 mx-auto" />
                    <div className="flex items-center bg-yellow-100 p-2 rounded">
                        <ConditionIcon /><p>If <strong>Source</strong> is 'Website'</p>
                    </div>
                    <div className="h-8 w-px bg-slate-300 mx-auto" />
                    <div className="flex items-center bg-blue-100 p-2 rounded">
                        <ActionIcon /><p>Then <strong>Send Email</strong> 'Welcome'</p>
                    </div>
                </div>
            </div>
             <p className="mt-4 text-xs italic">(This is a static visual representation)</p>
        </div>
    </div>
);

function WorkflowBuilder() {
  return (
    <div className="flex h-[calc(100vh-150px)] bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      {/* Left Panel: Nodes */}
      <aside className="w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Nodes</h3>
        <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Triggers</h4>
        <DraggableNode icon={<TriggerIcon />} label="Lead Created" />
        <DraggableNode icon={<TriggerIcon />} label="Status Changed" />
        <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mt-4 mb-2">Logic</h4>
        <DraggableNode icon={<ConditionIcon />} label="Condition (If/Else)" />
        <DraggableNode icon={<DelayIcon />} label="Add Delay" />
        <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mt-4 mb-2">Actions</h4>
        <DraggableNode icon={<ActionIcon />} label="Send Email" />
        <DraggableNode icon={<ActionIcon />} label="Create Task" />
        <DraggableNode icon={<ActionIcon />} label="Update Field" />
      </aside>

      {/* Center Panel: Canvas */}
      <main className="flex-1 bg-slate-100 dark:bg-slate-900 relative">
        <CanvasContent />
      </main>

      {/* Right Panel: Properties */}
      <aside className="w-80 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700 p-4">
        <h3 className="font-semibold mb-4">Properties</h3>
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium">Node Type</label>
                <p className="p-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md">Condition</p>
            </div>
            <div>
                <label className="text-sm font-medium">Field</label>
                <select className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <option>Lead Source</option>
                    <option>Lead Status</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium">Operator</label>
                 <select className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                    <option>Is equal to</option>
                    <option>Is not equal to</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium">Value</label>
                <input type="text" defaultValue="Website" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
            </div>
        </div>
      </aside>
    </div>
  );
}

export default WorkflowBuilder;