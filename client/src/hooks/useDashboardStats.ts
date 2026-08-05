import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import {
    cacheDashboardStats,
    getCachedDashboardStats,
} from '@/lib/offline-store';

export interface UseDashboardStatsResult {
    /** The most recent stats available: cached copy, then the live payload. */
    stats: Record<string, unknown> | null;
    /**
     * True only while nothing is visible yet. Once a cached copy or a fresh
     * payload is rendered, loading stays false even if a background refresh
     * is still in flight.
     */
    loading: boolean;
    /** Whether the currently visible stats came from IndexedDB (true) or the network (false). */
    fromCache: boolean;
}

/**
 * Dashboard stats with a stale-while-revalidate cache (offline-first).
 *
 * On mount the hook reads `dashboard-stats` from the offline store and renders
 * that copy immediately when present, then refetches GET /dashboard/stats and
 * writes the fresh payload through to the cache. A failed refresh keeps the
 * cached copy on screen instead of dropping back to the skeleton.
 *
 * The cache is keyed per user id so one browser session can never surface
 * another account's role-scoped numbers.
 */
export function useDashboardStats(userId?: string): UseDashboardStatsResult {
    const [stats, setStats] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        // Once the network answered, a slow cache read must not overwrite it.
        let freshApplied = false;

        // 1) Render cached stats immediately if present (stale-while-revalidate).
        getCachedDashboardStats(userId)
            .then((cached) => {
                if (cancelled || freshApplied || !cached) return;
                setStats(cached.stats);
                setFromCache(true);
                setLoading(false);
            })
            .catch(() => {
                // Cache read failed (e.g. storage blocked) — fall through to network.
            });

        // 2) Refresh from the network, then write through to the cache.
        api.get<{ data: Record<string, unknown> }>('/dashboard/stats')
            .then((response) => {
                if (cancelled) return;
                freshApplied = true;
                const fresh = response.data.data;
                setStats(fresh);
                setFromCache(false);
                setLoading(false);
                void cacheDashboardStats(userId, fresh).catch(() => {
                    // Best-effort write; never break the dashboard on a full store.
                });
            })
            .catch(() => {
                if (cancelled) return;
                // Keep whatever is showing (cached stats or nothing); stop the spinner.
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return { stats, loading, fromCache };
}
