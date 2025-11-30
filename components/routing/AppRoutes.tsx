import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Lazy load pages
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Leads = lazy(() => import('../pages/Leads'));
const Customers = lazy(() => import('../pages/Customers'));
const Products = lazy(() => import('../pages/Products'));
const Deals = lazy(() => import('../pages/Deals'));
const Automation = lazy(() => import('../pages/Automation'));
const ThemeCustomizer = lazy(() => import('../pages/ThemeCustomizer'));
const ReportsScheduler = lazy(() => import('../pages/ReportsScheduler'));
const Reports = lazy(() => import('../pages/Reports'));
const Integrations = lazy(() => import('../pages/Integrations'));
const WorkflowBuilder = lazy(() => import('../pages/WorkflowBuilder'));
const WebhooksManager = lazy(() => import('../pages/WebhooksManager'));
const Budget = lazy(() => import('../pages/Budget'));
const Users = lazy(() => import('../pages/Users'));
const AlertsPanel = lazy(() => import('../pages/AlertsPanel'));
const Documents = lazy(() => import('../pages/Documents'));
const BIDashboard = lazy(() => import('../pages/BIDashboard'));
const OmnichannelHub = lazy(() => import('../pages/OmnichannelHub'));
const Tasks = lazy(() => import('../pages/Tasks'));
const MarketingAI = lazy(() => import('../pages/MarketingAI'));
const ABTesting = lazy(() => import('../pages/ABTesting'));
const LegalCompliance = lazy(() => import('../pages/LegalCompliance'));
const DeviceManagement = lazy(() => import('../pages/DeviceManagement'));
const Documentation = lazy(() => import('../pages/Documentation'));
const Settings = lazy(() => import('../pages/Settings'));
const SettingsLayout = lazy(() => import('../pages/SettingsLayout'));
const AISettings = lazy(() => import('../pages/AISettings'));
const AlertSettings = lazy(() => import('../settings/AlertSettings'));
const Prospecting = lazy(() => import('../pages/Prospecting'));
const Workflows = lazy(() => import('../pages/Workflows'));

const LoadingFallback = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

const AppRoutes = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* CORE ROUTES - Accessible to all authenticated users */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/prospecting" element={<Prospecting />} />
                <Route path="/alerts" element={<AlertsPanel />} />
                <Route path="/documents" element={<Documents />} />

                {/* ADMIN ONLY ROUTES */}
                <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    <Route path="/settings" element={<SettingsLayout />}>
                        <Route index element={<Settings />} />
                        <Route path="theme" element={<ThemeCustomizer />} />
                        <Route path="reports" element={<ReportsScheduler />} />
                        <Route path="integrations" element={<Integrations />} />
                        <Route path="webhooks" element={<WebhooksManager />} />
                        <Route path="ai" element={<AISettings />} />
                        <Route path="alerts" element={<AlertSettings />} />
                        <Route path="documentation" element={<Documentation />} />
                    </Route>
                    <Route path="/users" element={<Users />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/automation" element={<Automation />} />
                    <Route path="/theme" element={<Navigate to="/settings/theme" replace />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/integrations" element={<Navigate to="/settings/integrations" replace />} />
                    <Route path="/workflows" element={<Workflows />} />
                    <Route path="/webhooks" element={<Navigate to="/settings/webhooks" replace />} />
                    <Route path="/bi-dashboards" element={<BIDashboard />} />
                    <Route path="/omnichannel" element={<OmnichannelHub />} />
                    <Route path="/marketing-ai" element={<MarketingAI />} />
                    <Route path="/ab-testing" element={<ABTesting />} />
                    <Route path="/legal-fiscal" element={<LegalCompliance />} />
                    <Route path="/device-management" element={<DeviceManagement />} />
                    <Route path="/documentation" element={<Navigate to="/settings/documentation" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
