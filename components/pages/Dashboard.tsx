import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Lead, Deal, Customer, User } from '../../types';
import { DealStage, LeadStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import DateRangePicker from '../common/DateRangePicker';
import TopLeadsWidget from '../dashboard/TopLeadsWidget';
import { useTranslation } from '../../services/i18nService';
import { useAuth } from '../../contexts/AuthContext.tsx';

// --- ICONS ---
const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>;
const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ArrowTrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.328 4.329 7.09-7.091M2.25 18h19.5v-19.5" /></svg>;


const KPICard = ({ title, value }: { title: string; value: string; }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
    <p className="text-3xl font-bold mt-2">{value}</p>
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
  kpis: { newLeads: string; winRate: string; revenue: string; activeCustomers: string; avgDealSize: string; leadConversionRate: string; };
  revenueByMonth: { name: string; revenue: number }[];
  leadSourceData: { name: string; value: number }[];
  dealValueByStage: { name: string; value: number }[];
  teamPerformance: { name: string; revenue: number }[];
  topLeads: Lead[];
  recentActivity: Activity[];
  users: { id: number; email: string; }[];
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    kpis: { newLeads: '0', winRate: '0%', revenue: '€0', activeCustomers: '0', avgDealSize: '€0', leadConversionRate: '0%' },
    revenueByMonth: [],
    leadSourceData: [],
    dealValueByStage: [],
    teamPerformance: [],
    topLeads: [],
    recentActivity: [],
    users: [],
  });
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

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
        { data: users, error: usersError },
      ] = await Promise.all([leadsQuery, customersQuery, dealsQuery, usersQuery]);

      if (leadsError || customersError || dealsError || usersError) {
        throw leadsError || customersError || dealsError || usersError;
      }

      const safeLeads = (leads as Lead[]) || [];
      const safeCustomers = (customers as Customer[]) || [];
      const safeDeals = (deals as Deal[]) || [];
      const safeUsers = (users as { id: number, email: string }[]) || [];

      // --- CLIENT-SIDE FILTERING & CALCULATIONS ---
      
      const leadsInDateRange = currentDateRange
        ? safeLeads.filter(l => l.created_at >= currentDateRange.from && l.created_at <= currentDateRange.to)
        : safeLeads;

      const dealsClosedInDateRange = currentDateRange
        ? safeDeals.filter(d =>
            (d.status === DealStage.CLOSED_WON || d.status === DealStage.CLOSED_LOST) &&
            d.updated_at >= currentDateRange.from && d.updated_at <= currentDateRange.to
          )
        : safeDeals.filter(d => d.status === DealStage.CLOSED_WON || d.status === DealStage.CLOSED_LOST);

      // KPIs
      const wonDeals = dealsClosedInDateRange.filter(d => d.status === DealStage.CLOSED_WON);
      const lostDeals = dealsClosedInDateRange.filter(d => d.status === DealStage.CLOSED_LOST);
      const totalRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
      const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
      const winRate = (wonDeals.length + lostDeals.length) > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0;
      
      const wonLeadsInDateRange = leadsInDateRange.filter(l => l.status === LeadStatus.Won);
      const leadConversionRate = leadsInDateRange.length > 0 ? (wonLeadsInDateRange.length / leadsInDateRange.length) * 100 : 0;

      // Chart: Revenue by Month (based on deals won in range)
      const revenueByMonthData = wonDeals.reduce((acc: {[key: string]: number}, deal) => {
          const month = new Date(deal.updated_at).toLocaleString('default', { month: 'short', year: '2-digit' });
          acc[month] = (acc[month] || 0) + Number(deal.value);
          return acc;
      }, {} as Record<string, number>);
      const revenueByMonth = Object.entries(revenueByMonthData).map(([name, revenue]) => ({ name, revenue }));

      // Chart: Lead Sources (based on leads created in range)
      const sourceCounts = leadsInDateRange.reduce((acc: Record<string, number>, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {});
      const leadSourceData = Object.keys(sourceCounts).map(name => ({ name, value: sourceCounts[name] }));
      
      // Chart: Deal Value by Stage
      // For open stages, it shows the current pipeline value (not date-range filtered).
      // For closed stages, it shows the value of deals closed within the selected date range.
      const openDeals = safeDeals.filter(d => d.status !== DealStage.CLOSED_WON && d.status !== DealStage.CLOSED_LOST);
      
      const dealValueByStage = Object.values(DealStage).map(stage => {
        let dealsForStage: Deal[];
        
        if (stage === DealStage.CLOSED_WON || stage === DealStage.CLOSED_LOST) {
            dealsForStage = dealsClosedInDateRange.filter(d => d.status === stage);
        } else {
            dealsForStage = openDeals.filter(d => d.status === stage);
        }
        
        return {
          name: stage,
          value: dealsForStage.reduce((sum, d) => sum + Number(d.value), 0),
        };
      });


      // Chart: Team Performance (Admin only, based on deals closed in range)
      let teamPerformance: { name: string, revenue: number }[] = [];
      if (user.role === 'Admin') {
          const userMap = new Map(safeUsers.map(u => [u.id, u.email]));
          const revenueByUser = wonDeals.reduce((acc: {[key: number]: number}, deal) => {
              if (deal.user_id) {
                  acc[deal.user_id] = (acc[deal.user_id] || 0) + Number(deal.value);
              }
              return acc;
          }, {} as Record<number, number>);
          teamPerformance = Object.entries(revenueByUser)
            .map(([userId, revenue]) => ({ name: userMap.get(parseInt(userId)) || `User #${userId}`, revenue }))
            .sort((a,b) => b.revenue - a.revenue);
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

      setStats({
        kpis: {
          newLeads: leadsInDateRange.length.toString(),
          winRate: `${winRate.toFixed(1)}%`,
          revenue: `€${totalRevenue.toLocaleString()}`,
          activeCustomers: safeCustomers.filter(c => c.status === 'Active').length.toString(),
          avgDealSize: `€${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          leadConversionRate: `${leadConversionRate.toFixed(1)}%`,
        },
        revenueByMonth,
        leadSourceData,
        dealValueByStage,
        teamPerformance,
        topLeads,
        recentActivity,
        users: safeUsers,
      });

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    const savedRange = localStorage.getItem('dashboardDateRange');
    const initialRange = savedRange ? JSON.parse(savedRange) : null;
    setDateRange(initialRange);
    fetchData(initialRange);
  }, [fetchData]);
  
  const handleDateChange = (range: { from: string; to: string } | null) => {
    setDateRange(range);
    localStorage.setItem('dashboardDateRange', JSON.stringify(range));
    fetchData(range);
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <DateRangePicker value={dateRange} onChange={handleDateChange} />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <KPICard title={t('dashboard.revenue')} value={stats.kpis.revenue} />
        <KPICard title={t('dashboard.avgDealSize')} value={stats.kpis.avgDealSize} />
        <KPICard title={t('dashboard.winRate')} value={stats.kpis.winRate} />
        <KPICard title={t('dashboard.leadConversionRate')} value={stats.kpis.leadConversionRate} />
        <KPICard title={t('dashboard.totalLeads')} value={stats.kpis.newLeads} />
        <KPICard title={t('dashboard.activeCustomers')} value={stats.kpis.activeCustomers} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.revenueByMonth')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenueByMonth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onDoubleClick={() => navigate(`/deals?status=${DealStage.CLOSED_WON}`)} className="cursor-pointer">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                  <XAxis dataKey="name" stroke="rgb(156 163 175)" />
                  <YAxis stroke="rgb(156 163 175)" tickFormatter={(value) => `€${Number(value) / 1000}k`} />
                  <Tooltip
                      contentStyle={{ backgroundColor: 'rgb(30 41 59)', border: '1px solid rgb(71 85 105)' }}
                      labelStyle={{ color: 'rgb(241 245 249)' }}
                      formatter={(value: number) => [`€${value.toLocaleString()}`, null]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.dealValueByStage')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dealValueByStage} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                    <XAxis type="number" stroke="rgb(156 163 175)" tickFormatter={(value) => `€${Number(value) / 1000}k`} />
                    <YAxis dataKey="name" type="category" width={90} stroke="rgb(156 163 175)" />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgb(30 41 59)', border: '1px solid rgb(71 85 105)' }}
                        labelStyle={{ color: 'rgb(241 245 249)' }}
                        formatter={(value: number) => [`€${value.toLocaleString()}`, null]}
                    />
                    <Bar dataKey="value" name="Value in Stage" fill="#2563eb" onDoubleClick={(data) => navigate(`/deals?status=${encodeURIComponent(data.name)}`)} className="cursor-pointer" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.leadSources')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={stats.leadSourceData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" onDoubleClick={(data) => navigate(`/leads?source=${encodeURIComponent(data.name)}`)}>
                        {stats.leadSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer" />)}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgb(30 41 59)', border: '1px solid rgb(71 85 105)' }}
                        formatter={(value: number, name: string) => [`${value} leads`, name]} />
                    <Legend wrapperStyle={{color: 'rgb(156 163 175)'}} />
                </PieChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            {user.role === 'Admin' ? (
                <>
                <h3 className="font-semibold text-lg mb-4">{t('dashboard.teamPerformance')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.teamPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                        <XAxis dataKey="name" stroke="rgb(156 163 175)" />
                        <YAxis stroke="rgb(156 163 175)" tickFormatter={(value) => `€${Number(value) / 1000}k`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgb(30 41 59)', border: '1px solid rgb(71 85 105)' }}
                            labelStyle={{ color: 'rgb(241 245 249)' }}
                            formatter={(value: number) => [`€${value.toLocaleString()}`, null]}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" className="cursor-pointer" onDoubleClick={(data) => {
                            const userEmail = data.name;
                            const targetUser = stats.users.find(u => u.email === userEmail);
                            if (targetUser) {
                                navigate(`/deals?userId=${targetUser.id}`);
                            }
                        }} />
                    </BarChart>
                </ResponsiveContainer>
                </>
            ) : <TopLeadsWidget leads={stats.topLeads} />}
        </div>
      </div>
       <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4">{t('dashboard.recentActivity')}</h3>
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
    </div>
  );
}

export default Dashboard;