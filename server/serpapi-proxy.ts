import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const SERPAPI_KEY = '2fbbca43f1b9c5a650d93dd85e5ed07a1df02cfb2571ab0ff6674318227f11b4';
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

// Proxy endpoint for SerpAPI
app.get('/api/serpapi', async (req, res) => {
    try {
        const { engine, q, num, gl, hl } = req.query;

        const params = new URLSearchParams({
            engine: engine as string || 'google',
            q: q as string,
            api_key: SERPAPI_KEY,
            num: num as string || '10',
            ...(gl && { gl: gl as string }),
            ...(hl && { hl: hl as string })
        });

        console.log('🔍 Proxying SerpAPI request:', q);

        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

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
