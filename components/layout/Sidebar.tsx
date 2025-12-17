

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../services/i18nService';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { listTasksForUser, getTaskCounts } from '../../services/tasksService';
import { getLeads, getCustomers, getDeals } from '../../services/crmService';
import { generateAlertRecommendations } from '../../services/predictiveAlerts';
import { getAutomationAlerts } from '../../services/alertsService';
import { getBrandName, getSidebarLogoUrl, BRANDING_UPDATED_EVENT } from '../../services/brandingService';
import { applyTheme, getActiveTheme, getThemeMode, toggleThemeMode } from '../../services/themeService';
import useSwipe from '../../hooks/useSwipe';
import { getNavItems, NavItem, XMarkIcon, PaintBrushIcon, GlobeAltIcon } from './navigationConfig';




interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { t, language, setLanguage } = useTranslation();
  const { user } = useAuth();
  const [brandName, setBrandName] = useState<string>(getBrandName());
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string>(getSidebarLogoUrl());
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [customersCount, setCustomersCount] = useState<number>(0);
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>(getThemeMode());

  const swipeHandlers = useSwipe({ onSwipedLeft: () => setIsOpen(false) });

  useEffect(() => {
    const update = () => {
      setBrandName(getBrandName());
      setSidebarLogoUrl(getSidebarLogoUrl());
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, update as EventListener);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, update as EventListener);
  }, []);

  // Fetch task, leads, and customers counts for badges
  useEffect(() => {
    let timer: number | undefined;
    const refresh = async () => {
      try {
        if (!user) return;
        const counts = await getTaskCounts(user.id);
        setOverdueCount(counts.overdue);
        setTodayCount(counts.today);
        setPendingCount(counts.pending);

        // Get leads count
        const leadsData = await getLeads(user);
        setLeadsCount(leadsData.length);

        // Get customers count
        const customersData = await getCustomers(user);
        setCustomersCount(customersData.length);

      } catch { }
    };
    refresh();
    // periodic refresh each 60s
    // @ts-ignore - window.setInterval returns number in browsers
    timer = window.setInterval(refresh, 60000);
    return () => { if (timer) window.clearInterval(timer); };
  }, [user]);

  // Fetch alerts count (predictive + automation persisted), minus dismissed
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user) return;
        const [leads, customers, deals, autoAlerts] = await Promise.all([
          getLeads(user), getCustomers(user), getDeals(user), getAutomationAlerts()
        ]);
        const predictive = await generateAlertRecommendations(leads, customers, deals);
        let dismissed: string[] = [];
        try { const raw = localStorage.getItem('dismissedAlerts'); dismissed = raw ? JSON.parse(raw) : []; } catch { }
        const combined = [...autoAlerts, ...predictive];
        const filtered = combined.filter((a: any) => !dismissed.includes(String(a.id)));
        if (active) setAlertsCount(filtered.length);
      } catch { }
    })();
    return () => { active = false; };
  }, [user]);



  const ENTERPRISE_NAV_ITEMS: NavItem[] = [
    // Settings moved to footer
  ];

  const NavList = ({ items }: { items: NavItem[] }) => (
    <ul>
      {items.map(item => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 my-1 rounded-lg transition-colors hover:bg-white/10 ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white/90'}`
            }
            onClick={() => setIsOpen(false)}
            onTouchStart={(e) => {
              // Prevent scroll interference on mobile
              e.currentTarget.style.touchAction = 'none';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.touchAction = 'auto';
            }}
          >
            {item.icon}
            <span className="ml-3 text-sm font-medium flex items-center gap-2">
              {t(item.labelKey)}
              {item.to === '/tasks' && (
                <>
                  {pendingCount > 0 && <span className="px-1.5 rounded-full text-[10px] bg-blue-600 text-white">{pendingCount}</span>}
                  {overdueCount > 0 && <span className="px-1.5 rounded-full text-[10px] bg-red-600 text-white">{overdueCount}</span>}
                  {todayCount > 0 && <span className="px-1.5 rounded-full text-[10px] bg-primary text-white">{todayCount}</span>}
                </>
              )}
              {item.to === '/alerts' && alertsCount > 0 && (
                <span className="px-1.5 rounded-full text-[10px] bg-primary text-white">{alertsCount}</span>
              )}
              {item.to === '/leads' && leadsCount > 0 && (
                <span className="px-1.5 rounded-full text-[10px] bg-slate-500 text-white">{leadsCount}</span>
              )}
              {item.to === '/customers' && customersCount > 0 && (
                <span className="px-1.5 rounded-full text-[10px] bg-slate-500 text-white">{customersCount}</span>
              )}
            </span>
          </NavLink>
        </li>
      ))}
    </ul>
  );

  const SidebarContent = () => (
    <>
      <div className="relative p-4 border-b border-white/20">
        <div className="flex justify-center items-center h-12 gap-2">
          <img src={sidebarLogoUrl} alt={brandName} className="h-full object-contain" onError={({ currentTarget }) => { (currentTarget as HTMLImageElement).src = '/dashboard/logo_white.png'; }} />
          <span className="text-sm font-medium text-white truncate">{brandName}</span>
          <span className="text-xs align-middle font-light text-white/60 ml-2">v{(import.meta.env.VITE_COMMIT_HASH || '1.0').substring(0, 7)}</span>
        </div>
        <button
          className="lg:hidden absolute top-1/2 right-4 -translate-y-1/2 p-1 text-white/80 hover:text-white"
          onClick={() => setIsOpen(false)}
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 p-4 pb-24 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
        <div>
          <NavList items={getNavItems(user?.role)} />
        </div>
      </nav>

      {/* Footer with Settings, Language and Theme Controls */}
      <div className="p-4 border-t border-white/20 space-y-3">
        {user?.role === 'Admin' && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg transition-colors hover:bg-white/10 ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white/90'}`
            }
            onClick={() => setIsOpen(false)}
          >
            <PaintBrushIcon className="h-5 w-5" />
            <span className="ml-3 text-sm font-medium">{t('sidebar.settings')}</span>
          </NavLink>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <GlobeAltIcon className="w-4 h-4 text-white/60 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'es' | 'pt')}
              className="w-full pl-8 pr-2 py-2 border border-white/20 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-white/40 bg-white/10 text-white appearance-none cursor-pointer hover:bg-white/20 transition-colors"
              aria-label="Select language"
            >
              <option value="en" className="text-slate-900">English</option>
              <option value="es" className="text-slate-900">Español</option>
              <option value="pt" className="text-slate-900">Português</option>
            </select>
          </div>
          <button
            onClick={() => { toggleThemeMode(); setCurrentMode(getThemeMode()); }}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            style={{
              backgroundColor: 'white',
              color: 'var(--color-primary)'
            }}
            aria-label="Toggle light/dark theme"
          >
            {currentMode === 'dark' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM19.071 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.179 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM15.657 15.657a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zM6.464 6.464a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zM15.657 4.343a.75.75 0 010 1.061l-1.061 1.06a.75.75 0 11-1.06-1.06l1.06-1.061a.75.75 0 011.061 0zM6.464 13.536a.75.75 0 010 1.061l-1.061 1.06a.75.75 0 11-1.06-1.06l1.06-1.061a.75.75 0 011.061 0z" />
                </svg>
                Light
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
                </svg>
                Dark
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 text-white"
        style={{
          background: `linear-gradient(180deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 85%, black) 100%)`
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Full Screen Grid (App Launcher Style) */}
      <div className={`fixed inset-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
        <div
          className="w-full h-full flex flex-col"
          style={{
            background: `linear-gradient(180deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 85%, black) 100%)`
          }}
        >
          {/* Mobile Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <img src={sidebarLogoUrl} alt={brandName} className="h-8 object-contain" onError={({ currentTarget }) => { (currentTarget as HTMLImageElement).src = '/dashboard/logo_white.png'; }} />
              <span className="text-lg font-bold text-white">{brandName}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-2">
              <XMarkIcon className="h-8 w-8" />
            </button>
          </div>

          {/* Mobile Grid Content */}
          <div className="flex-1 overflow-y-auto p-6" style={{ touchAction: 'pan-y' }}>
            <div className="grid grid-cols-3 gap-6">
              {/* Standard Navigation Items */}
              {getNavItems(user?.role).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-3 p-2 rounded-xl transition-all aspect-square ${isActive ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`
                  }
                >
                  <div className="text-white [&>svg]:w-8 [&>svg]:h-8">
                    {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-8 h-8' })}
                  </div>
                  <span className="text-xs font-medium text-white text-center leading-tight">
                    {t(item.labelKey)}
                  </span>
                  {/* Badges for Mobile Grid */}
                  {item.to === '/tasks' && (pendingCount > 0 || overdueCount > 0 || todayCount > 0) && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white/10" />
                  )}
                </NavLink>
              ))}

              {/* Settings (Admin) */}
              {user?.role === 'Admin' && (
                <NavLink
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-3 p-2 rounded-xl transition-all aspect-square ${isActive ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`
                  }
                >
                  <div className="text-white">
                    <PaintBrushIcon className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-medium text-white text-center leading-tight">{t('sidebar.settings')}</span>
                </NavLink>
              )}

              {/* Language Toggle (Cycles) */}
              <button
                onClick={() => {
                  const nextLang = language === 'en' ? 'es' : language === 'es' ? 'pt' : 'en';
                  setLanguage(nextLang);
                }}
                className="flex flex-col items-center justify-center gap-3 p-2 rounded-xl hover:bg-white/10 aspect-square"
              >
                <div className="text-white">
                  <GlobeAltIcon className="w-8 h-8" />
                </div>
                <span className="text-xs font-medium text-white text-center leading-tight uppercase">{language}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => { toggleThemeMode(); setCurrentMode(getThemeMode()); }}
                className="flex flex-col items-center justify-center gap-3 p-2 rounded-xl hover:bg-white/10 aspect-square"
              >
                <div className="text-white">
                  {currentMode === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-white text-center leading-tight">{currentMode === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

export default Sidebar;