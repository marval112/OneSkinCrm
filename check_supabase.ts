
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mobyfwaiqixcaenijfim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYnlmd2FpcWl4Y2FlbmlqZmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYxMDEsImV4cCI6MjA3NzE4MjEwMX0.UNsesNWkcYKDntZMLgVtZwtXrFP8j0Se41UazP-7kOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking secure_settings table...');
    const { data, error } = await supabase
        .from('secure_settings')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
    }
}

check();
