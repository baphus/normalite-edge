import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { materialService } from '../services/material.service';

export const materialController = {
    listMaterials: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, subject, program, type, search } = req.query;
        const result = await materialService.listMaterials({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            subject: subject as string,
            program: program as string,
            type: type as string,
            search: search as string,
        });

        ApiResponse.paginated(res, result.materials, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    listManagedMaterials: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = req.query;
        const result = await materialService.listMaterials({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            createdBy: req.user!.userId,
        });

        ApiResponse.paginated(res, result.materials, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getMaterial: catchAsync(async (req: Request, res: Response) => {
        const material = await materialService.getMaterial(req.params.id as string);
        ApiResponse.success(res, material);
    }),

    createMaterial: catchAsync(async (req: Request, res: Response) => {
        const material = await materialService.createMaterial({
            ...req.body,
            createdBy: req.user!.userId,
        });
        ApiResponse.created(res, material, 'Material created');
    }),

    updateMaterial: catchAsync(async (req: Request, res: Response) => {
        const material = await materialService.updateMaterial(req.params.id as string, req.body);
        ApiResponse.success(res, material, 'Material updated');
    }),

    deleteMaterial: catchAsync(async (req: Request, res: Response) => {
        await materialService.deleteMaterial(req.params.id as string);
        ApiResponse.success(res, null, 'Material deleted');
    }),
};
