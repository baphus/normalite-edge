import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircularProgressRing } from '@/components/exam/CircularProgressRing';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'pending' | 'error';

export interface TimerHeaderProps {
    /** ISO timestamp from the server; the countdown runs against this. */
    endsAt: string;
    examTitle: string;
    subject: string;
    /** e.g. "Section A (3/5)". */
    sectionLabel: string;
    saveStatus: SaveStatus;
    isOnline: boolean;
    /** Called exactly once when the countdown reaches zero (via the ring). */
    onTimeUp: () => void;
    /** Extra header controls (flag, submit, etc.) rendered on the right. */
    children?: React.ReactNode;
}

/** Aria-live warning thresholds, most urgent last (the last match wins). */
const WARNING_THRESHOLDS = [
    { seconds: 300, message: '5 minutes remaining' },
    { seconds: 120, message: '2 minutes remaining' },
    { seconds: 30, message: '30 seconds remaining' },
] as const;

/** How long a threshold warning stays announced before the region clears. */
const LIVE_MESSAGE_DURATION_MS = 3000;

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
    idle: 'Idle',
    saving: 'Saving…',
    saved: 'Saved',
    pending: 'Pending sync',
    error: 'Save failed',
};

const SAVE_STATUS_TONES: Record<SaveStatus, string> = {
    idle: 'border-slate-200 bg-slate-100 text-slate-500',
    saving: 'border-slate-200 bg-slate-100 text-slate-700',
    saved: 'border-slate-200 bg-slate-100 text-slate-600',
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    error: 'border-red-200 bg-red-50 text-red-700',
};

const parseEndsAtMs = (endsAt: string): number => {
    const parsed = new Date(endsAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const computeRemainingSeconds = (endsAtMs: number): number => {
    if (endsAtMs <= 0) return 0;
    return Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
};

/** `< 1h` → `MM:SS`, `≥ 1h` → `HH:MM:SS`. */
const formatClockTime = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours > 0
        ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
        : `${pad(minutes)}:${pad(secs)}`;
};

const TimerHeader: React.FC<TimerHeaderProps> = ({
    endsAt,
    examTitle,
    subject,
    sectionLabel,
    saveStatus,
    isOnline,
    onTimeUp,
    children,
}) => {
    // The ring shows remaining/total, so the total duration is captured once
    // at mount (endsAt − now). `endsAt` is server-authoritative; the remaining
    // time is recomputed from it every tick, so throttled background tabs are
    // corrected on return.
    const [{ initialRemaining, totalSeconds }] = useState(() => {
        const endsAtMs = parseEndsAtMs(endsAt);
        const initial = computeRemainingSeconds(endsAtMs);
        return { initialRemaining: initial, totalSeconds: Math.max(1, initial) };
    });
    const [remainingSeconds, setRemainingSeconds] = useState(initialRemaining);
    const [ariaLiveMessage, setAriaLiveMessage] = useState<string | null>(null);

    const previousRemainingRef = useRef<number | null>(null);
    const liveMessageTimeoutRef = useRef<number | null>(null);

    const announce = useCallback((message: string) => {
        if (liveMessageTimeoutRef.current !== null) {
            window.clearTimeout(liveMessageTimeoutRef.current);
        }
        setAriaLiveMessage(message);
        liveMessageTimeoutRef.current = window.setTimeout(() => {
            liveMessageTimeoutRef.current = null;
            setAriaLiveMessage(null);
        }, LIVE_MESSAGE_DURATION_MS);
    }, []);

    useEffect(() => {
        const endsAtMs = parseEndsAtMs(endsAt);
        if (endsAtMs <= 0) return;

        const syncRemaining = () => {
            const next = computeRemainingSeconds(endsAtMs);
            const previous = previousRemainingRef.current;
            previousRemainingRef.current = next;

            setRemainingSeconds((current) => (current === next ? current : next));

            if (previous === null || next >= previous) return;

            // Announce each threshold as it is crossed. On a large catch-up jump
            // (hidden tab), pick the most urgent threshold that was crossed.
            const crossed = WARNING_THRESHOLDS.filter(
                (threshold) => previous > threshold.seconds && next <= threshold.seconds,
            );
            const mostUrgent = crossed[crossed.length - 1];
            if (mostUrgent) {
                announce(mostUrgent.message);
            }
        };

        const interval = window.setInterval(syncRemaining, 1000);

        const handleVisibilityChange = () => {
            // Intervals are throttled while hidden, so recompute from the
            // server timestamp the moment the tab regains focus.
            if (document.visibilityState === 'visible') {
                syncRemaining();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [announce, endsAt]);

    useEffect(() => {
        return () => {
            if (liveMessageTimeoutRef.current !== null) {
                window.clearTimeout(liveMessageTimeoutRef.current);
                liveMessageTimeoutRef.current = null;
            }
        };
    }, []);

    const value = Math.min(1, Math.max(0, remainingSeconds / totalSeconds));
    const label = formatClockTime(remainingSeconds);

    return (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-5">
            <CircularProgressRing
                value={value}
                label={label}
                sizeRem={3.5}
                onTimeUp={onTimeUp}
            />

            <div className="min-w-0 flex-1 text-center">
                <h2 className="truncate text-xs font-semibold leading-tight text-slate-900 sm:text-sm">
                    {examTitle}
                </h2>
                <p className="truncate text-xs font-medium text-slate-400">
                    {subject} · {sectionLabel}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <span
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold',
                        isOnline
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700',
                    )}
                >
                    <span
                        className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isOnline ? 'bg-emerald-500' : 'bg-amber-500',
                        )}
                        aria-hidden="true"
                    />
                    {isOnline ? 'Online' : 'Offline'}
                </span>

                <span
                    data-guide="exam-take-save-status"
                    role="status"
                    className={cn(
                        'inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold sm:px-2',
                        SAVE_STATUS_TONES[saveStatus],
                    )}
                >
                    {SAVE_STATUS_LABELS[saveStatus]}
                </span>

                {children}
            </div>

            {/* Visually-hidden live region announcing 5m / 2m / 30s warnings. */}
            <span
                aria-live="polite"
                role="status"
                className="sr-only"
                data-testid="timer-live-region"
            >
                {ariaLiveMessage}
            </span>
        </header>
    );
};

export default TimerHeader;
