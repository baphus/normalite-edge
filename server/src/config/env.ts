import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// ─── Startup Validation ────────────────────────────────
// Crash immediately if critical secrets are missing in production
if (isProduction) {
    const requiredSecrets = [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
    ] as const;
    const missing = requiredSecrets.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `FATAL: Missing required environment variables in production: ${missing.join(', ')}. ` +
            'The application cannot start without these values.'
        );
    }
}

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    HOST: process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1'),
    DATABASE_URL: process.env.DATABASE_URL!,
    DIRECT_URL: process.env.DIRECT_URL || '',

    // ─── Supabase Auth ─────────────────────────────────
    // SUPABASE_SERVICE_ROLE_KEY bypasses row-level security and can provision
    // or delete any identity. Server-only: it must never reach the browser
    // bundle or source control.
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    // Public JWKS endpoint for verifying access tokens against the project's
    // asymmetric signing key — no shared secret needed.
    SUPABASE_JWKS_URL: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    // Expected `iss` claim on every Supabase-issued access token.
    SUPABASE_JWT_ISSUER: `${supabaseUrl}/auth/v1`,

    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
};

/** Domain whose accounts authenticate exclusively through Google SSO. */
export const INTERNAL_EMAIL_DOMAIN = 'cnu.edu.ph';

/**
 * True when the address belongs to the institution's Google Workspace.
 *
 * This decides authorization, not just presentation, so it insists on a
 * well-formed address rather than merely a matching suffix. A bare
 * `endsWith('@cnu.edu.ph')` also accepted `attacker@evil.com @cnu.edu.ph`,
 * which is only a suffix match away from being treated as internal.
 */
export const isInternalEmail = (email: string): boolean => {
    const normalized = email.trim().toLowerCase();
    const at = normalized.indexOf('@');

    return at > 0
        && normalized.indexOf('@', at + 1) === -1
        && !/\s/.test(normalized)
        && normalized.slice(at + 1) === INTERNAL_EMAIL_DOMAIN;
};
