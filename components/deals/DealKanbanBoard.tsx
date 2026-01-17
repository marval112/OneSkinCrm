import React, { useState } from 'react';
import type { Deal } from '../../types';
import { DealStage } from '../../types';

interface DealKanbanBoardProps {
    deals: Deal[];
    onStageChange: (dealId: number, newStage: DealStage) => void;
    onDealClick: (deal: Deal) => void;
    getCustomerName?: (customerId: number) => string;
    getLeadName?: (leadId: number) => string;
}

const stageColors: Record<DealStage, string> = {
    [DealStage.QUALIFICATION]: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
    [DealStage.PROPOSAL]: 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
    [DealStage.NEGOTIATION]: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700',
    [DealStage.CLOSED_WON]: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
    [DealStage.CLOSED_LOST]: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700',
};

const stageHeaderColors: Record<DealStage, string> = {
    [DealStage.QUALIFICATION]: 'bg-blue-500 text-white',
    [DealStage.PROPOSAL]: 'bg-purple-500 text-white',
    [DealStage.NEGOTIATION]: 'bg-yellow-500 text-white',
    [DealStage.CLOSED_WON]: 'bg-green-500 text-white',
    [DealStage.CLOSED_LOST]: 'bg-red-500 text-white',
};

function DealKanbanBoard({ deals, onStageChange, onDealClick, getCustomerName, getLeadName }: DealKanbanBoardProps) {
    const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    const stages = Object.values(DealStage);

    const getDealsByStage = (stage: DealStage) => {
        return deals.filter(deal => deal.status === stage);
    };

    const handleDragStart = (e: React.DragEvent, deal: Deal) => {
        setDraggedDeal(deal);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    };

    const handleDragEnd = () => {
        setDraggedDeal(null);
        setDragOverStage(null);
    };

    const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stage);
    };

    const handleDragLeave = () => {
        setDragOverStage(null);
    };

    const handleDrop = (e: React.DragEvent, stage: DealStage) => {
        e.preventDefault();
        if (draggedDeal && draggedDeal.status !== stage) {
            onStageChange(draggedDeal.id, stage);
        }
        setDraggedDeal(null);
        setDragOverStage(null);
    };

    const getPartyName = (deal: Deal) => {
        if (deal.customer_id && getCustomerName) {
            return getCustomerName(deal.customer_id);
        }
        if (deal.lead_id && getLeadName) {
            return getLeadName(deal.lead_id);
        }
        return 'Unknown';
    };

    const calculateTotalValue = (stage: DealStage) => {
        return getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);
    };

    return (
        <div className="flex gap-2 w-full h-full overflow-hidden pb-4">
            {stages.map(stage => {
                const stageDeals = getDealsByStage(stage);
                const totalValue = calculateTotalValue(stage);
                const isDragOver = dragOverStage === stage;
                const isClosedStage = stage === DealStage.CLOSED_WON || stage === DealStage.CLOSED_LOST;

                return (
                    <div
                        key={stage}
                        className="flex-1 min-w-0 flex flex-col h-full"
                        onDragOver={(e) => handleDragOver(e, stage)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        {/* Column Header */}
                        <div className={`${stageHeaderColors[stage]} rounded-t-lg p-3 shadow-sm flex-shrink-0`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm truncate">{stage}</h3>
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {stageDeals.length}
                                </span>
                            </div>
                            <div className="text-xs mt-1 opacity-90">
                                €{totalValue.toLocaleString()}
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            className={`flex-1 overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg p-2 space-y-2 border-2 transition-colors scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 ${isDragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent'
                                }`}
                            style={{ maxHeight: 'calc(100vh - 220px)' }}
                        >
                            {stageDeals.length === 0 && (
                                <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500 text-sm">
                                    {isDragOver ? 'Drop here' : 'No deals'}
                                </div>
                            )}

                            {stageDeals.map(deal => (
                                <div
                                    key={deal.id}
                                    draggable={!isClosedStage}
                                    onDragStart={(e) => handleDragStart(e, deal)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => onDealClick(deal)}
                                    className={`${stageColors[stage]} border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${draggedDeal?.id === deal.id ? 'opacity-50' : ''
                                        } ${isClosedStage ? 'cursor-default' : 'cursor-move'}`}
                                >
                                    {/* Deal Title */}
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                                        {deal.title}
                                    </h4>

                                    {/* Party Name */}
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 truncate">
                                        {getPartyName(deal)}
                                    </p>

                                    {/* Value */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                            €{deal.value.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {deal.probability}%
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                                        <div
                                            className="bg-primary h-1.5 rounded-full transition-all"
                                            style={{ width: `${deal.probability}%` }}
                                        ></div>
                                    </div>

                                    {/* Expected Close Date */}
                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
                                    </div>

                                    {/* Notes Indicator */}
                                    {deal.notes && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                            <span className="truncate">{deal.notes.substring(0, 30)}...</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default DealKanbanBoard;
