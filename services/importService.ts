import * as db from './databaseService';
import type { Lead, Customer } from '../types';

/**
 * Parses a CSV file into an array of objects.
 * Assumes the first row is the header.
 */
export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target?.result as string;
                const lines = csv.split(/\r\n|\n/);
                if (lines.length === 0) {
                    return resolve([]);
                }
                const headers = lines[0].split(',').map(h => h.trim());
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) continue;
                    const values = line.split(',');
                    const obj: any = {};
                    for (let j = 0; j < headers.length; j++) {
                        const header = headers[j];
                        let value = values[j]?.trim();
                        // Naive handling for quoted strings
                        if (value && value.startsWith('"') && value.endsWith('"')) {
                            value = value.substring(1, value.length - 1);
                        }
                        obj[header] = value;
                    }
                    data.push(obj);
                }
                resolve(data);
            } catch (error) {
                reject(new Error("Failed to parse CSV file."));
            }
        };
        reader.onerror = () => {
            reject(new Error("Failed to read the file."));
        };
        reader.readAsText(file);
    });
};

/**
 * Sanitizes and prepares lead data for upserting.
 * Converts string numbers to actual numbers, assigns user_id, etc.
 */
const sanitizeLeads = (data: any[], userId: number): Partial<Lead>[] => {
    return data.map(item => {
        const lead: Partial<Lead> = {};
        
        const parsedId = parseInt(item.id, 10);
        if (!isNaN(parsedId)) {
            lead.id = parsedId;
        }

        if (item.name) lead.name = item.name;
        if (item.email) lead.email = item.email;
        if (item.company) lead.company = item.company;
        if (item.phone) lead.phone = item.phone;
        if (item.country) lead.country = item.country;
        if (item.segment) lead.segment = item.segment;
        if (item.source) lead.source = item.source;
        if (item.status) lead.status = item.status;
        
        const parsedScore = parseInt(item.score, 10);
        lead.score = !isNaN(parsedScore) ? parsedScore : 0;
        
        if (item.notes) lead.notes = item.notes;
        
        const parsedUserId = parseInt(item.user_id, 10);
        lead.user_id = !isNaN(parsedUserId) ? parsedUserId : userId;
        
        // Ensure required fields are not undefined, even if empty
        if (!lead.name) lead.name = '';
        if (!lead.email) lead.email = '';

        return lead;
    }).filter(lead => lead.email); // Only import leads with an email
};

/**
 * Sanitizes and prepares customer data for upserting.
 */
const sanitizeCustomers = (data: any[], userId: number): Partial<Customer>[] => {
    return data.map(item => {
        const customer: Partial<Customer> = {};
        
        const parsedId = parseInt(item.id, 10);
        if (!isNaN(parsedId)) {
            customer.id = parsedId;
        }

        if (item.name) customer.name = item.name;
        if (item.email) customer.email = item.email;
        if (item.company) customer.company = item.company;
        if (item.phone) customer.phone = item.phone;
        if (item.country) customer.country = item.country;
        if (item.segment) customer.segment = item.segment;
        if (item.status) customer.status = item.status;

        const parsedHealthScore = parseInt(item.health_score, 10);
        customer.health_score = !isNaN(parsedHealthScore) ? parsedHealthScore : 75;
        
        if (item.last_contact) customer.last_contact = item.last_contact;

        const parsedUserId = parseInt(item.user_id, 10);
        customer.user_id = !isNaN(parsedUserId) ? parsedUserId : userId;

        if (!customer.name) customer.name = '';
        if (!customer.email) customer.email = '';

        return customer;
    }).filter(customer => customer.email);
};


export const importLeads = async (data: any[], userId: number): Promise<{ successCount: number }> => {
    const sanitizedData = sanitizeLeads(data, userId);
    if (sanitizedData.length === 0) {
        throw new Error("No valid lead data to import. Ensure leads have an email address.");
    }
    const result = await db.upsert<Lead>('leads', sanitizedData);
    return { successCount: result.length };
};

export const importCustomers = async (data: any[], userId: number): Promise<{ successCount: number }> => {
    const sanitizedData = sanitizeCustomers(data, userId);
    if (sanitizedData.length === 0) {
        throw new Error("No valid customer data to import. Ensure customers have an email address.");
    }
    const result = await db.upsert<Customer>('customers', sanitizedData);
    return { successCount: result.length };
};