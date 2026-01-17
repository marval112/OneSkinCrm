import { Prospect } from './prospectingService';

// Use local proxy in development, Vercel serverless function in production
const SERPAPI_BASE_URL = import.meta.env.DEV
    ? 'http://localhost:3001/api/serpapi'
    : '/api/serpapi';

interface SerpAPIResult {
    title?: string;
    link?: string;
    snippet?: string;
    position?: number;
}

interface LinkedInProfile {
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    link?: string;
}

/**
 * Search for companies using Google Search via SerpAPI
 */
export async function searchCompaniesGoogle(query: string): Promise<Prospect[]> {
    try {
        const params = new URLSearchParams({
            engine: 'google',
            q: query,
            num: '100',
            gl: 'es', // Spain
            hl: 'en'
        });

        console.log('🔍 SerpAPI Google Search:', query);
        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

        console.log('📦 SerpAPI Response:', data);
        console.log('📊 Organic Results Count:', data.organic_results?.length || 0);

        if (!data.organic_results || data.organic_results.length === 0) {
            console.warn('⚠️ No organic results from SerpAPI');
            return [];
        }

        const prospects: Prospect[] = data.organic_results
            .filter((result: SerpAPIResult) => {
                const hasTitle = !!result.title;
                const hasLink = !!result.link;
                console.log('🔎 Filtering result:', { title: result.title, hasTitle, hasLink });
                return hasTitle && hasLink;
            })
            .map((result: SerpAPIResult, index: number) => {
                const domain = extractDomain(result.link || '');
                const companyName = cleanCompanyName(result.title || '');

                const prospect = {
                    id: `google-${index}-${Date.now()}`,
                    name: 'Contact',
                    company: companyName,
                    role: 'Decision Maker',
                    source: 'Google' as const,
                    matchScore: calculateMatchScore(result, query, index),
                    location: extractLocation(result.snippet || ''),
                    snippet: result.snippet || 'No description available',
                    website: domain,
                    email: `info@${domain}`
                };

                console.log('✅ Created prospect:', prospect.company);
                return prospect;
            })
            .slice(0, 100);

        console.log(`✨ Returning ${prospects.length} Google prospects`);
        return prospects;
    } catch (error) {
        console.error('❌ SerpAPI Google search error:', error);
        return [];
    }
}

/**
 * Search for LinkedIn profiles via SerpAPI
 */
export async function searchLinkedIn(query: string): Promise<Prospect[]> {
    try {
        const params = new URLSearchParams({
            engine: 'google',
            q: `site:linkedin.com/in ${query}`,
            num: '100'
        });

        console.log('🔍 SerpAPI LinkedIn Search:', query);
        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

        console.log('📦 LinkedIn Response:', data);

        if (!data.organic_results) {
            return [];
        }

        const prospects: Prospect[] = data.organic_results
            .filter((result: SerpAPIResult) => result.link?.includes('linkedin.com'))
            .map((result: SerpAPIResult, index: number) => {
                const profile = parseLinkedInResult(result);

                return {
                    id: `linkedin-${index}-${Date.now()}`,
                    name: profile.name || 'LinkedIn Contact',
                    company: profile.company || 'Company',
                    role: profile.title || 'Professional',
                    source: 'LinkedIn' as const,
                    matchScore: calculateMatchScore(result, query, index),
                    location: profile.location || 'Europe',
                    snippet: result.snippet || '',
                    website: extractDomain(profile.company || ''),
                    linkedinUrl: result.link
                };
            })
            .slice(0, 100);

        console.log(`✨ Returning ${prospects.length} LinkedIn prospects`);
        return prospects;
    } catch (error) {
        console.error('❌ SerpAPI LinkedIn search error:', error);
        return [];
    }
}

/**
 * Combined search using both Google and LinkedIn
 */
export async function searchProspectsReal(query: string, sources: string[]): Promise<Prospect[]> {
    const results: Prospect[] = [];

    console.log('🚀 Starting SerpAPI search:', { query, sources });

    try {
        // Run searches in parallel
        const promises: Promise<Prospect[]>[] = [];

        if (sources.includes('Google')) {
            promises.push(searchCompaniesGoogle(query));
        }

        if (sources.includes('LinkedIn')) {
            promises.push(searchLinkedIn(query));
        }

        const allResults = await Promise.all(promises);

        // Flatten and combine results
        allResults.forEach(resultSet => {
            results.push(...resultSet);
        });

        console.log(`🎯 Total prospects found: ${results.length}`);

        // Sort by match score
        return results.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
        console.error('❌ SerpAPI combined search error:', error);
        return [];
    }
}

// Helper functions

function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'company.com';
    }
}

function cleanCompanyName(title: string): string {
    // Remove common suffixes and clean up
    return title
        .replace(/\s*-\s*.*$/, '') // Remove everything after dash
        .replace(/\s*\|.*$/, '') // Remove everything after pipe
        .replace(/\s*(GmbH|S\.L\.|Ltd|Inc|Corp|AG|SA).*$/i, '') // Remove legal suffixes
        .trim();
}

function extractLocation(snippet: string): string {
    // Try to extract location from snippet
    const locationPatterns = [
        /in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+)/,
        /([A-Z][a-z]+,\s*(?:Spain|France|Germany|Italy|UK|Portugal))/i
    ];

    for (const pattern of locationPatterns) {
        const match = snippet.match(pattern);
        if (match) return match[1];
    }

    return 'Europe';
}

function calculateMatchScore(result: SerpAPIResult, query: string, position: number): number {
    // Higher score for top results
    let score = 95 - (position * 5);

    // Boost if query terms appear in title
    const queryTerms = query.toLowerCase().split(' ');
    const title = (result.title || '').toLowerCase();
    const matchingTerms = queryTerms.filter(term => title.includes(term)).length;
    score += matchingTerms * 2;

    // Ensure score is between 70-99
    return Math.max(70, Math.min(99, score));
}

function parseLinkedInResult(result: SerpAPIResult): LinkedInProfile {
    const title = result.title || '';
    const snippet = result.snippet || '';

    // Try to parse "Name - Title at Company"
    const nameMatch = title.match(/^([^-|]+)/);
    const titleMatch = title.match(/-\s*([^|]+)/);
    const companyMatch = snippet.match(/at\s+([^·•]+)/i);
    const locationMatch = snippet.match(/·\s*([^·•]+(?:,\s*[^·•]+)?)/);

    return {
        name: nameMatch ? nameMatch[1].trim() : undefined,
        title: titleMatch ? titleMatch[1].trim() : undefined,
        company: companyMatch ? companyMatch[1].trim() : undefined,
        location: locationMatch ? locationMatch[1].trim() : undefined,
        link: result.link
    };
}
