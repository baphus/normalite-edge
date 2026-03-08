import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

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

    async checkDailyQuestionAnswer(userId: string, questionId: string, selectedChoice: string) {
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
        const [attempts, totalExams, totalMaterials, upcomingSessions, recentAttempts] = await Promise.all([
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
        ]);

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
            upcomingSessions,
            recentAttempts,
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
                    _count: { select: { attempts: true } },
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
        ]);

        return {
            examsCreated,
            decksCreated,
            totalAttempts,
            upcomingSessions,
            recentAttempts,
            recentExams,
            activityFeed,
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
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'PENDING' } }),
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
                category: material.category,
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
        };
    }
}

export const dashboardService = new DashboardService();
