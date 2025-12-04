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
                // This is a simplified check. Ideally, we'd query for messages NOT in read_by array.
                // For now, let's just listen to the latest message in conversations the user is part of.

                // Real-time subscription would be better, but sticking to polling as per previous pattern
                const { data: conversations, error } = await supabase
                    .from('team_conversations')
                    .select('id, participant_ids')
                    .contains('participant_ids', [user.id]);

                if (error || !conversations) return;

                for (const conv of conversations) {
                    const { data: msgs } = await supabase
                        .from('team_messages')
                        .select('*')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (msgs && msgs.length > 0) {
                        const latestMsg = msgs[0] as TeamMessage;

                        // Check if it's a new message we haven't processed yet
                        if (lastMessageIdRef.current && latestMsg.id <= lastMessageIdRef.current) {
                            continue;
                        }

                        // If sender is self, ignore
                        if (latestMsg.sender_id === user.id) continue;

                        // It's a new message!
                        lastMessageIdRef.current = latestMsg.id;

                        // Handle Call Types
                        if (latestMsg.message_type === 'call' || latestMsg.message_type === 'video_call') {
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
                                    console.log('Audio play failed (user interaction needed first):', e);
                                }
                            }
                        } else {
                            // Text message
                            // Play notification sound (short beep)
                            try {
                                const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                await beep.play();
                            } catch (e) {
                                // Ignore audio errors (usually due to autoplay policy)
                            }
                            showToast(`New message from team`, 'info', {
                                label: 'View Message',
                                onClick: () => window.location.hash = `#/team?userId=${latestMsg.sender_id}`
                            });
                        }
                    }
                }

            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        const interval = setInterval(pollMessages, 3000);
        return () => clearInterval(interval);
    }, [user, showToast]);

    const acceptCall = () => {
        if (incomingCall) {
            window.open(incomingCall.link, '_blank');
            setIncomingCall(null);
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    };

    const rejectCall = () => {
        setIncomingCall(null);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    return (
        <TeamContext.Provider value={{ incomingCall, acceptCall, rejectCall, unreadCount }}>
            {children}
        </TeamContext.Provider>
    );
};
