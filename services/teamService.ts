import { supabase } from './supabaseClient';
import type { TeamConversation, TeamMessage, User } from '../types/domain';

/**
 * Team Communication Service
 * Handles all team chat functionality including conversations and messages
 */

// Get or create a 1-on-1 conversation between two users
export const getOrCreateConversation = async (userId1: number, userId2: number): Promise<TeamConversation> => {
    // Check if conversation already exists
    const { data: existing, error: searchError } = await supabase
        .from('team_conversations')
        .select('*')
        .eq('is_group', false)
        .or(`participant_ids.cs.{${userId1},${userId2}}`);

    if (searchError) {
        console.error('[Team Service] Error searching for conversation:', searchError);
    }

    // Find exact match (both users, no more, no less)
    const exactMatch = existing?.find(conv =>
        conv.participant_ids.length === 2 &&
        conv.participant_ids.includes(userId1) &&
        conv.participant_ids.includes(userId2)
    );

    if (exactMatch) {
        return exactMatch as TeamConversation;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
        .from('team_conversations')
        .insert({
            participant_ids: [userId1, userId2],
            is_group: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (createError) {
        console.error('[Team Service] Error creating conversation:', createError);
        throw createError;
    }

    return newConv as TeamConversation;
};

// Get all conversations for a user
export const getConversations = async (userId: number): Promise<TeamConversation[]> => {
    const { data, error } = await supabase
        .from('team_conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[Team Service] Error fetching conversations:', error);
        throw error;
    }

    return (data as TeamConversation[]) || [];
};

// Send a message in a conversation
export const sendMessage = async (
    conversationId: number,
    senderId: number,
    message: string
): Promise<TeamMessage> => {
    const { data, error } = await supabase
        .from('team_messages')
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            message,
            message_type: 'text',
            created_at: new Date().toISOString(),
            read_by: [senderId], // Sender has read their own message
        })
        .select()
        .single();

    if (error) {
        console.error('[Team Service] Error sending message:', error);
        throw error;
    }

    // Update conversation's updated_at timestamp
    await supabase
        .from('team_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data as TeamMessage;
};

// Get messages for a conversation
export const getMessages = async (conversationId: number, limit: number = 100): Promise<TeamMessage[]> => {
    const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('[Team Service] Error fetching messages:', error);
        throw error;
    }

    return (data as TeamMessage[]) || [];
};

// Mark messages as read by a user
export const markAsRead = async (conversationId: number, userId: number): Promise<void> => {
    // Get all unread messages in this conversation
    const { data: messages, error: fetchError } = await supabase
        .from('team_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .not('read_by', 'cs', `{${userId}}`);

    if (fetchError) {
        console.error('[Team Service] Error fetching unread messages:', fetchError);
        return;
    }

    if (!messages || messages.length === 0) return;

    // Update each message to add userId to read_by array
    const updates = messages.map(msg => {
        const readBy = msg.read_by || [];
        if (!readBy.includes(userId)) {
            readBy.push(userId);
        }
        return supabase
            .from('team_messages')
            .update({ read_by: readBy })
            .eq('id', msg.id);
    });

    await Promise.all(updates);
};

// Get all team members (users)
export const getTeamMembers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .order('email', { ascending: true });

    if (error) {
        console.error('[Team Service] Error fetching team members:', error);
        throw error;
    }

    return (data as User[]) || [];
};

// Get unread message count for a conversation
export const getUnreadCount = async (conversationId: number, userId: number): Promise<number> => {
    const { data, error } = await supabase
        .from('team_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .not('read_by', 'cs', `{${userId}}`);

    if (error) {
        console.error('[Team Service] Error fetching unread count:', error);
        return 0;
    }

    return data?.length || 0;
};
