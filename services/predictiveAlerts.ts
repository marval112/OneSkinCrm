import type { Lead, Customer, Deal, Alert } from '../types';
import { CustomerStatus, LeadStatus, AlertType, AlertPriority, DealStage } from '../types';

// --- HELPERS ---
const daysSince = (dateString: string): number => {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// --- ALERT GENERATION LOGIC ---

/**
 * Hot leads: score > 70 && created < 7 days
 */
const findHotLeads = (leads: Lead[]): Alert[] => {
  return leads
    .filter(lead => lead.score > 70 && daysSince(lead.created_at) < 7 && lead.status === LeadStatus.New)
    .map(lead => ({
      id: `hot-${lead.id}`,
      type: AlertType.HOT_LEAD,
      priority: AlertPriority.HIGH,
      message: `High-potential lead: ${lead.name} (Score: ${lead.score}).`,
      recommendation: `Prioritize immediate follow-up within 24 hours to capitalize on strong interest.`,
      relatedEntityId: lead.id,
      relatedEntityName: lead.name,
    }));
};

/**
 * Churn risk: last_contact > 30 days && health_score < 40
 */
const findChurnRisks = (customers: Customer[]): Alert[] => {
  return customers
    .filter(c => c.status === CustomerStatus.Active && daysSince(c.last_contact) > 30 && c.health_score < 40)
    .map(customer => ({
      id: `churn-${customer.id}`,
      type: AlertType.CHURN_RISK,
      priority: AlertPriority.HIGH,
      message: `${customer.name} is at high risk of churning (Health: ${customer.health_score}).`,
      recommendation: `Last contact was ${daysSince(customer.last_contact)} days ago. Schedule a check-in call immediately.`,
      relatedEntityId: customer.id,
      relatedEntityName: customer.name,
    }));
};

/**
 * Stale deals: same stage > 14 days
 */
const findStaleDeals = (deals: Deal[]): Alert[] => {
    const activeStages = [DealStage.QUALIFICATION, DealStage.PROPOSAL, DealStage.NEGOTIATION];
    return deals
      .filter(d => activeStages.includes(d.status) && daysSince(d.updated_at) > 14)
      .map(deal => ({
        id: `stale-${deal.id}`,
        type: AlertType.STALE_DEAL,
        priority: AlertPriority.MEDIUM,
        message: `Deal "${deal.title}" has been in ${deal.status} for over 14 days.`,
        recommendation: `Review the deal and plan the next action to move it forward.`,
        relatedEntityId: deal.id,
        relatedEntityName: deal.title,
      }));
};

/**
 * Follow-up needed: no activity > 3 days for new/contacted leads
 */
const findFollowUpNeeded = (leads: Lead[]): Alert[] => {
    const relevantStages = [LeadStatus.New, LeadStatus.Contacted];
    // FIX: Changed property from non-existent 'last_activity_date' to 'updated_at' to track activity.
    return leads
      .filter(l => relevantStages.includes(l.status) && daysSince(l.updated_at) > 3)
      .map(lead => ({
        id: `followup-${lead.id}`,
        type: AlertType.FOLLOW_UP_NEEDED,
        priority: AlertPriority.MEDIUM,
        message: `No activity recorded for ${lead.name} in over 3 days.`,
        recommendation: `Engage with this lead now to maintain momentum.`,
        relatedEntityId: lead.id,
        relatedEntityName: lead.name,
      }));
};


/**
 * Main orchestrator function to generate all predictive alerts.
 */
export const generateAlertRecommendations = async (leads: Lead[], customers: Customer[], deals: Deal[]): Promise<Alert[]> => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async work

    const hotLeads = findHotLeads(leads);
    const churnAlerts = findChurnRisks(customers);
    const staleDeals = findStaleDeals(deals);
    const followUps = findFollowUpNeeded(leads);

    const allAlerts = [...hotLeads, ...churnAlerts, ...staleDeals, ...followUps];
    
    // Sort alerts by priority: High > Medium > Low
    const priorityOrder = { [AlertPriority.HIGH]: 1, [AlertPriority.MEDIUM]: 2, [AlertPriority.LOW]: 3 };
    allAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return allAlerts;
};