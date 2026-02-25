import prisma from '../config/db';

export class NotificationService {
    async listNotifications(userId: string, params: { page?: number; limit?: number; unreadOnly?: boolean }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { userId };
        if (params.unreadOnly) where.read = false;

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
            where: { id: notificationId, userId },
            data: { read: true },
        });
    }

    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }

    async createNotification(data: {
        userId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
    }) {
        return prisma.notification.create({ data });
    }
}

export const notificationService = new NotificationService();
