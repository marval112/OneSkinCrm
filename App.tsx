

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/pages/Dashboard';
import Leads from './components/pages/Leads';
import Customers from './components/pages/Customers';
import Products from './components/pages/Products';
import Deals from './components/pages/Deals';
import Automation from './components/pages/Automation';
import ThemeCustomizer from './components/pages/ThemeCustomizer';
import ReportsScheduler from './components/pages/ReportsScheduler';
import Integrations from './components/pages/Integrations';
import WorkflowBuilder from './components/pages/WorkflowBuilder';
import WebhooksManager from './components/pages/WebhooksManager';
import AIChatPanel from './components/common/AIChatPanel';
import Toast from './components/common/Toast';
import { ToastContext } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import type { ToastMessage } from './types';
import { applyTheme, getActiveTheme } from './services/themeService';
import { initializeDatabase } from './services/databaseInitialization';

// Import Auth and Login
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Login from './components/pages/Login.tsx';
import Users from './components/pages/Users.tsx';


// Import new placeholder pages
import AlertsPanel from './components/pages/AlertsPanel';
import Documents from './components/pages/Documents';
import BIDashboard from './components/pages/BIDashboard';
import OmnichannelHub from './components/pages/OmnichannelHub';
import MarketingAI from './components/pages/MarketingAI';
import ABTesting from './components/pages/ABTesting';
import LegalCompliance from './components/pages/LegalCompliance';
import DeviceManagement from './components/pages/DeviceManagement';
import Documentation from './components/pages/Documentation';

function AppContent() {
  const { user, loading } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        setIsDbInitialized(true);
    };
    initDb();

  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'warning' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
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
        {!user ? (
           <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
           </Routes>
        ) : (
          <div className="flex h-screen bg-slate-100 dark:bg-dark text-slate-800 dark:text-slate-200">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col w-full">
              <Header 
                onChatToggle={() => setIsChatPanelOpen(prev => !prev)} 
                onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
              />
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {/* CORE */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/alerts" element={<AlertsPanel />} />
                  <Route path="/documents" element={<Documents />} />
                  
                  {/* ADMIN ONLY ROUTES */}
                  {user.role === 'Admin' && (
                    <>
                      <Route path="/users" element={<Users />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/automation" element={<Automation />} />
                      <Route path="/theme" element={<ThemeCustomizer />} />
                      <Route path="/reports" element={<ReportsScheduler />} />
                      <Route path="/integrations" element={<Integrations />} />
                      <Route path="/workflows" element={<WorkflowBuilder />} />
                      <Route path="/webhooks" element={<WebhooksManager />} />
                      <Route path="/bi-dashboards" element={<BIDashboard />} />
                      <Route path="/omnichannel" element={<OmnichannelHub />} />
                      <Route path="/marketing-ai" element={<MarketingAI />} />
                      <Route path="/ab-testing" element={<ABTesting />} />
                      <Route path="/legal-fiscal" element={<LegalCompliance />} />
                      <Route path="/device-management" element={<DeviceManagement />} />
                      <Route path="/documentation" element={<Documentation />} />
                    </>
                  )}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
            {isChatPanelOpen && <AIChatPanel onClose={() => setIsChatPanelOpen(false)} />}
          </div>
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </HashRouter>
    </ToastContext.Provider>
  );
}


function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}


export default App;