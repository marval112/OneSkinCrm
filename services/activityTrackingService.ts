import { supabase } from './supabaseClient';

export interface UserSession {
    id: number;
    user_id: number;
    login_at: string;
    logout_at: string | null;
    last_activity_at: string;
    session_duration_minutes: number | null;
    ip_address: string | null;
    user_agent: string | null;
}

let currentSessionId: number | null = null;
let activityInterval: NodeJS.Timeout | null = null;

// Start a new session when user logs in
export const startSession = async (userId: number): Promise<number | null> => {
    try {
        // End any existing active session for this user
        await endActiveSession(userId);

        const { data, error } = await supabase
            .from('user_sessions')
            .insert({
                user_id: userId,
                login_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
                ip_address: null, // Could be populated from request if available
                user_agent: navigator.userAgent,
            })
            .select()
            .single();

        if (error) throw error;

        currentSessionId = data.id;
        console.log('[Activity Tracking] Session started:', currentSessionId);

        // Start activity heartbeat
        startActivityHeartbeat();

        return data.id;
    } catch (error) {
        console.error('[Activity Tracking] Error starting session:', error);
        return null;
    }
};

// Update last activity timestamp
export const updateActivity = async (): Promise<void> => {
    if (!currentSessionId) return;

    try {
        const { error } = await supabase
            .from('user_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', currentSessionId);

        if (error) throw error;
    } catch (error) {
        console.error('[Activity Tracking] Error updating activity:', error);
    }
};

// End current session
export const endSession = async (): Promise<void> => {
    if (!currentSessionId) return;

    try {
        // Get session start time
        const { data: session } = await supabase
            .from('user_sessions')
            .select('login_at')
            .eq('id', currentSessionId)
            .single();

        if (session) {
            const loginTime = new Date(session.login_at);
            const logoutTime = new Date();
            const durationMinutes = Math.round((logoutTime.getTime() - loginTime.getTime()) / 60000);

            const { error } = await supabase
                .from('user_sessions')
                .update({
                    logout_at: logoutTime.toISOString(),
                    session_duration_minutes: durationMinutes,
                })
                .eq('id', currentSessionId);

            if (error) throw error;

            console.log('[Activity Tracking] Session ended:', currentSessionId, `Duration: ${durationMinutes} min`);
        }

        currentSessionId = null;
        stopActivityHeartbeat();
    } catch (error) {
        console.error('[Activity Tracking] Error ending session:', error);
    }
};

// End any active session for a user (session without logout_at)
const endActiveSession = async (userId: number): Promise<void> => {
    try {
        const { data: activeSessions } = await supabase
            .from('user_sessions')
            .select('id, login_at')
            .eq('user_id', userId)
            .is('logout_at', null);

        if (activeSessions && activeSessions.length > 0) {
            for (const session of activeSessions) {
                const loginTime = new Date(session.login_at);
                const logoutTime = new Date();
                const durationMinutes = Math.round((logoutTime.getTime() - loginTime.getTime()) / 60000);

                await supabase
                    .from('user_sessions')
                    .update({
                        logout_at: logoutTime.toISOString(),
                        session_duration_minutes: durationMinutes,
                    })
                    .eq('id', session.id);
            }
        }
    } catch (error) {
        console.error('[Activity Tracking] Error ending active sessions:', error);
    }
};

// Start heartbeat to update activity every 30 seconds
const startActivityHeartbeat = (): void => {
    if (activityInterval) return;

    activityInterval = setInterval(() => {
        updateActivity();
    }, 30000); // 30 seconds
};

// Stop heartbeat
const stopActivityHeartbeat = (): void => {
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }
};

// Get all sessions for admin dashboard
export const getAllSessions = async (limit: number = 100): Promise<UserSession[]> => {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('*')
            .order('login_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Activity Tracking] Error fetching sessions:', error);
        return [];
    }
};

// Get sessions for a specific user
export const getUserSessions = async (userId: number, limit: number = 50): Promise<UserSession[]> => {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Activity Tracking] Error fetching user sessions:', error);
        return [];
    }
};

// Get currently active users
export const getActiveUsers = async (): Promise<UserSession[]> => {
    try {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('*')
            .is('logout_at', null)
            .order('login_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Activity Tracking] Error fetching active users:', error);
        return [];
    }
};

// Get activity statistics
export interface ActivityStats {
    totalSessions: number;
    averageDuration: number;
    totalUsers: number;
    activeNow: number;
}

export const getActivityStats = async (days: number = 7): Promise<ActivityStats> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: sessions, error } = await supabase
            .from('user_sessions')
            .select('user_id, session_duration_minutes, logout_at')
            .gte('login_at', startDate.toISOString());

        if (error) throw error;

        const completedSessions = sessions?.filter(s => s.session_duration_minutes !== null) || [];
        const totalDuration = completedSessions.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0);
        const uniqueUsers = new Set(sessions?.map(s => s.user_id) || []);

        const { data: activeUsers } = await supabase
            .from('user_sessions')
            .select('id')
            .is('logout_at', null);

        return {
            totalSessions: sessions?.length || 0,
            averageDuration: completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0,
            totalUsers: uniqueUsers.size,
            activeNow: activeUsers?.length || 0,
        };
    } catch (error) {
        console.error('[Activity Tracking] Error fetching stats:', error);
        return {
            totalSessions: 0,
            averageDuration: 0,
            totalUsers: 0,
            activeNow: 0,
        };
    }
};

// Clean up on window unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        endSession();
    });
}
