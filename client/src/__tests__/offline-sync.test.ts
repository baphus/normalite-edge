import { describe, it, expect, beforeEach } from 'vitest';
import { deleteDB } from 'idb';
import api from '@/lib/axios';
import { openOfflineDB } from '@/lib/offline-store';
import { queueProgress, processQueue, getSyncStatus } from '@/lib/offline-sync';

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

const DB_NAME = 'normalite-offline';

/**
 * Force the browser offline so `queueProgress` parks the record instead of
 * firing the flush it triggers when connectivity is up — the tests then drive
 * `processQueue` themselves and can assert on each step.
 */
beforeEach(async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await deleteDB(DB_NAME);
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
});

describe('offline-sync', () => {
    it('parks queued progress in the sync-queue store', async () => {
        await queueProgress({
            deckId: 'deck-1',
            cardsViewed: 3,
            completion: 60,
            lastAccessed: 1700000000000,
            totalItems: 10,
        });

        const db = await openOfflineDB();
        const queued = await db.getAll('sync-queue');
        db.close();

        expect(queued).toHaveLength(1);
        expect(queued[0].deckId).toBe('deck-1');
        expect(queued[0].cardsViewed).toBe(3);
        expect(queued[0].totalItems).toBe(10);
        expect(queued[0].queuedAt).toBeGreaterThan(0);
        expect(getSyncStatus()).toBe('pending');
    });

    it('flushes queued progress through the deck-session route and clears the queue', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'session-1' } } });
        vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } });

        await queueProgress({
            deckId: 'deck-1',
            cardsViewed: 3,
            completion: 60,
            lastAccessed: 1700000000000,
            totalItems: 10,
        });
        await processQueue();

        expect(api.post).toHaveBeenCalledWith('/decks/deck-1/sessions/start', { mode: 'QUIZ' });
        expect(api.patch).toHaveBeenCalledWith('/decks/sessions/session-1/save', {
            currentIndex: 3,
            totalItems: 10,
        });

        const db = await openOfflineDB();
        const queued = await db.getAll('sync-queue');
        db.close();
        expect(queued).toHaveLength(0);
        expect(getSyncStatus()).toBe('up-to-date');
    });

    it('keeps the record queued when the flush fails', async () => {
        vi.mocked(api.post).mockRejectedValue(new Error('still offline'));

        await queueProgress({
            deckId: 'deck-1',
            cardsViewed: 3,
            completion: 60,
            lastAccessed: 1700000000000,
            totalItems: 10,
        });
        await processQueue();

        const db = await openOfflineDB();
        const queued = await db.getAll('sync-queue');
        db.close();
        expect(queued).toHaveLength(1);
        expect(getSyncStatus()).toBe('pending');
    });
});
