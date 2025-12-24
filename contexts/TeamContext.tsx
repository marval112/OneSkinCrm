import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getMessages, markAsRead, getTeamMembers } from '../services/teamService';
import { useToast } from './ToastContext';
import type { User, TeamMessage } from '../types/domain';
import { supabase } from '../services/supabaseClient';

interface IncomingCall {
    conversationId: number;
    caller: User;
    type: 'call' | 'video_call';
    link: string;
}

interface TeamContextType {
    incomingCall: IncomingCall | null;
    acceptCall: () => void;
    rejectCall: () => void;
    unreadCount: number;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = () => {
    const context = useContext(TeamContext);
    if (!context) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastMessageIdRef = useRef<number | null>(null);

    // Initialize audio
    useEffect(() => {
        try {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'); // Phone ringtone
            audioRef.current.loop = true;
        } catch (e) {
            console.error('Failed to initialize audio:', e);
        }
    }, []);

    // Poll for new messages/calls
    useEffect(() => {
        if (!user) return;

        const pollMessages = async () => {
            try {
                // Fetch unread messages for the user
                const { data: conversations, error } = await supabase
                    .from('team_conversations')
                    .select('id, participant_ids')
                    .contains('participant_ids', [user.id]);

                if (error || !conversations) return;

                let totalUnread = 0;

                for (const conv of conversations) {
                    // Optimized query: Look for the latest message in this conversation NOT read by user
                    const { data: msgs } = await supabase
                        .from('team_messages')
                        .select('*')
                        .eq('conversation_id', conv.id)
                        .not('read_by', 'cs', `{${user.id}}`)
                        .order('created_at', { ascending: false });

                    if (msgs && msgs.length > 0) {
                        totalUnread += msgs.length;
                        const latestMsg = msgs[0] as TeamMessage;

                        // Skip if sender is self (should already be filterable by read_by, but keep for safety)
                        if (latestMsg.sender_id === user.id) continue;

                        // Check if it's a new message OR a relevant call signal we haven't processed
                        const isNew = !lastMessageIdRef.current || latestMsg.id > lastMessageIdRef.current;

                        // Handle Call Types
                        if (latestMsg.message_type === 'call' || latestMsg.message_type === 'video_call') {
                            if (isNew) {
                                lastMessageIdRef.current = latestMsg.id;
                                // Fetch caller details
                                const { data: callerData } = await supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', latestMsg.sender_id)
                                    .single();

                                if (callerData) {
                                    setIncomingCall({
                                        conversationId: conv.id,
                                        caller: callerData as User,
                                        type: latestMsg.message_type as 'call' | 'video_call',
                                        link: latestMsg.message
                                    });
                                    // Play ringtone
                                    try {
                                        await audioRef.current?.play();
                                    } catch (e) {
                                        console.log('Audio play failed:', e);
                                    }
                                }
                            }
                        } else if (latestMsg.message_type === 'call_end') {
                            // If we have an active call for this conversation, dismiss it
                            if (incomingCall && incomingCall.conversationId === conv.id) {
                                setIncomingCall(null);
                                audioRef.current?.pause();
                                if (audioRef.current) audioRef.current.currentTime = 0;
                                markAsRead(conv.id, user.id); // Mark the call_end as read too
                            }
                            if (isNew) lastMessageIdRef.current = latestMsg.id;
                        } else if (isNew) {
                            // Text message
                            lastMessageIdRef.current = latestMsg.id;
                            try {
                                const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                await beep.play();
                            } catch (e) { }

                            showToast(`New message from team`, 'info', {
                                label: 'View Message',
                                onClick: () => window.location.hash = `#/team?userId=${latestMsg.sender_id}`
                            });
                        }
                    }
                }
                setUnreadCount(totalUnread);

            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        const interval = setInterval(pollMessages, 3000);
        return () => clearInterval(interval);
    }, [user, showToast, incomingCall]); // Added incomingCall as dependency for call_end check

    const acceptCall = () => {
        if (incomingCall) {
            window.open(incomingCall.link, '_blank');
            markAsRead(incomingCall.conversationId, user!.id); // Mark the 'call' message as read
            setIncomingCall(null);
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    };

    const rejectCall = () => {
        if (incomingCall) {
            markAsRead(incomingCall.conversationId, user!.id); // Mark the 'call' message as read
            setIncomingCall(null);
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    };

    return (
        <TeamContext.Provider value={{ incomingCall, acceptCall, rejectCall, unreadCount }}>
            {children}
        </TeamContext.Provider>
    );
};
