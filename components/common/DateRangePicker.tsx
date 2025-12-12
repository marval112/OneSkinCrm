import React from 'react';

interface DateRangePickerProps {
    value: { from: string, to: string } | null;
    onChange: (range: { from: string, to: string } | null, preset?: string) => void;
    rightSlot?: React.ReactNode;
    year?: number;
}

const presets = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
];

const getRangeFromPreset = (preset: string | null, year: number | undefined) => {
    if (!preset) return null;

    const currentYear = new Date().getFullYear();
    const targetYear = year || currentYear;

    // Construct "now" relative to the target year
    // If target year is current year, use real now. 
    // If target year is past, use Dec 31st of that year OR maintain equivalent day/month?
    // Requirement says: "buttons are second filters on selected year".
    // If I select 2023 and click "Today" (assuming today is Dec 12), should it show Dec 12 2023? 
    // Logic: 
    // - Today -> Same day/month in target year.
    // - Week -> Same week # in target year? Or just week containing the relative "now"?
    // - Month -> Same month in target year.
    // - Quarter -> Same quarter in target year.
    // - Year -> Full target year.

    const realNow = new Date();
    // Base reference date for "Now" in target year
    let nowInYear = new Date(realNow);
    nowInYear.setFullYear(targetYear);

    // Safety: If leaping to non-existent date (e.g. Feb 29 in non-leap), JS Date handles it (rolls to Mar 1). 
    // But if target year < current year, "Today" implies the specific historical date? Yes.

    const to = new Date(nowInYear);
    let from = new Date(nowInYear);

    // If target year is NOT current year, 'to' (end of range) shouldn't be capped at "Now" time for Month/Year views?
    // Actually, usually "This Month" in a past year implies the WHOLE month, not just "up to 12th".
    // "This Year" in past means WHOLE year.
    // "Today" means that specific day.

    const isPastYear = targetYear < currentYear;

    // Default end of day
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);

    switch (preset) {
        case 'today':
            // Specific day in target year
            from.setHours(0, 0, 0, 0);
            break;
        case 'week': {
            // Week containing "nowInYear"
            const dayOfWeek = nowInYear.getDay(); // 0=Sun
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            from.setDate(nowInYear.getDate() - daysFromMonday);
            from.setHours(0, 0, 0, 0);

            // End of week (Sunday)
            const endOfWeek = new Date(from);
            endOfWeek.setDate(from.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            // If sticky to "current progress", we might cap at 'to', but for past years usually we want full week.
            // Let's return full week for consistency within the year context.
            return { from: from.toISOString(), to: endOfWeek.toISOString() };
        }
        case 'month':
            // 1st of month
            from = new Date(targetYear, nowInYear.getMonth(), 1);
            from.setHours(0, 0, 0, 0);

            if (isPastYear) {
                // Return full month
                const lastDay = new Date(targetYear, nowInYear.getMonth() + 1, 0);
                lastDay.setHours(23, 59, 59, 999);
                return { from: from.toISOString(), to: lastDay.toISOString() };
            }
            // If current year, 'to' is 'now' (end of today) or full month? 
            // Standard "This Month" ranges usually go up to "now".
            break;
        case 'quarter': {
            const month = nowInYear.getMonth();
            const quarterStartMonth = Math.floor(month / 3) * 3;
            from = new Date(targetYear, quarterStartMonth, 1);
            from.setHours(0, 0, 0, 0);

            if (isPastYear) {
                const quarterEndMonth = quarterStartMonth + 3;
                const lastDay = new Date(targetYear, quarterEndMonth, 0);
                lastDay.setHours(23, 59, 59, 999);
                return { from: from.toISOString(), to: lastDay.toISOString() };
            }
            break;
        }
        case 'year':
            // Full Year
            from = new Date(targetYear, 0, 1);
            from.setHours(0, 0, 0, 0);

            if (isPastYear || true) {
                // "This Year" usually means Jan 1 to Dec 31 context for filters, especially for past.
                // Even for current year, if I select "This Year", I might want to see the whole X-axis?
                // But usually we filter data UP TO now. 
                // However, returning full year range allow creating "future" targets/budget space?
                // Let's clamp 'to' to 'now' for current year to avoid future-looking weirdness?
                // No, user requirement: "buttons are filters".
                // Safest: Full year range. The backend/data just won't have future data.
                const lastDay = new Date(targetYear, 11, 31);
                lastDay.setHours(23, 59, 59, 999);
                return { from: from.toISOString(), to: lastDay.toISOString() };
            }
            break;
        default:
            return null;
    }

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
};


function DateRangePicker({ value, onChange, rightSlot, year }: DateRangePickerProps) {

    const handlePresetClick = (presetValue: string | null) => {
        onChange(presetValue ? getRangeFromPreset(presetValue, year) : null, presetValue || undefined);
    };

    const isPresetActive = (presetValue: string | null) => {
        if (!value && !presetValue && !year) return true; // 'All Time' is active, and no specific year (or default)
        // If "This Year" is active, it might be same as "All Time" if we just default to year. Only treat specific presets as active.
        if (!value || !presetValue) return false;

        const presetRange = getRangeFromPreset(presetValue, year);
        if (!presetRange) return false;

        // Compare just the date part to avoid timezone issues
        // Actually, timestamps are safer if we use exact logic
        return value.from === presetRange.from && value.to === presetRange.to;
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