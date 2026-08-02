/**
 * Hostnames we will import a provider avatar from.
 *
 * This allowlist is a security control, not a convenience. The source URL
 * originates from the Supabase token's `user_metadata`, which the user can
 * write to themselves — so without a restriction, any account could point this
 * at an internal address (cloud metadata endpoints, private services) and turn
 * the API into an SSRF proxy. Google is the only provider we import from.
 */
const ALLOWED_AVATAR_HOSTS = ['googleusercontent.com'];

/**
 * Hostnames an avatar may be *stored* from.
 *
 * Wider than the import allowlist by exactly one entry: our own Cloudinary
 * bucket, which is where a user's uploaded picture lands. Deliberately mirrors
 * the `imgSrc` CSP directive in `app.ts` — a URL we would refuse to render is a
 * URL we should refuse to store.
 */
const ALLOWED_STORED_AVATAR_HOSTS = [...ALLOWED_AVATAR_HOSTS, 'res.cloudinary.com'];

const matchesHost = (hostname: string, allowed: string[]): boolean =>
    allowed.some((host) => hostname === host || hostname.endsWith(`.${host}`));

/**
 * Google serves an avatar at any size from the same URL, selected by a trailing
 * `=s<N>-c` directive. The token typically carries `=s96-c`, which is soft when
 * rendered at 96 CSS pixels on a 2x display.
 */
const GOOGLE_SIZE_DIRECTIVE = /=s\d+-c$/;
const PREFERRED_AVATAR_SIZE = 's256-c';

/**
 * Validate and return a provider-hosted avatar URL for direct use.
 *
 * The URL is validated against an allowlist to prevent SSRF. We store the
 * Google-hosted URL directly instead of copying to Cloudinary, keeping things
 * simple — Google avatar URLs are stable and publicly accessible.
 *
 * Best-effort by design: returns null on any failure so that registration is
 * never blocked by an avatar problem.
 */
export function importRemoteAvatar(sourceUrl: string): string | null {
    try {
        const url = new URL(sourceUrl);

        if (url.protocol !== 'https:' || !matchesHost(url.hostname, ALLOWED_AVATAR_HOSTS)) {
            return null;
        }

        // Only ever applied to a URL already proven to be Google-hosted.
        return url.toString().replace(GOOGLE_SIZE_DIRECTIVE, `=${PREFERRED_AVATAR_SIZE}`);
    } catch {
        return null;
    }
}

/**
 * Whether a client-supplied avatar URL may be persisted.
 *
 * A stored avatar is rendered back to other people — reviewers and admins see
 * it in user management — so an unconstrained URL here is a stored-content and
 * tracking-pixel vector, not merely a cosmetic concern. Only our own upload
 * bucket and the provider's own host qualify.
 */
export function isStorableAvatarUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && matchesHost(url.hostname, ALLOWED_STORED_AVATAR_HOSTS);
    } catch {
        return false;
    }
}
