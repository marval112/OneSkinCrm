export interface SavedSearch {
    id: string;
    name: string;
    type: 'leads' | 'customers';
    filters: Record<string, any>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    createdAt: string;
}

const STORAGE_KEY = 'oneskin_crm_saved_searches';

export const getSavedSearches = (type: 'leads' | 'customers'): SavedSearch[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const allSearches: SavedSearch[] = JSON.parse(stored);
        return allSearches.filter(s => s.type === type).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
        console.error('Error loading saved searches:', error);
        return [];
    }
};

export const saveSearch = (search: Omit<SavedSearch, 'id' | 'createdAt'>): SavedSearch => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allSearches: SavedSearch[] = stored ? JSON.parse(stored) : [];

        const newSearch: SavedSearch = {
            ...search,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        allSearches.push(newSearch);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));
        return newSearch;
    } catch (error) {
        console.error('Error saving search:', error);
        throw error;
    }
};

export const deleteSearch = (id: string) => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const allSearches: SavedSearch[] = JSON.parse(stored);
        const filtered = allSearches.filter(s => s.id !== id);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error deleting search:', error);
        throw error;
    }
};
