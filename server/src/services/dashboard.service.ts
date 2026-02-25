import prisma from '../config/db';

export class DashboardService {
    /**
     * Get dashboard stats for a reviewee.
     */
    async getRevieweeStats(userId: string) {
        const [attempts, totalExams, totalMaterials, upcomingSessions, recentAttempts] = await Promise.all([
            prisma.attempt.findMany({
                where: { userId, status: { not: 'IN_PROGRESS' } },
                select: { score: true, percentage: true, exam: { select: { subject: true, totalItems: true } } },
            }),
            prisma.exam.count({ where: { isPublished: true } }),
            prisma.material.count(),
            prisma.liveSession.findMany({
                where: { scheduledDate: { gte: new Date() } },
                include: { creator: { select: { name: true } } },
                orderBy: { scheduledDate: 'asc' },
                take: 5,
            }),
            prisma.attempt.findMany({
                where: { userId, status: { not: 'IN_PROGRESS' } },
                include: { exam: { select: { id: true, title: true, subject: true, totalItems: true, timeLimit: true } } },
                orderBy: { completedAt: 'desc' },
                take: 4,
            }),
        ]);

        // Calculate average scores by subject
        const subjectScores: Record<string, { total: number; count: number }> = {};
        for (const attempt of attempts) {
            const subject = attempt.exam.subject;
            if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
            if (attempt.percentage !== null) {
                subjectScores[subject].total += attempt.percentage;
                subjectScores[subject].count += 1;
            }
        }

        const averagesBySubject = Object.entries(subjectScores).map(([subject, data]) => ({
            subject,
            average: Math.round(data.total / data.count),
        }));

        const overallAverage = attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
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
            prisma.liveSession.findMany({
                where: { createdBy: userId, scheduledDate: { gte: new Date() } },
                orderBy: { scheduledDate: 'asc' },
                take: 5,
            }),
            prisma.attempt.findMany({
                where: { exam: { createdBy: userId }, status: { not: 'IN_PROGRESS' } },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    exam: { select: { id: true, title: true, subject: true } },
                },
                orderBy: { completedAt: 'desc' },
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
        const [totalUsers, pendingUsers, totalExams, totalAttempts, totalMaterials, totalSessions] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'PENDING' } }),
            prisma.exam.count(),
            prisma.attempt.count({ where: { status: { not: 'IN_PROGRESS' } } }),
            prisma.material.count(),
            prisma.liveSession.count(),
        ]);

        // Users by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: true,
        });

        return {
            totalUsers,
            pendingUsers,
            totalExams,
            totalAttempts,
            totalMaterials,
            totalSessions,
            usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count })),
        };
    }
}

export const dashboardService = new DashboardService();
