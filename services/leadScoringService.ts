import type { Lead } from '../types';
import { LeadStatus, LeadSource, Segment } from '../types';

export interface ScoringRule {
    id: string;
    name: string;
    field: keyof Lead;
    condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
    value: any;
    points: number;
    category: 'demographic' | 'behavioral' | 'firmographic' | 'engagement';
}

export interface ScoreBreakdown {
    demographic: number;
    behavioral: number;
    firmographic: number;
    engagement: number;
    total: number;
    details: { rule: string; points: number }[];
}

// Default scoring rules
export const DEFAULT_SCORING_RULES: ScoringRule[] = [
    // Demographic (0-25 points)
    {
        id: 'demo_1',
        name: 'High-value country',
        field: 'country',
        condition: 'equals',
        value: ['United States', 'Germany', 'United Kingdom', 'France', 'Spain'],
        points: 10,
        category: 'demographic'
    },
    {
        id: 'demo_2',
        name: 'Industrial segment',
        field: 'segment',
        condition: 'equals',
        value: [Segment.INDUSTRIAL],
        points: 15,
        category: 'demographic'
    },

    // Behavioral (0-35 points)
    {
        id: 'behav_1',
        name: 'Qualified lead status',
        field: 'status',
        condition: 'equals',
        value: LeadStatus.Qualified,
        points: 20,
        category: 'behavioral'
    },
    {
        id: 'behav_2',
        name: 'Contacted lead status',
        field: 'status',
        condition: 'equals',
        value: LeadStatus.Contacted,
        points: 10,
        category: 'behavioral'
    },

    // Firmographic (0-20 points)
    {
        id: 'firm_1',
        name: 'Has company',
        field: 'company',
        condition: 'greater_than',
        value: '',
        points: 10,
        category: 'firmographic'
    },
    {
        id: 'firm_2',
        name: 'Referral source',
        field: 'source',
        condition: 'equals',
        value: LeadSource.Referral,
        points: 10,
        category: 'firmographic'
    },

    // Engagement (0-20 points)
    {
        id: 'engage_1',
        name: 'Has notes',
        field: 'notes',
        condition: 'greater_than',
        value: '',
        points: 5,
        category: 'engagement'
    },
    {
        id: 'engage_2',
        name: 'Recently updated',
        field: 'updated_at',
        condition: 'greater_than',
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        points: 15,
        category: 'engagement'
    }
];

function evaluateRule(lead: Lead, rule: ScoringRule): boolean {
    const fieldValue = lead[rule.field];

    switch (rule.condition) {
        case 'equals':
            if (Array.isArray(rule.value)) {
                return rule.value.includes(fieldValue);
            }
            return fieldValue === rule.value;

        case 'contains':
            return String(fieldValue || '').toLowerCase().includes(String(rule.value).toLowerCase());

        case 'greater_than':
            if (rule.field === 'updated_at' && fieldValue) {
                return new Date(fieldValue as string) > new Date(rule.value);
            }
            return String(fieldValue || '').length > String(rule.value).length;

        case 'less_than':
            if (rule.field === 'updated_at' && fieldValue) {
                return new Date(fieldValue as string) < new Date(rule.value);
            }
            return String(fieldValue || '').length < String(rule.value).length;

        case 'in_range':
            // For future use
            return false;

        default:
            return false;
    }
}

export function calculateLeadScore(lead: Lead, rules: ScoringRule[] = DEFAULT_SCORING_RULES): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
        demographic: 0,
        behavioral: 0,
        firmographic: 0,
        engagement: 0,
        total: 0,
        details: []
    };

    rules.forEach(rule => {
        if (evaluateRule(lead, rule)) {
            breakdown[rule.category] += rule.points;
            breakdown.total += rule.points;
            breakdown.details.push({
                rule: rule.name,
                points: rule.points
            });
        }
    });

    return breakdown;
}

export function getScoreColor(score: number): string {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
}

export function getScoreLabel(score: number): string {
    if (score >= 70) return 'Hot';
    if (score >= 40) return 'Warm';
    return 'Cold';
}

export function getScoreBadgeClasses(score: number): string {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold';

    if (score >= 70) {
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
    }
    if (score >= 40) {
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
    }
    return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
}
