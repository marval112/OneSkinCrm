import React, { useContext } from 'react';
import { useTranslation } from '../../services/i18nService';
import { SearchContext } from '../pages/Documentation';

const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200">{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

function KeyboardShortcuts() {
    const { t } = useTranslation();
    const searchContext = useContext(SearchContext);
    const searchTerm = searchContext?.searchTerm ?? '';
    const categories = ['general', 'navigation', 'actions'];

    const filteredCategories = categories.filter(key => {
        const category = t(`keyboardShortcuts.${key}` as any);
        return !searchTerm ||
               category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               category.shortcuts.some((shortcut: { keys: string, action: string }) => 
                    shortcut.keys.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    shortcut.action.toLowerCase().includes(searchTerm.toLowerCase())
               );
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {filteredCategories.map(key => {
                 const category = t(`keyboardShortcuts.${key}` as any);
                 return (
                    <div key={key}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">
                            <Highlight text={category.title} highlight={searchTerm} />
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Shortcut</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {category.shortcuts.map((shortcut: { keys: string, action: string }, index: number) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                                                    <Highlight text={shortcut.keys} highlight={searchTerm} />
                                                </kbd>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                                <Highlight text={shortcut.action} highlight={searchTerm} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 );
            })}
             {filteredCategories.length === 0 && (
                <p className="text-center text-slate-500 py-8">No shortcuts found matching your search.</p>
            )}
        </div>
    );
}

export default KeyboardShortcuts;
