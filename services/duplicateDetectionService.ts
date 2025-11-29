import type { Lead } from '../types';
import { supabase } from './supabaseClient';

export interface DuplicateMatch {
    lead: Lead;
    matchType: 'email' | 'phone' | 'company' | 'fuzzy';
    similarity: number;
}

/**
 * Check for duplicate leads based on email, phone, or company name
 */
export async function checkDuplicates(leadData: Partial<Lead>): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];

    try {
        // Check for exact email match
        if (leadData.email) {
            const { data: emailMatches } = await supabase
                .from('leads')
                .select('*')
                .eq('email', leadData.email);

            if (emailMatches && emailMatches.length > 0) {
                emailMatches.forEach(lead => {
                    duplicates.push({
                        lead: lead as Lead,
                        matchType: 'email',
                        similarity: 100
                    });
                });
            }
        }

        // Check for exact phone match
        if (leadData.phone) {
            const cleanPhone = leadData.phone.replace(/\D/g, ''); // Remove non-digits
            const { data: phoneMatches } = await supabase
                .from('leads')
                .select('*')
                .ilike('phone', `%${cleanPhone}%`);

            if (phoneMatches && phoneMatches.length > 0) {
                phoneMatches.forEach(lead => {
                    if (!duplicates.some(d => d.lead.id === lead.id)) {
                        duplicates.push({
                            lead: lead as Lead,
                            matchType: 'phone',
                            similarity: 100
                        });
                    }
                });
            }
        }

        // Check for similar company name (fuzzy match)
        if (leadData.company && leadData.company.length > 3) {
            const { data: companyMatches } = await supabase
                .from('leads')
                .select('*')
                .ilike('company', `%${leadData.company}%`);

            if (companyMatches && companyMatches.length > 0) {
                companyMatches.forEach(lead => {
                    if (!duplicates.some(d => d.lead.id === lead.id)) {
                        const similarity = calculateStringSimilarity(
                            leadData.company!.toLowerCase(),
                            lead.company.toLowerCase()
                        );

                        // Only include if similarity is above 70%
                        if (similarity >= 70) {
                            duplicates.push({
                                lead: lead as Lead,
                                matchType: similarity === 100 ? 'company' : 'fuzzy',
                                similarity
                            });
                        }
                    }
                });
            }
        }

    } catch (error) {
        console.error('Error checking duplicates:', error);
    }

    return duplicates;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
        return 100;
    }

    const editDistance = levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Merge two lead records
 */
export async function mergeLeads(
    primaryLeadId: number,
    duplicateLeadId: number,
    mergeData?: Partial<Lead>
): Promise<boolean> {
    try {
        // Get both leads
        const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .in('id', [primaryLeadId, duplicateLeadId]);

        if (!leads || leads.length !== 2) {
            throw new Error('Could not find both leads');
        }

        const primaryLead = leads.find(l => l.id === primaryLeadId);
        const duplicateLead = leads.find(l => l.id === duplicateLeadId);

        if (!primaryLead || !duplicateLead) {
            throw new Error('Invalid lead IDs');
        }

        // Merge data (primary lead takes precedence, but fill in missing fields from duplicate)
        const mergedData: Partial<Lead> = {
            ...duplicateLead,
            ...primaryLead,
            ...mergeData,
            // Combine notes
            notes: [primaryLead.notes, duplicateLead.notes]
                .filter(Boolean)
                .join('\n\n--- Merged from duplicate lead ---\n\n')
        };

        // Update primary lead with merged data
        const { error: updateError } = await supabase
            .from('leads')
            .update(mergedData)
            .eq('id', primaryLeadId);

        if (updateError) {
            throw updateError;
        }

        // Delete duplicate lead
        const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', duplicateLeadId);

        if (deleteError) {
            throw deleteError;
        }

        return true;
    } catch (error) {
        console.error('Error merging leads:', error);
        return false;
    }
}
