import React, { useState, createContext, useContext } from 'react';
import { useTranslation } from '../../services/i18nService';

import UserManual from '../documentation/UserManual';
import FAQ from '../documentation/FAQ';
import Tutorials from '../documentation/Tutorials';
import TechnicalGuide from '../documentation/TechnicalGuide';
import KeyboardShortcuts from '../documentation/KeyboardShortcuts';

// ICONS
const PrintIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.281.283 2.186 1.84 1.938 3.104a1.125 1.125 0 01-2.258.152C18.045 20.218 17.255 19 16.002 19h-8.004c-1.253 0-2.043 1.218-1.862 2.456a1.125 1.125 0 01-2.258-.152C3.473 20.84 4.378 19.283 5.66 19m1.98 0l-.07.072a4.5 4.5 0 01-6.364-6.364l.071-.072A4.5 4.5 0 015.66 6.34l.072.071a4.5 4.5 0 016.364 6.364l-.072.071a4.5 4.5 0 01-6.364-6.364l.071-.072A4.5 4.5 0 015.66 6.34l.072.071a4.5 4.5 0 016.364 6.364l-.072.071a4.5 4.5 0 01-6.364-6.364l.071-.072A4.5 4.5 0 0112 6.341a4.5 4.5 0 010 6.364l.353.353" /></svg>;
const GlobeAltIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;

export const SearchContext = createContext({ searchTerm: '', setSearchTerm: (term: string) => {} });

function Documentation() {
    const { t, setLanguage, language } = useTranslation();
    const [activeTab, setActiveTab] = useState('userManual');
    const [searchTerm, setSearchTerm] = useState('');

    const handlePrint = () => {
        const printContents = document.getElementById('doc-content')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to re-apply React scripts
        }
    };

    const TABS = [
        { id: 'userManual', label: t('documentation.tabs.userManual') },
        { id: 'faq', label: t('documentation.tabs.faq') },
        { id: 'tutorials', label: t('documentation.tabs.tutorials') },
        { id: 'technicalGuide', label: t('documentation.tabs.technicalGuide') },
        { id: 'shortcuts', label: t('documentation.tabs.shortcuts') },
    ];

    return (
        <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md min-h-full">
                {/* Header */}
                <header className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('documentation.title')}</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('documentation.description')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <GlobeAltIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <select 
                                    value={language} 
                                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es' | 'pt')}
                                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                    <option value="pt">Português</option>
                                </select>
                             </div>
                            <button onClick={handlePrint} className="flex items-center px-3 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 text-sm">
                                <PrintIcon className="w-5 h-5 mr-2" />
                                {t('documentation.print')}
                            </button>
                        </div>
                    </div>
                     <div className="mt-4">
                        <input
                            type="text"
                            placeholder={t('documentation.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full max-w-lg px-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                </header>

                {/* Tabs */}
                <nav className="flex border-b border-slate-200 dark:border-slate-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div id="doc-content" className="pt-6">
                    {activeTab === 'userManual' && <UserManual />}
                    {activeTab === 'faq' && <FAQ />}
                    {activeTab === 'tutorials' && <Tutorials />}
                    {activeTab === 'technicalGuide' && <TechnicalGuide />}
                    {activeTab === 'shortcuts' && <KeyboardShortcuts />}
                </div>
            </div>
        </SearchContext.Provider>
    );
}

export default Documentation;