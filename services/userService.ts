
import type { User } from '../types';
import * as db from './databaseService';

export const getUsers = async (): Promise<User[]> => {
    const users = await db.getAll<{ id: number; email: string; role: 'Admin' | 'Commercial' }>('users');
    return users;
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    // In a real app, hash the password before saving
    return db.create<User>('users', userData);
};
