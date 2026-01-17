import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, '');
  const current = path.split('/').pop() || '';

  const tabs = [
    { to: '/settings', label: 'Overview', exact: true },
    { to: '/settings/theme', label: 'Theme' },
    { to: '/settings/reports', label: 'Reports' },
    { to: '/settings/integrations', label: 'Integrations' },
    { to: '/settings/webhooks', label: 'Webhooks' },
    { to: '/settings/ai', label: 'AI' },
    { to: '/settings/documentation', label: 'Docs' },
  ];

  const currentLabel = tabs.find(t => (t.exact ? path === t.to : path.startsWith(t.to)))?.label || 'Overview';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/settings')}>Settings</span>
          <span className="mx-1">/</span>
          <span className="text-slate-700 dark:text-slate-300">{currentLabel}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) => `px-3 py-1.5 rounded-md ${isActive ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}

export default SettingsLayout;


