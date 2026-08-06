import { useEffect, useState } from 'react';
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

    useEffect(() => {
        let cancelled = false;
        const tz = new Date().getTimezoneOffset(); // minutes from UTC (e.g. -480 for UTC+8)
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
        return () => {
            cancelled = true;
        };
    }, []);

    return { data, loading };
}
