import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { userService } from '../services/user.service';
import { auditService } from '../services/audit.service';
import { parsePagination } from '../utils/pagination';

export const userController = {
    listUsers: catchAsync(async (req: Request, res: Response) => {
        const { role, status, search, trackId, campusId } = req.query;
        const { page, limit } = parsePagination(req.query as any);
        const result = await userService.listUsers({
            page,
            limit,
            role: role as any,
            status: status as any,
            search: search as string,
            trackId: trackId as string,
            campusId: campusId as string,
            requesterRole: req.user?.role as 'ADMIN' | 'REVIEWER' | 'REVIEWEE' | undefined,
        });

        ApiResponse.paginated(res, result.users, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getStudentProfile: catchAsync(async (req: Request, res: Response) => {
        const requestedId = req.params.id as string;
        const requesterId = req.user!.userId;
        const requesterRole = req.user!.role;

        // Only allow access to own profile or admin/reviewer roles
        if (requestedId !== requesterId && requesterRole !== 'ADMIN' && requesterRole !== 'REVIEWER') {
            return ApiResponse.error(res, 403, 'Access denied');
        }

        const profile = await userService.getStudentProfile(requestedId);
        ApiResponse.success(res, profile);
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

    updateUser: catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUser(req.params.id as string, req.body);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'user',
            entityId: user.id,
            summary: `Admin updated user ${user.email}`,
            metadata: {
                title: user.email,
            },
        });

        ApiResponse.success(res, user, 'User updated successfully');
    }),

    getAchievements: catchAsync(async (req: Request, res: Response) => {
        const achievements = await userService.getAchievements(req.user!.userId);
        ApiResponse.success(res, achievements);
    }),
};
