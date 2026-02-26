import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { fromDbUserStatus, resolveProgramTrack, toDbUserStatus } from '../utils/requirementsCompat';
import { notificationService } from './notification.service';

export class UserService {
    private splitName(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || 'Account';
        return { firstName, lastName };
    }

    /**
     * List all users with pagination and optional filters.
     */
    async listUsers(params: {
        page?: number;
        limit?: number;
        role?: Role;
        status?: string;
        search?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.role) where.role = params.role;
        if (params.status) where.status = toDbUserStatus(params.status);
        if (params.search) {
            where.OR = [
                { firstName: { contains: params.search, mode: 'insensitive' } },
                { lastName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    programTrack: true,
                    createdAt: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        const normalized = users.map((user) => ({
            ...user,
            name: `${user.firstName} ${user.lastName}`.trim(),
            status: fromDbUserStatus(user.status as string),
            program_track: user.programTrack,
        }));

        return { users: normalized, total, page, limit };
    }

    async createUser(data: {
        name: string;
        email: string;
        password: string;
        role: Role;
        status?: string;
        program_track?: string;
        major?: string;
        yearLevel?: string;
        section?: string;
    }) {
        const email = data.email.trim().toLowerCase();
        const { firstName, lastName } = this.splitName(data.name);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw ApiError.conflict('User with this email already exists');

        const passwordHash = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                passwordHash,
                role: data.role,
                status: toDbUserStatus(data.status || 'ACTIVE') as any,
                programTrack: resolveProgramTrack({ program_track: data.program_track }),
                createdByAdmin: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                programTrack: true,
                createdAt: true,
            },
        });

        return {
            ...user,
            name: `${user.firstName} ${user.lastName}`.trim(),
            status: fromDbUserStatus(user.status as string),
            program_track: user.programTrack,
        };
    }

    /**
     * Update a user's status (approve/reject).
     */
    async updateUserStatus(userId: string, status: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        const normalizedStatus = toDbUserStatus(status) as any;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { status: normalizedStatus },
            select: {
                id: true, email: true, firstName: true, lastName: true, role: true, status: true,
            },
        });

        if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'DISABLED') {
            const isApproved = normalizedStatus === 'ACTIVE';
            await notificationService.createNotification({
                recipientUserId: updated.id,
                type: isApproved ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
                title: isApproved ? 'Account Approved' : 'Account Rejected',
                message: isApproved
                    ? 'Your account has been approved. You can now access the platform.'
                    : 'Your account has been rejected or disabled. Please contact an administrator for details.',
                link: '/settings',
                entityType: 'user',
                entityId: updated.id,
                severity: isApproved ? 'INFO' : 'WARNING',
            });
        }

        return {
            ...updated,
            name: `${updated.firstName} ${updated.lastName}`.trim(),
            status: fromDbUserStatus(updated.status as string),
        };
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
                id: true, email: true, firstName: true, lastName: true, role: true, status: true,
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
            { id: '3', title: 'Accuracy Master', description: '90% score 3x', icon: '🎯', isUnlocked: attempts.filter(a => Number(a.percentage || 0) >= 90).length >= 3 },
            { id: '4', title: 'Knowledge Keeper', description: 'Study 100 flashcards', icon: '📚', isUnlocked: true }, // Placeholder for now
            { id: '5', title: 'Champion', description: 'Get a perfect score', icon: '🏆', isUnlocked: attempts.some(a => Number(a.percentage || 0) === 100) },
            { id: '6', title: 'On Fire', description: '10-day study streak', icon: '🔥', isUnlocked: false }, // Logic needed for streak
            { id: '7', title: 'Subject Expert', description: 'Master a subject', icon: '📖', isUnlocked: attempts.some(a => Number(a.percentage || 0) >= 95) },
            { id: '8', title: 'Session Pro', description: 'Join 5 live sessions', icon: '🎬', isUnlocked: true }, // Placeholder
            { id: '9', title: 'Rising Star', description: '50% score improvement', icon: '🌟', isUnlocked: false },
            { id: '10', title: 'Diamond', description: 'Unlock 20 badges', icon: '💎', isUnlocked: false }
        ];

        return achievements;
    }
}

export const userService = new UserService();
