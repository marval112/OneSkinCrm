import { supabase } from './supabaseClient';
import { LeadStatus, LeadSource, CustomerStatus, DealStage, WebhookEvent, ReportFormat, ReportType, Segment } from '../types';

const DB_INIT_FLAG = 'oneskin_db_initialized_v4'; // Bumped version flag for re-initialization

/**
 * Checks if a table is empty and, if so, seeds it with initial data.
 * @param tableName The name of the table to seed.
 * @param seedData An array of data objects to insert.
 */
const seedTableIfNotExists = async (tableName: string, seedData: any[]) => {
    if (seedData.length === 0) {
        console.log(`[DB Init] No data provided for table "${tableName}". Skipping seed.`);
        return;
    }
    try {
        // Check if table has any rows
        const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (countError) {
             // This specific error indicates the table likely doesn't exist.
            if (countError.code === '42P01' || countError.message.includes('relation') && countError.message.includes('does not exist')) {
                 console.error(`[DB Init] CRITICAL FAILURE: The table "${tableName}" does not exist in your Supabase project. Please run the complete SCHEMA.sql script in your Supabase dashboard's SQL Editor to create all required tables.`);
            } else {
                console.error(`[DB Init] Error checking table "${tableName}":`, countError);
            }
            throw countError; // Stop initialization for this table
        }

        if (count === 0) {
            console.log(`[DB Init] Table "${tableName}" is empty. Seeding data...`);
            const { error: insertError } = await supabase.from(tableName).insert(seedData);
            if (insertError) {
                console.error(`[DB Init] Error seeding table "${tableName}":`, insertError);
                throw insertError;
            }
            console.log(`[DB Init] Table "${tableName}" seeded successfully.`);
        } else {
            console.log(`[DB Init] Table "${tableName}" already has data. Skipping seed.`);
        }
    } catch (e) {
        // Log and re-throw to be caught by the main initializer
        console.error(`[DB Init] A critical error occurred while processing table "${tableName}".`);
        throw e;
    }
};

const seedAllData = async () => {
    // --- Seed Users (must be first) ---
    const usersToSeed = [
        { email: 'admin', password: 'admin', role: 'Admin' as const },
        { email: 'comercial@oneskin.com', password: 'password', role: 'Commercial' as const },
    ];

    for (const user of usersToSeed) {
        // FIX: Remove .single() to prevent errors on duplicate users, check by array length instead.
        const { data: existingUsers, error: selectError } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email);

        if (selectError) {
             console.error(`[DB Init] Error checking for user ${user.email}:`, selectError);
             throw selectError;
        }

        if (!existingUsers || existingUsers.length === 0) {
            console.log(`[DB Init] Seeding user: ${user.email}`);
            const { error: insertError } = await supabase.from('users').insert(user);
            if (insertError) {
                console.error(`[DB Init] Error inserting user ${user.email}:`, insertError);
                throw insertError;
            }
        } else {
            console.log(`[DB Init] User ${user.email} already exists.`);
        }
    }
    
    // Fetch the Admin user's ID to associate existing data with them
    // FIX: Remove .single() to prevent error if admin user is duplicated.
    const { data: adminUsers, error: userError } = await supabase.from('users').select('id').eq('email', 'admin');
    if (userError || !adminUsers || adminUsers.length === 0) {
        console.error("[DB Init] Could not find Admin user to assign data to. Halting seed.", userError);
        throw new Error("Admin user not found after seeding attempt. Cannot proceed.");
    }
    const ADMIN_ID = adminUsers[0].id;


    // --- Seed Countries ---
    await seedTableIfNotExists('countries', [
        { code: 'ES', name: 'Spain' }, { code: 'US', name: 'United States' },
        { code: 'PT', name: 'Portugal' }, { code: 'FR', name: 'France' },
    ]);

    // --- Seed Product Categories (depends on nothing) ---
    await seedTableIfNotExists('product_categories', [
        { id: 1, name: 'Lacquered Boards', parent_id: null },
        { id: 2, name: 'Melamines', parent_id: null },
        { id: 3, name: 'High Gloss', parent_id: 1 },
        { id: 4, name: 'Super Matt', parent_id: 1 },
        { id: 5, name: 'Wood Finish', parent_id: 2 },
    ]);

    // --- Seed Products (depends on categories) ---
    await seedTableIfNotExists('products', [
        { sku: 'OS-LGB-GLW-01', name: 'Glossy White Lacquered Board', description: 'High-gloss lacquered panel, perfect for modern kitchens.', price: 89.99, category_id: 3, active: true },
        { sku: 'OS-LGB-MTB-01', name: 'Matt Black Lacquered Board', description: 'Super-matt finish with anti-fingerprint technology.', price: 109.50, category_id: 4, active: true },
        { sku: 'OS-MLM-OAK-01', name: 'Oak Wood Melamine', description: 'Realistic oak wood texture melamine board.', price: 49.95, category_id: 5, active: false },
    ]);

    // --- Seed Customers ---
    await seedTableIfNotExists('customers', [
        { name: 'Elena Rodriguez', email: 'elena.r@archviz.es', company: 'Archviz Studios', country: 'Spain', status: CustomerStatus.Active, health_score: 85, last_contact: '2024-07-15', user_id: ADMIN_ID, segment: Segment.OTROS },
        { name: 'John Smith', email: 'jsmith@luxuryhomes.com', company: 'Luxury Homes LLC', country: 'United States', status: CustomerStatus.Active, health_score: 92, last_contact: '2024-07-01', user_id: ADMIN_ID, segment: Segment.OTROS },
    ]);
    
    // --- Seed Leads ---
    await seedTableIfNotExists('leads', [
        { name: 'Carlos Gomez', company: 'Reformas Express', email: 'carlos.g@ref-express.com', country: 'Spain', status: LeadStatus.New, source: LeadSource.Website, score: 75, updated_at: new Date().toISOString(), notes: 'Initial contact made through website form.', user_id: ADMIN_ID, segment: Segment.DISTRIBUCION },
        { name: 'Laura Fernandez', company: 'Deco Interiores', email: 'laura.f@deco-int.es', country: 'Spain', status: LeadStatus.Contacted, source: LeadSource.Referral, score: 92, updated_at: new Date().toISOString(), notes: 'Referred by Archviz Studios. High priority.', user_id: ADMIN_ID, segment: Segment.OTROS },
    ]);
    
    // --- Seed Deals (depends on customers) ---
    const { data: customers } = await supabase.from('customers').select('id, email');
    const customerMap = customers?.reduce((acc, c) => ({ ...acc, [c.email]: c.id }), {}) || {};

    const dealsToSeed = [];
    if (customerMap['elena.r@archviz.es']) {
        dealsToSeed.push(
            { title: 'Hotel Marbella Project', customer_id: customerMap['elena.r@archviz.es'], value: 8999.00, status: DealStage.PROPOSAL, probability: 75, expected_close_date: '2024-08-30', updated_at: new Date().toISOString(), user_id: ADMIN_ID },
            { title: 'Downtown Apartments', customer_id: customerMap['elena.r@archviz.es'], value: 4499.50, status: DealStage.CLOSED_WON, probability: 100, expected_close_date: '2024-07-20', updated_at: new Date().toISOString(), user_id: ADMIN_ID }
        );
    }
    await seedTableIfNotExists('deals', dealsToSeed);

    // --- Seed Other Tables ---
    await seedTableIfNotExists('scheduled_reports', []);
    await seedTableIfNotExists('webhooks', []);
    await seedTableIfNotExists('connected_integrations', []);
};

export const initializeDatabase = async (): Promise<boolean> => {
    if (localStorage.getItem(DB_INIT_FLAG)) {
        console.log('[DB Init] Database has already been initialized. Skipping.');
        return true;
    }
    
    console.log('[DB Init] Starting database initialization...');

    try {
        await seedAllData();
        localStorage.setItem(DB_INIT_FLAG, 'true');
        console.log('[DB Init] Database initialization complete.');
        return true;
    } catch (error) {
        console.error('[DB Init] CRITICAL: An error occurred during database initialization. The application may not function correctly.', error);
        return false;
    }
};