import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { sessionService } from '../services/session.service';

export const sessionController = {
    listSessions: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, upcoming } = req.query;
        const result = await sessionService.listSessions({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            upcoming: upcoming === 'true',
        });

        ApiResponse.paginated(res, result.sessions, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getSession: catchAsync(async (req: Request, res: Response) => {
        const session = await sessionService.getSession(req.params.id);
        ApiResponse.success(res, session);
    }),

    createSession: catchAsync(async (req: Request, res: Response) => {
        const session = await sessionService.createSession({
            ...req.body,
            createdBy: req.user!.userId,
        });
        ApiResponse.created(res, session, 'Session created');
    }),

    updateSession: catchAsync(async (req: Request, res: Response) => {
        const session = await sessionService.updateSession(req.params.id, req.body);
        ApiResponse.success(res, session, 'Session updated');
    }),

    deleteSession: catchAsync(async (req: Request, res: Response) => {
        await sessionService.deleteSession(req.params.id);
        ApiResponse.success(res, null, 'Session deleted');
    }),
};
