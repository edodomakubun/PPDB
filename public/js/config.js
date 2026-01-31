// Supabase Configuration
const SUPABASE_URL = 'https://hcnelzmhlweubyvsdkwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbmVsem1obHdldWJ5dnNka3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzIzNzUsImV4cCI6MjA4NTQ0ODM3NX0.We_4uaYj4BUuaRg-sS-heYx0Q3g47c-M63rnhNT3wEc';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Helpers ---

/**
 * Log Admin Activity to 'audit_logs' table
 * @param {string} action - Short description of action (e.g., 'UPDATE_STATUS')
 * @param {string} details - Detailed info (e.g., 'Updated status for NIK 123 to Accepted')
 */
async function logActivity(action, details) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return; // No session, cannot log (or public action)

        const userEmail = session.user.email;

        await supabaseClient.from('audit_logs').insert([{
            admin_email: userEmail,
            action: action,
            details: details
        }]);
    } catch (err) {
        console.warn('Audit Log Error:', err);
    }
}
