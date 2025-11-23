import React, { useState, useEffect } from 'react';
import { searchProspects, Prospect, calculateAIRelevance } from '../../services/prospectingService';
import { createLead } from '../../services/crmService';
import { LeadStatus, LeadSource, Segment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Prospecting = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    // Initialize state from sessionStorage if available
    const [query, setQuery] = useState(() => sessionStorage.getItem('prospecting_query') || '');
    const [results, setResults] = useState<Prospect[]>(() => {
        const saved = sessionStorage.getItem('prospecting_results');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);
    const [sources, setSources] = useState(() => {
        const saved = sessionStorage.getItem('prospecting_sources');
        return saved ? JSON.parse(saved) : {
            LinkedIn: true,
            Google: true,
            Directory: true
        };
    });
    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

    // Persist state changes
    useEffect(() => {
        sessionStorage.setItem('prospecting_query', query);
    }, [query]);

    useEffect(() => {
        sessionStorage.setItem('prospecting_results', JSON.stringify(results));
    }, [results]);

    useEffect(() => {
        sessionStorage.setItem('prospecting_sources', JSON.stringify(sources));
    }, [sources]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const activeSources = Object.keys(sources).filter(k => sources[k as keyof typeof sources]);
            const data = await searchProspects(query, activeSources);
            setResults(data);
            if (data.length === 0) {
                showToast('No prospects found for this criteria.', 'info');
            }
        } catch (error) {
            showToast('Failed to search prospects.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (prospect: Prospect) => {
        if (!user) return;
        try {
            // Map Prospect to Lead
            // Use a heuristic for Segment based on snippet or default to Industrial
            const segment = Segment.INDUSTRIAL;

            // Map source string to LeadSource enum, fallback to Website if not exact match
            let source = LeadSource.Website;
            if (prospect.source === 'LinkedIn') source = LeadSource.LinkedIn;
            else if (prospect.source === 'Google') source = LeadSource.Google;
            else if (prospect.source === 'Directory') source = LeadSource.Directory;

            await createLead({
                name: prospect.name,
                company: prospect.company,
                email: prospect.email || '', // AI might not always return email
                phone: '', // AI doesn't usually generate phone numbers
                country: prospect.location.split(',').pop()?.trim() || '',
                segment: segment,
                source: source,
                status: LeadStatus.New,
                score: prospect.matchScore,
                notes: `Imported from Prospecting Hub.\nRole: ${prospect.role}\nSnippet: ${prospect.snippet}\nLocation: ${prospect.location}`
            }, user.id);

            showToast(`Imported ${prospect.company} as a new Lead!`, 'success');
        } catch (error) {
            console.error("Import failed", error);
            showToast('Failed to import lead.', 'danger');
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Prospecting Hub</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Find new distributors and manufacturers using AI-powered search.</p>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSearch} className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g., Kitchen manufacturers in France, Furniture distributors in Spain..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <span>Search</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium mr-1">Sources:</span>
                        {Object.keys(sources).map(source => (
                            <label key={source} className="flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={sources[source as keyof typeof sources]}
                                    onChange={(e) => setSources(prev => ({ ...prev, [source]: e.target.checked }))}
                                    className="rounded text-primary focus:ring-primary bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500 h-3.5 w-3.5"
                                />
                                {source}
                            </label>
                        ))}
                    </div>
                </form>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* List */}
                <div className="lg:col-span-2 space-y-3">
                    {results.length > 0 ? (
                        results.map(prospect => (
                            <div
                                key={prospect.id}
                                onClick={() => setSelectedProspect(prospect)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedProspect?.id === prospect.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-primary ring-1 ring-primary'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-base text-slate-800 dark:text-white">{prospect.company}</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{prospect.name} • {prospect.role}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {prospect.location}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${prospect.source === 'LinkedIn' ? 'bg-blue-100 text-blue-700' :
                                            prospect.source === 'Google' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {prospect.source}
                                        </span>
                                        <div className="flex items-center gap-1" title="AI Match Score">
                                            <span className={`text-base font-bold ${prospect.matchScore >= 90 ? 'text-green-600' :
                                                prospect.matchScore >= 70 ? 'text-yellow-600' : 'text-slate-400'
                                                }`}>{prospect.matchScore}%</span>
                                            <span className="text-[10px] text-slate-400">Match</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic">"{prospect.snippet}"</p>
                            </div>
                        ))
                    ) : (
                        !loading && (
                            <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="mt-3 text-sm text-slate-500">Enter a search term to find new prospects.</p>
                            </div>
                        )
                    )}
                </div>

                {/* Detail / AI Panel */}
                <div className="lg:col-span-1">
                    {selectedProspect ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 sticky top-6 overflow-hidden">
                            <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{selectedProspect.company}</h2>
                                <a href={`https://${selectedProspect.website}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                    {selectedProspect.website}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* AI Insight */}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <h3 className="font-semibold text-sm text-indigo-900 dark:text-indigo-300">AI Analysis</h3>
                                    </div>
                                    <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                                        {calculateAIRelevance(selectedProspect, user)}
                                    </p>
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact Decision Maker</h4>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {selectedProspect.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-slate-800 dark:text-white">{selectedProspect.name}</p>
                                            <p className="text-xs text-slate-500">{selectedProspect.role}</p>
                                        </div>
                                    </div>
                                    {selectedProspect.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {selectedProspect.email}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => handleImport(selectedProspect)}
                                        className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Import to CRM
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedProspect?.linkedinUrl) {
                                                window.open(selectedProspect.linkedinUrl, '_blank');
                                            } else {
                                                showToast('LinkedIn profile not available', 'warning');
                                            }
                                        }}
                                        className="w-full mt-2 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 transition-all"
                                    >
                                        View Full Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                            <p className="text-sm">Select a prospect to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Prospecting;
