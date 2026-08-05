import { useCallback, useEffect, useRef, useState } from 'react';
import {
    cacheDeck as persistDeck,
    getCachedDeck,
    type DeckCache,
} from '@/lib/offline-store';

export interface UseDeckCacheResult {
    /** The most recent cached copy of this deck, if one exists. */
    cachedDeck: DeckCache | null;
    /** Persist a freshly fetched deck and make it the current cached copy. */
    cacheDeck: (deck: DeckCache) => Promise<void>;
    /** Whether the browser currently reports being offline. */
    isOffline: boolean;
}

/**
 * Bridges a material page to the offline store (ticket #57).
 *
 * The hook owns nothing about *fetching* — the page does that. It exposes:
 * - `isOffline`, driven by `navigator.onLine` plus `online`/`offline` events;
 * - `cachedDeck`, loaded from the store whenever `deckId` changes;
 * - `cacheDeck(deck)`, which the page calls on a successful fetch so the next
 *   visit (or the next outage) can serve from the store.
 *
 * The page decides when a cached copy is the right thing to show; the hook
 * only guarantees the cache is current and available.
 */
export function useDeckCache(deckId?: string): UseDeckCacheResult {
    const [cachedDeck, setCachedDeck] = useState<DeckCache | null>(null);
    const [isOffline, setIsOffline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? !navigator.onLine : false,
    );

    // Keep the latest cachedDeck readable from stable callbacks without
    // forcing them into effect dependency arrays.
    const cachedDeckRef = useRef<DeckCache | null>(null);
    useEffect(() => {
        cachedDeckRef.current = cachedDeck;
    }, [cachedDeck]);

    useEffect(() => {
        if (!deckId) return;
        let cancelled = false;
        getCachedDeck(deckId)
            .then((deck) => {
                if (!cancelled) setCachedDeck(deck ?? null);
            })
            .catch(() => {
                if (!cancelled) setCachedDeck(null);
            });
        return () => {
            cancelled = true;
        };
    }, [deckId]);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const cacheDeck = useCallback(async (deck: DeckCache) => {
        await persistDeck(deck);
        cachedDeckRef.current = deck;
        setCachedDeck(deck);
    }, []);

    return { cachedDeck, cacheDeck, isOffline };
}
