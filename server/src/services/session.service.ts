import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Role } from '@prisma/client';
import { notificationService } from './notification.service';

export class SessionService {
    private combineDateTime(date: Date, hhmm: string) {
        const [hour, minute] = hhmm.split(':').map((v) => Number(v));
        const value = new Date(date);
        value.setHours(hour || 0, minute || 0, 0, 0);
        return value;
    }

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
            where.startAt = { gte: new Date() };
        }

        const [sessions, total] = await Promise.all([
            prisma.conference.findMany({
                where,
                include: {
                    host: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } },
                },
                skip,
                take: limit,
                orderBy: { startAt: 'asc' },
            }),
            prisma.conference.count({ where }),
        ]);

        const normalized = sessions.map((session) => ({
            ...session,
            createdBy: session.hostId,
            scheduledDate: session.startAt,
            startTime: `${session.startAt.getHours().toString().padStart(2, '0')}:${session.startAt.getMinutes().toString().padStart(2, '0')}`,
            endTime: `${session.endAt.getHours().toString().padStart(2, '0')}:${session.endAt.getMinutes().toString().padStart(2, '0')}`,
            creator: {
                ...session.host,
                name: `${session.host.firstName} ${session.host.lastName}`.trim(),
            },
            program_track: session.programTrack || null,
        }));

        return { sessions: normalized, total, page, limit };
    }

    async getSession(id: string) {
        const session = await prisma.conference.findUnique({
            where: { id },
            include: { host: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } },
        });
        if (!session) throw ApiError.notFound('Session not found');
        return {
            ...session,
            createdBy: session.hostId,
            creator: {
                ...session.host,
                name: `${session.host.firstName} ${session.host.lastName}`.trim(),
            },
        };
    }

    async createSession(data: {
        title: string;
        description?: string;
        meetingLink: string;
        recordingLink?: string;
        platform: string;
        scheduledDate: Date;
        startTime: string;
        endTime: string;
        programTrack?: string;
        createdBy: string;
    }) {
        const session = await prisma.conference.create({
            data: {
                title: data.title,
                description: data.description,
                meetingLink: data.meetingLink,
                recordingLink: data.recordingLink,
                hostId: data.createdBy,
                startAt: this.combineDateTime(data.scheduledDate, data.startTime),
                endAt: this.combineDateTime(data.scheduledDate, data.endTime),
                programTrack: data.programTrack,
            },
            include: { host: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } },
        });

        const recipientUserIds = await notificationService.getActiveRevieweeIds(session.programTrack || undefined);
        await notificationService.createNotifications({
            recipientUserIds,
            type: 'CONFERENCE_SCHEDULED',
            title: 'Conference Scheduled',
            message: `A conference has been scheduled: ${session.title}`,
            link: '/conferences',
            entityType: 'conference',
            entityId: session.id,
            severity: 'INFO',
        });

        return session;
    }

    async updateSession(id: string, userId: string, userRole: Role, data: {
        title?: string;
        description?: string;
        meetingLink?: string;
        recordingLink?: string;
        platform?: string;
        scheduledDate?: Date;
        startTime?: string;
        endTime?: string;
        programTrack?: string;
    }) {
        const session = await prisma.conference.findUnique({ where: { id } });
        if (!session) throw ApiError.notFound('Session not found');
        if (userRole !== 'ADMIN' && session.hostId !== userId) {
            throw ApiError.forbidden('You can only edit sessions you created');
        }

        const startAt = data.scheduledDate && data.startTime
            ? this.combineDateTime(data.scheduledDate, data.startTime)
            : undefined;
        const endAt = data.scheduledDate && data.endTime
            ? this.combineDateTime(data.scheduledDate, data.endTime)
            : undefined;

        const updated = await prisma.conference.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                meetingLink: data.meetingLink,
                recordingLink: data.recordingLink,
                programTrack: data.programTrack,
                startAt,
                endAt,
            },
            include: { host: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } },
        });

        const recipientUserIds = await notificationService.getActiveRevieweeIds(updated.programTrack || undefined);
        await notificationService.createNotifications({
            recipientUserIds,
            type: 'CONFERENCE_UPDATED',
            title: 'Conference Updated',
            message: `Conference details were updated: ${updated.title}`,
            link: '/conferences',
            entityType: 'conference',
            entityId: updated.id,
            severity: 'INFO',
        });

        return updated;
    }

    async deleteSession(id: string, userId: string, userRole: Role) {
        const session = await prisma.conference.findUnique({ where: { id } });
        if (!session) throw ApiError.notFound('Session not found');
        if (userRole !== 'ADMIN' && session.hostId !== userId) {
            throw ApiError.forbidden('You can only delete sessions you created');
        }
        await prisma.conference.delete({ where: { id } });
        return { id };
    }
}

export const sessionService = new SessionService();
