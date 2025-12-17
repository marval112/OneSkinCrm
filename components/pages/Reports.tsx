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
import CustomReportBuilder from '../common/CustomReportBuilder';
import { getCustomReports, deleteCustomReport, CustomReport } from '../../services/customReportService';

type ReportKey =
  | 'closedWonDeals'
  | 'openPipeline'
  | 'leadsCreated'
  | 'customersByStatus'
  | 'inactiveCustomers'
  | 'sellersPerformance'
  | 'dealsAgingOpen'
  | 'staleDealsOpen'
  | 'customersCreated'
  | string; // Allow custom report IDs

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
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedCustomReport, setSelectedCustomReport] = useState<CustomReport | null>(null);

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
      } catch { }
    } catch {
      toastContext?.showToast('Failed to load data for reports.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [user, toastContext]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load custom reports
  useEffect(() => {
    setCustomReports(getCustomReports());
  }, []);

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
        days_since_contact: c.last_contact ? Math.floor((Date.now() - new Date(c.last_contact).getTime()) / (24 * 3600 * 1000)) : null,
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
        days_in_stage: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (24 * 3600 * 1000)),
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

  // Execute custom report
  const executeCustomReport = useMemo(() => {
    if (!selectedCustomReport) return [];

    const { dataSource, fields, groupBy } = selectedCustomReport;
    let sourceData: any[] = [];

    if (dataSource === 'leads') sourceData = allLeads;
    else if (dataSource === 'customers') sourceData = allCustomers;
    else if (dataSource === 'deals') sourceData = allDeals;

    // Apply date range filter if set
    if (dateRange) {
      sourceData = sourceData.filter(item => {
        const dateField = item.created_at || item.updated_at;
        return dateField && dateField >= dateRange.from && dateField <= dateRange.to;
      });
    }

    // If grouping, aggregate data
    if (groupBy) {
      const grouped = sourceData.reduce((acc: Record<string, any[]>, item) => {
        const key = item[groupBy] || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      return Object.entries(grouped).map(([key, items]) => ({
        [groupBy]: key,
        count: (items as any[]).length,
        ...fields.reduce((obj, field) => {
          if (field !== groupBy && field !== 'count') {
            // For numeric fields, calculate sum
            const numericValues = (items as any[]).map(i => Number(i[field]) || 0);
            obj[field] = numericValues.reduce((sum, val) => sum + val, 0);
          }
          return obj;
        }, {} as Record<string, any>)
      }));
    }

    // No grouping, just select fields
    return sourceData.map(item => {
      const row: Record<string, any> = {};
      fields.forEach(field => {
        row[field] = item[field] ?? '';
      });
      return row;
    });
  }, [selectedCustomReport, allLeads, allCustomers, allDeals, dateRange]);

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

  const customColumns = useMemo(() => {
    if (!selectedCustomReport) return [];
    return selectedCustomReport.groupBy
      ? [selectedCustomReport.groupBy, 'count', ...selectedCustomReport.fields.filter(f => f !== selectedCustomReport.groupBy)]
      : selectedCustomReport.fields;
  }, [selectedCustomReport]);

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

  const handleReportChange = (newReport: string) => {
    setReport(newReport);
    if (newReport.startsWith('custom_')) {
      const customReport = customReports.find(r => r.id === newReport);
      setSelectedCustomReport(customReport || null);
    } else {
      setSelectedCustomReport(null);
    }
  };

  const handleSaveCustomReport = (newReport: CustomReport) => {
    setCustomReports(prev => [...prev, newReport]);
    setReport(newReport.id);
    setSelectedCustomReport(newReport);
    toastContext?.showToast('Custom report saved successfully', 'success');
  };

  const handleDeleteCustomReport = (id: string) => {
    if (confirm('Are you sure you want to delete this custom report?')) {
      deleteCustomReport(id);
      setCustomReports(prev => prev.filter(r => r.id !== id));
      if (report === id) {
        setReport('closedWonDeals');
        setSelectedCustomReport(null);
      }
      toastContext?.showToast('Custom report deleted', 'success');
    }
  };

  const handleExport = () => {
    const dataToExport = selectedCustomReport ? executeCustomReport : rows;
    exportToExcel(dataToExport as any[], `report_${report}`);
    toastContext?.showToast('Report exported.', 'success');
  };

  const displayColumns = selectedCustomReport ? customColumns : columns;
  const displayRows = selectedCustomReport ? executeCustomReport : rows;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md w-full max-w-full">
      <h1 className="text-xl font-semibold mb-4">Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Report</label>
          <div className="flex gap-2">
            <select value={report} onChange={e => handleReportChange(e.target.value)} className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm min-w-[200px]">
              <optgroup label="Standard Reports">
                <option value="closedWonDeals">Closed Won Deals</option>
                <option value="openPipeline">Open Pipeline (Running Deals)</option>
                <option value="leadsCreated">Leads Created</option>
                <option value="customersByStatus">Customers by Status/Segment</option>
                <option value="inactiveCustomers">Inactive Customers</option>
                <option value="sellersPerformance">Sellers Performance (Won/Lost/Open)</option>
                <option value="dealsAgingOpen">Open Deals Aging (days in stage)</option>
                <option value="staleDealsOpen">Stale Deals (open, inactive N days)</option>
                <option value="customersCreated">Customers Created</option>
              </optgroup>
              {customReports.length > 0 && (
                <optgroup label="Custom Reports">
                  {customReports.map(cr => (
                    <option key={cr.id} value={cr.id}>{cr.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-2 py-1 rounded-md bg-primary text-white text-xs hover:bg-primary-hover whitespace-nowrap"
            >
              + Create Custom
            </button>
            {selectedCustomReport && (
              <button
                onClick={() => handleDeleteCustomReport(selectedCustomReport.id)}
                className="px-3 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                title="Delete this custom report"
              >
                Delete
              </button>
            )}
          </div>
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
          <button onClick={handleExport} className="px-2 py-1 rounded-md bg-slate-600 text-white text-xs hover:bg-slate-700">Export to Excel</button>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {displayColumns.map(col => (
                <th key={col} className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton columns={displayColumns.length || 5} rows={6} />
            ) : (
              (displayRows as any[]).length === 0 ? (
                <tr><td colSpan={displayColumns.length} className="px-4 py-6 text-center text-slate-500 text-sm">No data.</td></tr>
              ) : (
                (displayRows as any[]).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {displayColumns.map(c => (
                      <td key={c} className="px-2 py-2 text-xs text-slate-800 break-words max-w-[200px]">{(r as any)[c] ?? ''}</td>
                    ))}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Report Builder Modal */}
      {isBuilderOpen && (
        <CustomReportBuilder
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleSaveCustomReport}
        />
      )}
    </div>
  );
}

export default Reports;


