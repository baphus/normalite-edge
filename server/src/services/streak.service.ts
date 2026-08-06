import prisma from '../config/db';

/**
 * Compute the user's local calendar date as a server-local midnight Date.
 *
 * Server time is UTC (e.g. on Vercel), but users are in the Philippines
 * (UTC+8, timezoneOffsetMinutes = -480). Without the offset, a streak
 * activity just after midnight local time would land on the wrong day.
 *
 * `timezoneOffsetMinutes` follows the JS convention: minutes ahead of UTC
 * are negative (UTC+8 = -480). The returned Date is a local midnight whose
 * date components are the user's local year/month/day.
 */
function userLocalDate(timezoneOffsetMinutes: number): Date {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const localMs = utcMs - timezoneOffsetMinutes * 60_000;
    const local = new Date(localMs);
    return new Date(local.getFullYear(), local.getMonth(), local.getDate());
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

        // Upsert the streak day (idempotent — same day same user = no-op on unique constraint)
        await prisma.streakDay.upsert({
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

        // Atomically update the streak count within a transaction
        await prisma.$transaction(async (tx) => {
            const existing = await tx.userStreak.findUnique({
                where: { userId },
            });

            if (!existing) {
                // First activity ever
                await tx.userStreak.create({
                    data: {
                        userId,
                        currentStreak: 1,
                        longestStreak: 1,
                        lastActiveDate: todayMidnight,
                    },
                });
                return;
            }

            // Compute new streak
            const lastActiveMidnight = new Date(
                existing.lastActiveDate.getFullYear(),
                existing.lastActiveDate.getMonth(),
                existing.lastActiveDate.getDate(),
            );
            const diffDays = Math.round(
                (todayMidnight.getTime() - lastActiveMidnight.getTime()) / 86_400_000,
            );

            let newCurrentStreak: number;
            let newLongestStreak: number;

            if (diffDays === 0) {
                // Same day — no change to streak count
                newCurrentStreak = existing.currentStreak;
                newLongestStreak = existing.longestStreak;
            } else if (diffDays === 1) {
                // Consecutive day
                newCurrentStreak = existing.currentStreak + 1;
                newLongestStreak = Math.max(existing.longestStreak, newCurrentStreak);
            } else {
                // Gap — reset streak
                newCurrentStreak = 1;
                newLongestStreak = Math.max(existing.longestStreak, 1);
            }

            await tx.userStreak.update({
                where: { userId },
                data: {
                    currentStreak: newCurrentStreak,
                    longestStreak: newLongestStreak,
                    lastActiveDate: todayMidnight,
                },
            });
        });
    }
}

export const streakService = new StreakService();
