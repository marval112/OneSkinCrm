import React from 'react';
import type { DuplicateMatch } from '../../services/duplicateDetectionService';

interface DuplicateWarningProps {
    duplicates: DuplicateMatch[];
    onViewDuplicate: (leadId: number) => void;
    onMerge: (primaryId: number, duplicateId: number) => void;
    onIgnore: () => void;
}

function DuplicateWarning({ duplicates, onViewDuplicate, onMerge, onIgnore }: DuplicateWarningProps) {
    if (duplicates.length === 0) return null;

    const getMatchTypeLabel = (matchType: string) => {
        switch (matchType) {
            case 'email':
                return 'Same email';
            case 'phone':
                return 'Same phone';
            case 'company':
                return 'Same company';
            case 'fuzzy':
                return 'Similar company';
            default:
                return 'Match';
        }
    };

    const getMatchTypeColor = (matchType: string) => {
        switch (matchType) {
            case 'email':
            case 'phone':
                return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            case 'company':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
            case 'fuzzy':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
        }
    };

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                        Potential Duplicate Leads Found
                    </h3>

                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                        We found {duplicates.length} potential duplicate{duplicates.length > 1 ? 's' : ''} in the system:
                    </p>

                    <div className="space-y-2">
                        {duplicates.map((duplicate, index) => (
                            <div
                                key={duplicate.lead.id}
                                className="bg-white dark:bg-slate-800 rounded-md p-3 border border-yellow-200 dark:border-yellow-800"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                                {duplicate.lead.name}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getMatchTypeColor(duplicate.matchType)}`}>
                                                {getMatchTypeLabel(duplicate.matchType)} ({duplicate.similarity}%)
                                            </span>
                                        </div>

                                        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                            <div className="truncate">{duplicate.lead.email}</div>
                                            <div className="flex items-center gap-3">
                                                <span>{duplicate.lead.company}</span>
                                                {duplicate.lead.phone && <span>• {duplicate.lead.phone}</span>}
                                            </div>
                                            <div className="text-slate-500 dark:text-slate-500">
                                                Created: {new Date(duplicate.lead.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => onViewDuplicate(duplicate.lead.id)}
                                            className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => onMerge(duplicate.lead.id, duplicate.lead.id)}
                                            className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:underline"
                                        >
                                            Merge
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={onIgnore}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            Ignore and Continue
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            You can merge duplicates later from the lead detail view
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DuplicateWarning;
