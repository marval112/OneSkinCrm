import React, { useState } from 'react';
import type { Lead } from '../../types';
import { LeadStatus } from '../../types';

interface LeadsKanbanViewProps {
    leads: Lead[];
    onUpdateLead: (lead: Lead) => void;
    onEmailLead: (lead: Lead) => void;
}

const statusColors: Record<LeadStatus, { bg: string, text: string }> = {
    [LeadStatus.New]: { bg: 'bg-blue-100', text: 'text-blue-800' },
    [LeadStatus.Contacted]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    [LeadStatus.Qualified]: { bg: 'bg-purple-100', text: 'text-purple-800' },
    [LeadStatus.Lost]: { bg: 'bg-red-100', text: 'text-red-800' },
    [LeadStatus.Won]: { bg: 'bg-green-100', text: 'text-green-800' },
};

const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const LeadCard: React.FC<{ lead: Lead; onEmail: () => void; }> = ({ lead, onEmail }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('leadId', lead.id.toString());
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow mb-3 cursor-grab active:cursor-grabbing"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{lead.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company}</p>
                    {lead.segment && <span className="mt-1 text-xs font-semibold inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">{lead.segment}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onEmail(); }} className="text-slate-400 hover:text-primary p-1 rounded-full">
                    <EnvelopeIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-bold ${statusColors[lead.status].text}`}>{lead.score}</span>
                <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${lead.score}%` }}></div>
                </div>
            </div>
        </div>
    );
};

// FIX: Explicitly type as React.FC to correctly handle the 'key' prop from mapping.
const KanbanColumn: React.FC<{
    status: LeadStatus;
    leads: Lead[];
    onDrop: (status: LeadStatus) => void;
    onEmailLead: (lead: Lead) => void;
}> = ({
    status,
    leads,
    onDrop,
    onEmailLead,
}) => {
        const [isOver, setIsOver] = useState(false);

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsOver(true);
        };

        const handleDragLeave = () => {
            setIsOver(false);
        }

        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            onDrop(status);
            setIsOver(false);
        }

        return (
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 min-w-0 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg transition-colors ${isOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
            >
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 px-1 truncate" title={status.replace(/_/g, ' ')}>{status} ({leads.length})</h3>
                <div className="space-y-2 h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {leads.map(lead => <LeadCard key={lead.id} lead={lead} onEmail={() => onEmailLead(lead)} />)}
                </div>
            </div>
        );
    };

function LeadsKanbanView({ leads, onUpdateLead, onEmailLead }: LeadsKanbanViewProps) {
    const handleDrop = (leadIdStr: string, newStatus: LeadStatus) => {
        const leadId = parseInt(leadIdStr, 10);
        const leadToMove = leads.find(l => l.id === leadId);
        if (leadToMove && leadToMove.status !== newStatus) {
            onUpdateLead({ ...leadToMove, status: newStatus });
        }
    };

    return (
        <div className="flex gap-2 w-full h-full overflow-hidden">
            {Object.values(LeadStatus).map(status => (
                <KanbanColumn
                    key={status}
                    status={status}
                    leads={leads.filter(l => l.status === status)}
                    onEmailLead={onEmailLead}
                    onDrop={(newStatus) => handleDrop(
                        (window.event as DragEvent).dataTransfer!.getData('leadId'),
                        newStatus
                    )}
                />
            ))}
        </div>
    );
}

export default LeadsKanbanView;