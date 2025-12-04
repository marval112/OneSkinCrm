import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import GroupCallModal from './GroupCallModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../services/i18nService';
import type { User, TeamConversation, TeamMessage } from '../../types/domain';
import {
    getTeamMembers,
    getOrCreateConversation,
    getMessages,
    sendMessage as sendTeamMessage,
    sendCallSignal,
    markAsRead,
    getUnreadCounts,
} from '../../services/teamService';

// Icons
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const VideoCameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

function Team() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [isGroupCallModalOpen, setIsGroupCallModalOpen] = useState(false);
    const [currentConversation, setCurrentConversation] = useState<TeamConversation | null>(null);
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load team members
    useEffect(() => {
        const loadTeamMembers = async () => {
            try {
                const members = await getTeamMembers();
                // Filter out current user
                const otherMembers = members.filter(m => m.id !== user?.id);
                setTeamMembers(otherMembers);
            } catch (error) {
                console.error('Failed to load team members:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadTeamMembers();
        }
    }, [user]);

    // Handle query param for auto-selection
    useEffect(() => {
        const userIdParam = searchParams.get('userId');
        if (userIdParam && teamMembers.length > 0) {
            const targetUser = teamMembers.find(m => m.id === parseInt(userIdParam));
            if (targetUser) {
                handleSelectUser(targetUser);
            }
        }
    }, [searchParams, teamMembers]);

    // Poll for unread counts
    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            const counts = await getUnreadCounts(user.id);
            setUnreadCounts(counts);
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 5000);
        return () => clearInterval(interval);
    }, [user]);

    // Load conversation and messages when user is selected
    const loadConversation = useCallback(async (selectedUserId: number) => {
        if (!user) return;

        try {
            const conversation = await getOrCreateConversation(user.id, selectedUserId);
            setCurrentConversation(conversation);

            const msgs = await getMessages(conversation.id);
            setMessages(msgs);

            // Mark messages as read
            await markAsRead(conversation.id, user.id);

            scrollToBottom();
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }, [user]);

    // Handle user selection
    const handleSelectUser = (member: User) => {
        setSelectedUser(member);
        loadConversation(member.id);
        // Clear unread count locally
        setUnreadCounts(prev => ({ ...prev, [member.id]: 0 }));
    };

    // Poll for new messages
    useEffect(() => {
        if (!currentConversation || !user) return;

        const pollMessages = async () => {
            try {
                const msgs = await getMessages(currentConversation.id);
                setMessages(msgs);
                await markAsRead(currentConversation.id, user.id);
            } catch (error) {
                console.error('Failed to poll messages:', error);
            }
        };

        // Poll every 3 seconds
        pollingIntervalRef.current = setInterval(pollMessages, 3000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [currentConversation, user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentConversation || !user) return;

        try {
            await sendTeamMessage(currentConversation.id, user.id, newMessage.trim());
            setNewMessage('');

            // Immediately refresh messages
            const msgs = await getMessages(currentConversation.id);
            setMessages(msgs);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    // Format timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return t('team.justNow');
        if (diffMins < 60) return `${diffMins}m`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;

        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) return t('team.yesterday');

        return date.toLocaleDateString();
    };

    const handleStartGroupCall = async (selectedUserIds: number[]) => {
        if (!user) return;

        const link = `https://meet.jit.si/OneSkinCRM-Group-${Date.now()}`;

        // Open for self immediately
        window.open(link, '_blank');

        // Send invites
        for (const userId of selectedUserIds) {
            try {
                const conversation = await getOrCreateConversation(user.id, userId);
                await sendCallSignal(conversation.id, user.id, link, 'video_call');
            } catch (error) {
                console.error(`Failed to invite user ${userId}:`, error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-slate-500 dark:text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100dvh-4rem)] bg-white dark:bg-slate-800 overflow-hidden">
            {/* Left Sidebar - Team Members */}
            <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-200 dark:border-slate-700 flex-col`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('team.title')}</h2>
                    <button
                        onClick={() => setIsGroupCallModalOpen(true)}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        title="Start Group Call"
                    >
                        <VideoCameraIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {teamMembers.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                            {t('team.selectUser')}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {teamMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelectUser(member)}
                                    className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedUser?.id === member.id ? 'bg-slate-100 dark:bg-slate-700' : ''
                                        }`}
                                >
                                    <div className="relative">
                                        <UserCircleIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                                        {unreadCounts[member.id] > 0 && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                                                {unreadCounts[member.id]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium text-slate-900 dark:text-white">{member.email}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{member.role}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full`}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="md:hidden p-1 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    <ChevronLeftIcon className="w-6 h-6" />
                                </button>
                                <UserCircleIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">{selectedUser.email}</div>
                                    <div className="text-xs text-green-600 dark:text-green-400">{t('team.online')}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        if (!currentConversation || !user) return;
                                        const link = `https://meet.jit.si/OneSkinCRM-${currentConversation.id}`;
                                        await sendCallSignal(currentConversation.id, user.id, link, 'video_call');
                                        window.open(link, '_blank');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <VideoCameraIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">Video</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!currentConversation || !user) return;
                                        const link = `tel:${selectedUser.email}`; // Fallback if no phone
                                        await sendCallSignal(currentConversation.id, user.id, link, 'call');
                                        window.location.href = link;
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                                >
                                    <PhoneIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">{t('team.call')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-slate-500 dark:text-slate-400">
                                        {t('team.noMessages')}
                                    </div>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isOwnMessage = msg.sender_id === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-md px-4 py-2 rounded-2xl ${isOwnMessage
                                                    ? 'bg-primary text-white rounded-br-none'
                                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none shadow'
                                                    }`}
                                            >
                                                <div className="text-sm">{msg.message}</div>
                                                <div
                                                    className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
                                                        }`}
                                                >
                                                    {formatTime(msg.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={t('team.typeMessage')}
                                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
                        {t('team.selectUser')}
                    </div>
                )}
            </div>

            <GroupCallModal
                isOpen={isGroupCallModalOpen}
                onClose={() => setIsGroupCallModalOpen(false)}
                users={teamMembers}
                onStartCall={handleStartGroupCall}
            />
        </div>
    );
}

export default Team;
