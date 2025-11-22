import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTranslation } from '../../services/i18nService';
import { getDeals, getCustomers, getLeads } from '../../services/crmService';
import { getUsers } from '../../services/userService';
import type { Deal, Customer, Lead, User } from '../../types';
import { DealStage, LeadStatus, Segment, CustomerStatus } from '../../types';
import DateRangePicker from '../common/DateRangePicker';
import TableSkeleton from '../common/TableSkeleton';
import { exportToExcel } from '../../services/exportService';
import { ToastContext } from '../../contexts/ToastContext';

type ReportKey =
  | 'closedWonDeals'
  | 'openPipeline'
  | 'leadsCreated'
  | 'customersByStatus'
  | 'inactiveCustomers'
  | 'sellersPerformance'
  | 'dealsAgingOpen'
  | 'staleDealsOpen'
  | 'customersCreated';

function Reports() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toastContext = useContext(ToastContext);
  const [loading, setLoading] = useState(true);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: number; email: string }[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [segment, setSegment] = useState<Segment | 'All'>('All');
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus | 'All'>('All');
  const [ownerId, setOwnerId] = useState<number | 'All'>('All');
  const [inactiveDays, setInactiveDays] = useState<number>(60);
  const [report, setReport] = useState<ReportKey>('closedWonDeals');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [deals, customers, leads] = await Promise.all([
        getDeals(user as User),
        getCustomers(user as User),
        getLeads(user as User),
      ]);
      setAllDeals(deals);
      setAllCustomers(customers);
      setAllLeads(leads);
      try {
        const users = await getUsers();
        setAllUsers(users.map(u => ({ id: u.id, email: u.email })));
      } catch {}
    } catch {
      toastContext?.showToast('Failed to load data for reports.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [user, toastContext]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dateWithin = (iso: string) => {
    if (!dateRange) return true;
    return iso >= dateRange.from && iso <= dateRange.to;
  };

  const filtered = useMemo(() => {
    const customerById = new Map<number, Customer>(allCustomers.map(c => [c.id, c]));
    const ownerFilter = (uid?: number | null) => (ownerId === 'All' ? true : uid === ownerId);
    const ownerEmail = (uid?: number | null) => (uid ? (allUsers.find(u => u.id === uid)?.email || `User #${uid}`) : '');
    const segmentFilter = (cid?: number) => {
      if (segment === 'All' || !cid) return true;
      const c = customerById.get(cid);
      return c ? c.segment === segment : true;
    };
    const customerStatusFilter = (cid?: number) => {
      if (customerStatus === 'All' || !cid) return true;
      const c = customerById.get(cid);
      return c ? c.status === customerStatus : true;
    };

    const closedWonDeals = allDeals
      .filter(d => d.status === DealStage.CLOSED_WON)
      .filter(d => dateWithin(d.updated_at))
      .filter(d => ownerFilter(d.user_id as any))
      .filter(d => segmentFilter(d.customer_id))
      .filter(d => customerStatusFilter(d.customer_id))
      .map(d => ({
        id: d.id,
        title: d.title,
        customer: d.customer_id || '',
        lead: d.lead_id || '',
        owner_email: ownerEmail(d.user_id as any),
        value: d.value,
        stage: d.status,
        closed_at: d.updated_at,
      }));

    const openPipeline = allDeals
      .filter(d => d.status !== DealStage.CLOSED_WON && d.status !== DealStage.CLOSED_LOST)
      .filter(d => dateWithin(d.updated_at))
      .filter(d => ownerFilter(d.user_id as any))
      .filter(d => segmentFilter(d.customer_id))
      .filter(d => customerStatusFilter(d.customer_id))
      .map(d => ({
        id: d.id,
        title: d.title,
        customer: d.customer_id || '',
        lead: d.lead_id || '',
        owner_email: ownerEmail(d.user_id as any),
        value: d.value,
        stage: d.status,
        expected_close: d.expected_close_date,
        updated_at: d.updated_at,
      }));

    const leadsCreated = allLeads
      .filter(l => dateWithin(l.created_at))
      .filter(l => (segment === 'All' ? true : l.segment === segment))
      .filter(l => ownerFilter(l.user_id as any))
      .map(l => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        country: l.country,
        source: l.source,
        status: l.status,
        owner_email: ownerEmail(l.user_id as any),
        created_at: l.created_at,
      }));

    const customersByStatusRows = allCustomers
      .filter(c => dateWithin(c.created_at))
      .filter(c => (segment === 'All' ? true : c.segment === segment))
      .filter(c => (customerStatus === 'All' ? true : c.status === customerStatus))
      .filter(c => ownerFilter(c.user_id as any))
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        country: c.country,
        segment: c.segment,
        status: c.status,
        owner_email: ownerEmail(c.user_id as any),
        created_at: c.created_at,
        last_contact: c.last_contact,
      }));

    const inactiveCutoff = new Date();
    inactiveCutoff.setDate(inactiveCutoff.getDate() - (inactiveDays || 60));
    const inactiveIso = inactiveCutoff.toISOString();
    const inactiveCustomers = allCustomers
      .filter(c => (segment === 'All' ? true : c.segment === segment))
      .filter(c => (customerStatus === 'All' ? true : c.status === customerStatus))
      .filter(c => ownerFilter(c.user_id as any))
      .filter(c => !c.last_contact || c.last_contact < inactiveIso)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        country: c.country,
        segment: c.segment,
        status: c.status,
        owner_email: ownerEmail(c.user_id as any),
        last_contact: c.last_contact || '',
        days_since_contact: c.last_contact ? Math.floor((Date.now() - new Date(c.last_contact).getTime()) / (24*3600*1000)) : null,
      }));

    // Sellers Performance (by owner)
    const perfByOwner = allDeals
      .filter(d => dateWithin(d.updated_at))
      .filter(d => segmentFilter(d.customer_id))
      .reduce((acc: Record<number, { owner_email: string; won_amount: number; lost_amount: number; open_amount: number; won_count: number; lost_count: number; open_count: number }>, d) => {
        const uid = d.user_id as any as number;
        if (!uid) return acc;
        if (!acc[uid]) acc[uid] = { owner_email: ownerEmail(uid), won_amount: 0, lost_amount: 0, open_amount: 0, won_count: 0, lost_count: 0, open_count: 0 };
        if (d.status === DealStage.CLOSED_WON) { acc[uid].won_amount += Number(d.value); acc[uid].won_count += 1; }
        else if (d.status === DealStage.CLOSED_LOST) { acc[uid].lost_amount += Number(d.value); acc[uid].lost_count += 1; }
        else { acc[uid].open_amount += Number(d.value); acc[uid].open_count += 1; }
        return acc;
      }, {});
    const sellersPerformance = Object.values(perfByOwner);

    // Deals Aging (open)
    const dealsAgingOpen = allDeals
      .filter(d => d.status !== DealStage.CLOSED_WON && d.status !== DealStage.CLOSED_LOST)
      .filter(d => dateWithin(d.updated_at))
      .filter(d => ownerFilter(d.user_id as any))
      .filter(d => segmentFilter(d.customer_id))
      .map(d => ({
        id: d.id,
        title: d.title,
        owner_email: ownerEmail(d.user_id as any),
        stage: d.status,
        value: d.value,
        updated_at: d.updated_at,
        days_in_stage: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (24*3600*1000)),
      }));

    // Stale Deals (open and older than N days since update)
    const staleDealsOpen = dealsAgingOpen.filter(d => d.days_in_stage >= inactiveDays);

    // Customers Created
    const customersCreated = allCustomers
      .filter(c => dateWithin(c.created_at))
      .filter(c => (segment === 'All' ? true : c.segment === segment))
      .filter(c => ownerFilter(c.user_id as any))
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        country: c.country,
        segment: c.segment,
        status: c.status,
        owner_email: ownerEmail(c.user_id as any),
        created_at: c.created_at,
      }));

    return { closedWonDeals, openPipeline, leadsCreated, customersByStatusRows, inactiveCustomers, sellersPerformance, dealsAgingOpen, staleDealsOpen, customersCreated };
  }, [allDeals, allCustomers, allLeads, allUsers, dateRange, segment, customerStatus, ownerId, inactiveDays]);

  const columns = useMemo(() => {
    switch (report) {
      case 'closedWonDeals':
        return ['id', 'title', 'customer', 'lead', 'owner_email', 'value', 'stage', 'closed_at'];
      case 'openPipeline':
        return ['id', 'title', 'customer', 'lead', 'owner_email', 'value', 'stage', 'expected_close', 'updated_at'];
      case 'leadsCreated':
        return ['id', 'name', 'email', 'phone', 'company', 'country', 'source', 'status', 'owner_email', 'created_at'];
      case 'customersByStatus':
        return ['id', 'name', 'email', 'phone', 'company', 'country', 'segment', 'status', 'owner_email', 'created_at', 'last_contact'];
      case 'inactiveCustomers':
        return ['id', 'name', 'email', 'phone', 'company', 'country', 'segment', 'status', 'owner_email', 'last_contact', 'days_since_contact'];
      case 'sellersPerformance':
        return ['owner_email', 'won_amount', 'lost_amount', 'open_amount', 'won_count', 'lost_count', 'open_count'];
      case 'dealsAgingOpen':
        return ['id', 'title', 'owner_email', 'stage', 'value', 'updated_at', 'days_in_stage'];
      case 'staleDealsOpen':
        return ['id', 'title', 'owner_email', 'stage', 'value', 'updated_at', 'days_in_stage'];
      case 'customersCreated':
        return ['id', 'name', 'email', 'phone', 'company', 'country', 'segment', 'status', 'owner_email', 'created_at'];
      default:
        return [];
    }
  }, [report]);

  const rows = useMemo(() => {
    const { closedWonDeals, openPipeline, leadsCreated, customersByStatusRows, inactiveCustomers, sellersPerformance, dealsAgingOpen, staleDealsOpen, customersCreated } = filtered;
    switch (report) {
      case 'closedWonDeals': return closedWonDeals;
      case 'openPipeline': return openPipeline;
      case 'leadsCreated': return leadsCreated;
      case 'customersByStatus': return customersByStatusRows;
      case 'inactiveCustomers': return inactiveCustomers;
      case 'sellersPerformance': return sellersPerformance;
      case 'dealsAgingOpen': return dealsAgingOpen;
      case 'staleDealsOpen': return staleDealsOpen;
      case 'customersCreated': return customersCreated;
    }
  }, [filtered, report]);

  const handleExport = () => {
    exportToExcel(rows as any[], `report_${report}`);
    toastContext?.showToast('Report exported.', 'success');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-xl font-semibold mb-4">Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Report</label>
          <select value={report} onChange={e => setReport(e.target.value as ReportKey)} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm min-w-[200px]">
            <option value="closedWonDeals">Closed Won Deals</option>
            <option value="openPipeline">Open Pipeline (Running Deals)</option>
            <option value="leadsCreated">Leads Created</option>
            <option value="customersByStatus">Customers by Status/Segment</option>
            <option value="inactiveCustomers">Inactive Customers</option>
            <option value="sellersPerformance">Sellers Performance (Won/Lost/Open)</option>
            <option value="dealsAgingOpen">Open Deals Aging (days in stage)</option>
            <option value="staleDealsOpen">Stale Deals (open, inactive N days)</option>
            <option value="customersCreated">Customers Created</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Segment</label>
          <select value={segment} onChange={e => setSegment(e.target.value as Segment | 'All')} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
            <option value="All">All</option>
            {Object.values(Segment).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Customer Status</label>
          <select value={customerStatus} onChange={e => setCustomerStatus(e.target.value as CustomerStatus | 'All')} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
            <option value="All">All</option>
            {Object.values(CustomerStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {user?.role === 'Admin' && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Owner</label>
            <select value={ownerId === 'All' ? 'All' : String(ownerId)} onChange={e => setOwnerId(e.target.value === 'All' ? 'All' : parseInt(e.target.value, 10))} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm min-w-[140px]">
              <option value="All">All</option>
              {/* Owners inferred from customers/deals */}
              {[...new Set(allDeals.map(d => d.user_id).concat(allCustomers.map(c => c.user_id)).filter(Boolean) as number[])].map(uid => <option key={uid} value={uid}>{`User #${uid}`}</option>)}
            </select>
          </div>
        )}
        {report === 'inactiveCustomers' && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Days without contact</label>
            <input type="number" min={1} value={inactiveDays} onChange={e => setInactiveDays(parseInt(e.target.value || '0', 10))} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm w-28" />
          </div>
        )}
        <div className="ml-auto">
          <button onClick={handleExport} className="px-3 py-2 rounded-md bg-slate-600 text-white text-sm hover:bg-slate-700">Export to Excel</button>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton columns={columns.length || 5} rows={6} />
            ) : (
              (rows as any[]).length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500 text-sm">No data.</td></tr>
              ) : (
                (rows as any[]).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {columns.map(c => (
                      <td key={c} className="px-4 py-2 text-sm text-slate-800">{(r as any)[c] ?? ''}</td>
                    ))}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;


