import { supabase } from './supabaseClient';
import type { User } from '../types';

export const login = async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .eq('password', password); // In a real production app, the password should be hashed and compared securely on a server.
    
    if (error) {
        console.error("Login error:", error);
        return null;
    }

    if (data && data.length > 0) {
        if (data.length > 1) {
            console.warn(`[Auth Service] Multiple users found for email: ${email}. Using the first result.`);
        }
        return data[0] as User;
    }

    // No user found
    return null;
};