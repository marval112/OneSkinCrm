import React from 'react';

interface DateRangePickerProps {
    value: { from: string, to: string } | null;
    onChange: (range: { from: string, to: string } | null) => void;
    rightSlot?: React.ReactNode;
}

const presets = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
];

const getRangeFromPreset = (preset: string | null) => {
    if (!preset) return null;

    const now = new Date();
    const to = new Date(now);
    let from = new Date(now);

    // Set time to 00:00:00 for accurate 'day' comparisons
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    switch (preset) {
        case 'today':
            // Today: from start of today to end of today
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            break;
        case 'week': {
            // This Week: from Monday to Sunday (natural week)
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday = 0
            from.setDate(now.getDate() - daysFromMonday);
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            break;
        }
        case 'month':
            // This Month: from first day of month to today
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            break;
        case 'quarter': {
            // This Quarter: from first day of current quarter to today
            const month = now.getMonth();
            const quarterStartMonth = Math.floor(month / 3) * 3; // 0, 3, 6, or 9
            from = new Date(now.getFullYear(), quarterStartMonth, 1);
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            break;
        }
        default:
            return null;
    }

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
};


function DateRangePicker({ value, onChange, rightSlot }: DateRangePickerProps) {

    const handlePresetClick = (presetValue: string | null) => {
        onChange(presetValue ? getRangeFromPreset(presetValue) : null);
    };

    const isPresetActive = (presetValue: string | null) => {
        if (!value && !presetValue) return true; // 'All Time' is active
        if (!value || !presetValue) return false;

        const presetRange = getRangeFromPreset(presetValue);
        if (!presetRange) return false;

        // Compare just the date part to avoid timezone issues
        return value.from === presetRange.from;
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-base">Date Range</h3>
                <div className="flex items-center gap-2 flex-wrap">
                    {presets.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => handlePresetClick(p.value)}
                            className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${isPresetActive(p.value)
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    {rightSlot && <div className="ml-2">{rightSlot}</div>}
                </div>
            </div>
        </div>
    );
}

export default DateRangePicker;