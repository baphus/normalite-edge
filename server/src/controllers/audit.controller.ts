import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { auditService } from '../services/audit.service';

export const auditController = {
    listLogs: catchAsync(async (req: Request, res: Response) => {
        const { action, entityType, actorId, actorRole, from, to, search } = req.query;
        const { page, limit } = parsePagination(req.query as any);

        const result = await auditService.listLogs({
            page,
            limit,
            action: action as string | undefined,
            entityType: entityType as string | undefined,
            actorId: actorId as string | undefined,
            actorRole: actorRole as string | undefined,
            from: from as string | undefined,
            to: to as string | undefined,
            search: search as string | undefined,
        });

        ApiResponse.paginated(res, result.logs, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    listContentActivity: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = parsePagination(req.query as any);
        const result = await auditService.listContentActivity({
            page,
            limit,
        });

        ApiResponse.paginated(res, result.activities, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),
};
