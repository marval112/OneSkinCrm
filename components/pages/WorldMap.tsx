import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDeals, getCustomers } from '../../services/crmService';
import { DealStage } from '../../types';
import type { Deal, Customer, User } from '../../types';
import { useNavigate } from 'react-router-dom';
import DateRangePicker from '../common/DateRangePicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CountryData {
    country: string;
    dealCount: number;
    totalValue: number;
}

function WorldMap() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
    const [sortBy, setSortBy] = useState<'country' | 'dealCount' | 'totalValue'>('totalValue');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [dealsData, customersData] = await Promise.all([
                    getDeals(user as User),
                    getCustomers(user as User)
                ]);
                setDeals(dealsData);
                setCustomers(customersData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const countryData = useMemo(() => {
        const customerMap = new Map(customers.map(c => [c.id, c]));

        // Filter won deals
        let wonDeals = deals.filter(d => d.status === DealStage.CLOSED_WON);

        // Apply date filter if set
        if (dateRange) {
            wonDeals = wonDeals.filter(d => {
                const date = d.updated_at || d.created_at;
                return date >= dateRange.from && date <= dateRange.to;
            });
        }

        // Aggregate by country
        const countryMap = new Map<string, { count: number; value: number }>();

        wonDeals.forEach(deal => {
            const customer = customerMap.get(deal.customer_id);
            if (customer && (customer as any).country) {
                const country = (customer as any).country as string;
                const existing = countryMap.get(country) || { count: 0, value: 0 };
                countryMap.set(country, {
                    count: existing.count + 1,
                    value: existing.value + Number(deal.value || 0)
                });
            }
        });

        // Convert to array
        const result: CountryData[] = Array.from(countryMap.entries()).map(([country, data]) => ({
            country,
            dealCount: data.count,
            totalValue: data.value
        }));

        // Sort
        result.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            const comparison = typeof aVal === 'string'
                ? aVal.localeCompare(bVal as string)
                : (aVal as number) - (bVal as number);
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [deals, customers, dateRange, sortBy, sortOrder]);

    const handleSort = (column: 'country' | 'dealCount' | 'totalValue') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const totalDeals = countryData.reduce((sum, d) => sum + d.dealCount, 0);
    const totalValue = countryData.reduce((sum, d) => sum + d.totalValue, 0);

    // Prepare data for chart (top 10 countries)
    const chartData = countryData.slice(0, 10).map(d => ({
        country: d.country,
        value: d.totalValue,
        deals: d.dealCount
    }));

    // Color scale for bars
    const getColor = (index: number) => {
        const colors = ['#155724', '#28a745', '#7cbd9b', '#a8d5ba', '#d4edda'];
        return colors[Math.min(index, colors.length - 1)];
    };

    if (!user) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Won Deals by Country</h1>
                <div>
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center h-96">
                    <div className="text-slate-500 dark:text-slate-400">Loading data...</div>
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Won Deals</div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                                {totalDeals}
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Value</div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                €{totalValue.toLocaleString('es-ES')}
                            </div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Countries with Deals</div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                                {countryData.length}
                            </div>
                        </div>
                    </div>

                    {/* Chart - Top 10 Countries */}
                    {chartData.length > 0 && (
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Top 10 Countries by Value</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="country" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number, name: string) => {
                                            if (name === 'value') return [`€${value.toLocaleString('es-ES')}`, 'Value'];
                                            return [value, 'Deals'];
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="value" fill="#28a745" name="Value (€)">
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getColor(index)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th
                                        onClick={() => handleSort('country')}
                                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                                    >
                                        <div className="flex items-center gap-1">
                                            Country
                                            {sortBy === 'country' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('dealCount')}
                                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                                    >
                                        <div className="flex items-center gap-1">
                                            Deals
                                            {sortBy === 'dealCount' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('totalValue')}
                                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                                    >
                                        <div className="flex items-center gap-1">
                                            Total Value (€)
                                            {sortBy === 'totalValue' && (
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        Avg Value (€)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {countryData.map((country, index) => (
                                    <tr key={country.country} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{index < 3 ? ['🥇', '🥈', '🥉'][index] : '📍'}</span>
                                                {country.country}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                            {country.dealCount}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                            €{country.totalValue.toLocaleString('es-ES')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                            €{(country.totalValue / country.dealCount).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {countryData.length === 0 && (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            No won deals found for the selected period.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default WorldMap;
