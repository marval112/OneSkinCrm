

import type { Lead, Customer, Deal, Product, User, Country } from '../types';
import { CustomerStatus, LeadStatus } from '../types';
import * as db from './databaseService';
// Fix: Import supabase client directly to build custom queries.
import { supabase } from './supabaseClient';

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
    const now = new Date().toISOString();
    const newLeadData = {
        ...leadData,
        user_id: userId,
        created_at: now,
        updated_at: now,
    };
    return db.create<Lead>('leads', newLeadData as Omit<Lead, 'id'>);
};

export const updateLead = async (updatedLead: Omit<Lead, 'created_at'>): Promise<Lead> => {
    const leadWithTimestamp = {
        ...updatedLead,
        updated_at: new Date().toISOString(),
    };
    return db.update<Lead>('leads', leadWithTimestamp as Lead);
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
    const newCustomer = {
        ...customerData,
        user_id: userId,
        created_at: new Date().toISOString()
    };
    return db.create<Customer>('customers', newCustomer as Omit<Customer, 'id'>);
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
    const newDealData = {
        ...dealData,
        user_id: userId,
        created_at: now,
        updated_at: now,
    } as Omit<Deal, 'id'>;
    return db.create<Deal>('deals', newDealData);
};

export const updateDeal = async (updatedDeal: Omit<Deal, 'created_at'>): Promise<Deal> => {
    // Destructure to remove created_at, which should not be updated.
    const { created_at, ...dealData } = updatedDeal as Deal;
    const dealWithTimestamp = {
        ...dealData,
        updated_at: new Date().toISOString(),
    };
    return db.update<Deal>('deals', dealWithTimestamp as Deal);
};

export const bulkDeleteDeals = async (ids: number[]): Promise<void> => {
    return db.bulkRemove('deals', ids);
};

// --- Countries ---
export const getCountries = async (): Promise<Country[]> => {
    const { data, error } = await supabase.from('countries').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data as Country[];
};