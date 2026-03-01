import React, { useMemo } from 'react';
import {
    Bell,
    CheckCircle2,
    Calendar,
    AlertCircle,
    Info,
    Check,
    Clock,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';

const NotificationsPage: React.FC = () => {
    const {
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAllAsRead,
        markAsRead,
    } = useNotifications();

    const groupedNotifications = useMemo(() => {
        return notifications.map((notification) => ({
            ...notification,
            category: notification.entityType || notification.type || 'system',
        }));
    }, [notifications]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
            case 'info': return <Calendar className="text-blue-500" size={20} />;
            default: return <Info className="text-primary" size={20} />;
        }
    };

    return (
        <div className="flex flex-col gap-5 font-lexend pb-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Notifications</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">
                        Live updates are enabled. {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="h-9 rounded-lg border-gray-200 font-semibold text-[11px] uppercase tracking-wider gap-2"
                        onClick={refreshNotifications}
                    >
                        <RefreshCw size={13} /> Refresh
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 rounded-lg border-gray-200 font-semibold text-[11px] uppercase tracking-wider gap-2"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <Check size={13} /> Mark all as read
                    </Button>
                </div>
            </header>

            <div className="flex flex-col gap-2.5">
                {loading ? (
                    <div className="text-sm text-gray-500 font-medium">Loading notifications...</div>
                ) : groupedNotifications.length > 0 ? (
                    groupedNotifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`border transition-all rounded-xl ${notification.isRead ? 'bg-white border-gray-200' : 'bg-primary/5 border-primary/20'}`}
                        >
                            <CardContent className="p-4">
                                <div className="flex gap-3 items-start">
                                    <div className={`mt-0.5 p-2 rounded-lg ${notification.type === 'success' ? 'bg-green-100/60' :
                                        notification.type === 'warning' ? 'bg-amber-100/60' :
                                            notification.type === 'info' ? 'bg-blue-100/60' : 'bg-primary/10'
                                        }`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-sm md:text-base font-semibold tracking-tight ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-semibold text-[9px] uppercase tracking-widest bg-gray-100 text-gray-700">
                                                    {notification.category}
                                                </Badge>
                                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed pr-2">
                                            {notification.message}
                                        </p>
                                        <div className="pt-2.5 flex items-center justify-end border-t border-gray-100 mt-2.5">
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-2.5 font-semibold text-[11px] text-primary uppercase tracking-wider"
                                                onClick={() => markAsRead(notification.id)}
                                                disabled={notification.isRead}
                                            >
                                                <Check size={13} className="mr-1" /> Mark as read
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <Bell size={28} className="text-gray-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">No Notifications</h3>
                            <p className="text-xs font-medium text-gray-400 mt-1">You’ll see new activity here instantly.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
