import React from 'react';
import type { Lead } from '../../types';

interface TopLeadsWidgetProps {
    leads: Lead[];
}

const daysSince = (dateString: string): number => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function TopLeadsWidget({ leads }: TopLeadsWidgetProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4">Top 5 Hot Leads</h3>
            <div className="space-y-4">
                {leads.length > 0 ? leads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50">
                        <div>
                            <p className="font-medium text-slate-800">{lead.name}</p>
                            <p className="text-sm text-slate-500">{lead.source} - {daysSince(lead.created_at)} days ago</p>
                        </div>
                        <div className="flex items-center">
                             <div className="w-20 bg-gray-200 rounded-full h-2.5 mr-2">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${lead.score}%` }}></div>
                            </div>
                            <span className="font-bold text-primary text-lg">{lead.score}</span>
                        </div>
                    </div>
                )) : (
                    <p className="text-slate-500 text-center py-4">No leads to display for the selected period.</p>
                )}
            </div>
        </div>
    );
}

export default TopLeadsWidget;
