import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { notificationService } from '../services/notification.service';
import { notificationRealtimeService } from '../services/notificationRealtime.service';
import { verifyAccessToken } from '../utils/jwt';

export const notificationController = {
    streamNotifications: (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const queryToken = typeof req.query.accessToken === 'string' ? req.query.accessToken : undefined;
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
        const token = bearerToken || queryToken;

        if (!token) {
            res.status(401).json({ success: false, message: 'Access token required' });
            return;
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch {
            res.status(401).json({ success: false, message: 'Invalid or expired access token' });
            return;
        }

        const userId = payload.userId;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        notificationRealtimeService.registerClient(userId, res);

        const heartbeatInterval = setInterval(() => {
            notificationRealtimeService.emitHeartbeat(userId);
        }, 25000);

        req.on('close', () => {
            clearInterval(heartbeatInterval);
            notificationRealtimeService.unregisterClient(userId, res);
            res.end();
        });
    },

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
        await notificationService.markAsRead(req.params.id as string, req.user!.userId);
        ApiResponse.success(res, null, 'Notification marked as read');
    }),

    markAllAsRead: catchAsync(async (req: Request, res: Response) => {
        await notificationService.markAllAsRead(req.user!.userId);
        ApiResponse.success(res, null, 'All notifications marked as read');
    }),

    getUnreadCount: catchAsync(async (req: Request, res: Response) => {
        const unreadCount = await notificationService.getUnreadCount(req.user!.userId);
        ApiResponse.success(res, { unreadCount });
    }),
};
