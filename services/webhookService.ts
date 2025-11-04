

import type { Webhook } from '../types';
import { WebhookEvent } from '../types';
import * as db from './databaseService';

export const getWebhooks = async (): Promise<Webhook[]> => {
    return db.getAll<Webhook>('webhooks');
};

export const createWebhook = async (data: Omit<Webhook, 'id' | 'last_triggered'>): Promise<Webhook> => {
    const newWebhookData = {
        ...data,
        last_triggered: null
    };
    return db.create<Webhook>('webhooks', newWebhookData as Omit<Webhook, 'id'>);
};

export const updateWebhook = async (updatedWebhook: Webhook): Promise<Webhook> => {
    return db.update<Webhook>('webhooks', updatedWebhook);
};

export const deleteWebhook = async (webhookId: number): Promise<void> => {
    return db.remove('webhooks', webhookId);
};

// This function would be called internally by other services (e.g., crmService)
export const triggerWebhooks = async (event: WebhookEvent, payload: any): Promise<void> => {
    const allWebhooks = await getWebhooks();
    // Fix: Changed property from `isActive` to `active` to match the Webhook type.
    const relevantWebhooks = allWebhooks.filter(w => w.active && w.events.includes(event));
    
    console.log(`[WEBHOOKS] Triggering ${relevantWebhooks.length} webhooks for event: ${event}`);

    for (const webhook of relevantWebhooks) {
        console.log(`[WEBHOOKS] Firing POST to ${webhook.url} with payload:`, payload);
        // In a real app, you'd use fetch() here and handle response/retry logic.
        webhook.last_triggered = new Date().toISOString();
        await updateWebhook(webhook);
    }
};