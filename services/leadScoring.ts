import { Lead, LeadSource } from '../types';

const sourceScores: Record<LeadSource, number> = {
    [LeadSource.Referral]: 30,
    [LeadSource.TradeShow]: 25,
    [LeadSource.Website]: 20,
    [LeadSource.Organic]: 20,
    [LeadSource.OnlineAd]: 10,
    [LeadSource.Paid]: 10,
    [LeadSource.ColdCall]: 5,
};

const daysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculates a lead score based on a set of rules.
 * @param lead The lead object to score.
 * @returns A score between 0 and 100.
 */
export const calculateLeadScore = (lead: Lead): number => {
    let score = 0;

    // 1. Source Score (up to 30 points)
    score += sourceScores[lead.source] || 0;

    // 2. Engagement Score (up to 30 points) - using mock data as it's not in DB
    const engagement = lead.engagement || { email_opens: Math.floor(Math.random() * 5), clicks: Math.floor(Math.random() * 2) };
    let engagementScore = (engagement.email_opens * 3) + (engagement.clicks * 5);
    score += Math.min(engagementScore, 30);
    
    // 3. Demographic Score (up to 30 points) - using mock data
    // In a real app, this would involve lookups or pattern matching
    if (lead.company?.toLowerCase().includes('studios') || lead.company?.toLowerCase().includes('arch')) {
        score += 20;
    }
    if (lead.email?.includes('.es') || lead.email?.includes('.com')) {
        score += 5;
    }
    if (lead.country?.toLowerCase() === 'spain' || lead.country?.toLowerCase() === 'usa') {
        score += 5;
    }

    // 4. Time Decay (negative points)
    const daysOld = daysSince(lead.created_at || new Date().toISOString());
    if (daysOld > 30) {
        score -= 15;
    } else if (daysOld > 7) {
        score -= 5;
    }

    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
};