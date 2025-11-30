import React from 'react';
import { TooltipProps } from 'recharts';

interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean;
    payload?: any[];
    label?: string;
    formatter?: (value: number) => string;
    title?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter, title }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {title ? `${title}: ${label}` : label}
                </p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-600 dark:text-slate-400">
                                {entry.name}:
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {formatter ? formatter(entry.value) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default CustomTooltip;
