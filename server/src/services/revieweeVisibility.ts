/**
 * Track visibility for reviewee-facing list endpoints.
 *
 * Exams and decks answer the same question — "may this reviewee see this
 * record?" — and answered it two different ways. Exams read `trackId` off the
 * user row and always applied the restriction. Decks read a track *name* off
 * `req.user`, which never carries one, so the restriction was silently skipped
 * and every reviewee received every published deck. See the note on
 * `buildTrackVisibilityFilter` for why this file exists rather than the check
 * living inline in each service.
 *
 * These builders are pure so they can be tested without a database.
 */

/** A record with no track links is open to everyone — that is what "public" means here. */
type UntrackedClause = { trackLinks: { none: Record<string, never> } };
type TrackedClause = { trackLinks: { some: { trackId: string } } };

export type TrackVisibilityFilter = {
    OR: Array<UntrackedClause | TrackedClause>;
};

/**
 * The visibility predicate for a reviewee with the given track.
 *
 * The restriction is returned unconditionally. A reviewee with no track
 * (`null`) sees untracked records only — it must never widen to "everything",
 * which is the failure mode this replaces. Callers must not make applying the
 * result conditional on the track being present.
 */
export function buildTrackVisibilityFilter(trackId: string | null | undefined): TrackVisibilityFilter {
    const or: Array<UntrackedClause | TrackedClause> = [{ trackLinks: { none: {} } }];

    if (trackId) {
        or.push({ trackLinks: { some: { trackId } } });
    }

    return { OR: or };
}

export interface DeckListWhereParams {
    subject?: string;
    categoryId?: string;
    trackId?: string;
    search?: string;
    visibility?: string;
    createdBy?: string;
    /** True when the caller is a reviewee, who may only see published decks in their track. */
    revieweeOnlyPublished?: boolean;
    /** The reviewee's own track, read from the user row — not from token claims. */
    revieweeTrackId?: string | null;
}

/**
 * Builds the `where` for `listDecks`. Pure — no Prisma client, no I/O.
 */
export function buildDeckListWhere(params: DeckListWhereParams): Record<string, any> {
    const where: Record<string, any> = {};

    if (params.subject) where.subject = params.subject;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.trackId) {
        where.trackLinks = { some: { trackId: params.trackId } };
    }
    if (params.createdBy) where.createdBy = params.createdBy;

    if (params.visibility) {
        where.visibility = params.visibility;
    } else if (params.revieweeOnlyPublished) {
        where.visibility = 'PUBLISHED';
    }

    if (params.search) {
        where.OR = [
            { title: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
        ];
    }

    // Unconditional for reviewees. Gating this on the track being present is the
    // bug it replaces — an absent track must narrow the result set, never widen it.
    if (params.revieweeOnlyPublished) {
        where.AND = [...(where.AND || []), buildTrackVisibilityFilter(params.revieweeTrackId)];
    }

    return where;
}
