import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { ApiError } from './ApiError';

/**
 * The verified identity carried by a Supabase access token.
 * This says only "Supabase authenticated this person" — it grants no
 * application access on its own. Authorization comes from the matching
 * `public.users` row (see middleware/authenticate.ts).
 */
export interface SupabaseIdentity {
    /** auth.users.id — also the primary key of the matching public.users row. */
    id: string;
    email: string;
    /** Sign-in provider, e.g. 'google' or 'email'. */
    provider: string | null;
    /** Display name supplied by the provider, when present. */
    fullName: string | null;
    /** Avatar URL supplied by the provider, when present. */
    pictureUrl: string | null;
}

/**
 * Remote JWKS, fetched from the Supabase project's public endpoint and cached
 * by `jose`. Using asymmetric verification means no shared JWT secret has to
 * be stored in this service's environment, and Supabase can rotate its signing
 * key without a redeploy.
 *
 * Requires the Supabase project to be using asymmetric JWT signing keys. A
 * project still on the legacy shared-secret (HS256) setting will fail every
 * verification here until it is migrated.
 */
const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value : null;

/**
 * Verify a Supabase-issued access token and extract the identity claims.
 * Throws 401 for anything that does not verify cleanly.
 */
export async function verifySupabaseAccessToken(token: string): Promise<SupabaseIdentity> {
    let claims: Record<string, unknown>;

    try {
        const { payload } = await jwtVerify(token, jwks, {
            issuer: env.SUPABASE_JWT_ISSUER,
            audience: 'authenticated',
        });
        claims = payload as Record<string, unknown>;
    } catch {
        // Covers bad signature, wrong key, expired, wrong issuer/audience, and
        // algorithm mismatch. Deliberately not surfacing which — the client has
        // no legitimate use for the distinction.
        throw ApiError.unauthorized('Invalid or expired access token');
    }

    const id = asString(claims.sub);
    const email = asString(claims.email)?.toLowerCase() ?? null;

    if (!id || !email) {
        throw ApiError.unauthorized('Access token is missing required identity claims');
    }

    const appMetadata = (claims.app_metadata ?? {}) as Record<string, unknown>;
    const userMetadata = (claims.user_metadata ?? {}) as Record<string, unknown>;

    return {
        id,
        email,
        provider: asString(appMetadata.provider),
        // user_metadata is user-writable, so these are treated strictly as
        // display hints. Nothing security-relevant is ever read from it.
        fullName: asString(userMetadata.full_name) ?? asString(userMetadata.name),
        pictureUrl: asString(userMetadata.avatar_url) ?? asString(userMetadata.picture),
    };
}
