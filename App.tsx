

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AIChatPanel from './components/common/AIChatPanel';
import AINudgeTray from './components/common/AINudgeTray';
import Toast from './components/common/Toast';
import { ToastContext } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import type { ToastMessage } from './types';
import { applyTheme, getActiveTheme } from './services/themeService';
import { initializeDatabase } from './services/databaseInitialization';
import { runDueReports } from './services/scheduledReports';
import { loadGeminiApiKey, loadOpenRouterApiKey } from './services/aiSettingsService';
import { runNurtureCoach } from './services/nurtureCoach';
import { applyBrandFavicon } from './services/brandingService';

// Import Auth and Login
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Login from './components/pages/Login.tsx';
import AppRoutes from './components/routing/AppRoutes';
import useSwipe from './hooks/useSwipe';


import { ChatProvider, useChat } from './contexts/ChatContext';
import { TeamProvider } from './contexts/TeamContext';
import IncomingCallModal from './components/common/IncomingCallModal';

import { getNavItems } from './components/layout/navigationConfig';

// Main Layout Component to handle Router context and Global Swipes
const MainLayout = () => {
  const { user } = useAuth();
  const { isOpen: isChatPanelOpen, openChat, closeChat } = useChat();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const swipeHandlers = useSwipe({
    onSwipedRight: () => {
      setIsSidebarOpen(true);
    },
    onSwipedLeft: () => {
      if (!user) return;
      const navItems = getNavItems(user.role);
      const currentIndex = navItems.findIndex(item => item.to === location.pathname);

      if (currentIndex !== -1 && currentIndex < navItems.length - 1) {
        const nextItem = navItems[currentIndex + 1];
        navigate(nextItem.to);
      }
    }
  });

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-dark text-slate-800 dark:text-slate-200">
      {/* Sidebar handles its own close swipe */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area with Global Swipe Detection */}
      <div
        className="flex-1 flex flex-col w-full"
        {...swipeHandlers}
      >
        <Header
          onChatToggle={() => isChatPanelOpen ? closeChat() : openChat()}
          onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
        />
        {/* Lightweight scheduler to run due reports every ~60s (Admin only, gated) */}
        {user?.role === 'Admin' && ((import.meta as any).env?.VITE_ENABLE_SCHEDULER === 'true') && (
          <SchedulerTicker />
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
          <AppRoutes />
        </main>
      </div>
      {isChatPanelOpen && <AIChatPanel onClose={closeChat} />}
      <AINudgeTray />
      <IncomingCallModal />
    </div>
  );
};

function AppContent() {
  const { user, loading } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  useEffect(() => {
    // Apply theme on initial load, which now also handles setting the 'dark' class
    const activeTheme = getActiveTheme();
    applyTheme(activeTheme.id);

    // Initialize database schema and seed data
    const initDb = async () => {
      const success = await initializeDatabase();
      if (success) {
        console.log("Database is ready.");
      } else {
        console.error("Database initialization failed.");
      }
      // Warm AI key cache from Supabase (non-blocking for UI)
      try { await loadGeminiApiKey(); await loadOpenRouterApiKey(); } catch { }
      setIsDbInitialized(true);
    };
    initDb();

    // Apply favicon from brand logo and keep it in sync
    try {
      applyBrandFavicon();
      const handler = () => applyBrandFavicon();
      window.addEventListener('branding:updated', handler);
      return () => window.removeEventListener('branding:updated', handler);
    } catch { }

  }, []);

  // Periodic AI Nurture Coach
  useEffect(() => {
    if (!isDbInitialized || loading) return;
    let id: number | undefined;
    const tick = async () => { try { if (user) await runNurtureCoach(user); } catch { } };
    tick(); // run once on mount
    // @ts-ignore
    id = window.setInterval(tick, 5 * 60 * 1000); // every 5 minutes
    return () => { if (id) window.clearInterval(id); };
  }, [isDbInitialized, loading, user]);

  const showToast = useMemo(() => {
    // Simple wrapper to avoid passing state setter directly down context if not needed, 
    // but here we just need a memoized showToast function
    return (message: string, type: 'success' | 'danger' | 'warning' | 'info', action?: { label?: string; onClick: () => void }) => {
      setToast({ message, type, action });
      setTimeout(() => setToast(null), 5000);
    };
  }, []);

  const toastContextValue = useMemo(() => ({ showToast }), [showToast]);

  const FullScreenLoader = ({ message }: { message: string }) => (
    <div className="flex justify-center items-center h-screen bg-slate-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="ml-4 text-slate-600">{message}</p>
    </div>
  );

  if (!isDbInitialized || loading) {
    return <FullScreenLoader message={!isDbInitialized ? "Setting up the database..." : "Loading..."} />;
  }

  return (
    <ToastContext.Provider value={toastContextValue}>
      <HashRouter>
        <TeamProvider>
          {!user ? (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <MainLayout />
          )}
        </TeamProvider>
        {toast && <Toast message={toast.message} type={toast.type} action={toast.action} onClose={() => setToast(null)} />}
      </HashRouter>
    </ToastContext.Provider>
  );
}


function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}


export default App;

function SchedulerTicker() {
  useEffect(() => {
    const key = 'report_scheduler_last_tick';
    const tick = async () => {
      const now = Date.now();
      try {
        const last = parseInt(localStorage.getItem(key) || '0', 10);
        if (Number.isFinite(last) && now - last < 55_000) {
          return; // avoid running too frequently (best-effort dedupe across tabs)
        }
        localStorage.setItem(key, String(now));
        await runDueReports();
      } catch { }
    };
    const id = setInterval(tick, 60_000);
    // run once on mount
    tick();
    return () => clearInterval(id);
  }, []);
  return null;
}