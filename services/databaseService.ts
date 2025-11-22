import { supabase } from './supabaseClient';

/**
 * A generic database service using a Supabase client.
 * This centralizes all data persistence logic for the application.
 */

// --- SCHEMA DEFINITION ---
const DB_TABLES = [
    'users',
    'countries',
    'products', 
    'product_categories', 
    'leads', 
    'customers', 
    'deals',
    'scheduled_reports',
    'report_runs',
    'activities',
    'webhooks',
    'connected_integrations',
    'automation_rules',
    'automation_alerts'
] as const;

export type DbTable = (typeof DB_TABLES)[number];


/**
 * Handles specific database errors, like missing columns, to make operations more resilient.
 * If a "column not found" error is detected, it retries the operation without the offending column.
 */
const handleResilientOperation = async (error: any, table: DbTable, itemData: any, operation: 'insert' | 'update') => {
    // Check for Supabase's specific error for a missing column
    if (error.code === 'PGRST204' && error.message.includes("Could not find the") && error.message.includes("column")) {
        const offendingColumnMatch = error.message.match(/'(\w+)' column/);
        if (offendingColumnMatch && offendingColumnMatch[1]) {
            const offendingColumn = offendingColumnMatch[1];
            console.warn(`[DB Service] Column '${offendingColumn}' not found in table '${table}'. Retrying operation without it.`);
            
            const sanitizedData = { ...itemData };
            delete sanitizedData[offendingColumn];
            
            let query;
            if (operation === 'insert') {
                query = supabase.from(table).insert(sanitizedData).select().single();
            } else {
                const { id, ...updateData } = sanitizedData;
                if (!id) {
                     console.error(`[DB Service] Cannot perform resilient update without an ID for table '${table}'.`);
                     throw error; // Re-throw original error if ID is missing
                }
                query = supabase.from(table).update(updateData).eq('id', id).select().single();
            }

            const { data: retryData, error: retryError } = await query;
            if (retryError) {
                 console.error(`[DB Error] Retry failed for table: ${table}.`, retryError);
                 throw retryError;
            }
            return retryData;
        }
    }

    // If the error is not the one we're handling, or if parsing fails, re-throw it.
    console.error(`[DB Error] Table: ${table}, Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
    throw error;
};


// --- PUBLIC API (CRUD OPERATIONS) ---

export const getAll = async <T>(table: DbTable): Promise<T[]> => {
    const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false });
    if (error) {
        console.error(`[DB Error] Table: ${table}, Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
        throw error;
    }
    return data as T[];
};

export const getById = async <T>(table: DbTable, id: number | string): Promise<T | null> => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') { // "No rows found"
            return null; 
        }
        console.error(`[DB Error] Table: ${table}, Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
        throw error;
    }
    return data as T | null;
};

export const create = async <T>(table: DbTable, itemData: Omit<T, 'id'>): Promise<T> => {
    const { data, error } = await supabase.from(table).insert(itemData).select().single();
    if (error) {
        // Attempt to handle the error gracefully before failing
        return handleResilientOperation(error, table, itemData, 'insert');
    }
    return data as T;
};

export const update = async <T extends { id: any }>(table: DbTable, updatedItem: T): Promise<T> => {
    const { id, ...updateData } = updatedItem;
    const { data, error } = await supabase.from(table).update(updateData).eq('id', id).select().single();
    if (error) {
        // Attempt to handle the error gracefully before failing
        return handleResilientOperation(error, table, updatedItem, 'update');
    }
    return data as T;
};

export const upsert = async <T>(table: DbTable, items: Partial<T>[]): Promise<T[]> => {
    const { data, error } = await supabase.from(table).upsert(items).select();
    if (error) {
        console.error(`[DB Error] Upsert failed for table: ${table}.`, error);
        throw error;
    }
    return data as T[];
};

export const remove = async (table: DbTable, id: number | string): Promise<void> => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        console.error(`[DB Error] Table: ${table}, Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
        throw error;
    }
};

export const bulkRemove = async (table: DbTable, ids: (number | string)[]): Promise<void> => {
    const { error } = await supabase.from(table).delete().in('id', ids);
    if (error) {
        console.error(`[DB Error] Table: ${table}, Code: ${error.code}, Message: ${error.message}, Details: ${error.details}`);
        throw error;
    }
}