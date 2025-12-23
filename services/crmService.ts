

import type { Lead, Customer, Deal, Product, User, Country } from '../types';
import { CustomerStatus, LeadStatus, TaskType, TaskStatus } from '../types';
import * as db from './databaseService';
// Fix: Import supabase client directly to build custom queries.
import { supabase } from './supabaseClient';
import { runLeadCreatedAutomations } from './automationService';
import { sendTelegramMessage } from './telegramService';

const getFilteredQuery = (table: 'leads' | 'customers' | 'deals', user: User) => {
    let query = supabase.from(table).select('*').order('id', { ascending: false });
    if (user.role === 'Commercial') {
        query = query.eq('user_id', user.id);
    }
    return query;
};

// --- Leads ---
export const getLeads = async (user: User): Promise<Lead[]> => {
    const { data, error } = await getFilteredQuery('leads', user);
    if (error) throw error;
    return data as Lead[];
};

export const createLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id'>, userId: number): Promise<Lead> => {
    // Check for duplicate email
    if (leadData.email) {
        const { data: existing } = await supabase
            .from('leads')
            .select('id')
            .eq('email', leadData.email)
            .maybeSingle();

        if (existing) {
            throw new Error('A lead with this email already exists.');
        }
    }

    const now = new Date().toISOString();
    const newLeadData = {
        ...leadData,
        user_id: userId,
        created_at: now,
        updated_at: now,
    };
    const lead = await db.create<Lead>('leads', newLeadData as Omit<Lead, 'id'>);
    // Run user-defined automations for lead creation only (no direct task creation here)
    try { await runLeadCreatedAutomations(lead); } catch (e) { console.warn('[automation] lead-created automations failed', e); }
    // Notify Telegram (best-effort)
    try { await sendTelegramMessage(`🆕 New Lead: ${lead.name} (${lead.email})`); } catch { }
    return lead;
};

export const updateLead = async (updatedLead: Omit<Lead, 'created_at'>): Promise<Lead> => {
    // Fetch previous to detect status change
    let prev: Lead | null = null;
    try {
        const { data } = await supabase.from('leads').select('*').eq('id', (updatedLead as any).id).maybeSingle();
        prev = (data as Lead) || null;
    } catch { }
    const leadWithTimestamp = {
        ...updatedLead,
        updated_at: new Date().toISOString(),
    };
    const saved = await db.update<Lead>('leads', leadWithTimestamp as Lead);
    try {
        if (prev && prev.status !== saved.status) {
            await sendTelegramMessage(`🔄 Lead status changed: ${saved.name} • ${prev.status} → ${saved.status}`);
        }
    } catch { }
    return saved;
};

export const bulkDeleteLeads = async (ids: number[]): Promise<void> => {
    return db.bulkRemove('leads', ids);
};

export const convertLeadToCustomer = async (lead: Lead, user: User): Promise<Customer> => {
    // 1. Check if a customer with the same email already exists
    const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', lead.email)
        .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "No rows found", which is good.
        throw new Error(checkError.message);
    }
    if (existingCustomer) {
        throw new Error('A customer with this email already exists.');
    }

    // 2. Create a new customer from the lead's data
    const newCustomerData: Omit<Customer, 'id' | 'created_at' | 'user_id'> = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        country: lead.country,
        segment: lead.segment,
        status: CustomerStatus.Active,
        health_score: 80, // Default health score for new customers
        last_contact: new Date().toISOString(),
    };
    const newCustomer = await createCustomer(newCustomerData, user.id);

    // 3. Update the lead's status to 'Won'
    await updateLead({ ...lead, status: LeadStatus.Won });

    return newCustomer;
};


// --- Customers ---
export const getCustomers = async (user: User): Promise<Customer[]> => {
    const { data, error } = await getFilteredQuery('customers', user);
    if (error) throw error;
    return data as Customer[];
};

export const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'user_id'>, userId: number): Promise<Customer> => {
    // Check for duplicate email
    if (customerData.email) {
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('email', customerData.email)
            .maybeSingle();

        if (existing) {
            throw new Error('A customer with this email already exists.');
        }
    }

    const newCustomer = {
        ...customerData,
        user_id: userId,
        created_at: new Date().toISOString()
    };
    const saved = await db.create<Customer>('customers', newCustomer as Omit<Customer, 'id'>);
    try { await sendTelegramMessage(`🧑‍💼 New Customer: ${saved.name} (${saved.email})`); } catch { }
    return saved;
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
    return db.update<Customer>('customers', updatedCustomer);
};

export const bulkDeleteCustomers = async (ids: number[]): Promise<void> => {
    return db.bulkRemove('customers', ids);
};

// --- Deals ---
export const getDeals = async (user: User): Promise<Deal[]> => {
    const { data, error } = await getFilteredQuery('deals', user);
    if (error) throw error;
    return data as Deal[];
};

export const getDealsByCustomer = async (customerId: number): Promise<Deal[]> => {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Deal[];
};

type NewDealInput = {
    title: string;
    value: number;
    status: Deal['status'];
    probability: number;
    expected_close_date: string;
    notes?: string;
    customer_id?: number;
    lead_id?: number | null;
};

export const createDeal = async (dealData: NewDealInput, userId: number): Promise<Deal> => {
    if (!dealData.customer_id && !dealData.lead_id) {
        throw new Error('Either customer_id or lead_id must be provided to create a deal.');
    }
    const now = new Date().toISOString();
    const isClosed = dealData.status === 'Closed Won' || dealData.status === 'Closed Lost';
    const newDealData: any = {
        ...dealData,
        user_id: userId,
        created_at: now,
        updated_at: now,
    };
    if (isClosed) {
        (newDealData as any)['closed_year'] = new Date().getFullYear();
    }
    const saved = await db.create<Deal>('deals', newDealData as Omit<Deal, 'id'>);
    try {
        const assoc = saved.customer_id ? `Customer #${saved.customer_id}` : saved.lead_id ? `Lead #${saved.lead_id}` : '';
        await sendTelegramMessage(`💼 New Deal: ${saved.title} • €${Number(saved.value).toLocaleString()} • ${assoc}`);
    } catch { }
    return saved;
};

export const updateDeal = async (updatedDeal: Omit<Deal, 'created_at'>): Promise<Deal> => {
    // Destructure to remove created_at, which should not be updated.
    const { created_at, ...dealData } = updatedDeal as Deal;
    let prev: Deal | null = null;
    try {
        const { data } = await supabase.from('deals').select('*').eq('id', (updatedDeal as any).id).maybeSingle();
        prev = (data as Deal) || null;
    } catch { }
    // Prevent edits when already closed
    if (prev && (prev.status === 'Closed Won' || prev.status === 'Closed Lost')) {
        throw new Error('This deal is closed and cannot be modified.');
    }
    const dealWithTimestamp = {
        ...dealData,
        updated_at: new Date().toISOString(),
    };
    // If transitioning to a closed state, stamp closed_year
    const closedStates = ['Closed Won', 'Closed Lost'];
    if (prev && prev.status !== dealWithTimestamp.status && closedStates.includes(dealWithTimestamp.status)) {
        (dealWithTimestamp as any)['closed_year'] = new Date().getFullYear();
    }
    const saved = await db.update<Deal>('deals', dealWithTimestamp as Deal);
    try {
        if (prev && prev.status !== saved.status) {
            await sendTelegramMessage(`🔁 Deal stage changed: ${saved.title} • ${prev.status} → ${saved.status}`);
        }
    } catch { }
    return saved;
};

export const bulkDeleteDeals = async (ids: number[]): Promise<void> => {
    return db.bulkRemove('deals', ids);
};

// --- Countries ---
export const getCountries = async (): Promise<Country[]> => {
    return db.getAll('countries');
};

// --- Proactive Context ---
export async function getProactiveBriefingContext(user: User): Promise<string> {
    try {
        const [leads, deals, tasks] = await Promise.all([
            getLeads(user),
            getDeals(user),
            supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'Pending')
        ]);

        const pendingLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
        const openDeals = deals.filter(d => d.status !== 'Closed Won' && d.status !== 'Closed Lost');
        const pendingTasks = tasks.data || [];

        // Summarize
        let context = `RESUMEN DE CARTERA PARA EL COMERCIAL:\n`;
        context += `- Leads pendientes: ${pendingLeads.length}\n`;
        context += `- Oportunidades abiertas: ${openDeals.length} (Valor total: €${openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0).toLocaleString()})\n`;
        context += `- Tareas pendientes: ${pendingTasks.length}\n`;

        if (pendingLeads.length > 0) {
            context += `Próximos Leads relevantes: ${pendingLeads.slice(0, 3).map(l => l.name).join(', ')}\n`;
        }

        return context;
    } catch (error) {
        console.error('Error gathering proactive context:', error);
        return "Error al recopilar datos de la cartera.";
    }
}