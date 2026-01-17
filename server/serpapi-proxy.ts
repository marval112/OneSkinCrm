import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Supabase configuration
const supabaseUrl = 'https://mobyfwaiqixcaenijfim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYnlmd2FpcWl4Y2FlbmlqZmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYxMDEsImV4cCI6MjA3NzE4MjEwMX0.UNsesNWkcYKDntZMLgVtZwtXrFP8j0Se41UazP-7kOw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

async function getSerpApiKey(): Promise<string | null> {
    try {
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

// Proxy endpoint for SerpAPI
app.get('/api/serpapi', async (req, res) => {
    try {
        const apiKey = await getSerpApiKey();

        if (!apiKey) {
            console.error('❌ Failed to retrieve SERPAPI key');
            return res.status(500).json({ error: 'Configuration error: API key not found' });
        }

        const { engine, q, num, gl, hl } = req.query;

        const params = new URLSearchParams({
            engine: engine as string || 'google',
            q: q as string,
            api_key: apiKey,
            num: num as string || '10',
            ...(gl && { gl: gl as string }),
            ...(hl && { hl: hl as string })
        });

        console.log('🔍 Proxying SerpAPI request:', q);
        console.log('🔢 Requested num:', num);
        console.log('🔗 Constructed params:', params.toString());

        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data: any = await response.json();

        console.log('✅ SerpAPI response received, results:', data.organic_results?.length || 0);

        res.json(data);
    } catch (error) {
        console.error('❌ SerpAPI proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from SerpAPI' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SerpAPI Proxy running on http://localhost:${PORT}`);
});
