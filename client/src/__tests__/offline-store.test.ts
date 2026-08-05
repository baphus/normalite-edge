import { describe, it, expect, beforeEach } from 'vitest';
import { deleteDB } from 'idb';
import {
    cacheDeck,
    getCachedDeck,
    deleteCachedDeck,
    getAllCachedDecks,
    saveDeckProgress,
    getDeckProgress,
    cacheDashboardStats,
    getCachedDashboardStats,
    type DeckCache,
    type DeckProgress,
} from '@/lib/offline-store';

const DB_NAME = 'normalite-offline';

beforeEach(async () => {
    await deleteDB(DB_NAME);
});

function makeDeck(overrides: Partial<DeckCache> = {}): DeckCache {
    return {
        id: 'deck-1',
        title: 'Gen Ed Set A',
        description: 'Core concepts',
        subject: 'General Education',
        category: 'General Education',
        questions: [
            {
                id: 'q-1',
                questionText: 'What is 2 + 2?',
                choiceA: '3',
                choiceB: '4',
                choiceC: '5',
                choiceD: '6',
                correctChoice: 'B',
                rationalization: 'Basic arithmetic.',
            },
        ],
        cachedAt: 1700000000000,
        ...overrides,
    };
}

function makeProgress(overrides: Partial<DeckProgress> = {}): DeckProgress {
    return {
        deckId: 'deck-1',
        cardsViewed: 3,
        completion: 60,
        lastAccessed: 1700000000000,
        ...overrides,
    };
}

describe('offline-store', () => {
    it('round-trips a deck through cacheDeck and getCachedDeck', async () => {
        await cacheDeck(makeDeck());
        const cached = await getCachedDeck('deck-1');
        expect(cached).toBeDefined();
        expect(cached?.id).toBe('deck-1');
        expect(cached?.title).toBe('Gen Ed Set A');
        expect(cached?.questions).toHaveLength(1);
        expect(cached?.questions[0].questionText).toBe('What is 2 + 2?');
        expect(cached?.cachedAt).toBe(1700000000000);
    });

    it('round-trips progress through saveDeckProgress and getDeckProgress', async () => {
        await saveDeckProgress(makeProgress());
        const progress = await getDeckProgress('deck-1');
        expect(progress).toBeDefined();
        expect(progress?.deckId).toBe('deck-1');
        expect(progress?.cardsViewed).toBe(3);
        expect(progress?.completion).toBe(60);
        expect(progress?.lastAccessed).toBe(1700000000000);
    });

    it('returns every cached deck from getAllCachedDecks', async () => {
        await cacheDeck(makeDeck({ id: 'deck-1', title: 'Deck One' }));
        await cacheDeck(makeDeck({ id: 'deck-2', title: 'Deck Two' }));
        const all = await getAllCachedDecks();
        expect(all).toHaveLength(2);
        expect(all.map((deck) => deck.id).sort()).toEqual(['deck-1', 'deck-2']);
    });

    it('removes a deck with deleteCachedDeck', async () => {
        await cacheDeck(makeDeck({ id: 'deck-1' }));
        await cacheDeck(makeDeck({ id: 'deck-2' }));
        await deleteCachedDeck('deck-1');

        expect(await getCachedDeck('deck-1')).toBeUndefined();
        expect(await getCachedDeck('deck-2')).toBeDefined();
    });

    it('round-trips dashboard stats and isolates them per user', async () => {
        await cacheDashboardStats('user-a', { totalUsers: 10, pendingApprovals: 2 });
        await cacheDashboardStats('user-b', { totalUsers: 99 });

        const cachedA = await getCachedDashboardStats('user-a');
        expect(cachedA).toBeDefined();
        expect(cachedA?.stats.totalUsers).toBe(10);
        expect(cachedA?.cachedAt).toBeGreaterThan(0);

        const cachedB = await getCachedDashboardStats('user-b');
        expect(cachedB?.stats.totalUsers).toBe(99);

        expect(await getCachedDashboardStats('user-never-cached')).toBeUndefined();
    });
});
