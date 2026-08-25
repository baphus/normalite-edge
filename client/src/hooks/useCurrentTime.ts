import { useEffect, useState } from 'react';

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Supplies time as React state instead of reading the clock during render.
 *
 * The minute pulse keeps relative exam labels fresh. When a deadline is known,
 * an additional one-shot wake-up makes a result gate change immediately after
 * that deadline rather than waiting for the next pulse.
 */
export function useCurrentTime(wakeAt?: number): number {
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const syncTime = () => setCurrentTime(Date.now());
        syncTime();

        const intervalId = window.setInterval(syncTime, REFRESH_INTERVAL_MS);
        const delay = wakeAt == null ? null : wakeAt - Date.now() + 1;
        const wakeTimeoutId = delay != null && delay > 0
            ? window.setTimeout(syncTime, delay)
            : null;

        return () => {
            window.clearInterval(intervalId);
            if (wakeTimeoutId !== null) window.clearTimeout(wakeTimeoutId);
        };
    }, [wakeAt]);

    return currentTime;
}
