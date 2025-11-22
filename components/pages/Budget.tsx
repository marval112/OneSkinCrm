import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useTranslation } from '../../services/i18nService';
import { listCustomersWithBudgets, listAchievedByCustomerForYear, upsertBudget } from '../../services/budgetService';
import type { Customer } from '../../types';
import TableSkeleton from '../common/TableSkeleton';
import { exportToExcel } from '../../services/exportService';

export default function Budget() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Array<Customer & { budget2026?: number; budget2027?: number; budget2028?: number; achieved2026?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listCustomersWithBudgets(user, [2026, 2027, 2028]);
      const achievedMap = await listAchievedByCustomerForYear(user, 2026);
      setRows(data.map(r => ({ ...r, achieved2026: achievedMap[r.id] || 0 })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const total2026 = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.budget2026) || 0), 0);
  }, [rows]);
  const total2027 = useMemo(() => rows.reduce((s, r) => s + (Number(r.budget2027) || 0), 0), [rows]);
  const total2028 = useMemo(() => rows.reduce((s, r) => s + (Number(r.budget2028) || 0), 0), [rows]);
  const achievedTotal2026 = useMemo(() => rows.reduce((s, r) => s + (Number(r.achieved2026) || 0), 0), [rows]);
  const deltaTotal2026 = useMemo(() => total2026 - achievedTotal2026, [total2026, achievedTotal2026]);
  const percentTotal2026 = useMemo(() => {
    if (!total2026 || total2026 <= 0) return 0;
    return Math.round((achievedTotal2026 / total2026) * 100);
  }, [total2026, achievedTotal2026]);

  const formatEuro = (n: number) => `€${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const handleSave = async (customerId: number, year: number, value: string) => {
    if (!user) return;
    const amount = Number(value) || 0;
    setSavingId(customerId);
    try {
      await upsertBudget(customerId, year, amount);
      setRows(prev => prev.map(r => r.id === customerId ? { ...r, [`budget${year}`]: amount } as any : r));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{t('budget.title') || 'Budget'}</h1>
        <div className="text-sm flex flex-wrap gap-4">
          <div>
            <span className="font-medium mr-2">{t('budget.total2026') || 'Total 2026'}:</span>
            <span className="text-primary font-semibold">{formatEuro(total2026)}</span>
          </div>
          <div>
            <span className="font-medium mr-2">{t('budget.total2027') || 'Total 2027'}:</span>
            <span className="font-semibold">{formatEuro(total2027)}</span>
          </div>
          <div>
            <span className="font-medium mr-2">{t('budget.total2028') || 'Total 2028'}:</span>
            <span className="font-semibold">{formatEuro(total2028)}</span>
          </div>
          <div>
            <span className="font-medium mr-2">{t('budget.totalClosedWon2026') || 'Closed Won 2026'}:</span>
            <span className="font-semibold">{formatEuro(achievedTotal2026)}</span>
          </div>
          <div>
            <span className="font-medium mr-2">{t('budget.totalDelta2026') || 'Delta 2026'}:</span>
            <span className={`${deltaTotal2026 >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'} font-semibold`}>{formatEuro(deltaTotal2026)}</span>
          </div>
          <div>
            <span className="font-medium mr-2">{t('budget.percentClosedWon2026') || '% Closed Won 2026'}:</span>
            <span className="font-semibold">${''}{`${percentTotal2026}%`}</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => {
                const data = rows.map(r => ({
                  Customer: r.name,
                  Email: r.email,
                  Company: r.company,
                  Country: r.country,
                  Budget2026: Number(r.budget2026 || 0),
                  Achieved2026: Number(r.achieved2026 || 0),
                  Delta2026: Number(r.budget2026 || 0) - Number(r.achieved2026 || 0),
                  Percent2026: (Number(r.budget2026 || 0) > 0) ? Math.round(Number(r.achieved2026 || 0) / Number(r.budget2026 || 0) * 100) : 0,
                }));
                exportToExcel(data, 'budget_2026');
              }}
              className="px-3 py-1.5 text-xs bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              {t('budget.exportExcel') || 'Export Excel'}
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('common.customer')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase hidden md:table-cell">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.amount2026') || 'Budget 2026'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.amount2027') || 'Budget 2027'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.amount2028') || 'Budget 2028'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.closedWon2026') || 'Closed Won 2026'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.delta2026') || 'Delta 2026'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">{t('budget.percentClosedWon2026') || '% Closed Won 2026'}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <TableSkeleton columns={7} rows={5} />
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-primary hover:underline cursor-pointer" onClick={()=> navigate('/customers')}>{r.name}</div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </td>
                <td className="px-6 py-3 hidden md:table-cell text-sm">{r.company}{r.country ? `, ${r.country}` : ''}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      className="w-32 px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                      defaultValue={Number(r.budget2026 || 0)}
                      onBlur={(e) => handleSave(r.id, 2026, e.target.value)}
                    />
                    {savingId === r.id && <span className="text-xs text-slate-400">...</span>}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      className="w-32 px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                      defaultValue={Number(r.budget2027 || 0)}
                      onBlur={(e) => handleSave(r.id, 2027, e.target.value)}
                    />
                    {savingId === r.id && <span className="text-xs text-slate-400">...</span>}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      className="w-32 px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                      defaultValue={Number(r.budget2028 || 0)}
                      onBlur={(e) => handleSave(r.id, 2028, e.target.value)}
                    />
                    {savingId === r.id && <span className="text-xs text-slate-400">...</span>}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm">{formatEuro(Number(r.achieved2026 || 0))}</span>
                </td>
                <td className="px-6 py-3">
                  {(() => {
                    const delta = (Number(r.budget2026 || 0)) - (Number(r.achieved2026 || 0));
                    return <span className={`text-sm ${delta >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatEuro(delta)}</span>;
                  })()}
                </td>
                <td className="px-6 py-3">
                  {(() => {
                    const budget = Number(r.budget2026 || 0);
                    const achieved = Number(r.achieved2026 || 0);
                    const pct = budget > 0 ? Math.round((achieved / budget) * 100) : 0;
                    return <span className="text-sm">{pct}%</span>;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


