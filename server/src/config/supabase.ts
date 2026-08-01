import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase Admin client (service_role).
 *
 * This key bypasses row-level security and can provision, mutate, or delete
 * any identity in the project. It is server-only — it must never be imported
 * into client code, echoed in an API response, or logged.
 *
 * Session persistence is disabled: this client acts on behalf of the service,
 * never on behalf of a signed-in user.
 */
export const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);
