import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { buildTrackVisibilityFilter } from './revieweeVisibility';
import { streakService } from './streak.service';

type AttemptScoreRow = {
    percentage: { toString(): string } | number;
    userId: string;
    submittedAt: Date | null;
    updatedAt: Date;
    user: { programTrack: string | null };
};

const buildDashboardAnalytics = (
    attemptRows: AttemptScoreRow[],
    examVolumes: {
        id: string;
        title: string;
        creator: { firstName: string | null; lastName: string | null; profilePicture: string | null };
        _count: { attempts: number };
    }[],
    statusCounts: { status: string; _count: number }[],
) => {
    const scores = attemptRows.map((attempt) => Number(attempt.percentage));
    const scoreBands = [
        { label: 'Below 50%', count: 0 },
        { label: '50–74%', count: 0 },
        { label: '75–89%', count: 0 },
        { label: '90–100%', count: 0 },
    ];

    scores.forEach((score) => {
        const index = score < 50 ? 0 : score < 75 ? 1 : score < 90 ? 2 : 3;
        scoreBands[index].count += 1;
    });

    const currentWeek = new Date();
    currentWeek.setUTCHours(0, 0, 0, 0);
    currentWeek.setUTCDate(currentWeek.getUTCDate() - ((currentWeek.getUTCDay() + 6) % 7));
    const weeks = Array.from({ length: 8 }, (_, index) => {
        const start = new Date(currentWeek);
        start.setUTCDate(currentWeek.getUTCDate() - (7 * (7 - index)));
        return {
            start,
            label: new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
            }).format(start),
            count: 0,
        };
    });

    attemptRows.forEach((attempt) => {
        const submittedAt = attempt.submittedAt ?? attempt.updatedAt;
        const offset = Math.floor((submittedAt.getTime() - weeks[0].start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (offset >= 0 && offset < weeks.length) weeks[offset].count += 1;
    });

    const examStatuses = { live: 0, draft: 0, closed: 0, archived: 0 };
    statusCounts.forEach((entry) => {
        const status = entry.status.toLowerCase() as keyof typeof examStatuses;
        if (status in examStatuses) examStatuses[status] = entry._count;
    });

    const programScores = new Map<string, { total: number; submissions: number }>();
    attemptRows.forEach((attempt) => {
        const program = attempt.user.programTrack?.trim();
        if (!program) return;
        const summary = programScores.get(program) ?? { total: 0, submissions: 0 };
        summary.total += Number(attempt.percentage);
        summary.submissions += 1;
        programScores.set(program, summary);
    });

    return {
        averageScore: scores.length
            ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
            : null,
        passRate: scores.length
            ? Math.round((scores.filter((score) => score >= 75).length / scores.length) * 100)
            : null,
        learnerCount: new Set(attemptRows.map((attempt) => attempt.userId)).size,
        scoreDistribution: scoreBands,
        weeklySubmissions: weeks.map(({ label, count }) => ({ label, count })),
        topPrograms: [...programScores.entries()]
            .map(([program, summary]) => ({
                program,
                averageScore: Math.round((summary.total / summary.submissions) * 10) / 10,
                submissions: summary.submissions,
            }))
            .sort((first, second) => second.averageScore - first.averageScore || second.submissions - first.submissions)
            .slice(0, 5),
        submissionVolume: examVolumes
            .map((exam) => ({
                id: exam.id,
                title: exam.title,
                author: [exam.creator.firstName, exam.creator.lastName].filter(Boolean).join(' ') || 'Unknown author',
                authorAvatar: exam.creator.profilePicture,
                count: exam._count.attempts,
            }))
            .sort((first, second) => second.count - first.count || first.title.localeCompare(second.title))
            .slice(0, 6),
        examStatuses,
    };
};

export class DashboardService {
    private getDailySeed(userId: string) {
        const dateKey = new Date().toISOString().slice(0, 10);
        const seed = `${userId}:${dateKey}`;

        return seed.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
    }

    async getDailyQuestion(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { programTrack: true },
        });

        const where: any = {
            exam: {
                status: 'LIVE',
            },
        };

        if (user?.programTrack) {
            where.exam = {
                status: 'LIVE',
                OR: [
                    { programTrack: user.programTrack },
                    { programTrack: null },
                ],
            };
        }

        const totalQuestions = await prisma.examQuestion.count({ where });
        if (totalQuestions === 0) {
            return null;
        }

        const skip = this.getDailySeed(userId) % totalQuestions;

        const question = await prisma.examQuestion.findFirst({
            where,
            select: {
                id: true,
                questionText: true,
                choiceA: true,
                choiceB: true,
                choiceC: true,
                choiceD: true,
                exam: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                    },
                },
            },
            orderBy: { id: 'asc' },
            skip,
            take: 1,
        });

        if (!question) {
            return null;
        }

        return {
            questionId: question.id,
            examId: question.exam.id,
            examTitle: question.exam.title,
            subject: question.exam.subject,
            questionText: question.questionText,
            choices: {
                A: question.choiceA,
                B: question.choiceB,
                C: question.choiceC,
                D: question.choiceD,
            },
        };
    }

    async checkDailyQuestionAnswer(userId: string, questionId: string, selectedChoice: string, timezoneOffsetMinutes: number = 0) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { programTrack: true },
        });

        const where: any = {
            id: questionId,
            exam: {
                status: 'LIVE',
            },
        };

        if (user?.programTrack) {
            where.exam = {
                status: 'LIVE',
                OR: [
                    { programTrack: user.programTrack },
                    { programTrack: null },
                ],
            };
        }

        const question = await prisma.examQuestion.findFirst({
            where,
            select: {
                id: true,
                questionText: true,
                correctChoice: true,
                rationalization: true,
                exam: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!question) {
            throw ApiError.notFound('Daily question not found');
        }

        const normalizedChoice = selectedChoice.toUpperCase();
        const normalizedCorrect = question.correctChoice.toUpperCase();

        // Record streak activity for daily question (fire-and-forget).
        streakService.recordActivity(userId, 'DAILY_QUESTION', timezoneOffsetMinutes).catch((err) => console.error('[streak] DAILY_QUESTION recordActivity failed:', err));

        return {
            questionId: question.id,
            examId: question.exam.id,
            examTitle: question.exam.title,
            questionText: question.questionText,
            selectedChoice: normalizedChoice,
            correctChoice: normalizedCorrect,
            isCorrect: normalizedChoice === normalizedCorrect,
            rationalization: question.rationalization,
        };
    }

    /**
     * Get dashboard stats for a reviewee.
     */
    async getRevieweeStats(userId: string) {
        const [attempts, totalExams, totalMaterials, upcomingSessions, recentAttempts, examAnswersAnswered, deckAnswersAnswered] = await Promise.all([
            prisma.attempt.findMany({
                where: { userId, status: { not: 'IN_PROGRESS' } },
                select: { score: true, percentage: true, exam: { select: { subject: true } } },
            }),
            prisma.exam.count({ where: { status: 'LIVE' } }),
            prisma.studyDeck.count({ where: { visibility: 'PUBLISHED' } }),
            prisma.conference.findMany({
                where: { startAt: { gte: new Date() } },
                include: { host: { select: { firstName: true, lastName: true } } },
                orderBy: { startAt: 'asc' },
                take: 5,
            }),
            prisma.attempt.findMany({
                where: { userId, status: { not: 'IN_PROGRESS' } },
                include: { exam: { select: { id: true, title: true, subject: true, timeLimitMinutes: true } } },
                orderBy: { submittedAt: 'desc' },
                take: 4,
            }),
            prisma.attemptAnswer.count({
                where: {
                    answeredAt: { not: null },
                    attempt: { userId },
                },
            }),
            prisma.deckSessionItem.count({
                where: {
                    selectedChoice: { not: null },
                    session: { userId },
                },
            }),
        ]);

        // Look up user's track for upcoming exams visibility.  Use trackId
        // (UUID FK to the Track table), NOT programTrack (a legacy free-text
        // string).  buildTrackVisibilityFilter expects a UUID because it
        // filters through the trackLinks junction table.
        const revieweeUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { trackId: true },
        });

        const upcomingExams = await prisma.exam.findMany({
            where: {
                status: 'LIVE',
                scheduleStart: { gte: new Date() },
                ...buildTrackVisibilityFilter(revieweeUser?.trackId),
            },
            select: {
                id: true,
                title: true,
                subject: true,
                scheduleStart: true,
                scheduleEnd: true,
                programTrack: true,
                status: true,
            },
            orderBy: { scheduleStart: 'asc' },
            take: 5,
        });

        const subjectScores: Record<string, { total: number; count: number }> = {};
        for (const attempt of attempts) {
            const subject = attempt.exam.subject || 'General';
            if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
            if (attempt.percentage !== null) {
                subjectScores[subject].total += Number(attempt.percentage);
                subjectScores[subject].count += 1;
            }
        }

        const averagesBySubject = Object.entries(subjectScores).map(([subject, data]) => ({
            subject,
            average: data.count > 0 ? Math.round(data.total / data.count) : 0,
        }));

        const overallAverage = attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / attempts.length)
            : 0;

        return {
            overallAverage,
            averagesBySubject,
            totalExamsTaken: attempts.length,
            totalExamsAvailable: totalExams,
            totalMaterials,
            questionsAnswered: examAnswersAnswered + deckAnswersAnswered,
            upcomingSessions,
            recentAttempts,
            upcomingExams,
        };
    }

    /**
     * Get compact exam performance metrics used on the reviewee profile page.
     */
    async getRevieweeProfilePerformance(userId: string) {
        const submittedAttempts = await prisma.attempt.findMany({
            where: {
                userId,
                status: 'SUBMITTED',
            },
            select: {
                id: true,
                percentage: true,
                score: true,
                timeSpentSeconds: true,
                submittedAt: true,
                exam: {
                    select: {
                        id: true,
                        title: true,
                        _count: {
                            select: {
                                questions: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                submittedAt: 'desc',
            },
        });

        const [correctAnswers, wrongAnswers, answeredQuestions] = await Promise.all([
            prisma.attemptAnswer.count({
                where: {
                    isCorrect: true,
                    attempt: {
                        userId,
                        status: 'SUBMITTED',
                    },
                },
            }),
            prisma.attemptAnswer.count({
                where: {
                    isCorrect: false,
                    attempt: {
                        userId,
                        status: 'SUBMITTED',
                    },
                },
            }),
            prisma.attemptAnswer.count({
                where: {
                    attempt: {
                        userId,
                        status: 'SUBMITTED',
                    },
                },
            }),
        ]);

        const totalExamsAnswered = submittedAttempts.length;
        const totalScore = submittedAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0);
        const totalTimeSpentSeconds = submittedAttempts.reduce((sum, attempt) => sum + Math.max(0, attempt.timeSpentSeconds || 0), 0);
        const totalQuestionsServed = submittedAttempts.reduce(
            (sum, attempt) => sum + Math.max(0, attempt.exam?._count?.questions || 0),
            0,
        );

        const averageScore = totalExamsAnswered > 0
            ? Math.round((totalScore / totalExamsAnswered) * 100) / 100
            : 0;

        const highestScoreAttempt = submittedAttempts.reduce<typeof submittedAttempts[number] | null>((best, current) => {
            if (!best) return current;
            return Number(current.percentage || 0) > Number(best.percentage || 0) ? current : best;
        }, null);

        const fastestAttempt = submittedAttempts.reduce<typeof submittedAttempts[number] | null>((best, current) => {
            if (!best) return current;
            return Math.max(0, current.timeSpentSeconds || 0) < Math.max(0, best.timeSpentSeconds || 0) ? current : best;
        }, null);

        const averageCompletionSeconds = totalExamsAnswered > 0
            ? Math.round(totalTimeSpentSeconds / totalExamsAnswered)
            : 0;

        const averageTimePerAnsweredQuestionSeconds = answeredQuestions > 0
            ? Math.round(totalTimeSpentSeconds / answeredQuestions)
            : 0;

        const totalSkippedQuestions = Math.max(totalQuestionsServed - answeredQuestions, 0);
        const accuracy = answeredQuestions > 0
            ? Math.round((correctAnswers / answeredQuestions) * 10000) / 100
            : 0;

        return {
            totalExamsAnswered,
            averageScore,
            averageCompletionSeconds,
            averageTimePerAnsweredQuestionSeconds,
            accuracy,
            totals: {
                correctAnswers,
                wrongAnswers,
                answeredQuestions,
                skippedQuestions: totalSkippedQuestions,
                questionsServed: totalQuestionsServed,
            },
            highestScore: highestScoreAttempt
                ? {
                    percentage: Math.round(Number(highestScoreAttempt.percentage || 0) * 100) / 100,
                    score: highestScoreAttempt.score,
                    examId: highestScoreAttempt.exam.id,
                    examTitle: highestScoreAttempt.exam.title,
                    submittedAt: highestScoreAttempt.submittedAt,
                }
                : null,
            fastestCompletion: fastestAttempt
                ? {
                    seconds: Math.max(0, fastestAttempt.timeSpentSeconds || 0),
                    examId: fastestAttempt.exam.id,
                    examTitle: fastestAttempt.exam.title,
                    submittedAt: fastestAttempt.submittedAt,
                }
                : null,
            recentAttempts: submittedAttempts.slice(0, 5).map((attempt) => ({
                id: attempt.id,
                examId: attempt.exam.id,
                examTitle: attempt.exam.title,
                percentage: Math.round(Number(attempt.percentage || 0) * 100) / 100,
                score: attempt.score,
                timeSpentSeconds: Math.max(0, attempt.timeSpentSeconds || 0),
                submittedAt: attempt.submittedAt,
            })),
        };
    }

    /**
     * Get dashboard stats for a reviewer.
     */
    async getReviewerStats(userId: string) {
        const [
            examsCreated,
            decksCreated,
            totalAttempts,
            upcomingSessions,
            recentAttempts,
            recentExams,
            activityFeed,
            upcomingExams,
            examVolumes,
            attemptScoreRows,
            examStatusCounts,
        ] = await Promise.all([
            prisma.exam.count({ where: { createdBy: userId } }),
            prisma.studyDeck.count({ where: { createdBy: userId } }),
            prisma.attempt.count({
                where: { exam: { createdBy: userId }, status: { not: 'IN_PROGRESS' } },
            }),
            prisma.conference.findMany({
                where: { hostId: userId, startAt: { gte: new Date() } },
                orderBy: { startAt: 'asc' },
                take: 5,
            }),
            prisma.attempt.findMany({
                where: { exam: { createdBy: userId }, status: { not: 'IN_PROGRESS' } },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    exam: { select: { id: true, title: true, subject: true } },
                },
                orderBy: { submittedAt: 'desc' },
                take: 8,
            }),
            prisma.exam.findMany({
                where: { createdBy: userId },
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            attempts: { where: { status: { not: 'IN_PROGRESS' } } },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: 6,
            }),
            prisma.exam.findMany({
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    status: true,
                    createdAt: true,
                    creator: {
                        select: { firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
            prisma.exam.findMany({
                where: {
                    createdBy: userId,
                    status: 'LIVE',
                    scheduleStart: { gte: new Date() },
                },
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    scheduleStart: true,
                    scheduleEnd: true,
                    programTrack: true,
                    status: true,
                },
                orderBy: { scheduleStart: 'asc' },
                take: 5,
            }),
            prisma.exam.findMany({
                where: { createdBy: userId },
                select: {
                    id: true,
                    title: true,
                    creator: { select: { firstName: true, lastName: true, profilePicture: true } },
                    _count: {
                        select: {
                            attempts: { where: { status: { not: 'IN_PROGRESS' } } },
                        },
                    },
                },
            }),
            prisma.attempt.findMany({
                where: { exam: { createdBy: userId }, status: { not: 'IN_PROGRESS' } },
                select: {
                    percentage: true,
                    userId: true,
                    submittedAt: true,
                    updatedAt: true,
                    user: { select: { programTrack: true } },
                },
            }),
            prisma.exam.groupBy({
                by: ['status'],
                where: { createdBy: userId },
                _count: true,
            }),
        ]);

        return {
            examsCreated,
            decksCreated,
            totalAttempts,
            upcomingSessions,
            recentAttempts,
            recentExams,
            activityFeed,
            upcomingExams,
            analytics: buildDashboardAnalytics(attemptScoreRows, examVolumes, examStatusCounts),
        };
    }

    /**
     * Get dashboard stats for an admin.
     */
    async getAdminStats() {
        const now = new Date();
        const [
            totalUsers,
            pendingUsers,
            totalExams,
            totalAttempts,
            totalMaterials,
            totalSessions,
            activeSessions,
            recentMockExams,
            recentMaterials,
            recentSubmissions,
            recentUsers,
            recentAuditLogs,
            upcomingExams,
            examVolumes,
            attemptScoreRows,
            examStatusCounts,
        ] = await Promise.all([
            prisma.user.count(),
            // Admin approval was removed with the move to Google SSO, so there
            // is no pending queue. Kept as a constant zero to preserve the
            // dashboard response shape for existing clients.
            Promise.resolve(0),
            prisma.exam.count(),
            prisma.attempt.count({ where: { status: { not: 'IN_PROGRESS' } } }),
            prisma.studyDeck.count(),
            prisma.conference.count(),
            prisma.conference.count({ where: { startAt: { gte: now } } }),
            prisma.exam.findMany({
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    programTrack: true,
                    status: true,
                    createdAt: true,
                    creator: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.studyDeck.findMany({
                select: {
                    id: true,
                    title: true,
                    category: true,
                    visibility: true,
                    createdAt: true,
                    creator: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.attempt.findMany({
                where: { status: { not: 'IN_PROGRESS' } },
                select: {
                    id: true,
                    percentage: true,
                    submittedAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true,
                        },
                    },
                    exam: {
                        select: {
                            title: true,
                        },
                    },
                },
                orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
                take: 5,
            }),
            prisma.user.findMany({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    programTrack: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.auditLog.findMany({
                select: {
                    id: true,
                    action: true,
                    summary: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.exam.findMany({
                where: {
                    status: 'LIVE',
                    scheduleStart: { gte: now },
                },
                select: {
                    id: true,
                    title: true,
                    subject: true,
                    scheduleStart: true,
                    scheduleEnd: true,
                    programTrack: true,
                    status: true,
                },
                orderBy: { scheduleStart: 'asc' },
                take: 5,
            }),
            prisma.exam.findMany({
                select: {
                    id: true,
                    title: true,
                    creator: { select: { firstName: true, lastName: true, profilePicture: true } },
                    _count: {
                        select: {
                            attempts: { where: { status: { not: 'IN_PROGRESS' } } },
                        },
                    },
                },
            }),
            prisma.attempt.findMany({
                where: { status: { not: 'IN_PROGRESS' } },
                select: {
                    percentage: true,
                    userId: true,
                    submittedAt: true,
                    updatedAt: true,
                    user: { select: { programTrack: true } },
                },
            }),
            prisma.exam.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);

        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: true,
        });

        return {
            totalUsers,
            pendingUsers,
            pendingApprovals: pendingUsers,
            totalExams,
            totalAttempts,
            totalMaterials,
            totalSessions,
            activeSessions,
            usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
            recentMockExams: recentMockExams.map((exam) => ({
                id: exam.id,
                title: exam.title,
                program: exam.programTrack || exam.subject || 'General',
                status: exam.status,
                createdAt: exam.createdAt,
                uploaderName: `${exam.creator.firstName} ${exam.creator.lastName}`.trim(),
                uploaderAvatar: exam.creator.profilePicture,
            })),
            recentMaterials: recentMaterials.map((material) => ({
                id: material.id,
                title: material.title,
                category: material.category?.name || 'No Category',
                visibility: material.visibility,
                createdAt: material.createdAt,
                uploaderName: `${material.creator.firstName} ${material.creator.lastName}`.trim(),
                uploaderAvatar: material.creator.profilePicture,
            })),
            recentSubmissions: recentSubmissions.map((attempt) => ({
                id: attempt.id,
                student: `${attempt.user.firstName} ${attempt.user.lastName}`.trim(),
                studentAvatar: attempt.user.profilePicture,
                task: attempt.exam.title,
                score: Number(attempt.percentage),
                submittedAt: attempt.submittedAt || attempt.updatedAt,
            })),
            recentUsers: recentUsers.map((user) => ({
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                major: user.programTrack || 'General',
                status: user.status,
                createdAt: user.createdAt,
            })),
            activityFeed: recentAuditLogs.map((log) => ({
                id: log.id,
                title: log.summary || log.action,
                sub: log.summary || `Action: ${log.action}`,
                createdAt: log.createdAt,
            })),
            upcomingExams,
            analytics: buildDashboardAnalytics(attemptScoreRows, examVolumes, examStatusCounts),
        };
    }
}

export const dashboardService = new DashboardService();
