import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeckListWhere, buildTrackVisibilityFilter } from '../services/revieweeVisibility';

/**
 * `GET /decks` scoped reviewees to their track only when a track *name* was
 * present on `req.user`. `authenticate` builds `req.user` from four fields —
 * userId, role, status, email — and none of them is a track, so the condition
 * was never true and the restriction was never applied: every reviewee received
 * every published deck in every track. Three `as any` casts in the controller
 * kept the type checker from noticing.
 *
 * The rule these tests pin down is that the restriction is unconditional. A
 * reviewee with no track sees untracked decks only; it must never widen to
 * "everything". Exams already worked this way (exam.service reads trackId from
 * the user row), which is the shape adopted here.
 *
 * The builders are pure, so this needs no database.
 */

const REVIEWEE_TRACK = '11111111-1111-1111-1111-111111111111';

/** The track predicate, wherever it ended up in the AND stack. */
function trackFilterOf(where: Record<string, any>) {
    const and: any[] = where.AND || [];
    return and.find((clause) => Array.isArray(clause?.OR) && clause.OR.some((o: any) => o?.trackLinks));
}

describe('buildTrackVisibilityFilter', () => {
    it('always allows decks with no track links', () => {
        const filter = buildTrackVisibilityFilter(REVIEWEE_TRACK);
        assert.deepEqual(filter.OR[0], { trackLinks: { none: {} } });
    });

    it('matches the reviewee track by id, not by name or code', () => {
        const filter = buildTrackVisibilityFilter(REVIEWEE_TRACK);
        assert.deepEqual(filter.OR[1], { trackLinks: { some: { trackId: REVIEWEE_TRACK } } });
    });

    it('narrows to untracked records when the reviewee has no track', () => {
        const filter = buildTrackVisibilityFilter(null);
        assert.equal(filter.OR.length, 1);
        assert.deepEqual(filter.OR[0], { trackLinks: { none: {} } });
    });
});

describe('buildDeckListWhere — reviewee scoping', () => {
    it('restricts a reviewee to published decks', () => {
        const where = buildDeckListWhere({ revieweeOnlyPublished: true, revieweeTrackId: REVIEWEE_TRACK });
        assert.equal(where.visibility, 'PUBLISHED');
    });

    it('applies the track restriction for a reviewee with a track', () => {
        const where = buildDeckListWhere({ revieweeOnlyPublished: true, revieweeTrackId: REVIEWEE_TRACK });
        const filter = trackFilterOf(where);
        assert.ok(filter, 'expected a track visibility clause in where.AND');
        assert.deepEqual(filter.OR[1], { trackLinks: { some: { trackId: REVIEWEE_TRACK } } });
    });

    // The regression. Previously the restriction was skipped whenever no track
    // string was supplied, which was always — leaving the reviewee unscoped.
    it('still applies the track restriction when the reviewee has no track', () => {
        const where = buildDeckListWhere({ revieweeOnlyPublished: true, revieweeTrackId: null });
        const filter = trackFilterOf(where);
        assert.ok(filter, 'reviewee with no track must still be scoped, not unscoped');
        assert.equal(filter.OR.length, 1);
    });

    it('never scopes by track name or code', () => {
        const where = buildDeckListWhere({ revieweeOnlyPublished: true, revieweeTrackId: REVIEWEE_TRACK });
        assert.equal(
            JSON.stringify(where).includes('"name"'),
            false,
            'track matching must use trackId, not the track name',
        );
    });

    it('leaves a manager unscoped by track', () => {
        const where = buildDeckListWhere({ createdBy: 'author-1' });
        assert.equal(where.AND, undefined);
        assert.equal(where.visibility, undefined);
    });

    it('keeps the search predicate off the track clause', () => {
        const where = buildDeckListWhere({
            revieweeOnlyPublished: true,
            revieweeTrackId: REVIEWEE_TRACK,
            search: 'algebra',
        });
        assert.ok(Array.isArray(where.OR), 'search should stay on where.OR');
        assert.ok(trackFilterOf(where), 'track clause should stay in where.AND');
    });
});
