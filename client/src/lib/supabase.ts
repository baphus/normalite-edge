import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Copy them from the Supabase dashboard under Project Settings → API.'
    );
}

/**
 * Browser Supabase client — the only thing that issues or refreshes tokens.
 *
 * The anon key is public by design: it identifies the project and grants
 * nothing on its own. The service_role key must never appear here.
 *
 * `detectSessionInUrl` lets this client complete the OAuth redirect and the
 * invite/recovery links, so no server-side callback route is needed.
 *
 * Sessions persist in localStorage (Supabase's default). This is a knowingly
 * accepted regression of SECURITY_AUDIT.md finding H7 — see the auth migration
 * plan, section 9.1 — mitigated by the absence of any HTML-injection sink in
 * this app and by the Content-Security-Policy shipped alongside it.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
    },
});

/** Where Google returns the user after a successful sign-in. */
export const OAUTH_REDIRECT_URL = `${window.location.origin}/auth/callback`;
