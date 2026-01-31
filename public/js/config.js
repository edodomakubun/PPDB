// Supabase Configuration
const SUPABASE_URL = 'https://hcnelzmhlweubyvsdkwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbmVsem1obHdldWJ5dnNka3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzIzNzUsImV4cCI6MjA4NTQ0ODM3NX0.We_4uaYj4BUuaRg-sS-heYx0Q3g47c-M63rnhNT3wEc';

// Initialize Supabase Client
// We use 'supabaseClient' to avoid conflict with the global 'supabase' library variable
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
