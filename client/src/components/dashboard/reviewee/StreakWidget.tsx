import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakWidgetProps {
    currentStreak: number;
    longestStreak: number;
    /** "YYYY-MM-DD" dates the user was active this week (Sun-Sat). */
    activeDays: string[];
    /** Called when the user clicks "Start your streak" (streak is 0). */
    onStartStreak?: () => void;
}

/** Day-of-week initials: Sun-Sat. */
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Format a Date as "YYYY-MM-DD" in the user's local timezone (not UTC).
 * `toISOString().split('T')[0]` would shift dates for users behind UTC.
 */
function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * A compact weekly streak widget. Shows a Sun–Sat dot grid, the current
 * streak count, and a call-to-action when the streak is zero.
 *
 * Sits below `StatTiles` on the reviewee dashboard.
 */
export const StreakWidget: React.FC<StreakWidgetProps> = ({
    currentStreak,
    longestStreak,
    activeDays,
    onStartStreak,
}) => {
    const today = new Date();
    const todayStr = toLocalDateString(today);

    // Build the current week's dates (Sun–Sat)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return toLocalDateString(d);
    });

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Streak
                    </span>
                </div>
                {currentStreak > 0 && (
                    <span className="text-[11px] text-slate-500">Best: {longestStreak}</span>
                )}
            </div>

            {/* Weekly dot grid */}
            <div className="flex items-center justify-between mb-3" role="group" aria-label="Activity this week">
                {DAYS.map((day, i) => {
                    const isActive = activeDays.includes(weekDates[i]);
                    const isToday = weekDates[i] === todayStr;

                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <span className={cn('text-[11px] font-semibold', isToday ? 'text-primary' : 'text-slate-400')}>
                                {day}
                            </span>
                            <div
                                className={cn(
                                    'h-6 w-6 rounded-full flex items-center justify-center text-[11px]',
                                    isActive
                                        ? 'bg-orange-100 text-orange-600'
                                        : isToday
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-slate-50 text-slate-300',
                                    isToday && 'ring-2 ring-primary/40 ring-offset-1',
                                )}
                                aria-label={`${day}: ${isActive ? 'active' : isToday ? 'today' : 'inactive'}`}
                            >
                                {isActive ? (
                                    <Flame className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                    <span aria-hidden="true">&middot;</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between">
                <div className="text-[13px]">
                    <span className="font-semibold text-slate-900">{currentStreak}</span>
                    <span className="text-slate-500 ml-1">{currentStreak === 1 ? 'day' : 'days'} streak</span>
                </div>
                {currentStreak === 0 && onStartStreak && (
                    <button
                        type="button"
                        onClick={onStartStreak}
                        className="text-[13px] font-semibold text-primary hover:underline"
                    >
                        Start your streak
                    </button>
                )}
            </div>
        </div>
    );
};

export default StreakWidget;
