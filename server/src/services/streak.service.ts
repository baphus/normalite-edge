import prisma from '../config/db';

/**
 * Compute the user's local calendar date, represented as a UTC midnight.
 *
 * Server time is UTC (e.g. on Vercel), but users are in the Philippines
 * (UTC+8, timezoneOffsetMinutes = -480). Without the offset, a streak
 * activity just after midnight local time would land on the wrong day.
 *
 * We deliberately return a Date whose *UTC* date components are the user's
 * local year/month/day (e.g. `2026-08-07T00:00:00.000Z` for a Philippine
 * Aug 7) rather than a server-local midnight. A `DATE` column truncates the
 * timestamp to the connection's timezone (UTC on Supabase), so a server-local
 * midnight for UTC+8 users (Aug 7 00:00 +08 = Aug 6 16:00Z) would be stored
 * and read back as the previous day.
 *
 * `timezoneOffsetMinutes` follows the JS convention: minutes ahead of UTC
 * are negative (UTC+8 = -480).
 */
function userLocalDate(timezoneOffsetMinutes: number): Date {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const localMs = utcMs - timezoneOffsetMinutes * 60_000;
    const local = new Date(localMs);
    return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

export class StreakService {
    /**
     * Get streak data for a user.
     * Returns current streak, longest streak, active days in the current week (Sun-Sat),
     * and the last active date.
     */
    async getStreak(userId: string, timezoneOffsetMinutes: number = 0) {
        const streak = await prisma.userStreak.findUnique({
            where: { userId },
        });

        const todayMidnight = userLocalDate(timezoneOffsetMinutes);

        // Get active days in the current week (Sun-Sat)
        const startOfWeek = new Date(todayMidnight);
        startOfWeek.setDate(todayMidnight.getDate() - todayMidnight.getDay()); // Sunday

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        endOfWeek.setHours(23, 59, 59, 999);

        const activeDaysInWeek = await prisma.streakDay.findMany({
            where: {
                userId,
                date: {
                    gte: startOfWeek,
                    lte: endOfWeek,
                },
            },
            select: { date: true },
            orderBy: { date: 'asc' },
        });

        const activeDays = activeDaysInWeek.map((d) => {
            const date = new Date(d.date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        });

        return {
            currentStreak: streak?.currentStreak ?? 0,
            longestStreak: streak?.longestStreak ?? 0,
            activeDays,
            lastActiveDate: streak?.lastActiveDate
                ? `${streak.lastActiveDate.getFullYear()}-${String(streak.lastActiveDate.getMonth() + 1).padStart(2, '0')}-${String(streak.lastActiveDate.getDate()).padStart(2, '0')}`
                : null,
        };
    }

    /**
     * Record a streak activity for a user.
     * Call this when: exam submitted, deck session completed, or daily question answered.
     */
    async recordActivity(userId: string, activityType: 'DAILY_QUESTION' | 'DECK_SESSION' | 'EXAM_SUBMISSION', timezoneOffsetMinutes: number = 0) {
        const todayMidnight = userLocalDate(timezoneOffsetMinutes);

        // Atomically update the streak count AND register the activity day in a
        // single transaction. Order matters: `streak_days.user_id` has a FK to
        // `user_streaks.user_id` (streak_days_streak_fkey), so the UserStreak
        // row must exist before the StreakDay can be written.
        await prisma.$transaction(async (tx) => {
            const existing = await tx.userStreak.findUnique({
                where: { userId },
            });

            let currentStreak: number;
            let longestStreak: number;

            if (!existing) {
                // First activity ever
                currentStreak = 1;
                longestStreak = 1;
                await tx.userStreak.create({
                    data: {
                        userId,
                        currentStreak,
                        longestStreak,
                        lastActiveDate: todayMidnight,
                    },
                });
            } else {
                // Compute new streak
                const lastActiveMidnight = new Date(
                    existing.lastActiveDate.getFullYear(),
                    existing.lastActiveDate.getMonth(),
                    existing.lastActiveDate.getDate(),
                );
                const diffDays = Math.round(
                    (todayMidnight.getTime() - lastActiveMidnight.getTime()) / 86_400_000,
                );

                if (diffDays === 0) {
                    // Same day — no change to streak count
                    currentStreak = existing.currentStreak;
                    longestStreak = existing.longestStreak;
                } else if (diffDays === 1) {
                    // Consecutive day
                    currentStreak = existing.currentStreak + 1;
                    longestStreak = Math.max(existing.longestStreak, currentStreak);
                } else {
                    // Gap — reset streak
                    currentStreak = 1;
                    longestStreak = Math.max(existing.longestStreak, 1);
                }

                await tx.userStreak.update({
                    where: { userId },
                    data: {
                        currentStreak,
                        longestStreak,
                        lastActiveDate: todayMidnight,
                    },
                });
            }

            // Register the activity day (idempotent — same day same user = no-op
            // on unique constraint). Must run AFTER the UserStreak row exists
            // to satisfy the foreign key.
            await tx.streakDay.upsert({
                where: {
                    userId_date: {
                        userId,
                        date: todayMidnight,
                    },
                },
                update: {
                    // Already exists for today — no change needed
                },
                create: {
                    userId,
                    date: todayMidnight,
                    activityType,
                },
            });
        });
    }
}

export const streakService = new StreakService();
