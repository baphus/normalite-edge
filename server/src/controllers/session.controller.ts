import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { sessionService } from '../services/session.service';
import { auditService } from '../services/audit.service';
import { resolveProgramTrack } from '../utils/requirementsCompat';

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
        const session = await sessionService.getSession(req.params.id as string);
        ApiResponse.success(res, session);
    }),

    createSession: catchAsync(async (req: Request, res: Response) => {
        const session = await sessionService.createSession({
            ...req.body,
            scheduledDate: new Date(req.body.scheduledDate),
            programTrack: resolveProgramTrack(req.body),
            createdBy: req.user!.userId,
        });

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'session',
            entityId: session.id,
            summary: `Scheduled session: ${session.title}`,
        });

        ApiResponse.created(res, session, 'Session created');
    }),

    updateSession: catchAsync(async (req: Request, res: Response) => {
        const session = await sessionService.updateSession(
            req.params.id as string,
            req.user!.userId,
            req.user!.role as any,
            {
                ...req.body,
                scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
                programTrack: resolveProgramTrack(req.body),
            }
        );

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'session',
            entityId: session.id,
            summary: `Updated session: ${session.title}`,
        });

        ApiResponse.success(res, session, 'Session updated');
    }),

    deleteSession: catchAsync(async (req: Request, res: Response) => {
        await sessionService.deleteSession(req.params.id as string, req.user!.userId, req.user!.role as any);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'session',
            entityId: req.params.id as string,
            summary: `Deleted session with id: ${req.params.id as string}`,
        });

        ApiResponse.success(res, null, 'Session deleted');
    }),
};
