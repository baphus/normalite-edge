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
                status: 'PUBLISHED',
            },
        };

        if (user?.programTrack) {
            where.exam = {
                status: 'PUBLISHED',
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
                status: 'PUBLISHED',
            },
        };

        if (user?.programTrack) {
            where.exam = {
                status: 'PUBLISHED',
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
            prisma.exam.count({ where: { status: 'PUBLISHED' } }),
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
     * Get dashboard stats for a reviewer.
     */
    async getReviewerStats(userId: string) {
        const [examsCreated, totalAttempts, upcomingSessions, recentAttempts] = await Promise.all([
            prisma.exam.count({ where: { createdBy: userId } }),
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
                take: 10,
            }),
        ]);

        return {
            examsCreated,
            totalAttempts,
            upcomingSessions,
            recentAttempts,
        };
    }

    /**
     * Get dashboard stats for an admin.
     */
    async getAdminStats() {
        const now = new Date();
        const [totalUsers, pendingUsers, totalExams, totalAttempts, totalMaterials, totalSessions, activeSessions] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'PENDING' } }),
            prisma.exam.count(),
            prisma.attempt.count({ where: { status: { not: 'IN_PROGRESS' } } }),
            prisma.studyDeck.count(),
            prisma.conference.count(),
            prisma.conference.count({ where: { startAt: { gte: now } } }),
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
        };
    }
}

export const dashboardService = new DashboardService();
