import { Response } from 'express';

type NotificationRealtimeEvent =
    | 'notification:new'
    | 'notification:sync'
    | 'notification:read'
    | 'notification:read-all'
    | 'connected'
    | 'ping';

class NotificationRealtimeService {
    private clients = new Map<string, Set<Response>>();

    registerClient(userId: string, res: Response) {
        const userClients = this.clients.get(userId) ?? new Set<Response>();
        userClients.add(res);
        this.clients.set(userId, userClients);

        this.sendToClient(res, 'connected', {
            connectedAt: new Date().toISOString(),
        });
    }

    unregisterClient(userId: string, res: Response) {
        const userClients = this.clients.get(userId);
        if (!userClients) return;

        userClients.delete(res);
        if (userClients.size === 0) {
            this.clients.delete(userId);
        }
    }

    emitToUser(userId: string, event: NotificationRealtimeEvent, payload: unknown) {
        const userClients = this.clients.get(userId);
        if (!userClients || userClients.size === 0) return;

        for (const client of userClients) {
            this.sendToClient(client, event, payload);
        }
    }

    emitHeartbeat(userId: string) {
        this.emitToUser(userId, 'ping', { ts: Date.now() });
    }

    private sendToClient(res: Response, event: NotificationRealtimeEvent, payload: unknown) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
}

export const notificationRealtimeService = new NotificationRealtimeService();
