/**
 * Hostnames we will accept an avatar from.
 *
 * This allowlist is a security control, not a convenience. The source URL
 * originates from the Supabase token's `user_metadata`, which the user can
 * write to themselves — so without a restriction, any account could point this
 * at an internal address (cloud metadata endpoints, private services) and turn
 * the API into an SSRF proxy. Google is the only provider we import from.
 */
const ALLOWED_AVATAR_HOSTS = ['googleusercontent.com'];

const isAllowedHost = (hostname: string): boolean =>
    ALLOWED_AVATAR_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

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

        if (url.protocol !== 'https:' || !isAllowedHost(url.hostname)) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}
