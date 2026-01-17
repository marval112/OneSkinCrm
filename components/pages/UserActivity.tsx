import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAllSessions,
    getActivityStats,
    getActiveUsers,
    UserSession,
    ActivityStats
} from '../../services/activityTrackingService';
import { getAll } from '../../services/databaseService';
import type { User } from '../../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function UserActivity() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<ActivityStats>({ totalSessions: 0, averageDuration: 0, totalUsers: 0, activeNow: 0 });
    const [activeUsers, setActiveUsers] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(7); // days

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [sessionsData, usersData, statsData, activeData] = await Promise.all([
                getAllSessions(200),
                getAll<User>('users'),
                getActivityStats(dateRange),
                getActiveUsers(),
            ]);

            console.log('[UserActivity] Loaded data:', {
                sessions: sessionsData.length,
                users: usersData.length,
                stats: statsData,
                active: activeData.length
            });

            setSessions(sessionsData);
            setUsers(usersData);
            setStats(statsData);
            setActiveUsers(activeData);
        } catch (error) {
            console.error('Error loading activity data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load activity data');
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for charts
    const getUserEmail = (userId: number) => {
        const user = users.find(u => u.id === userId);
        return user?.email || `User ${userId}`;
    };

    // Login frequency by user (top 10)
    const loginFrequencyData = () => {
        const userLogins: Record<number, number> = {};
        sessions.forEach(session => {
            userLogins[session.user_id] = (userLogins[session.user_id] || 0) + 1;
        });

        return Object.entries(userLogins)
            .map(([userId, count]) => ({
                user: getUserEmail(Number(userId)),
                logins: count,
            }))
            .sort((a, b) => b.logins - a.logins)
            .slice(0, 10);
    };

    // Average session duration by user (top 10)
    const sessionDurationData = () => {
        const userDurations: Record<number, { total: number; count: number }> = {};

        sessions.forEach(session => {
            if (session.session_duration_minutes) {
                if (!userDurations[session.user_id]) {
                    userDurations[session.user_id] = { total: 0, count: 0 };
                }
                userDurations[session.user_id].total += session.session_duration_minutes;
                userDurations[session.user_id].count += 1;
            }
        });

        return Object.entries(userDurations)
            .map(([userId, data]) => ({
                user: getUserEmail(Number(userId)),
                avgDuration: Math.round(data.total / data.count),
            }))
            .sort((a, b) => b.avgDuration - a.avgDuration)
            .slice(0, 10);
    };

    // Daily login activity (last 7 days)
    const dailyActivityData = () => {
        const days: Record<string, number> = {};
        const today = new Date();

        for (let i = dateRange - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            days[dateStr] = 0;
        }

        sessions.forEach(session => {
            const dateStr = session.login_at.split('T')[0];
            if (days.hasOwnProperty(dateStr)) {
                days[dateStr]++;
            }
        });

        return Object.entries(days).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            logins: count,
        }));
    };

    // Format duration
    const formatDuration = (minutes: number | null) => {
        if (!minutes) return 'Active';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Activity Data</h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
                <p className="text-sm text-red-500 dark:text-red-400 mt-4">
                    Make sure you have executed the SQL migration script to create the user_sessions table.
                </p>
                <button
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Activity</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Monitor user login activity and session duration</p>
                    </div>
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        Back to Settings
                    </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-16 w-16 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">No Activity Data Yet</h3>
                    <p className="text-blue-700 dark:text-blue-300 mb-4">
                        Activity tracking has been enabled. Data will appear here once users log in.
                    </p>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-left max-w-2xl mx-auto">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Setup Steps:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li>Execute the SQL migration script in Supabase SQL Editor</li>
                            <li>Log out and log back in to create your first session</li>
                            <li>Activity data will start appearing automatically</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Activity</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monitor user login activity and session duration</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(Number(e.target.value))}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                    </select>
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        Back to Settings
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Active Now</div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.activeNow}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Total Sessions</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalSessions}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Avg Duration</div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.averageDuration}m</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Unique Users</div>
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.totalUsers}</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Activity */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Daily Login Activity</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyActivityData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={2} name="Logins" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Login Frequency */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Login Frequency (Top 10 Users)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={loginFrequencyData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="user" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                            <Bar dataKey="logins" fill="#10b981" name="Number of Logins" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Duration */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Avg Session Duration (Top 10 Users)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={sessionDurationData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="user" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                            <Bar dataKey="avgDuration" fill="#8b5cf6" name="Avg Duration (min)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Active Users Now */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Currently Active Users</h3>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {activeUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No active users</p>
                        ) : (
                            activeUsers.map((session) => (
                                <div key={session.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white">{getUserEmail(session.user_id)}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Logged in: {new Date(session.login_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Sessions Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Sessions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Login</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Logout</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {sessions.slice(0, 20).map((session) => (
                                <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                        {getUserEmail(session.user_id)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(session.login_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {session.logout_at ? new Date(session.logout_at).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {formatDuration(session.session_duration_minutes)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {session.logout_at ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                Ended
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default UserActivity;
