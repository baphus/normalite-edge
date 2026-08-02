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

/** Our own upload bucket — where a picture the user uploaded lands. */
const UPLOAD_BUCKET_HOST = 'res.cloudinary.com';

/**
 * Avatars are served from subdomains (`lh3.`, `lh4.`, …), never the apex. Both
 * predicates match the `imgSrc` CSP directive in `app.ts` exactly — `*.google‑
 * usercontent.com` and the literal bucket host — so a URL we would refuse to
 * render is a URL we refuse to store.
 */
const isProviderAvatarHost = (hostname: string): boolean =>
    ALLOWED_AVATAR_HOSTS.some((host) => hostname.endsWith(`.${host}`));

const isUploadBucketHost = (hostname: string): boolean => hostname === UPLOAD_BUCKET_HOST;

/**
 * `URL.hostname` drops any `user:pass@` prefix, so a host check alone would
 * accept `https://evil.test@lh3.googleusercontent.com/…` and then persist the
 * credentials when the URL is serialized back out.
 */
const hasEmbeddedCredentials = (url: URL): boolean => Boolean(url.username || url.password);

/**
 * A CSP host-source with no port matches only the scheme's default, so an
 * explicit port would be stored and then refused at render time. `URL.port` is
 * empty when the port is absent or is the default for the scheme.
 */
const hasExplicitPort = (url: URL): boolean => url.port !== '';

/**
 * Google serves an avatar at any size from the same URL, selected by a trailing
 * `=s<N>-c` directive on the *path*. The token typically carries `=s96-c`,
 * which is soft when rendered at 96 CSS pixels on a 2x display.
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

        if (
            url.protocol !== 'https:'
            || hasEmbeddedCredentials(url)
            || hasExplicitPort(url)
            || !isProviderAvatarHost(url.hostname)
        ) {
            return null;
        }

        // Scoped to the path: rewriting the serialized URL would miss the
        // directive whenever a query or fragment follows it, and could mangle
        // a query value that happens to look like one.
        url.pathname = url.pathname.replace(GOOGLE_SIZE_DIRECTIVE, `=${PREFERRED_AVATAR_SIZE}`);

        return url.toString();
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

        return url.protocol === 'https:'
            && !hasEmbeddedCredentials(url)
            && !hasExplicitPort(url)
            && (isUploadBucketHost(url.hostname) || isProviderAvatarHost(url.hostname));
    } catch {
        return false;
    }
}
