import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { userService } from '../services/user.service';

export const userController = {
    listUsers: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, role, status, search } = req.query;
        const result = await userService.listUsers({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            role: role as any,
            status: status as any,
            search: search as string,
        });

        ApiResponse.paginated(res, result.users, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    updateUserStatus: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUserStatus(req.params.id as string, req.body.status);
        ApiResponse.success(res, user, `User ${req.body.status.toLowerCase()}`);
    }),

    updateUserRole: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUserRole(req.params.id as string, req.body.role);
        ApiResponse.success(res, user, 'User role updated');
    }),

    deleteUser: catchAsync(async (req: Request, res: Response) => {
        await userService.deleteUser(req.params.id as string);
        ApiResponse.success(res, null, 'User deleted');
    }),

    getAchievements: catchAsync(async (req: Request, res: Response) => {
        const achievements = await userService.getAchievements(req.user!.userId);
        ApiResponse.success(res, achievements);
    }),
};
