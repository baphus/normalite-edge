import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    severity?: string;
    entityType?: string;
    link?: string | null;
    createdAt: string;
    isRead: boolean;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    loading: boolean;
    refreshNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

interface ToastMessage {
    id: string;
    title: string;
    message: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const mapNotification = (row: any): NotificationItem => ({
    id: String(row.id),
    title: String(row.title ?? 'Notification'),
    message: String(row.message ?? ''),
    type: String(row.type ?? 'INFO').toLowerCase(),
    severity: row.severity ? String(row.severity) : undefined,
    entityType: row.entityType ? String(row.entityType) : undefined,
    link: typeof row.link === 'string' ? row.link : null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    isRead: Boolean(row.isRead),
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const reconnectTimerRef = useRef<number | null>(null);

    const pushToast = useCallback((notification: NotificationItem) => {
        const toastId = `${notification.id}-${Date.now()}`;
        setToasts((prev) => [
            ...prev,
            {
                id: toastId,
                title: notification.title,
                message: notification.message,
            },
        ]);

        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 5000);
    }, []);

    const refreshNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/notifications?page=1&limit=100');
            const rows = (response.data?.data || []) as any[];
            setNotifications(rows.map(mapNotification));
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = useCallback(async (id: string) => {
        await api.patch(`/notifications/${id}/read`);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    }, []);

    const markAllAsRead = useCallback(async () => {
        await api.patch('/notifications/read-all');
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }, []);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            return;
        }

        refreshNotifications();

        let eventSource: EventSource | null = null;
        let closedByCleanup = false;

        const clearReconnectTimer = () => {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };

        const connect = () => {
            clearReconnectTimer();

            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const baseUrl = String(api.defaults.baseURL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
            const streamUrl = `${baseUrl}/notifications/stream?accessToken=${encodeURIComponent(token)}`;
            eventSource = new EventSource(streamUrl, { withCredentials: true });

            eventSource.addEventListener('notification:new', (event) => {
                const raw = JSON.parse((event as MessageEvent).data);
                const incoming = mapNotification(raw);

                setNotifications((prev) => {
                    if (prev.some((existing) => existing.id === incoming.id)) {
                        return prev;
                    }
                    return [incoming, ...prev];
                });

                pushToast(incoming);
            });

            eventSource.addEventListener('notification:sync', () => {
                refreshNotifications();
            });

            eventSource.addEventListener('notification:read', (event) => {
                const payload = JSON.parse((event as MessageEvent).data) as { notificationId?: string };
                if (!payload.notificationId) return;
                setNotifications((prev) =>
                    prev.map((n) => (n.id === payload.notificationId ? { ...n, isRead: true } : n))
                );
            });

            eventSource.addEventListener('notification:read-all', () => {
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            });

            eventSource.onerror = () => {
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }

                if (!closedByCleanup) {
                    reconnectTimerRef.current = window.setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            closedByCleanup = true;
            clearReconnectTimer();
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [pushToast, refreshNotifications, user]);

    const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                refreshNotifications,
                markAsRead,
                markAllAsRead,
            }}
        >
            {children}

            <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto rounded-xl border border-primary/20 bg-white px-4 py-3 shadow-lg"
                    >
                        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{toast.message}</p>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
