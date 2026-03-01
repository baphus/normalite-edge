import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { userService } from '../services/user.service';
import { auditService } from '../services/audit.service';

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

    createUser: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.createUser(req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'user',
            entityId: user.id,
            summary: `Admin created user ${user.email}`,
            metadata: {
                title: user.email,
            },
        });

        ApiResponse.created(res, user, 'User created successfully');
    }),

    updateUserStatus: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUserStatus(req.params.id as string, req.body.status);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: req.body.status === 'PENDING' ? 'UPDATE' : 'APPROVE',
            entityType: 'user',
            entityId: user.id,
            summary: `Updated user status for ${user.email} to ${req.body.status}`,
            metadata: {
                title: user.email,
            },
        });

        ApiResponse.success(res, user, `User ${req.body.status.toLowerCase()}`);
    }),

    updateUserRole: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUserRole(req.params.id as string, req.body.role);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'user',
            entityId: user.id,
            summary: `Updated user role for ${user.email} to ${req.body.role}`,
            metadata: {
                title: user.email,
            },
        });

        ApiResponse.success(res, user, 'User role updated');
    }),

    deleteUser: catchAsync(async (req: Request, res: Response) => {
        await userService.deleteUser(req.params.id as string);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'user',
            entityId: req.params.id as string,
            summary: `Deleted user with id: ${req.params.id as string}`,
        });

        ApiResponse.success(res, null, 'User deleted');
    }),

    getAchievements: catchAsync(async (req: Request, res: Response) => {
        const achievements = await userService.getAchievements(req.user!.userId);
        ApiResponse.success(res, achievements);
    }),
};
