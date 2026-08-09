import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakCompactProps {
    currentStreak: number;
    /** Called when the user taps "Start your streak" (streak is 0). */
    onStartStreak?: () => void;
}

/**
 * A simplified streak widget for the mobile side-by-side layout with
 * DailyChallenge. Drops the weekly dot grid and best-streak count in
 * exchange for a tighter footprint: an animated flame, the current
 * streak number, and a single call-to-action.
 */
export const StreakCompact: React.FC<StreakCompactProps> = ({
    currentStreak,
    onStartStreak,
}) => {
    return (
        <div className="rounded-[16px] border border-slate-200 bg-white p-5">
            <style>{`
                @keyframes flame-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
                .flame-pulse {
                    animation: flame-pulse 1.2s ease-in-out infinite;
                    transform-origin: center;
                }
            `}</style>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Flame
                        className={cn(
                            'h-5 w-5',
                            currentStreak > 0
                                ? 'flame-pulse text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.45)]'
                                : 'text-slate-300',
                        )}
                        aria-hidden="true"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Streak
                    </span>
                </div>
                <span className="text-[24px] font-semibold tabular-nums leading-none text-slate-900">
                    {currentStreak}
                </span>
            </div>

            {currentStreak > 0 ? (
                <p className="mt-2 text-[13px] font-medium text-slate-600">Keep it going!</p>
            ) : onStartStreak ? (
                <button
                    type="button"
                    onClick={onStartStreak}
                    className="mt-2 inline-flex min-h-11 items-center rounded-lg px-4 text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                >
                    Start your streak!
                </button>
            ) : (
                <p className="mt-2 text-[13px] font-medium text-slate-400">Start your streak!</p>
            )}
        </div>
    );
};

export default StreakCompact;
