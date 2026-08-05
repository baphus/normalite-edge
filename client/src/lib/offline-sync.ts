import api from '@/lib/axios';
import { openOfflineDB, type DeckProgress, type QueuedProgress } from '@/lib/offline-store';

/**
 * Offline sync (ticket #58).
 *
 * A `deck-progress` record that cannot reach the server is parked in the
 * `sync-queue` store and flushed on the next `online` event (or via
 * `manualSync`, e.g. the Settings button). Progress is an upsert keyed on
 * `deckId`, so a deck that keeps generating progress while offline never
 * accumulates stale entries — the latest record wins.
 *
 * The flush rides the deck-session API, which is how the server persists deck
 * progress (`POST /decks/:id/sessions/start` resumes or creates an
 * IN_PROGRESS session, `PATCH /decks/sessions/:sessionId/save` writes the
 * progress). There is no per-deck `/progress` endpoint. A save that lands on
 * a finalized session is non-fatal: the next flush restarts the session and
 * retries, so the record is only dropped once the server has truly accepted
 * it.
 */

export type SyncStatus = 'pending' | 'syncing' | 'up-to-date';

let currentStatus: SyncStatus = 'up-to-date';
const statusListeners = new Set<(status: SyncStatus) => void>();

function setStatus(next: SyncStatus) {
    if (currentStatus === next) return;
    currentStatus = next;
    statusListeners.forEach((listener) => listener(next));
}

export function getSyncStatus(): SyncStatus {
    return currentStatus;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
    statusListeners.add(listener);
    listener(currentStatus);
    return () => {
        statusListeners.delete(listener);
    };
}

function isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
}

export async function queueProgress(progress: DeckProgress): Promise<void> {
    const record: QueuedProgress = { ...progress, queuedAt: Date.now() };
    const db = await openOfflineDB();
    try {
        await db.put('sync-queue', record);
    } finally {
        db.close();
    }
    setStatus('pending');
    if (isOnline()) {
        void processQueue();
    }
}

/**
 * Resolve a deck's session id via the start/resume route, which guarantees an
 * IN_PROGRESS session the save route will accept.
 */
async function ensureSessionId(deckId: string): Promise<string> {
    const response = await api.post(`/decks/${deckId}/sessions/start`, {
        mode: 'QUIZ',
    });
    const sessionId: string | undefined = response.data?.data?.id;
    if (!sessionId) {
        throw new Error(`Session start returned no session id for deck ${deckId}`);
    }
    return sessionId;
}

/**
 * Push every pending record to the server, deleting each one as it succeeds.
 * A failed push keeps its record queued and stops the loop so the remaining
 * records stay pending rather than being half-applied.
 */
export async function processQueue(): Promise<void> {
    if (currentStatus === 'syncing') return;

    const db = await openOfflineDB();
    try {
        const pending = await db.getAll('sync-queue');
        if (pending.length === 0) {
            setStatus('up-to-date');
            return;
        }

        setStatus('syncing');
        for (const record of pending) {
            try {
                const sessionId = await ensureSessionId(record.deckId);
                await api.patch(`/decks/sessions/${sessionId}/save`, {
                    currentIndex: record.cardsViewed,
                    totalItems: record.totalItems,
                });
                await db.delete('sync-queue', record.deckId);
            } catch (error) {
                console.error('Offline progress sync failed for deck', record.deckId, error);
                break;
            }
        }

        const remaining = await db.getAll('sync-queue');
        setStatus(remaining.length === 0 ? 'up-to-date' : 'pending');
    } finally {
        db.close();
    }
}

/** Manual flush for the Settings "Sync now" button. */
export async function manualSync(): Promise<void> {
    await processQueue();
}

// Flush automatically the moment connectivity comes back.
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        void processQueue();
    });
}
