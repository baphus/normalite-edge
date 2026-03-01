import prisma from '../config/db';

export class AuditService {
    async log(data: {
        actorId: string;
        actorRole: string;
        action: string;
        entityType: string;
        entityId?: string;
        summary?: string;
        metadata?: Record<string, unknown>;
    }) {
        await (prisma as any).auditLog.create({
            data: {
                actorId: data.actorId,
                actorRole: data.actorRole,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                summary: data.summary,
                metadata: data.metadata,
            },
        });
    }

    async listLogs(params: {
        page?: number;
        limit?: number;
        action?: string;
        entityType?: string;
        actorId?: string;
        actorRole?: string;
        from?: string;
        to?: string;
        search?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.action) where.action = params.action;
        if (params.entityType) where.entityType = params.entityType;
        if (params.actorId) where.actorId = params.actorId;
        if (params.actorRole) where.actorRole = params.actorRole;
        if (params.from || params.to) {
            where.createdAt = {
                ...(params.from ? { gte: new Date(params.from) } : {}),
                ...(params.to ? { lte: new Date(params.to) } : {}),
            };
        }
        if (params.search) {
            where.OR = [
                { summary: { contains: params.search, mode: 'insensitive' } },
                { entityType: { contains: params.search, mode: 'insensitive' } },
                { action: { equals: params.search as any } },
                { actorRole: { equals: params.search as any } },
                { actor: { firstName: { contains: params.search, mode: 'insensitive' } } },
                { actor: { lastName: { contains: params.search, mode: 'insensitive' } } },
                { actor: { email: { contains: params.search, mode: 'insensitive' } } },
            ];
        }

        const [logs, total] = await Promise.all([
            (prisma as any).auditLog.findMany({
                where,
                include: {
                    actor: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            (prisma as any).auditLog.count({ where }),
        ]);

        return { logs, total, page, limit };
    }

    async listContentActivity(params: { page?: number; limit?: number }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where = {
            entityType: { in: ['exam', 'material', 'session'] },
            action: { in: ['CREATE', 'UPDATE'] },
        };

        const [activities, total] = await Promise.all([
            (prisma as any).auditLog.findMany({
                where,
                include: {
                    actor: { select: { id: true, firstName: true, lastName: true, role: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            (prisma as any).auditLog.count({ where }),
        ]);

        return { activities, total, page, limit };
    }
}

export const auditService = new AuditService();
