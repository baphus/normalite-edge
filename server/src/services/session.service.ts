import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class SessionService {
    async listSessions(params: {
        page?: number;
        limit?: number;
        upcoming?: boolean;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.upcoming) {
            where.scheduledDate = { gte: new Date() };
        }

        const [sessions, total] = await Promise.all([
            prisma.liveSession.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                },
                skip,
                take: limit,
                orderBy: { scheduledDate: 'asc' },
            }),
            prisma.liveSession.count({ where }),
        ]);

        return { sessions, total, page, limit };
    }

    async getSession(id: string) {
        const session = await prisma.liveSession.findUnique({
            where: { id },
            include: { creator: { select: { id: true, name: true } } },
        });
        if (!session) throw ApiError.notFound('Session not found');
        return session;
    }

    async createSession(data: {
        title: string;
        description?: string;
        meetingLink: string;
        platform: string;
        scheduledDate: Date;
        startTime: string;
        endTime: string;
        createdBy: string;
    }) {
        return prisma.liveSession.create({
            data,
            include: { creator: { select: { id: true, name: true } } },
        });
    }

    async updateSession(id: string, data: {
        title?: string;
        description?: string;
        meetingLink?: string;
        platform?: string;
        scheduledDate?: Date;
        startTime?: string;
        endTime?: string;
    }) {
        const session = await prisma.liveSession.findUnique({ where: { id } });
        if (!session) throw ApiError.notFound('Session not found');

        return prisma.liveSession.update({
            where: { id },
            data,
            include: { creator: { select: { id: true, name: true } } },
        });
    }

    async deleteSession(id: string) {
        const session = await prisma.liveSession.findUnique({ where: { id } });
        if (!session) throw ApiError.notFound('Session not found');
        await prisma.liveSession.delete({ where: { id } });
        return { id };
    }
}

export const sessionService = new SessionService();
