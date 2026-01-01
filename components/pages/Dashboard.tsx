import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, FunnelChart, Funnel, LabelList, ReferenceLine } from 'recharts';
import type { Lead, Deal, Customer, User } from '../../types';
import { DealStage, LeadStatus, Segment, CustomerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { getBudgetsForCustomers } from '../../services/budgetService';
import DateRangePicker from '../common/DateRangePicker';
import CustomTooltip from '../common/CustomTooltip';
// TopLeadsWidget import removed - component not found
import { useTranslation } from '../../services/i18nService';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getBrandName, getBrandLogoUrl } from '../../services/brandingService';
import { generateDashboardInsights } from '../../services/geminiService';
import ModelSelector from '../common/ModelSelector';

// --- ICONS ---
const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>;
const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ArrowTrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.328 4.329 7.09-7.091M2.25 18h19.5v-19.5" /></svg>;
const DocumentCurrencyDollarIcon = CurrencyDollarIcon; // Reusing CurrencyDollarIcon for DocumentCurrencyDollarIcon
const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75c-.256-.81-.9-1.548-1.752-2.071a9.71 9.71 0 00-5.498-1.52c-2.26 0-4.44.69-6.24 1.994a10.007 10.007 0 01-4.24 2.387c-.403.078-.753.307-.97.614-.216.307-.284.66-.196 1.007.088.347.39.625.754.757a10.007 10.007 0 004.24 2.387c2.26 0 4.44-.69 6.24-1.994a10.007 10.007 0 014.24-2.387c.403-.078.753-.307.97-.614.216-.307.284-.66.196-1.007-.088-.347-.39-.625-.754-.757zM12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" /></svg>;


const KPICard = ({ title, value, accent }: { title: string; value: string; accent?: 'primary' | 'success' | 'warning'; }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex-1 leading-tight">{title}</h3>
      <div className="flex-shrink-0">
        {accent === 'primary' && <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><DocumentCurrencyDollarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>}
        {accent === 'success' && <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg"><ArrowTrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" /></div>}
        {!accent && <div className="p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg"><UserGroupIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div>}
      </div>
    </div>
    <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">{value}</p>
  </div>
);

type Activity = {
  id: string;
  type: 'lead' | 'deal' | 'customer';
  text: string;
  date: string;
  icon: React.ReactElement;
};

interface DashboardStats {
  kpis: { newLeads: string; winRate: string; revenue: string; activeCustomers: string; openPipeline: string; leadConversionRate: string; };
  revenueByMonth: { month: string;[key: string]: number | string }[];
  leadSourceData: { name: string; value: number }[];
  dealValueByStage: { name: string; value: number; displayLabel?: string }[];
  teamPerformance: { name: string; won: number; lost: number }[];
  leadsByStatus: { name: string; value: number }[];
  leadsBySegment: { name: string; value: number }[];
  leadsByCountry: { name: string; value: number }[];
  leadsByOwner: { name: string; value: number }[];
  customersByStatus: { name: string; value: number }[];
  customersBySegment: { name: string; value: number }[];
  customersByCountry: { name: string; value: number }[];
  customersByOwner: { name: string; value: number }[];
  topLeads: Lead[];
  recentActivity: Activity[];
  users: { id: number; email: string; }[];
  budgetVsAchieved?: { budget2026: number; achieved2026: number };
}

function Dashboard() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | 'All'>('All');
  const [selectedCountry, setSelectedCountry] = useState<string | 'All'>('All');
  const [selectedUserId, setSelectedUserId] = useState<number | 'All'>('All');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; email: string }[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    kpis: { newLeads: '0', winRate: '0%', revenue: '€0', activeCustomers: '0', openPipeline: '€0', leadConversionRate: '0%' },
    revenueByMonth: [],
    leadSourceData: [],
    dealValueByStage: [],
    teamPerformance: [],
    leadsByStatus: [],
    leadsBySegment: [],
    leadsByCountry: [],
    leadsByOwner: [],
    customersByStatus: [],
    customersBySegment: [],
    customersByCountry: [],
    customersByOwner: [],
    topLeads: [],
    recentActivity: [],
    users: [],
    budgetVsAchieved: { budget2026: 0, achieved2026: 0 },
  });
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic year calculation: current year, year-1, year-2
  const currentYear = new Date().getFullYear();
  const [budgetYear, setBudgetYear] = useState<number>(currentYear);
  const budgetYears = [currentYear - 2, currentYear - 1, currentYear];
  const [chartYear, setChartYear] = useState<number>(currentYear);
  // Allow picking back to 2022 or earlier if needed
  const chartYears: Array<number> = [currentYear - 2, currentYear - 1, currentYear];

  const [activeDatePreset, setActiveDatePreset] = useState<string>('year'); // Default to 'This Year'

  const BLUE_SHADES = ['#1e3a8a', '#1f4dd8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
  const COLORS = ['#1f4dd8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
  const SERIES_ACCENT = '#2563eb';

  function isDarkColor(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const [R, G, B] = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    return luminance < 0.5;
  }

  function getContrastText(hex: string): string {
    return isDarkColor(hex) ? '#ffffff' : '#111827';
  }

  function colorForStage(stage: string): string {
    if (stage === DealStage.CLOSED_WON) return '#1e3a8a';
    if (stage === DealStage.CLOSED_LOST) return '#93c5fd';
    return '#3b82f6';
  }

  const renderHorizontalBarLabel = (props: any) => {
    const { x, y, width, height, value, fill } = props;
    const label = `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const inside = width >= 40;
    const tx = inside ? x + width - 6 : x + width + 6;
    const ty = y + height / 2 + 4;
    const color = inside ? getContrastText(fill || SERIES_ACCENT) : '#111827';
    return (
      <text x={tx} y={ty} textAnchor={inside ? 'end' : 'start'} fill={color} fontSize={12}>{label}</text>
    );
  };

  const renderHorizontalCountLabel = (props: any) => {
    const { x, y, width, height, value, fill } = props;
    const label = `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const inside = width >= 28;
    const tx = inside ? x + width - 6 : x + width + 6;
    const ty = y + height / 2 + 4;
    const color = inside ? getContrastText(fill || SERIES_ACCENT) : '#111827';
    return (
      <text x={tx} y={ty} textAnchor={inside ? 'end' : 'start'} fill={color} fontSize={12}>{label}</text>
    );
  };

  const renderPieLabel = (props: any) => {
    const { x, y, value, fill } = props;
    const label = typeof value === 'number' ? `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}%` : String(value);
    const color = getContrastText(fill || SERIES_ACCENT);
    return <text x={x} y={y} fill={color} textAnchor="middle" dominantBaseline="central" fontSize={12}>{label}</text>;
  };

  const renderFunnelLabelCenter = (props: any) => {
    const { x, y, payload } = props;
    const label: string = payload?.displayLabel || '';
    const [stage, amount] = label.includes(':') ? label.split(':').map((s: string) => s.trim()) : [payload?.name || '', label];
    const tx = x ?? 0;
    const ty = (y ?? 0) - 2;
    const fill = colorForStage(stage);
    const textColor = getContrastText(fill);
    return (
      <text x={tx} y={ty} textAnchor="middle" fontSize={12} fill={textColor}>
        <tspan x={tx} dy={0}>{stage}</tspan>
        {amount && <tspan x={tx} dy={14}>{amount}</tspan>}
      </text>
    );
  };

  const renderLineTopEuroLabel = (props: any) => {
    const { x, y, value } = props;
    const tx = x;
    const ty = y - 8;
    const label = `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return <text x={tx} y={ty} fill="#111827" textAnchor="middle" fontSize={12}>{label}</text>;
  };

  const renderPieOutsideCountLabel = (props: any) => {
    const { x, y, value } = props;
    const tx = (x || 0);
    const ty = (y || 0);
    const label = `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return <text x={tx} y={ty} fill="#111827" textAnchor="start" dominantBaseline="central" fontSize={12}>{label}</text>;
  };

  const renderFunnelRightSmallLabel = (props: any) => {
    const { x, y, value } = props;
    const tx = (x || 0) + 6;
    const ty = (y || 0) + 3;
    return <text x={tx} y={ty} fill="#111827" textAnchor="start" fontSize={12}>{String(value)}</text>;
  };

  const RAD = Math.PI / 180;
  const renderLeadSourcesInnerLabel = (props: any) => {
    const {
      cx, cy, midAngle, innerRadius, outerRadius, percent, index, name
    } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);
    const pct = Math.round((percent || 0) * 100);
    const sliceColor = COLORS[index % COLORS.length] || SERIES_ACCENT;
    const textColor = getContrastText(sliceColor);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={textColor}>
        <tspan x={x} dy={-2}>{`${pct}%`}</tspan>
        <tspan x={x} dy={14}>{String(name)}</tspan>
      </text>
    );
  };

  const fetchData = useCallback(async (currentDateRange: { from: string, to: string } | null) => {
    if (!user) return;
    try {
      setLoading(true);

      // Fetch all data first, without date range filters
      let leadsQuery = supabase.from('leads').select('*');
      let customersQuery = supabase.from('customers').select('*');
      let dealsQuery = supabase.from('deals').select('*');
      let usersQuery = supabase.from('users').select('id, email');

      if (user.role === 'Commercial') {
        leadsQuery = leadsQuery.eq('user_id', user.id);
        customersQuery = customersQuery.eq('user_id', user.id);
        dealsQuery = dealsQuery.eq('user_id', user.id);
      }

      const [
        { data: leads, error: leadsError },
        { data: customers, error: customersError },
        { data: deals, error: dealsError },
        usersResult,
      ] = await Promise.all([leadsQuery, customersQuery, dealsQuery, usersQuery]);

      if (leadsError || customersError || dealsError) {
        throw leadsError || customersError || dealsError;
      }

      let safeLeads = (leads as Lead[]) || [];
      let safeCustomers = (customers as Customer[]) || [];
      let safeDeals = (deals as Deal[]) || [];
      let safeUsers: { id: number, email: string }[] = [];
      if ('error' in usersResult && usersResult.error) {
        console.warn('Users query failed, continuing without user list:', usersResult.error);
      } else if ('data' in usersResult) {
        safeUsers = (usersResult.data as { id: number, email: string }[]) || [];
      }

      // Filter by selected user (admin only)
      if (user.role === 'Admin' && selectedUserId !== 'All') {
        safeLeads = safeLeads.filter(l => l.user_id === selectedUserId);
        safeCustomers = safeCustomers.filter(c => c.user_id === selectedUserId);
        safeDeals = safeDeals.filter(d => d.user_id === selectedUserId);
      }

      // Build customer map for deal-level filters by segment/country
      const customerById = new Map<number, Customer>(safeCustomers.map(c => [c.id, c]));

      // Filter by segment
      if (selectedSegment !== 'All') {
        const seg = selectedSegment;
        safeLeads = safeLeads.filter(l => l.segment === seg);
        safeCustomers = safeCustomers.filter(c => c.segment === seg);
        safeDeals = safeDeals.filter(d => {
          const cust = customerById.get(d.customer_id);
          return cust ? cust.segment === seg : true;
        });
      }

      // Filter by country
      if (selectedCountry !== 'All') {
        const ctry = selectedCountry;
        safeLeads = safeLeads.filter(l => (l.country || '').toLowerCase() === ctry.toLowerCase());
        safeCustomers = safeCustomers.filter(c => (c.country || '').toLowerCase() === ctry.toLowerCase());
        safeDeals = safeDeals.filter(d => {
          const cust = customerById.get(d.customer_id);
          return cust ? (cust.country || '').toLowerCase() === ctry.toLowerCase() : true;
        });
      }

      // --- CLIENT-SIDE FILTERING & CALCULATIONS ---

      // Year helpers
      const dateYear = (iso?: string | null) => (iso ? new Date(iso).getFullYear() : undefined);
      const matchYear = (yr: number | 'All', val?: number) => (yr === 'All' ? true : val === yr);
      const closedYearMatches = (deal: Deal) => {
        if (typeof chartYear === 'string' && chartYear === 'All') return true;
        const closed = (deal as any)['closed_year'];
        if (typeof closed === 'number') return closed === chartYear;
        return matchYear(chartYear, dateYear(deal.updated_at));
      };

      const leadsInDateRange = currentDateRange
        ? safeLeads.filter(l => l.created_at >= currentDateRange.from && l.created_at <= currentDateRange.to)
        : safeLeads;
      const leadsInYear = leadsInDateRange.filter(l => matchYear(chartYear, dateYear(l.created_at)));

      const dealsClosedInDateRange = currentDateRange
        ? safeDeals.filter(d =>
          (d.status === DealStage.CLOSED_WON || d.status === DealStage.CLOSED_LOST) &&
          d.updated_at >= currentDateRange.from && d.updated_at <= currentDateRange.to
        )
        : safeDeals.filter(d => d.status === DealStage.CLOSED_WON || d.status === DealStage.CLOSED_LOST);
      const dealsClosedInYear = dealsClosedInDateRange.filter(d => closedYearMatches(d));

      // KPIs
      const wonDeals = dealsClosedInYear.filter(d => d.status === DealStage.CLOSED_WON);
      const lostDeals = dealsClosedInYear.filter(d => d.status === DealStage.CLOSED_LOST);
      const totalRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
      const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0; // legacy calc (unused)
      const winRate = (wonDeals.length + lostDeals.length) > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0;

      const wonLeadsInYear = leadsInYear.filter(l => l.status === LeadStatus.Won);
      const leadConversionRate = leadsInYear.length > 0 ? (wonLeadsInYear.length / leadsInYear.length) * 100 : 0;

      // Chart: Revenue by Month (multi-year comparison: selected year, year-1, year-2)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const comparisonYear = typeof chartYear === 'number' ? chartYear : currentYear;
      const years = [comparisonYear - 2, comparisonYear - 1, comparisonYear];

      // Initialize data structure with all 12 months and 3 years
      const revenueByMonth = months.map(month => {
        const monthData: { month: string;[key: string]: number | string } = { month };
        years.forEach(year => {
          monthData[`year${year}`] = 0;
        });
        return monthData;
      });

      // Populate with actual data from wonDeals (all won deals, not filtered by date range)
      const allWonDeals = safeDeals.filter(d => d.status === DealStage.CLOSED_WON);
      allWonDeals.forEach(deal => {
        const dealDate = new Date(deal.updated_at);
        const dealYear = dealDate.getFullYear();

        // Use getMonth() (0-11) directly to avoid locale mismatch with 'months' array
        const monthIndex = dealDate.getMonth();

        if (years.includes(dealYear)) {
          if (monthIndex >= 0 && monthIndex < 12) {
            revenueByMonth[monthIndex][`year${dealYear}`] =
              (revenueByMonth[monthIndex][`year${dealYear}`] as number) + Number(deal.value);
          }
        }
      });

      // Chart: Lead Sources (based on leads created in range)
      const sourceCounts = leadsInYear.reduce((acc: Record<string, number>, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {});
      const leadSourceData = Object.keys(sourceCounts).map(name => ({ name, value: sourceCounts[name] }));

      // Chart: Leads by Status (based on leads created in range)
      const statusCounts = leadsInYear.reduce((acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const leadsByStatus = Object.values(LeadStatus).map(st => ({ name: st as string, label: t(`labels.leadStatus.${st}`) || st, value: statusCounts[st] || 0 }));

      // Chart: Leads by Segment (based on leads created in range)
      const segCounts = leadsInYear.reduce((acc: Record<string, number>, lead) => {
        acc[lead.segment] = (acc[lead.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const leadsBySegment = Object.values(Segment).map(seg => ({ name: seg as string, label: t(`labels.segments.${seg}`) || seg, value: segCounts[seg] || 0 }));

      // Chart: Leads by Country (based on leads created in range)
      const leadCountryCounts = leadsInYear.reduce((acc: Record<string, number>, lead) => {
        const key = (lead.country || 'Unknown');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const leadCountryEntries = Object.entries(leadCountryCounts).map(([name, value]) => ({ name, value: Number(value) }));
      leadCountryEntries.sort((a, b) => b.value - a.value);
      let leadsByCountry = leadCountryEntries.slice(0, 10);
      if (leadCountryEntries.length > 10) {
        const othersTotal = leadCountryEntries.slice(10).reduce((sum, e) => sum + e.value, 0);
        leadsByCountry.push({ name: t('common.others') || 'Others', value: othersTotal });
      }

      // Chart: Leads by Owner (Admin)
      const leadOwnerCounts: Record<string, number> = {};
      leadsInDateRange.forEach(l => {
        const email = (safeUsers.find(u => u.id === (l.user_id as any))?.email) || `User #${l.user_id}`;
        leadOwnerCounts[email] = (leadOwnerCounts[email] || 0) + 1;
      });
      let leadsByOwner = Object.entries(leadOwnerCounts).map(([name, value]) => ({ name, value }));
      leadsByOwner.sort((a, b) => b.value - a.value);

      // Chart: Deal Value by Stage
      // Respect date range for both open and closed stages
      const openDealsAll = safeDeals.filter(d => d.status !== DealStage.CLOSED_WON && d.status !== DealStage.CLOSED_LOST);
      const openDeals = currentDateRange
        ? openDealsAll.filter(d => d.updated_at >= currentDateRange.from && d.updated_at <= currentDateRange.to)
        : openDealsAll;
      const openDealsInYear = openDeals.filter(d => matchYear(chartYear, dateYear(d.updated_at)));
      const openPipelineTotal = openDeals.reduce((sum, d) => sum + Number(d.value), 0);

      const dealValueByStage = Object.values(DealStage).map(stage => {
        let dealsForStage: Deal[];
        if (stage === DealStage.CLOSED_WON || stage === DealStage.CLOSED_LOST) {
          dealsForStage = dealsClosedInYear.filter(d => d.status === stage);
        } else {
          dealsForStage = openDealsInYear.filter(d => d.status === stage);
        }
        const total = dealsForStage.reduce((sum, d) => sum + Number(d.value), 0);
        return {
          name: stage,
          value: total,
          displayLabel: `${stage}: €${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        };
      });


      // Chart: Team Performance (Admin only, based on deals closed in range)
      const userMap = new Map(safeUsers.map(u => [u.id, u.email]));
      const amountsByUser = dealsClosedInYear.reduce((acc: Record<number, { won: number; lost: number }>, d) => {
        const uid = d.user_id as number | null;
        if (!uid) return acc;
        if (!acc[uid]) acc[uid] = { won: 0, lost: 0 };
        if (d.status === DealStage.CLOSED_WON) acc[uid].won += Number(d.value);
        if (d.status === DealStage.CLOSED_LOST) acc[uid].lost += Number(d.value);
        return acc;
      }, {} as Record<number, { won: number; lost: number }>);

      let teamPerformance: { name: string, won: number, lost: number }[] = [];
      if (user.role === 'Admin') {
        teamPerformance = Object.entries(amountsByUser)
          .map(([userId, vals]) => ({ name: userMap.get(parseInt(userId)) || `User #${userId}`, won: vals.won, lost: vals.lost }))
          .sort((a, b) => (b.won + b.lost) - (a.won + a.lost));
        if (teamPerformance.length > 0 && selectedUserId === 'All') {
          const totals = teamPerformance.reduce((acc, cur) => ({ won: acc.won + cur.won, lost: acc.lost + cur.lost }), { won: 0, lost: 0 });
          teamPerformance.unshift({ name: t('dashboard.allSellers') || 'All Sellers', won: totals.won, lost: totals.lost });
        }
      } else {
        // Non-admin: show only current user's performance; note safeDeals already filtered by user, but we ensure labeling
        const self = amountsByUser[user.id] || { won: 0, lost: 0 };
        teamPerformance = [{ name: user.email, won: self.won, lost: self.lost }];
      }

      // Widget: Top 5 Leads (all-time)
      const topLeads = [...safeLeads].sort((a, b) => b.score - a.score).slice(0, 5);

      // Widget: Recent Activity
      const recentActivity: Activity[] = [
        ...safeLeads.slice(0, 5).map(l => ({ id: `l-${l.id}`, type: 'lead' as const, text: t('dashboard.activity.leadCreated').replace('{name}', l.name), date: l.created_at, icon: <UserPlusIcon className="w-5 h-5 text-blue-500" /> })),
        ...safeDeals.slice(0, 5).map(d => ({ id: `d-${d.id}`, type: 'deal' as const, text: t('dashboard.activity.dealCreated').replace('{title}', d.title), date: d.created_at, icon: <CurrencyDollarIcon className="w-5 h-5 text-green-500" /> })),
        ...safeCustomers.slice(0, 5).map(c => ({ id: `c-${c.id}`, type: 'customer' as const, text: t('dashboard.activity.customerCreated').replace('{name}', c.name), date: c.created_at, icon: <ArrowTrendingUpIcon className="w-5 h-5 text-purple-500" /> }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);

      // Customers in date range (for charts)
      const customersInDateRange = currentDateRange
        ? safeCustomers.filter(c => c.created_at >= currentDateRange.from && c.created_at <= currentDateRange.to)
        : safeCustomers;

      // Customers by Country (all-time)
      const ctryCounts = safeCustomers.reduce((acc: Record<string, number>, c) => {
        const key = (c.country || 'Unknown');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const countryEntries = Object.entries(ctryCounts).map(([name, value]) => ({ name, value: Number(value) }));
      countryEntries.sort((a, b) => b.value - a.value);
      let customersByCountry = countryEntries.slice(0, 10);
      if (countryEntries.length > 10) {
        const othersTotal = countryEntries.slice(10).reduce((sum, e) => sum + e.value, 0);
        customersByCountry.push({ name: t('common.others') || 'Others', value: othersTotal });
      }

      // Customers by Owner (admin, all-time)
      const cbOwnerCounts: Record<string, number> = {};
      safeCustomers.forEach(c => {
        const email = (safeUsers.find(u => u.id === (c.user_id as any))?.email) || `User #${c.user_id}`;
        cbOwnerCounts[email] = (cbOwnerCounts[email] || 0) + 1;
      });
      let customersByOwner = Object.entries(cbOwnerCounts).map(([name, value]) => ({ name, value }));
      customersByOwner.sort((a, b) => b.value - a.value);

      // Budget vs Closed Won (parametric year)
      const year = budgetYear;
      const custIds = safeCustomers.map(c => c.id);
      let budget2026 = 0;
      try {
        const budgets = await getBudgetsForCustomers(year, custIds);
        budget2026 = budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
      } catch { }
      const achieved2026 = safeDeals
        .filter(d => d.status === DealStage.CLOSED_WON)
        .filter(d => {
          let closedYear = (d as any)['closed_year']; // Prefer 'closed_year'
          if (typeof closedYear === 'number' && !Number.isNaN(closedYear)) {
            return closedYear === year;
          }
          // Fallback to 'año_closed' if 'closed_year' is not available or invalid
          closedYear = (d as any)['año_closed'];
          if (typeof closedYear === 'number' && !Number.isNaN(closedYear)) {
            return closedYear === year;
          }
          // Fallback to updated_at year if legacy data without 'closed_year' or 'año_closed'
          const upd = (d as any).hasOwnProperty('updated_at') ? new Date((d as any).updated_at).getFullYear() : undefined;
          return upd === year;
        })
        .reduce((s, d) => s + Number((d as any).value || 0), 0);

      setStats({
        kpis: {
          newLeads: safeLeads.length.toString(),
          winRate: `${Math.round(winRate)}%`,
          revenue: `€${Number(totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          activeCustomers: safeCustomers.filter(c => c.status === 'Active').length.toString(),
          openPipeline: `€${Number(openPipelineTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          leadConversionRate: `${Math.round(leadConversionRate)}%`,
        },
        revenueByMonth,
        leadSourceData,
        dealValueByStage,
        teamPerformance,
        leadsByStatus,
        leadsBySegment,
        leadsByCountry,
        leadsByOwner,
        customersByStatus: Object.values(CustomerStatus).map(s => ({ name: s as string, label: t(`labels.customerStatus.${s}`) || s, value: safeCustomers.filter(c => c.status === s).length })),
        customersBySegment: Object.values(Segment).map(s => ({ name: s as string, label: t(`labels.segments.${s}`) || s, value: safeCustomers.filter(c => c.segment === s).length })),
        customersByCountry,
        customersByOwner,
        topLeads,
        recentActivity,
        users: safeUsers,
        budgetVsAchieved: { budget2026, achieved2026 },
      });

      // Update filter options (countries from customers & leads; users only for admin)
      const countriesSet = new Set<string>();
      safeCustomers.forEach(c => { if (c.country) countriesSet.add(c.country); });
      safeLeads.forEach(l => { if (l.country) countriesSet.add(l.country); });
      setAvailableCountries(Array.from(countriesSet).sort());
      setAvailableUsers(safeUsers);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, t, selectedSegment, selectedCountry, selectedUserId, budgetYear]);

  // AI Insights after stats load
  useEffect(() => {
    if (!loading) {
      (async () => {
        try {
          const payload = { kpis: stats.kpis, leadSourceData: stats.leadSourceData, dealValueByStage: stats.dealValueByStage, teamPerformance: stats.teamPerformance };
          const text = await generateDashboardInsights(payload as any, language);
          setAiInsights(text);
        } catch { }
      })();
    }
  }, [loading, stats, language]);

  useEffect(() => {
    const savedRange = localStorage.getItem('dashboardDateRange');
    let initialRange = savedRange ? JSON.parse(savedRange) : null; // All Time by default
    setDateRange(initialRange);

    const savedFiltersRaw = localStorage.getItem('dashboardFilters');
    if (savedFiltersRaw) {
      try {
        const f = JSON.parse(savedFiltersRaw);
        if (f.segment) setSelectedSegment(f.segment as Segment | 'All');
        if (typeof f.userId !== 'undefined') setSelectedUserId(f.userId as number | 'All');
        if (f.country) setSelectedCountry(f.country as string | 'All');
      } catch { }
    }

    // Initial fetch with the computed range (null => All Time)
    fetchData(initialRange);
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute when budgetYear or chartYear changes
  // Also re-apply the active preset when chartYear changes to ensure range matches the new year "same month" etc
  useEffect(() => {
    if (activeDatePreset) {
      setPresetRange(activeDatePreset as any, chartYear);
    } else {
      // If no preset active (custom range), we might want to shift it? 
      // For now, if custom range, we just re-fetch. But logic implies we should stick to the selected year.
      // If user manually changed year, we usually want to default to full year or keep preset.
      // Let's force full year if custom range doesn't make sense? 
      // Actually best UX: If I change year, reset to "This Year" unless I have a relative preset like "Month" active.
      if (!activeDatePreset) {
        setPresetRange('year', chartYear);
      }
      else {
        fetchData(dateRange);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetYear, chartYear]);

  const handleDateChange = (range: { from: string; to: string } | null, preset?: string) => {
    setDateRange(range);
    if (preset) setActiveDatePreset(preset);
    else setActiveDatePreset(''); // Custom range clears preset

    // localStorage.setItem('dashboardDateRange', JSON.stringify(range));
    fetchData(range);
  };

  const setPresetRange = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year', year: number) => {
    // Logic duplicated/moved to DateRangePicker but we need to construct it here to set state?
    // Actually DateRangePicker component exports the logic internally but we used to calc it here.
    // Let's use the DateRangePicker component's internal logic via a helper or just replicate for "on load / on year change" sync.
    // For simplicity, I'll rely on a simplified construction here OR just trigger the DateRangePicker via ref? No.
    // Replicate logic briefly for the exact sync or use the same helper if exported? 
    // It's not exported. I will implement a local 'getRangeForYear' helper.

    const targetYear = year;
    const now = new Date();
    // Adjust "now" to match target year's day/month roughly
    const nowInYear = new Date(now);
    nowInYear.setFullYear(targetYear);

    const isPast = targetYear < currentYear;

    let from = new Date(nowInYear);
    let to = new Date(nowInYear);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (preset === 'today') {
      // Just today
    } else if (preset === 'week') {
      const day = nowInYear.getDay();
      const diff = nowInYear.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
      from.setDate(diff);
      const end = new Date(from);
      end.setDate(from.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      to = end;
    } else if (preset === 'month') {
      from = new Date(targetYear, nowInYear.getMonth(), 1);
      if (isPast) {
        to = new Date(targetYear, nowInYear.getMonth() + 1, 0);
        to.setHours(23, 59, 59, 999);
      }
    } else if (preset === 'quarter') {
      const q = Math.floor(nowInYear.getMonth() / 3);
      from = new Date(targetYear, q * 3, 1);
      if (isPast) {
        to = new Date(targetYear, (q * 3) + 3, 0);
        to.setHours(23, 59, 59, 999);
      }
    } else { // year
      from = new Date(targetYear, 0, 1);
      to = new Date(targetYear, 11, 31);
      to.setHours(23, 59, 59, 999);
    }

    const range = { from: from.toISOString(), to: to.toISOString() };
    setDateRange(range);
    setActiveDatePreset(preset);
    fetchData(range);
  };

  const handleExportDashboardPDF = async () => {
    try {
      const root = containerRef.current;
      if (!root) return;
      // @ts-ignore - Dynamic CDN import
      const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')).default;
      // @ts-ignore - Dynamic CDN import
      const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      if (!jsPDF) throw new Error('jsPDF failed to load');

      const canvas = await html2canvas(root, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const headerHeight = 64;
      const headerPaddingX = 20;
      const primaryHex = getComputedStyle(document.documentElement).getPropertyValue('--color-primary')?.trim() || '#2563eb';
      const { r, g, b } = hexToRgb(primaryHex) || { r: 37, g: 99, b: 235 };
      // Header bar
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      // Branding
      try {
        const logoUrl = getBrandLogoUrl();
        const logo = await loadImageAsDataUrl(logoUrl);
        pdf.addImage(logo, 'PNG', headerPaddingX, 16, 96, 32);
      } catch { }
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      const brand = getBrandName();
      const subtitle = buildSubtitle();
      pdf.text(brand, pageWidth - headerPaddingX, 22, { align: 'right', baseline: 'top' });
      pdf.setFontSize(9);
      pdf.text(subtitle, pageWidth - headerPaddingX, 42, { align: 'right', baseline: 'top' });

      // Content image below header
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = headerHeight + 16; // below header

      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - (position + 20));
      while (heightLeft > 0) {
        pdf.addPage();
        // draw header on each page
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.text(brand, pageWidth - headerPaddingX, 22, { align: 'right', baseline: 'top' });
        pdf.setFontSize(9);
        pdf.text(subtitle, pageWidth - headerPaddingX, 42, { align: 'right', baseline: 'top' });

        position = headerHeight + 16 - (imgHeight - (imgHeight - heightLeft));
        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - (headerHeight + 36));
      }
      const filename = `Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('Dashboard export failed', e);
    }
  };

  const handleExportDashboardPNG = async () => {
    try {
      const root = containerRef.current;
      if (!root) return;
      // @ts-ignore - Dynamic CDN import
      const html2canvasMod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      const html2canvas = (html2canvasMod && (html2canvasMod.default || (window as any).html2canvas)) as any;
      const shot = await html2canvas(root, { backgroundColor: '#ffffff', scale: 2, useCORS: true });

      const headerHeight = 120; // px on final image
      const outCanvas = document.createElement('canvas');
      outCanvas.width = shot.width;
      outCanvas.height = shot.height + headerHeight;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) return;

      // Header background
      const primaryHex = getComputedStyle(document.documentElement).getPropertyValue('--color-primary')?.trim() || '#2563eb';
      ctx.fillStyle = primaryHex;
      ctx.fillRect(0, 0, outCanvas.width, headerHeight);

      // Branding
      try {
        const logoUrl = getBrandLogoUrl();
        const dataUrl = await loadImageAsDataUrl(logoUrl);
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = resolve as any; img.onerror = reject as any; img.src = dataUrl; });
        const logoW = Math.min(240, outCanvas.width * 0.2);
        const logoH = (img.height / img.width) * logoW;
        ctx.drawImage(img, 20, (headerHeight - logoH) / 2, logoW, logoH);
      } catch { }

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 24px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'right';
      ctx.fillText(getBrandName(), outCanvas.width - 20, 38);
      ctx.font = '400 16px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText(buildSubtitle(), outCanvas.width - 20, 68);

      // Content image
      ctx.drawImage(shot, 0, headerHeight);

      const pngUrl = outCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `Dashboard_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Dashboard PNG export failed', e);
    }
  };

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return { r, g, b };
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  async function loadImageAsDataUrl(path: string): Promise<string> {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load image');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }

  function buildSubtitle(): string {
    const parts: string[] = [];
    if (dateRange?.from || dateRange?.to) {
      const from = dateRange?.from ? new Date(dateRange.from).toLocaleDateString() : '';
      const to = dateRange?.to ? new Date(dateRange.to).toLocaleDateString() : '';
      parts.push(`${from} – ${to}`);
    }
    if (selectedSegment !== 'All') parts.push(`Segment: ${selectedSegment}`);
    if (selectedCountry !== 'All') parts.push(`Country: ${selectedCountry}`);
    if (selectedUserId !== 'All') parts.push(`Owner: ${availableUsers.find(u => u.id === selectedUserId)?.email || selectedUserId}`);
    return parts.join(' | ') || 'Current view';
  }

  // Persist filters and refetch when filters change
  useEffect(() => {
    localStorage.setItem('dashboardFilters', JSON.stringify({
      segment: selectedSegment,
      country: selectedCountry,
      userId: selectedUserId,
    }));
    if (dateRange) {
      fetchData(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSegment, selectedCountry, selectedUserId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateChange}
            year={chartYear}
            rightSlot={
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-slate-500 dark:text-slate-400">Year</label>
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(parseInt(e.target.value, 10))}
                  className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  {chartYears.map(y => <option key={String(y)} value={String(y)}>{String(y)}</option>)}
                </select>
                <button onClick={handleExportDashboardPDF} className="ml-2 px-2 py-1 text-xs rounded-md bg-primary text-white hidden md:inline-block">Export PDF</button>
                <button onClick={handleExportDashboardPNG} className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hidden md:inline-block">Export PNG</button>
              </div>
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Segment</label>
            <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value as Segment | 'All')} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">
              <option value="All">All</option>
              {Object.values(Segment).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Country</label>
            <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value as any)} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">
              <option value="All">All</option>
              {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {user.role === 'Admin' && (
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Owner</label>
              <select value={selectedUserId === 'All' ? 'All' : String(selectedUserId)} onChange={e => setSelectedUserId(e.target.value === 'All' ? 'All' : parseInt(e.target.value, 10))} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">
                <option value="All">All</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </div>
          )}

          <div className="self-end">
            <button onClick={() => { setSelectedSegment('All'); setSelectedCountry('All'); setSelectedUserId('All'); }} className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">Reset</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        <KPICard title={t('dashboard.revenue')} value={stats.kpis.revenue} accent="primary" />
        <KPICard title={t('dashboard.openPipelineValue') || 'Running Deals'} value={stats.kpis.openPipeline} />
        <KPICard title={t('dashboard.winRate')} value={stats.kpis.winRate} accent="success" />
        <KPICard title={t('dashboard.leadConversionRate')} value={stats.kpis.leadConversionRate} />
        <KPICard title={t('dashboard.totalLeads')} value={stats.kpis.newLeads} />
        <KPICard title={t('dashboard.activeCustomers')} value={stats.kpis.activeCustomers} />
      </div>

      {/* World Map Navigation Card */}
      <div
        onClick={() => navigate('/world-map')}
        className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-1">🌍 Won Deals by Country</h3>
            <p className="text-sm text-green-600 dark:text-green-400">View global distribution of closed won deals</p>
          </div>
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Global Year selector moved into DateRangePicker rightSlot */}

      {/* Budget vs Closed Won (Water Glass) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm" onDoubleClick={() => navigate('/budget')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base mb-3">{(t('dashboard.budget') || 'Budget') + ' vs ' + (t('dashboard.achieved') || 'Closed Won') + ` (${budgetYear})`}</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Budget Year</label>
            <select
              value={budgetYear}
              onChange={(e) => { const y = parseInt(e.target.value, 10); setBudgetYear(y); }}
              className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
            >
              {budgetYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          {(() => {
            const budget = stats.budgetVsAchieved?.budget2026 || 0;
            const closed = Math.min(stats.budgetVsAchieved?.achieved2026 || 0, budget);
            const remaining = Math.max(budget - closed, 0);
            const percent = budget > 0 ? Math.round((closed / budget) * 100) : 0;
            const data = [{ name: String(budgetYear), closed, remaining, budget, percent }];
            const formatEuro = (n: number) => `€${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            const FillLabel = (props: any) => {
              const { x, y, width, height, value, payload } = props;
              const tx = x + 6;
              const ty = y + height / 2 + 4;
              const pct = budget > 0 ? Math.round((Number(value || 0) / budget) * 100) : 0;
              const label = `${formatEuro(Number(value))} (${pct}%)`;
              const color = '#ffffff';
              return <text x={tx} y={ty} textAnchor="start" fill={color} fontSize={12}>{label}</text>;
            };
            const BudgetLabelOnRemaining = (props: any) => {
              const { x, y, width, height, payload } = props;
              if (!payload || Number(payload.remaining) <= 0) return null;
              const tx = x + width - 6;
              const ty = y + height / 2 + 4;
              const label = `${formatEuro(Number(payload.budget || budget))}`;
              return <text x={tx} y={ty} textAnchor="end" fill="#111827" fontSize={12}>{label}</text>;
            };
            const BudgetLabelOnClosed = (props: any) => {
              const { x, y, width, height, payload } = props;
              if (!payload || Number(payload.remaining) > 0) return null;
              const tx = x + width - 6;
              const ty = y + height / 2 + 4;
              const label = `${formatEuro(Number(payload.budget || budget))}`;
              return <text x={tx} y={ty} textAnchor="end" fill="#ffffff" fontSize={12}>{label}</text>;
            };
            return (
              <BarChart className="cursor-pointer" layout="vertical" data={data} margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `€${Math.round(Number(v) / 1000)}k`} />
                <YAxis type="category" dataKey="name" stroke="rgb(100 116 139)" />
                <CustomTooltip
                  formatter={(v: number) => `€${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                {/* Put Closed Won on the left, Remaining on the right */}
                <Bar dataKey="closed" stackId="g" fill="#1e3a8a" radius={[8, 0, 0, 8]}>
                  <LabelList dataKey="closed" content={FillLabel as any} />
                  <LabelList dataKey="closed" content={BudgetLabelOnClosed as any} />
                </Bar>
                <Bar dataKey="remaining" stackId="g" fill="#E5E7EB" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="remaining" content={BudgetLabelOnRemaining as any} />
                </Bar>
                {/* Budget label integrated within the bar; reference line removed */}
              </BarChart>
            );
          })()}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Comparativa de ingresos mensuales de los últimos 3 años (basado en oportunidades Closed Won).">{t('dashboard.revenueByMonth')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.revenueByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} onDoubleClick={() => navigate(`/deals?status=${DealStage.CLOSED_WON}`)} className="cursor-pointer">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" />
              <XAxis dataKey="month" stroke="rgb(100 116 139)" />
              <YAxis stroke="rgb(100 116 139)" tickFormatter={(value) => `€${Math.round(Number(value) / 1000)}k`} padding={{ top: 30 }} />
              <CustomTooltip
                formatter={(value: number) => `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <Legend wrapperStyle={{ color: 'rgb(100 116 139)' }} />
              {(() => {
                const currentYear = new Date().getFullYear();
                const years = [currentYear - 2, currentYear - 1, currentYear];
                const colors = ['#93c5fd', '#60a5fa', '#2563eb']; // Light to dark blue
                return years.map((year, index) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`year${year}`}
                    name={String(year)}
                    stroke={colors[index]}
                    strokeWidth={index === 2 ? 3 : 2}
                    dot={{ r: index === 2 ? 4 : 3 }}
                    activeDot={{ r: 6 }}
                  >
                    {/* Only show labels for the current year (last index) to avoid clutter */}
                    {index === 2 && <LabelList dataKey={`year${year}`} content={renderLineTopEuroLabel} />}
                  </Line>
                ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Valor agregado de oportunidades por etapa; para etapas cerradas se toma el año de cierre.">{t('dashboard.dealValueByStage')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.dealValueByStage} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" />
              <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(value) => `€${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={90} stroke="rgb(100 116 139)" tick={{ fontSize: 11 }} />
              <CustomTooltip
                formatter={(value: number) => `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <Bar dataKey="value" name="Value in Stage" onDoubleClick={(data) => navigate(`/deals?status=${encodeURIComponent(data.name)}`)} className="cursor-pointer" radius={[4, 4, 4, 4]}>
                {stats.dealValueByStage.map((entry, index) => {
                  const color = entry.name === DealStage.CLOSED_WON
                    ? '#1e3a8a' // dark blue for Won
                    : entry.name === DealStage.CLOSED_LOST
                      ? '#93c5fd' // light blue for Lost
                      : '#3b82f6';
                  return <Cell key={`dvbs-cell-${index}`} fill={color} />;
                })}
                <LabelList content={renderHorizontalBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 pb-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Embudo por valor con las mismas cifras del gráfico por etapa.">{t('dashboard.dealsFunnel') || 'Deals Funnel (Value)'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <FunnelChart margin={{ top: 0, right: -10, bottom: -10, left: 10 }}>
              <CustomTooltip
                formatter={(value: number) => `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <Funnel data={stats.dealValueByStage} dataKey="value" nameKey="name" isAnimationActive>
                {stats.dealValueByStage.map((entry, index) => {
                  const color = entry.name === DealStage.CLOSED_WON
                    ? '#1e3a8a'
                    : entry.name === DealStage.CLOSED_LOST
                      ? '#93c5fd'
                      : '#3b82f6';
                  return <Cell key={`funnel-cell-${index}`} fill={color} />;
                })}
                <LabelList dataKey="displayLabel" content={renderFunnelRightSmallLabel} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 pb-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Porcentaje de oportunidades Ganadas frente a Perdidas en el año/periodo.">{t('dashboard.winRate')}</h3>
          <div className="relative" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart margin={{ top: 10, right: 0, bottom: -30, left: 10 }}>
                {(() => {
                  const wr = parseFloat((stats.kpis.winRate || '0').toString().replace('%', '')) || 0;
                  const clamped = Math.max(0, Math.min(100, wr));
                  const data = [
                    { name: 'Win', value: clamped },
                    { name: 'Rest', value: 100 - clamped }
                  ];
                  return (
                    <Pie data={data} dataKey="value" startAngle={180} endAngle={0} innerRadius={80} outerRadius={110} stroke="none" labelLine={false} label={renderPieLabel}>
                      <Cell key="win" fill="#2563eb" />
                      <Cell key="rest" fill="#bfdbfe" />
                    </Pie>
                  );
                })()}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-end justify-center pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.kpis.winRate}</div>
                <div className="text-xs text-slate-500">{t('dashboard.winRate')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Distribución de leads por fuente para el año/periodo.">{t('dashboard.leadSources')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie data={stats.leadSourceData} cx="50%" cy="50%" labelLine={false} outerRadius={95} dataKey="value" nameKey="name" onDoubleClick={(data) => navigate(`/leads?source=${encodeURIComponent(data.name)}`)} label={renderLeadSourcesInnerLabel}>
                {stats.leadSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer" />)}
              </Pie>
              <CustomTooltip
                formatter={(value: number) => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} leads`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-semibold text-base mb-3" title="Importe ganado y perdido por vendedor en el año/periodo.">{t('dashboard.teamPerformance')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.teamPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.25)" />
              <XAxis dataKey="name" stroke="rgb(100 116 139)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgb(100 116 139)" tickFormatter={(value) => `€${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 11 }} />
              <CustomTooltip
                formatter={(value: number) => `€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
              <Legend wrapperStyle={{ color: 'rgb(100 116 139)' }} />
              <Bar dataKey="won" name={t('dashboard.won') || 'Won'} fill="#1e3a8a" className="cursor-pointer" radius={[4, 4, 0, 0]} onDoubleClick={(data) => {
                const userEmail = (data as any).name;
                const targetUser = stats.users.find(u => u.email === userEmail);
                if (targetUser) navigate(`/deals?userId=${targetUser.id}&status=${encodeURIComponent(DealStage.CLOSED_WON)}`);
              }}>
                <LabelList content={renderHorizontalBarLabel} />
              </Bar>
              <Bar dataKey="lost" name={t('dashboard.lost') || 'Lost'} fill="#93c5fd" className="cursor-pointer" radius={[0, 0, 4, 4]} onDoubleClick={(data) => {
                const userEmail = (data as any).name;
                const targetUser = stats.users.find(u => u.email === userEmail);
                if (targetUser) navigate(`/deals?userId=${targetUser.id}&status=${encodeURIComponent(DealStage.CLOSED_LOST)}`);
              }}>
                <LabelList content={renderHorizontalBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT COLUMN: LEADS */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.leadsByStatus') || 'Leads by Status'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.leadsByStatus} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="label" type="category" width={130} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name="Leads" radius={[4, 4, 4, 4]} onDoubleClick={(d) => navigate(`/leads?status=${encodeURIComponent((d as any).name)}`)}>
                  {stats.leadsByStatus.map((_, i) => <Cell key={`l-s-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.leadsBySegment') || 'Leads by Segment'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.leadsBySegment} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="label" type="category" width={130} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name="Leads" radius={[4, 4, 4, 4]} onDoubleClick={(d) => navigate(`/leads?segment=${encodeURIComponent((d as any).name)}`)}>
                  {stats.leadsBySegment.map((_, i) => <Cell key={`l-seg-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.leadsByCountry') || 'Leads by Country'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.leadsByCountry} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="name" type="category" width={160} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name={t('leads.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => { const n = (d as any).name; if (!n || n === (t('common.others') || 'Others')) return; navigate(`/leads?country=${encodeURIComponent(n)}`) }}>
                  {stats.leadsByCountry.map((_, i) => <Cell key={`l-ctry-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {user.role === 'Admin' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-semibold text-sm mb-2">{t('dashboard.leadsByOwner') || 'Leads by Owner'}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.leadsByOwner} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                  <YAxis dataKey="name" type="category" width={190} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                  <CustomTooltip
                    formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Bar dataKey="value" name={t('leads.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => { const email = (d as any).name; const u = stats.users.find(x => x.email === email); if (u) navigate(`/leads?userId=${u.id}`) }}>
                    {stats.leadsByOwner.map((_, i) => <Cell key={`l-own-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList content={renderHorizontalCountLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {/* RIGHT COLUMN: CUSTOMERS */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.customersByStatus') || 'Customers by Status'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.customersByStatus} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="label" type="category" width={150} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name={t('customers.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => navigate(`/customers?status=${encodeURIComponent((d as any).name)}`)}>
                  {stats.customersByStatus.map((_, i) => <Cell key={`c-st-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.customersBySegment') || 'Customers by Segment'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.customersBySegment} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="label" type="category" width={150} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name={t('customers.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => navigate(`/customers?segment=${encodeURIComponent((d as any).name)}`)}>
                  {stats.customersBySegment.map((_, i) => <Cell key={`c-seg-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">{t('dashboard.customersByCountry') || 'Customers by Country'}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.customersByCountry} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                <YAxis dataKey="name" type="category" width={160} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                <CustomTooltip
                  formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="value" name={t('customers.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => { const n = (d as any).name; if (!n || n === (t('common.others') || 'Others')) return; navigate(`/customers?country=${encodeURIComponent(n)}`) }}>
                  {stats.customersByCountry.map((_, i) => <Cell key={`c-ctry-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList content={renderHorizontalCountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {user.role === 'Admin' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-semibold text-sm mb-2">{t('dashboard.customersByOwner') || 'Customers by Owner'}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.customersByOwner} layout="vertical" margin={{ top: 5, right: 20, left: 16, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis type="number" stroke="rgb(100 116 139)" tickFormatter={(v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} style={{ fontSize: '11px' }} />
                  <YAxis dataKey="name" type="category" width={190} stroke="rgb(100 116 139)" style={{ fontSize: '11px' }} />
                  <CustomTooltip
                    formatter={(v: number) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Bar dataKey="value" name={t('customers.title')} radius={[4, 4, 4, 4]} onDoubleClick={(d) => { const email = (d as any).name; const u = stats.users.find(x => x.email === email); if (u) navigate(`/customers?userId=${u.id}`) }}>
                    {stats.customersByOwner.map((_, i) => <Cell key={`c-own-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList content={renderHorizontalCountLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="font-semibold text-base mb-3">{t('dashboard.recentActivity')}</h3>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {stats.recentActivity.map(activity => (
            <li key={activity.id} className="py-3 flex items-center">
              <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-full h-8 w-8 flex items-center justify-center">
                {activity.icon}
              </div>
              <div className="ml-3 flex-grow">
                <p className="text-sm text-slate-700 dark:text-slate-300">{activity.text}</p>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(activity.date).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Insights */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">AI Insights</h3>
          <div className="flex items-center gap-3">
            <ModelSelector compact />
            <button className="text-xs underline text-slate-600 dark:text-slate-400" onClick={() => navigate('/settings/documentation')}>{t('common.howAiHelps')}</button>
          </div>
        </div>
        <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{aiInsights || '...'}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => navigate('/leads')} className="px-3 py-1 text-xs bg-primary text-white rounded">Open Leads</button>
          <button onClick={() => navigate('/deals')} className="px-3 py-1 text-xs bg-primary text-white rounded">Open Deals</button>
          <button onClick={() => navigate('/tasks')} className="px-3 py-1 text-xs bg-primary text-white rounded">Open Tasks</button>
        </div>
      </div>
    </div >
  );
}

export default Dashboard;