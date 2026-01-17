import React, { useState, useEffect } from 'react';
const BookmarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const BookmarkSolidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
    </svg>
);
import { SavedSearch, getSavedSearches, saveSearch, deleteSearch } from '../../services/savedSearchService';

interface SavedSearchControlsProps {
    type: 'leads' | 'customers';
    currentFilters: Record<string, any>;
    onApplySearch: (filters: Record<string, any>) => void;
}

const SavedSearchControls: React.FC<SavedSearchControlsProps> = ({ type, currentFilters, onApplySearch }) => {
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newSearchName, setNewSearchName] = useState('');

    useEffect(() => {
        loadSearches();
    }, [type]);

    const loadSearches = () => {
        setSearches(getSavedSearches(type));
    };

    const handleSave = () => {
        if (!newSearchName.trim()) return;

        saveSearch({
            name: newSearchName,
            type,
            filters: currentFilters
        });

        setNewSearchName('');
        setIsSaveModalOpen(false);
        loadSearches();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteSearch(id);
        loadSearches();
    };

    const handleApply = (search: SavedSearch) => {
        onApplySearch(search.filters);
        setIsMenuOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium"
            >
                <BookmarkIcon className="h-4 w-4" />
                Saved Searches
            </button>

            {isMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <button
                                onClick={() => { setIsMenuOpen(false); setIsSaveModalOpen(true); }}
                                className="flex w-full items-center gap-2 px-2 py-2 text-sm text-primary hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Save Current Search
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto py-1">
                            {searches.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-slate-500 text-center">
                                    No saved searches yet
                                </div>
                            ) : (
                                searches.map((search) => (
                                    <div
                                        key={search.id}
                                        className="group flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                        onClick={() => handleApply(search)}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <BookmarkSolidIcon className="h-3 w-3 text-slate-400" />
                                            <span className="truncate">{search.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, search.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                                            title="Delete"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {isSaveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 m-4">
                        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Save Search</h3>
                        <input
                            type="text"
                            value={newSearchName}
                            onChange={(e) => setNewSearchName(e.target.value)}
                            placeholder="Enter a name (e.g., 'Hot Leads Spain')"
                            className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 mb-4 focus:ring-2 focus:ring-primary focus:border-transparent"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsSaveModalOpen(false)}
                                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!newSearchName.trim()}
                                className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-hover text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedSearchControls;
