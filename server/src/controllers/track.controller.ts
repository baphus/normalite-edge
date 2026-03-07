import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { trackService } from '../services/track.service';
import { auditService } from '../services/audit.service';

export const trackController = {
    listTracks: catchAsync(async (_req: Request, res: Response) => {
        const tracks = await trackService.listTracks();
        ApiResponse.success(res, tracks);
    }),

    createTrack: catchAsync(async (req: Request, res: Response) => {
        const track = await trackService.createTrack(req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'track',
            entityId: track.id,
            summary: `Created program ${track.name}`,
            metadata: {
                title: track.name,
                code: track.code,
            },
        });

        ApiResponse.created(res, track, 'Program created successfully');
    }),

    updateTrack: catchAsync(async (req: Request, res: Response) => {
        const track = await trackService.updateTrack(req.params.id as string, req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'track',
            entityId: track.id,
            summary: `Updated program ${track.name}`,
            metadata: {
                title: track.name,
                code: track.code,
            },
        });

        ApiResponse.success(res, track, 'Program updated successfully');
    }),

    deleteTrack: catchAsync(async (req: Request, res: Response) => {
        const deleted = await trackService.deleteTrack(req.params.id as string);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'track',
            entityId: deleted.id,
            summary: `Deleted program ${deleted.name}`,
            metadata: {
                title: deleted.name,
                code: deleted.code,
            },
        });

        ApiResponse.success(res, deleted, 'Program deleted successfully');
    }),
};
