import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';
import StreakCelebration from '@/components/StreakCelebration';

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    activeDays: string[];
    lastActiveDate: string | null;
}

interface StreakContextValue {
    streakCount: number;
    longestStreak: number;
    activeDays: string[];
    loading: boolean;
    refetchStreak: () => Promise<void>;
    showCelebration: boolean;
    celebrationCount: number;
    dismissCelebration: () => void;
}

const StreakContext = createContext<StreakContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useStreakContext(): StreakContextValue {
    const ctx = useContext(StreakContext);
    if (!ctx) throw new Error('useStreakContext must be used within StreakProvider');
    return ctx;
}

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [data, setData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationCount, setCelebrationCount] = useState(0);
    const prevStreakRef = useRef<number | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchStreakData = useCallback(async () => {
        const tz = new Date().getTimezoneOffset();
        try {
            const res = await api.get<{ data: StreakData }>('/streak', { params: { tz } });
            const newData = res.data.data;

            const prev = prevStreakRef.current;

            // First load: just record the value, don't celebrate
            if (prev !== null && newData.currentStreak > prev) {
                setCelebrationCount(newData.currentStreak);
                setShowCelebration(true);
            }

            prevStreakRef.current = newData.currentStreak;
            setData(newData);
        } catch {
            // Silent fail -- streak is non-critical
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch + visibility-based refetch
    useEffect(() => {
        let cancelled = false;

        const doFetch = async () => {
            if (cancelled) return;
            const tz = new Date().getTimezoneOffset();
            try {
                const res = await api.get<{ data: StreakData }>('/streak', { params: { tz } });
                if (cancelled) return;
                const newData = res.data.data;
                const prev = prevStreakRef.current;

                if (prev !== null && newData.currentStreak > prev) {
                    setCelebrationCount(newData.currentStreak);
                    setShowCelebration(true);
                }

                prevStreakRef.current = newData.currentStreak;
                setData(newData);
            } catch {
                // Silent fail
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        // Initial fetch
        doFetch();

        // Retry after short delay to catch fire-and-forget streak recordings
        retryTimerRef.current = setTimeout(() => {
            if (!cancelled) doFetch();
        }, 2000);

        // Refetch when user returns to tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !cancelled) {
                doFetch();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const refetchStreak = useCallback(async () => {
        await fetchStreakData();
        // Retry after delay to catch async streak recordings (deck completion, exam submission)
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(fetchStreakData, 2000);
    }, [fetchStreakData]);

    const dismissCelebration = useCallback(() => {
        setShowCelebration(false);
    }, []);

    return (
        <StreakContext.Provider
            value={{
                streakCount: data?.currentStreak ?? 0,
                longestStreak: data?.longestStreak ?? 0,
                activeDays: data?.activeDays ?? [],
                loading,
                refetchStreak,
                showCelebration,
                celebrationCount,
                dismissCelebration,
            }}
        >
            {children}
            <StreakCelebration
                trigger={showCelebration}
                streakCount={celebrationCount}
                onComplete={dismissCelebration}
            />
        </StreakContext.Provider>
    );
};
