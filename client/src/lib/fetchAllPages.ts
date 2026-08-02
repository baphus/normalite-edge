import type { AxiosResponse } from 'axios';

/**
 * The managed list endpoints are paginated server-side. The dashboards filter and
 * sort client-side, so they need the whole set — previously they requested a single
 * page of 100 and silently dropped everything beyond it.
 *
 * Walks pages until one comes back short, so the caller always gets the full list.
 * `maxPages` is a runaway guard, not a product limit; when it trips the caller can
 * tell the difference via `truncated`.
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
    const limit = options?.limit ?? 100;
    const maxPages = options?.maxPages ?? 50;

    const items: T[] = [];
    let page = 1;

    while (page <= maxPages) {
        const response = await request(page, limit);
        const pageItems = extractListPayload<T>(response);
        items.push(...pageItems);

        if (pageItems.length < limit) {
            return { items, truncated: false };
        }
        page += 1;
    }

    return { items, truncated: true };
}
