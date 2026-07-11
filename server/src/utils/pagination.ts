/**
 * Parse and clamp pagination parameters.
 * Enforces upper bounds to prevent denial-of-service via excessive queries.
 */

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export function parsePagination(query: { page?: string; limit?: string }) {
    const page = query.page ? Math.max(1, parseInt(query.page, 10) || 1) : 1;
    const rawLimit = query.limit ? parseInt(query.limit, 10) : DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(1, rawLimit || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

    return { page, limit };
}
