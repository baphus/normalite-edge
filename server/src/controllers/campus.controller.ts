import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { campusService } from '../services/campus.service';
import { auditService } from '../services/audit.service';

export const campusController = {
    listCampuses: catchAsync(async (_req: Request, res: Response) => {
        const campuses = await campusService.listCampuses();
        ApiResponse.success(res, campuses);
    }),

    createCampus: catchAsync(async (req: Request, res: Response) => {
        const campus = await campusService.createCampus(req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'campus',
            entityId: campus.id,
            summary: `Created campus ${campus.name}`,
            metadata: {
                title: campus.name,
                code: campus.code,
            },
        });

        ApiResponse.created(res, campus, 'Campus created successfully');
    }),

    updateCampus: catchAsync(async (req: Request, res: Response) => {
        const campus = await campusService.updateCampus(req.params.id as string, req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'campus',
            entityId: campus.id,
            summary: `Updated campus ${campus.name}`,
            metadata: {
                title: campus.name,
                code: campus.code,
            },
        });

        ApiResponse.success(res, campus, 'Campus updated successfully');
    }),

    deleteCampus: catchAsync(async (req: Request, res: Response) => {
        const deleted = await campusService.deleteCampus(req.params.id as string);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'campus',
            entityId: deleted.id,
            summary: `Deleted campus ${deleted.name}`,
            metadata: {
                title: deleted.name,
                code: deleted.code,
            },
        });

        ApiResponse.success(res, deleted, 'Campus deleted successfully');
    }),
};
