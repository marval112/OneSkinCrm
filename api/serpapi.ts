// Vercel Serverless Function: /api/serpapi
// Proxy for SerpAPI requests with API key fetched from Supabase

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mobyfwaiqixcaenijfim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYnlmd2FpcWl4Y2FlbmlqZmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYxMDEsImV4cCI6MjA3NzE4MjEwMX0.UNsesNWkcYKDntZMLgVtZwtXrFP8j0Se41UazP-7kOw';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

async function getSerpApiKey(): Promise<string | null> {
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase
            .from('secure_settings')
            .select('value')
            .eq('key', 'VITE_SERPAPI_KEY')
            .single();

        if (error) {
            console.error('❌ Error fetching SERPAPI key from Supabase:', error);
            return null;
        }

        return data?.value || null;
    } catch (error) {
        console.error('❌ Unexpected error fetching SERPAPI key:', error);
        return null;
    }
}

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = await getSerpApiKey();

        if (!apiKey) {
            console.error('❌ Failed to retrieve SERPAPI key');
            return res.status(500).json({ error: 'Configuration error: API key not found' });
        }

        const { engine, q, num, gl, hl } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Missing required parameter: q' });
        }

        const params = new URLSearchParams({
            engine: (engine as string) || 'google',
            q: q as string,
            api_key: apiKey,
            num: (num as string) || '10',
            ...(gl && { gl: gl as string }),
            ...(hl && { hl: hl as string })
        });

        console.log('🔍 Proxying SerpAPI request:', q);
        console.log('🔢 Requested num:', num);

        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data: any = await response.json();

        console.log('✅ SerpAPI response received, results:', data.organic_results?.length || 0);

        return res.status(200).json(data);
    } catch (error: any) {
        console.error('❌ SerpAPI proxy error:', error);
        return res.status(500).json({ error: 'Failed to fetch from SerpAPI', message: error?.message });
    }
}
