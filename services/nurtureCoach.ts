import type { User, Lead } from '../types';
import { getLeads } from './crmService';
import { suggestLeadTasks, summarizeLead } from './geminiService';
import { addAutomationAlert } from './alertsService';

function daysBetween(iso: string): number {
  try { return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000)); } catch { return 0; }
}

export async function runNurtureCoach(user: User): Promise<void> {
  try {
    const leads = await getLeads(user);
    // Heuristic: candidates with status not Won/Lost, score >= 60, stale (updated > 7d)
    const candidates = leads
      .filter(l => !['Won', 'Lost'].includes(String(l.status)))
      .filter(l => (l.score ?? 0) >= 60)
      .filter(l => daysBetween(l.updated_at) >= 7)
      .slice(0, 2);

    for (const lead of candidates) {
      // Ask AI for brief suggestion
      let suggestion = '';
      try {
        const tasks = await suggestLeadTasks(lead as any, []);
        if (tasks && tasks.length > 0) {
          suggestion = `Try: ${tasks.map((t: any) => t.title || t.type).slice(0, 2).join(' • ')}`;
        } else {
          const sum = await summarizeLead(lead as any, []);
          suggestion = sum?.split('\n').slice(0, 2).join(' ') || 'Re-engage this lead with a concise value email.';
        }
      } catch { }

      await addAutomationAlert({
        type: 'follow_up_needed' as any,
        priority: (daysBetween(lead.updated_at) >= 14 ? 'High' : 'Medium') as any,
        message: `AI Nurture for ${lead.name}: ${suggestion}`,
        recommendation: 'Open Alerts to apply the suggestion or create tasks.',
        relatedEntityId: lead.id,
        relatedEntityName: lead.name,
        rule_title: 'AI Nurture Coach'
      } as any);

      // Fire in-app nudge event ONLY if suggestion is valid
      if (suggestion && !suggestion.includes('Could not') && !suggestion.includes('error')) {
        try {
          window.dispatchEvent(new CustomEvent('ai:nudge', { detail: { leadId: lead.id, name: lead.name, message: suggestion } }));
        } catch { }
      }
    }
  } catch (e) {
    // Ignore failures to avoid interrupting user
    console.warn('[nurture-coach] failed', e);
  }
}


