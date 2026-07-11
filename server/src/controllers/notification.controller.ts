import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { notificationService } from '../services/notification.service';
import { notificationRealtimeService } from '../services/notificationRealtime.service';
import { sseTicketService } from '../services/sseTicket.service';
import { parsePagination } from '../utils/pagination';

export const notificationController = {
    /**
     * POST /api/v1/notifications/sse-ticket
     * Generate a short-lived, single-use ticket for SSE connection.
     * Requires authentication.
     */
    createSseTicket: catchAsync(async (req: Request, res: Response) => {
        const ticket = sseTicketService.createTicket(req.user!.userId);
        ApiResponse.success(res, { ticket });
    }),

    streamNotifications: (req: Request, res: Response) => {
        const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;

        if (!ticket) {
            res.status(401).json({ success: false, message: 'SSE ticket required' });
            return;
        }

        const userId = sseTicketService.consumeTicket(ticket);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Invalid or expired SSE ticket' });
            return;
        }

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
        const { unreadOnly } = req.query;
        const { page, limit } = parsePagination(req.query as any);
        const result = await notificationService.listNotifications(req.user!.userId, {
            page,
            limit,
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
