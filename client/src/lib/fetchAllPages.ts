import type { AxiosResponse } from 'axios';

/**
 * The managed list endpoints are paginated server-side. The dashboards filter and
 * sort client-side, so they need the whole set — previously they requested a single
 * page of 100 and silently dropped everything beyond it.
 *
 * `maxPages` is a runaway guard, not a product limit; when it trips the caller can
 * tell the difference via `truncated`.
 *
 * Completion is decided from the server's `meta.totalPages` whenever it is present,
 * and only falls back to "this page came back short" when it is not.
 *
 * That distinction is load-bearing. `parsePagination` clamps `limit` to
 * MAX_PAGE_SIZE (100), so a caller asking for 200 receives 100 — and a short-page
 * test would read that as the end of the list and silently discard every record
 * beyond the first hundred. The short page is evidence of the end only when we
 * asked for no more than the server was willing to give. `meta.limit` is therefore
 * preferred over the requested limit when deciding what "short" means.
 */
export interface FetchAllPagesResult<T> {
    items: T[];
    truncated: boolean;
}

export function extractListPayload<T>(response: AxiosResponse): T[] {
    const payload = response.data?.data;
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.items)) return payload.items as T[];
    return [];
}

export async function fetchAllPages<T>(
    request: (page: number, limit: number) => Promise<AxiosResponse>,
    options?: { limit?: number; maxPages?: number },
): Promise<FetchAllPagesResult<T>> {
    const requestedLimit = options?.limit ?? 100;
    const maxPages = options?.maxPages ?? 50;

    const items: T[] = [];
    let page = 1;
    let totalPages: number | null = null;

    while (page <= maxPages) {
        const response = await request(page, requestedLimit);
        const pageItems = extractListPayload<T>(response);
        items.push(...pageItems);

        const meta = response.data?.meta as { totalPages?: number; limit?: number } | undefined;
        const reportedTotalPages = Number(meta?.totalPages);
        if (Number.isFinite(reportedTotalPages) && reportedTotalPages > 0) {
            totalPages = reportedTotalPages;
        }

        // An empty page always ends the walk, whatever the metadata claims —
        // otherwise a bad total would spin until maxPages.
        if (pageItems.length === 0) {
            return { items, truncated: false };
        }

        if (totalPages !== null) {
            if (page >= totalPages) return { items, truncated: false };
        } else {
            // No authoritative total: fall back to the short-page test, measured
            // against what the server said it would serve, not what we asked for.
            const servedLimit = Number(meta?.limit) || requestedLimit;
            if (pageItems.length < servedLimit) return { items, truncated: false };
        }

        page += 1;
    }

    return { items, truncated: true };
}
