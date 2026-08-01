import { cloudinaryService } from '../services/cloudinary.service';

/**
 * Hostnames we will fetch an avatar from.
 *
 * This allowlist is a security control, not a convenience. The source URL
 * originates from the Supabase token's `user_metadata`, which the user can
 * write to themselves — so without a restriction, any account could point this
 * at an internal address (cloud metadata endpoints, private services) and turn
 * the API into an SSRF proxy. Google is the only provider we import from.
 */
const ALLOWED_AVATAR_HOSTS = ['googleusercontent.com'];

const ALLOWED_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

const isAllowedHost = (hostname: string): boolean =>
    ALLOWED_AVATAR_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

/**
 * Copy a provider-hosted avatar into Cloudinary and return the stored URL.
 *
 * Copying rather than hot-linking keeps the image available after the provider
 * rotates or removes it, avoids sending every page view to Google, and means a
 * strict CSP does not need to allowlist an external image host.
 *
 * Best-effort by design: returns null on any failure so that registration is
 * never blocked by an avatar problem.
 */
export async function importRemoteAvatar(sourceUrl: string): Promise<string | null> {
    try {
        const url = new URL(sourceUrl);

        if (url.protocol !== 'https:' || !isAllowedHost(url.hostname)) {
            return null;
        }

        const response = await fetch(url, {
            redirect: 'error',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) return null;

        const contentType = (response.headers.get('content-type') || '')
            .split(';')[0]
            .trim()
            .toLowerCase();

        if (!ALLOWED_CONTENT_TYPES.has(contentType)) return null;

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) return null;

        const dataUrl = `data:${contentType};base64,${bytes.toString('base64')}`;
        const { secureUrl } = await cloudinaryService.uploadImage(dataUrl, 'profile-pics');

        return secureUrl || null;
    } catch {
        return null;
    }
}
