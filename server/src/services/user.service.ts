import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Role, UserStatus } from '@prisma/client';

export class UserService {
    /**
     * List all users with pagination and optional filters.
     */
    async listUsers(params: {
        page?: number;
        limit?: number;
        role?: Role;
        status?: UserStatus;
        search?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.role) where.role = params.role;
        if (params.status) where.status = params.status;
        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    role: true,
                    status: true,
                    program: true,
                    major: true,
                    yearLevel: true,
                    section: true,
                    createdAt: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    }

    /**
     * Update a user's status (approve/reject).
     */
    async updateUserStatus(userId: string, status: UserStatus) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        return prisma.user.update({
            where: { id: userId },
            data: { status },
            select: {
                id: true, email: true, name: true, role: true, status: true,
            },
        });
    }

    /**
     * Update a user's role.
     */
    async updateUserRole(userId: string, role: Role) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        return prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true, email: true, name: true, role: true, status: true,
            },
        });
    }

    /**
     * Delete a user.
     */
    async deleteUser(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        await prisma.user.delete({ where: { id: userId } });
        return { id: userId };
    }

    /**
     * Get user achievements based on activity.
     */
    async getAchievements(userId: string) {
        const attempts = await prisma.attempt.findMany({
            where: { userId, status: { not: 'IN_PROGRESS' } },
            select: { score: true, percentage: true, startedAt: true },
        });

        const achievements = [
            { id: '1', title: 'First Step', description: 'Take your first exam', icon: '🎓', isUnlocked: attempts.length >= 1 },
            { id: '2', title: 'Speed Demon', description: 'Complete 5 exams', icon: '⚡', isUnlocked: attempts.length >= 5 },
            { id: '3', title: 'Accuracy Master', description: '90% score 3x', icon: '🎯', isUnlocked: attempts.filter(a => (a.percentage || 0) >= 90).length >= 3 },
            { id: '4', title: 'Knowledge Keeper', description: 'Study 100 flashcards', icon: '📚', isUnlocked: true }, // Placeholder for now
            { id: '5', title: 'Champion', description: 'Get a perfect score', icon: '🏆', isUnlocked: attempts.some(a => (a.percentage || 0) === 100) },
            { id: '6', title: 'On Fire', description: '10-day study streak', icon: '🔥', isUnlocked: false }, // Logic needed for streak
            { id: '7', title: 'Subject Expert', description: 'Master a subject', icon: '📖', isUnlocked: attempts.some(a => (a.percentage || 0) >= 95) },
            { id: '8', title: 'Session Pro', description: 'Join 5 live sessions', icon: '🎬', isUnlocked: true }, // Placeholder
            { id: '9', title: 'Rising Star', description: '50% score improvement', icon: '🌟', isUnlocked: false },
            { id: '10', title: 'Diamond', description: 'Unlock 20 badges', icon: '💎', isUnlocked: false }
        ];

        return achievements;
    }
}

export const userService = new UserService();
