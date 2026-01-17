
import fetch from 'node-fetch';

async function verify() {
    console.log('Testing proxy server...');
    try {
        // Wait a bit for the server to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await fetch('http://localhost:3001/api/serpapi?q=Apple&num=1');

        if (response.ok) {
            const data: any = await response.json();
            console.log('✅ Proxy test successful!');
            console.log('Results found:', data.organic_results?.length || 0);
            if (data.error) {
                console.error('❌ Proxy returned error:', data.error);
            }
        } else {
            console.error('❌ Proxy request failed:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
        }
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

verify();
