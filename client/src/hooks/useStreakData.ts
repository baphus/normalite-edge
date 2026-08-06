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

        // Initial fetch
        const tz = new Date().getTimezoneOffset();
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

        // Refetch when user returns to the tab (stale count after activity)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !cancelled) {
                fetchStreak();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStreak]);

    return { data, loading, refetch: fetchStreak };
}
