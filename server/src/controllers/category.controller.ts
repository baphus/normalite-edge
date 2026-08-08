import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { categoryService } from '../services/category.service';
import { auditService } from '../services/audit.service';

export const categoryController = {
    listCategories: catchAsync(async (req: Request, res: Response) => {
        const categories = await categoryService.listCategories();
        ApiResponse.success(res, categories);
    }),

    createCategory: catchAsync(async (req: Request, res: Response) => {
        const { name, color } = req.body;
        const category = await categoryService.createCategory(name, color);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'category',
            entityId: category.id,
            summary: `Created category: ${category.name}`,
            metadata: { name: category.name },
        });

        ApiResponse.created(res, category, 'Category created successfully');
    }),

    updateCategory: catchAsync(async (req: Request, res: Response) => {
        const { name, color } = req.body;
        const category = await categoryService.updateCategory(req.params.id as string, name, color);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'category',
            entityId: category.id,
            summary: `Updated category to: ${category.name}`,
            metadata: { name: category.name },
        });

        ApiResponse.success(res, category, 'Category updated successfully');
    }),

    deleteCategory: catchAsync(async (req: Request, res: Response) => {
        const category = await categoryService.deleteCategory(req.params.id as string);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'category',
            entityId: category.id,
            summary: `Deleted category: ${category.name}`,
            metadata: { name: category.name },
        });

        ApiResponse.success(res, null, 'Category deleted successfully');
    }),

    getCategoryExams: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = parsePagination(req.query as any);
        const result = await categoryService.getCategoryExams(req.params.id as string, page, limit);

        ApiResponse.paginated(res, result.exams, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),
};
