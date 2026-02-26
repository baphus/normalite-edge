import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { auditService } from '../services/audit.service';

export const auditController = {
    listLogs: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, action, entityType, actorId, search } = req.query;

        const result = await auditService.listLogs({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            action: action as string | undefined,
            entityType: entityType as string | undefined,
            actorId: actorId as string | undefined,
            search: search as string | undefined,
        });

        ApiResponse.paginated(res, result.logs, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    listContentActivity: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = req.query;
        const result = await auditService.listContentActivity({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        ApiResponse.paginated(res, result.activities, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),
};
