import React, { useState } from 'react';
import type { ScoreBreakdown } from '../../services/leadScoringService';
import { getScoreBadgeClasses, getScoreLabel } from '../../services/leadScoringService';

interface ScoreBadgeProps {
    score: number;
    breakdown?: ScoreBreakdown;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

function ScoreBadge({ score, breakdown, showLabel = true, size = 'md' }: ScoreBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-xs px-2 py-1',
        lg: 'text-sm px-3 py-1.5'
    };

    const badgeClasses = `${getScoreBadgeClasses(score)} ${sizeClasses[size]} relative cursor-help`;

    return (
        <div
            className="inline-block relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className={badgeClasses}>
                {showLabel && <span className="mr-1">{getScoreLabel(score)}</span>}
                <span className="font-bold">{score}</span>
            </span>

            {showTooltip && breakdown && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
                    <div className="font-semibold mb-2 border-b border-slate-700 pb-2">
                        Score Breakdown
                    </div>

                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between">
                            <span className="text-slate-300">Demographic:</span>
                            <span className="font-semibold">{breakdown.demographic}/25</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">Behavioral:</span>
                            <span className="font-semibold">{breakdown.behavioral}/35</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">Firmographic:</span>
                            <span className="font-semibold">{breakdown.firmographic}/20</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">Engagement:</span>
                            <span className="font-semibold">{breakdown.engagement}/20</span>
                        </div>
                    </div>

                    {breakdown.details.length > 0 && (
                        <>
                            <div className="font-semibold mb-1 border-t border-slate-700 pt-2">
                                Applied Rules:
                            </div>
                            <div className="space-y-0.5">
                                {breakdown.details.map((detail, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-300">
                                        <span className="truncate mr-2">{detail.rule}</span>
                                        <span className="text-green-400">+{detail.points}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-4 border-transparent border-t-slate-900"></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScoreBadge;
