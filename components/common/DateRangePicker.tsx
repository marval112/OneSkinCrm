import React from 'react';

interface DateRangePickerProps {
    value: { from: string, to: string } | null;
    onChange: (range: { from: string, to: string } | null) => void;
    rightSlot?: React.ReactNode;
}

const presets = [
    { label: 'All Time', value: null },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
];

const getRangeFromPreset = (preset: string | null) => {
    if (!preset) return null;
    
    const to = new Date();
    let from = new Date();

    // Set time to 00:00:00 for accurate 'day' comparisons
    to.setHours(0, 0, 0, 0);
    from.setHours(0, 0, 0, 0);

    switch (preset) {
        case '7d':
            from.setDate(to.getDate() - 6); // -6 to include today as the 7th day
            break;
        case '30d':
            from.setDate(to.getDate() - 29); // -29 to include today
            break;
        case 'month':
            from = new Date(to.getFullYear(), to.getMonth(), 1);
            break;
        case 'quarter': {
            const month = to.getMonth();
            const quarterStartMonth = Math.floor(month / 3) * 3;
            from = new Date(to.getFullYear(), quarterStartMonth, 1);
            break;
        }
        case 'year':
            from = new Date(to.getFullYear(), 0, 1);
            break;
        default:
            return null;
    }
    
    return {
        from: from.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0], // 'to' should always be today
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
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Date Range</h3>
            <div className="flex items-center gap-2">
                {presets.map(p => (
                    <button
                        key={p.label}
                        onClick={() => handlePresetClick(p.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            isPresetActive(p.value)
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                {rightSlot && <div className="ml-2">{rightSlot}</div>}
            </div>
        </div>
    );
}

export default DateRangePicker;