import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Offline study-material store (ticket #57).
 *
 * `normalite-offline` v1 owns four object stores:
 * - `decks`          — the last successful fetch of a study deck, questions included.
 * - `deck-progress`  — the local read-model of a reviewee's progress through a deck.
 * - `sync-queue`     — deck-progress records waiting to be pushed to the server
 *                      (owned by `offline-sync.ts`, created here so both modules
 *                      share one DB schema / upgrade callback).
 * - `dashboard-stats`— the last successful fetch of GET /dashboard/stats, keyed per
 *                      user, so a revisit can render instantly (stale-while-revalidate).
 *
 * Exam content is NEVER written here. Exams carry time pressure and a live
 * attempt lifecycle; caching them offline would let a reviewee sit on a timed
 * paper indefinitely. Only decks (flashcards/quiz material) are cached.
 */

export interface DeckCacheQuestion {
    id: string;
    orderNo?: number;
    questionText: string;
    imageUrl?: string | null;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
}

export interface DeckCacheTrack {
    id?: string;
    name: string;
    code?: string | null;
}

export interface DeckCacheCreator {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
}

export interface DeckCache {
    id: string;
    title: string;
    description?: string | null;
    subject?: string | null;
    category?: string | null;
    /** Server visibility string, kept for the status pill when serving offline. */
    visibility?: string | null;
    tracks?: DeckCacheTrack[];
    program_track?: string | null;
    creator?: DeckCacheCreator;
    createdAt?: string;
    questions: DeckCacheQuestion[];
    cachedAt: number;
}

export interface DeckProgress {
    deckId: string;
    cardsViewed: number;
    completion: number;
    lastAccessed: number;
    /** Question count of the deck at sync time — required by the session-save payload. */
    totalItems?: number;
}

export interface QueuedProgress extends DeckProgress {
    queuedAt: number;
}

/** Cached GET /dashboard/stats payload, keyed per user id. */
export interface DashboardStatsCache {
    userId: string;
    stats: Record<string, unknown>;
    cachedAt: number;
}

interface OfflineStoreSchema extends DBSchema {
    decks: { key: string; value: DeckCache };
    'deck-progress': { key: string; value: DeckProgress };
    'sync-queue': { key: string; value: QueuedProgress };
    'dashboard-stats': { key: string; value: DashboardStatsCache };
}

const DB_NAME = 'normalite-offline';
const DB_VERSION = 1;

export function openOfflineDB(): Promise<IDBPDatabase<OfflineStoreSchema>> {
    return openDB<OfflineStoreSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('decks')) {
                db.createObjectStore('decks', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('deck-progress')) {
                db.createObjectStore('deck-progress', { keyPath: 'deckId' });
            }
            if (!db.objectStoreNames.contains('sync-queue')) {
                db.createObjectStore('sync-queue', { keyPath: 'deckId' });
            }
            if (!db.objectStoreNames.contains('dashboard-stats')) {
                db.createObjectStore('dashboard-stats', { keyPath: 'userId' });
            }
        },
    });
}

/** Open a connection, run one operation, and close it — no leaky handles. */
async function withDB<T>(fn: (db: IDBPDatabase<OfflineStoreSchema>) => Promise<T>): Promise<T> {
    const db = await openOfflineDB();
    try {
        return await fn(db);
    } finally {
        db.close();
    }
}

/* ── Deck cache ── */

export async function cacheDeck(deck: DeckCache): Promise<void> {
    await withDB((db) => db.put('decks', deck));
}

export async function getCachedDeck(id: string): Promise<DeckCache | undefined> {
    return withDB((db) => db.get('decks', id));
}

export async function deleteCachedDeck(id: string): Promise<void> {
    await withDB((db) => db.delete('decks', id));
}

export async function getAllCachedDecks(): Promise<DeckCache[]> {
    return withDB((db) => db.getAll('decks'));
}

/* ── Deck progress (local read model) ── */

export async function saveDeckProgress(progress: DeckProgress): Promise<void> {
    await withDB((db) => db.put('deck-progress', progress));
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress | undefined> {
    return withDB((db) => db.get('deck-progress', deckId));
}

/* ── Dashboard stats cache ── */

/**
 * Persist the last successful fetch of GET /dashboard/stats, stamped with the
 * write time so a revisit can render it instantly (stale-while-revalidate).
 * Keyed per user so a role-scoped dashboard can never show another account's
 * cached numbers after a session switch.
 */
export async function cacheDashboardStats(
    userId: string,
    stats: Record<string, unknown>,
): Promise<void> {
    await withDB((db) =>
        db.put('dashboard-stats', { userId, stats, cachedAt: Date.now() }),
    );
}

/** The most recent cached dashboard stats for this user, if any. */
export async function getCachedDashboardStats(
    userId: string,
): Promise<DashboardStatsCache | undefined> {
    return withDB((db) => db.get('dashboard-stats', userId));
}
