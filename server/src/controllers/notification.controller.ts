import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { notificationService } from '../services/notification.service';

export const notificationController = {
    listNotifications: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, unreadOnly } = req.query;
        const result = await notificationService.listNotifications(req.user!.userId, {
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            unreadOnly: unreadOnly === 'true',
        });

        ApiResponse.paginated(res, result.notifications, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    markAsRead: catchAsync(async (req: Request, res: Response) => {
        await notificationService.markAsRead(req.params.id, req.user!.userId);
        ApiResponse.success(res, null, 'Notification marked as read');
    }),

    markAllAsRead: catchAsync(async (req: Request, res: Response) => {
        await notificationService.markAllAsRead(req.user!.userId);
        ApiResponse.success(res, null, 'All notifications marked as read');
    }),
};
