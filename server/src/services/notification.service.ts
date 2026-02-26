import prisma from '../config/db';

export class NotificationService {
    async listNotifications(userId: string, params: { page?: number; limit?: number; unreadOnly?: boolean }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { recipientUserId: userId };
        if (params.unreadOnly) where.isRead = false;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.notification.count({ where }),
        ]);

        return { notifications, total, page, limit };
    }

    async markAsRead(notificationId: string, userId: string) {
        return prisma.notification.updateMany({
            where: { id: notificationId, recipientUserId: userId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { recipientUserId: userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { recipientUserId: userId, isRead: false },
        });
    }

    async createNotification(data: {
        recipientUserId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        entityType?: string;
        entityId?: string;
        severity?: string;
    }) {
        return prisma.notification.create({ data });
    }

    async createNotifications(data: {
        recipientUserIds: string[];
        type: string;
        title: string;
        message: string;
        link?: string;
        entityType?: string;
        entityId?: string;
        severity?: string;
    }) {
        const recipientUserIds = Array.from(new Set(data.recipientUserIds.filter(Boolean)));
        if (recipientUserIds.length === 0) return { count: 0 };

        return prisma.notification.createMany({
            data: recipientUserIds.map((recipientUserId) => ({
                recipientUserId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                entityType: data.entityType,
                entityId: data.entityId,
                severity: data.severity || 'INFO',
            })),
        });
    }

    async getActiveRevieweeIds(programTrack?: string, excludeUserId?: string) {
        const users = await prisma.user.findMany({
            where: {
                role: 'REVIEWEE',
                status: 'ACTIVE',
                ...(programTrack ? { programTrack } : {}),
                ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
            },
            select: { id: true },
        });

        return users.map((user) => user.id);
    }

    async getActiveRevieweeIdsByTrackLabels(trackLabels?: string[], excludeUserId?: string) {
        const normalized = Array.from(
            new Set((trackLabels || []).map((label) => label.trim()).filter(Boolean))
        );

        if (normalized.length === 0) {
            return this.getActiveRevieweeIds(undefined, excludeUserId);
        }

        const users = await prisma.user.findMany({
            where: {
                role: 'REVIEWEE',
                status: 'ACTIVE',
                programTrack: { in: normalized },
                ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
            },
            select: { id: true },
        });

        return users.map((user) => user.id);
    }
}

export const notificationService = new NotificationService();
