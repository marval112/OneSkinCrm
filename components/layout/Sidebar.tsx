

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../services/i18nService';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { listTasksForUser } from '../../services/tasksService';
import { getBrandLogoUrl, getBrandName, BRANDING_UPDATED_EVENT } from '../../services/brandingService';

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const BoltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
);
const PaintBrushIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.998 15.998 0 011.622-3.385m5.043.025a2.25 2.25 0 012.245 2.4 3 3 0 001.128 5.78m-1.622-3.385a15.998 15.998 0 00-1.622-3.385m3.385 1.62a15.998 15.998 0 01-3.385-1.62m-1.622 5.043a2.25 2.25 0 01-2.4-2.245 3 3 0 00-5.78-1.128 2.25 2.25 0 00-2.245 2.4 3 3 0 001.128 5.78m1.622-3.385a15.998 15.998 0 013.385 1.62m-5.043-.025a15.998 15.998 0 00-1.622 3.385m5.043.025a2.25 2.25 0 002.245-2.4 3 3 0 015.78-1.128 2.25 2.25 0 012.245-2.4 3 3 0 00-1.128-5.78 2.25 2.25 0 00-2.4 2.245 3 3 0 01-5.78 1.128z" />
    </svg>
);
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);
const PuzzlePieceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v.316a9 9 0 005.214 7.932c.166.074.324.156.479.248v.013a4.502 4.502 0 011.144 4.129 2.25 2.25 0 01-2.112 1.586h-2.25a2.25 2.25 0 01-2.112-1.586 4.502 4.502 0 011.144-4.129v-.013a9.002 9.002 0 004.48-8.181v-.316z" />
    </svg>
);
const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186l-9.566-5.314" />
    </svg>
);
const GlobeAltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);
// New Icons
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663l.001.001zM11.314 9.474a3 3 0 015.372 0l1.98 1.98a1.5 1.5 0 01-2.12 2.12l-1.98-1.98a3.001 3.001 0 01-5.372 0z" /></svg>;
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;
const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>;
const ChatBubbleLeftRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72.372a3.527 3.527 0 01-3.296-2.027l-1.12-2.24a3.527 3.527 0 00-3.296-2.027l-3.72.372c-1.134.093-1.98-.943-1.98-2.097v-4.286c0-.97.616-1.813 1.5-2.097L6.75 6.25l2.25-2.25a3.527 3.527 0 013.296-2.027l3.72-.372c1.134-.093 1.98.943 1.98 2.097v4.286zM6.75 16.5c.247 0 .484.025.717.071l3.72.372a3.527 3.527 0 003.296-2.027l1.12-2.24a3.527 3.527 0 013.296-2.027l3.72-.372c.233.046.47.071.717.071" /></svg>;
const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a7.5 7.5 0 00-7.5 0c.065.21.145.421.24.631a3.75 3.75 0 006.96 0c.095-.21.175-.421.24-.631zM15.25 5.25A3.25 3.25 0 0012 2L8.75 5.25A3.25 3.25 0 0012 8.5l3.25-3.25z" /></svg>;
const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.153.24c-1.003 0-1.945-.323-2.707-.907m-2.16-8.219c-.219-.133-.442-.255-.668-.367m-6.75 4.26l-2.62 10.726c-.122.499.106 1.028.589 1.202a5.989 5.989 0 002.153.24c1.003 0 1.945-.323 2.707-.907m-2.16-8.219c.219-.133.442-.255.668-.367" /></svg>;
const DevicePhoneMobileIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>;
const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
const DocumentCurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-1.481l-1.242 1.241a2.25 2.25 0 01-3.182 0l-3.182-3.182a2.25 2.25 0 010-3.182l1.24-1.241m4.5 1.481l1.241 1.241a2.25 2.25 0 003.182 0l3.182-3.182a2.25 2.25 0 000-3.182l-1.24-1.241m-1.5-1.5l-6 6m6-6l-1.5-1.5m1.5 1.5l-1.5 1.5m-6 6l-1.5-1.5m1.5 1.5l-1.5 1.5" /></svg>;

type NavItem = { to: string; labelKey: string; icon: React.ReactElement };

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [brandName, setBrandName] = useState<string>(getBrandName());
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(getBrandLogoUrl());
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      setBrandName(getBrandName());
      setBrandLogoUrl(getBrandLogoUrl());
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, update as EventListener);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, update as EventListener);
  }, []);

  // Fetch task counters for badge
  useEffect(() => {
    let timer: number | undefined;
    const refresh = async () => {
      try {
        if (!user) return;
        const tasks = await listTasksForUser(user.id, true); // pending only
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < startToday).length;
        const today = tasks.filter(t => t.due_date && new Date(t.due_date) >= startToday && new Date(t.due_date) <= endToday).length;
        setOverdueCount(overdue);
        setTodayCount(today);
      } catch {}
    };
    refresh();
    // periodic refresh each 60s
    // @ts-ignore - window.setInterval returns number in browsers
    timer = window.setInterval(refresh, 60000);
    return () => { if (timer) window.clearInterval(timer); };
  }, [user]);

  const getCoreNavItems = (): NavItem[] => {
    // Define items visible to all roles
    const items: NavItem[] = [
        { to: '/dashboard', labelKey: 'sidebar.dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { to: '/leads', labelKey: 'sidebar.leads', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { to: '/customers', labelKey: 'sidebar.customers', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-2a6 6 0 00-12 0v2" /></svg> },
        { to: '/tasks', labelKey: 'sidebar.tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m-7 8h8a2 2 0 002-2V7a2 2 0 00-2-2H9l-2 2H5a2 2 0 00-2 2v7a2 2 0 002 2h2z" /></svg> },
        { to: '/deals', labelKey: 'sidebar.deals', icon: <DocumentCurrencyDollarIcon className="h-6 w-6" /> },
        { to: '/alerts', labelKey: 'sidebar.alerts', icon: <BellIcon className="h-6 w-6" /> },
        { to: '/documents', labelKey: 'sidebar.documents', icon: <FolderIcon className="h-6 w-6" /> },
    ];
    
    // If user is Admin, insert admin-only items into their correct positions
    if (user?.role === 'Admin') {
        const customerIndex = items.findIndex(item => item.to === '/customers');
        items.splice(customerIndex + 1, 0,
            { to: '/users', labelKey: 'sidebar.users', icon: <UsersIcon className="h-6 w-6" /> },
            { to: '/products', labelKey: 'sidebar.products', icon: <PackageIcon className="h-6 w-6" /> }
        );

        const dealIndex = items.findIndex(item => item.to === '/deals');
        items.splice(dealIndex + 1, 0, { to: '/automation', labelKey: 'sidebar.automation', icon: <BoltIcon className="h-6 w-6" /> });
    }

    return items;
  };

  const ENTERPRISE_NAV_ITEMS: NavItem[] = [
      { to: '/settings', labelKey: 'sidebar.settings', icon: <PaintBrushIcon className="h-6 w-6" /> },
  ];

  const NavList = ({ items }: { items: NavItem[] }) => (
     <ul>
          {items.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center p-3 my-1 rounded-lg transition-colors hover:bg-slate-700 ${isActive ? 'bg-primary text-white' : 'text-slate-200'}`
                }
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span className="ml-4 font-medium flex items-center gap-2">
                  {t(item.labelKey)}
                  {item.to === '/tasks' && (
                    <>
                      {overdueCount > 0 && <span className="px-1.5 rounded-full text-xs bg-red-600 text-white">{overdueCount}</span>}
                      {todayCount > 0 && <span className="px-1.5 rounded-full text-xs bg-primary text-white">{todayCount}</span>}
                    </>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
  );

  const SidebarContent = () => (
    <>
      <div className="relative p-4 border-b border-slate-700">
        <div className="flex justify-center items-center h-12 gap-2">
            <img src={brandLogoUrl} alt={brandName} className="h-full object-contain" onError={({ currentTarget }) => { (currentTarget as HTMLImageElement).src = '/dashboard/logo.png'; }} />
            <span className="text-sm font-medium text-slate-100">{brandName}</span>
            <span className="text-xs align-middle font-light text-slate-400 ml-2">v1.1</span>
        </div>
         <button 
            className="lg:hidden absolute top-1/2 right-4 -translate-y-1/2 p-1 text-slate-300 hover:text-white" 
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
        >
            <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <div>
            <h2 className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Core</h2>
            <NavList items={getCoreNavItems()} />
        </div>
        {user?.role === 'Admin' && (
            <div className="mt-4 pt-4 border-t border-slate-700">
                <h2 className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</h2>
                <NavList items={ENTERPRISE_NAV_ITEMS} />
            </div>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-800 text-white">
        <SidebarContent />
      </aside>
      
      {/* Sidebar for Mobile (Drawer) */}
      <div className={`fixed inset-0 z-40 flex ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
          <div className="w-64 h-full bg-slate-800 text-white shadow-lg flex flex-col">
             <SidebarContent />
          </div>
          <div className="flex-1 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}></div>
      </div>
    </>
  );
}

export default Sidebar;