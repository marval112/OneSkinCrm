
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../services/i18nService';
import { applyTheme, getActiveTheme } from '../../services/themeService';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface HeaderProps {
    onChatToggle: () => void;
    onSidebarToggle: () => void;
}

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.47-1.472L13 18.25l1.188-.648a2.25 2.25 0 011.47 1.472L16.25 20l.648-.102a2.25 2.25 0 011.47 1.472l.648 1.188-.648 1.188a2.25 2.25 0 01-1.47-1.472L16.25 20z" />
    </svg>
);

const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.95-4.243l-1.59-1.591M5.25 12H3m4.243-4.95l-1.59-1.591M12 9a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
);

const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);

const GlobeAltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

const ArrowLeftOnRectangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

function Header({ onChatToggle, onSidebarToggle }: HeaderProps) {
  const location = useLocation();
  const { t, language, setLanguage } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState(getActiveTheme().id);
  const { user, logout } = useAuth();

  const getTitle = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    // Use translation keys that match the path
    const translationKey = `sidebar.${path.replace('-', '')}`;
    const title = t(translationKey);
    // If translation not found, fallback to capitalizing path
    return title === translationKey ? path.charAt(0).toUpperCase() + path.slice(1) : title;
  };

  const handleThemeToggle = () => {
      const newThemeId = currentTheme === 'dark' ? 'default' : 'dark';
      applyTheme(newThemeId);
      setCurrentTheme(newThemeId);
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm p-4 border-b border-slate-200 dark:border-slate-700 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
            <button
                onClick={onSidebarToggle}
                className="lg:hidden text-slate-500 hover:text-slate-700 mr-4"
                aria-label="Open sidebar"
            >
                <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{getTitle()}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
             <div className="relative">
                <GlobeAltIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es' | 'pt')}
                    className="pl-8 pr-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-transparent dark:bg-slate-700 dark:text-white appearance-none"
                    aria-label="Select language"
                >
                    <option value="en">EN</option>
                    <option value="es">ES</option>
                    <option value="pt">PT</option>
                </select>
             </div>

            <button
                onClick={handleThemeToggle}
                className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle light/dark theme"
            >
                {currentTheme === 'dark' ? <SunIcon className="h-6 w-6 text-yellow-400" /> : <MoonIcon className="h-6 w-6 text-slate-600" />}
            </button>

            <button 
                onClick={onChatToggle}
                className="flex items-center px-3 sm:px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors"
                aria-label="Toggle AI Assistant"
            >
                <SparklesIcon className="w-5 h-5 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">{t('header.aiAssistant')}</span>
            </button>

             <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
                </div>
                 <button onClick={logout} className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Logout">
                    <ArrowLeftOnRectangleIcon className="h-6 w-6"/>
                </button>
            </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
