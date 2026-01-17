import React, { useState } from 'react';
import Modal from './Modal';
import { saveCustomReport, AVAILABLE_FIELDS, NUMERIC_FIELDS, CustomReport } from '../../services/customReportService';

interface CustomReportBuilderProps {
    onClose: () => void;
    onSave: (report: CustomReport) => void;
}

const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({ onClose, onSave }) => {
    const [reportName, setReportName] = useState('');
    const [dataSource, setDataSource] = useState<'leads' | 'customers' | 'deals'>('leads');
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [groupBy, setGroupBy] = useState<string>('');

    const availableFields = AVAILABLE_FIELDS[dataSource];
    const numericFields = NUMERIC_FIELDS[dataSource];

    const toggleField = (field: string) => {
        setSelectedFields(prev =>
            prev.includes(field)
                ? prev.filter(f => f !== field)
                : [...prev, field]
        );
    };

    const handleSave = () => {
        if (!reportName.trim()) {
            alert('Please enter a report name');
            return;
        }
        if (selectedFields.length === 0) {
            alert('Please select at least one field');
            return;
        }

        const report = saveCustomReport({
            name: reportName,
            dataSource,
            fields: selectedFields,
            groupBy: groupBy || undefined
        });

        onSave(report);
        onClose();
    };

    const handleDataSourceChange = (newSource: 'leads' | 'customers' | 'deals') => {
        setDataSource(newSource);
        setSelectedFields([]);
        setGroupBy('');
    };

    return (
        <Modal title="Create Custom Report" onClose={onClose}>
            <div className="p-6 space-y-4">
                {/* Report Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Report Name
                    </label>
                    <input
                        type="text"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="e.g., High-Value Customers"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>

                {/* Data Source */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data Source
                    </label>
                    <div className="flex gap-2">
                        {(['leads', 'customers', 'deals'] as const).map(source => (
                            <button
                                key={source}
                                onClick={() => handleDataSourceChange(source)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dataSource === source
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {source.charAt(0).toUpperCase() + source.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Field Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Select Fields to Display
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 border border-slate-200 dark:border-slate-600 rounded-md">
                        {availableFields.map(field => (
                            <label key={field} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={selectedFields.includes(field)}
                                    onChange={() => toggleField(field)}
                                    className="rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{field}</span>
                            </label>
                        ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {selectedFields.length} field(s) selected
                    </div>
                </div>

                {/* Group By (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Group By (Optional)
                    </label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    >
                        <option value="">No Grouping</option>
                        {availableFields
                            .filter(f => !numericFields.includes(f) && f !== 'id')
                            .map(field => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                    </select>
                    {groupBy && (
                        <div className="text-xs text-slate-500 mt-1">
                            Data will be grouped by {groupBy} with count aggregation
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover"
                    >
                        Save Report
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CustomReportBuilder;
