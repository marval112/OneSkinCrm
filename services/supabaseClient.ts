
import { createClient } from '@supabase/supabase-js';

// --- Supabase Credentials ---
// In a real-world scenario, these should be in environment variables.
// For this environment, we are setting them directly as provided.
const supabaseUrl = 'https://mobyfwaiqixcaenijfim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vYnlmd2FpcWl4Y2FlbmlqZmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYxMDEsImV4cCI6MjA3NzE4MjEwMX0.UNsesNWkcYKDntZMLgVtZwtXrFP8j0Se41UazP-7kOw';

// --- Client Initialization ---

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase URL or Anon Key is missing. Credentials must be provided.";
  console.error(errorMessage);
  // Display a visible error in the app for easier debugging if credentials are removed.
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca;">
      <h1 style="font-size: 1.25rem; font-weight: bold;">Configuration Error</h1>
      <p>${errorMessage}</p>
      <p style="margin-top: 1rem; font-size: 0.875rem;">Please contact an administrator to configure the database credentials.</p>
    </div>`;
  }
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
