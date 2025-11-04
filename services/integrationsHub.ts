
import type { Integration } from '../types';
import * as db from './databaseService';

// Fix: Add the required 'config' property to each integration object.
const availableIntegrations: Omit<Integration, 'status'>[] = [
    { id: 'mailchimp', name: 'Mailchimp', description: 'Sync contacts for email marketing.', logo: 'https://static.mailchimp.com/brand/brand-assets/logo-mc-flatten-1200.png', config: {} },
    { id: 'slack', name: 'Slack', description: 'Get CRM notifications in your channels.', logo: 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png', config: {} },
    { id: 'g-sheets', name: 'Google Sheets', description: 'Export CRM data directly to Sheets.', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/1200px-Google_Sheets_logo_%282014-2020%29.svg.png', config: {} },
    { id: 'whatsapp', name: 'WhatsApp Business', description: 'Engage with customers on WhatsApp.', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2044px-WhatsApp.svg.png', config: {} },
    { id: 'zapier', name: 'Zapier', description: 'Connect to thousands of other apps.', logo: 'https://cdn.zapier.com/zapier/images/releases/0b8f4f10-1311-493d-9d32-d85c63d59646.png', config: {} },
    { id: 'dynamics', name: 'MS Dynamics 365', description: 'Sync data with Microsoft Dynamics.', logo: 'https://www.logo.wine/a/logo/Microsoft_Dynamics_365/Microsoft_Dynamics_365-Logo.wine.svg', config: {} },
    { id: 'sap', name: 'SAP', description: 'Integrate with your SAP ERP.', logo: 'https://1000logos.net/wp-content/uploads/2017/12/SAP-Logo.png', config: {} },
    { id: 'odoo', name: 'Odoo', description: 'Connect with your Odoo business apps.', logo: 'https://www.odoo.com/img/assets/odoo_logo_positive.svg', config: {} },
];

const TABLE = 'connected_integrations';

export const getIntegrations = async (): Promise<Integration[]> => {
    // Supabase table `connected_integrations` should have one column: `id` (text, primary key)
    const connected = await db.getAll<{ id: string }>(TABLE);
    const connectedIds = new Set(connected.map(c => c.id));
    
    const integrations = availableIntegrations.map(int => ({
        ...int,
        status: connectedIds.has(int.id) ? 'connected' : 'disconnected',
    } as Integration));
    return integrations;
};

export const connectIntegration = async (id: string): Promise<void> => {
    // Simulate OAuth flow or API key exchange
    await new Promise(resolve => setTimeout(resolve, 1000));
    // The primary key `id` is the integration name string
    await db.create(TABLE, { id });
};

export const disconnectIntegration = async (id: string): Promise<void> => {
    await db.remove(TABLE, id);
};
