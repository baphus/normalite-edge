import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/axios';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    activeDays: string[];
    lastActiveDate: string | null;
}

export function useStreakData() {
    const [data, setData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStreak = useCallback(() => {
        const tz = new Date().getTimezoneOffset(); // minutes from UTC (e.g. -480 for UTC+8)
        api.get<{ data: StreakData }>('/streak', { params: { tz } })
            .then((res) => {
                setData(res.data.data);
            })
            .catch(() => {
                // Silent fail — streak is non-critical
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let cancelled = false;

        const tz = new Date().getTimezoneOffset();

        const doFetch = () =>
            api.get<{ data: StreakData }>('/streak', { params: { tz } })
                .then((res) => {
                    if (!cancelled) setData(res.data.data);
                })
                .catch(() => {
                    // Silent fail — streak is non-critical
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });

        // Initial fetch
        doFetch();

        // Retry after a short delay to catch fire-and-forget streak recordings
        // (e.g. deck completion, exam submission) that haven't landed yet on mount.
        const retryTimer = setTimeout(() => {
            if (!cancelled) doFetch();
        }, 2000);

        // Refetch when user returns to the tab (stale count after activity)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !cancelled) {
                doFetch();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            clearTimeout(retryTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStreak]);

    return { data, loading, refetch: fetchStreak };
}
