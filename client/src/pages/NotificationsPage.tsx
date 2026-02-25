import React, { useState } from 'react';
import {
    Bell,
    CheckCircle2,
    Calendar,
    AlertCircle,
    Info,
    MoreHorizontal,
    Trash2,
    Check,
    Clock,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'system';
    date: string;
    isRead: boolean;
    category: string;
}

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
            case 'info': return <Calendar className="text-blue-500" size={20} />;
            default: return <Info className="text-primary" size={20} />;
        }
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Notifications</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Stay updated with the latest progress, exams, and system alerts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 rounded-xl border-gray-100 font-black text-[10px] uppercase tracking-widest gap-2" onClick={markAllAsRead}>
                        <Check size={14} /> Mark all as read
                    </Button>
                    <Button variant="ghost" className="h-11 rounded-xl text-red-600 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest gap-2" onClick={() => setNotifications([])}>
                        <Trash2 size={14} /> Clear all
                    </Button>
                </div>
            </header>

            <div className="flex flex-col gap-4">
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <Card key={notification.id} className={`group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-[2rem] overflow-hidden ${notification.isRead ? 'bg-white opacity-80' : 'bg-primary/5 border-primary/10 shadow-lg shadow-primary/5'}`}>
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex gap-6 items-start">
                                    <div className={`mt-1 p-4 rounded-2xl ${notification.type === 'success' ? 'bg-green-100/50' :
                                        notification.type === 'warning' ? 'bg-amber-100/50' :
                                            notification.type === 'info' ? 'bg-blue-100/50' : 'bg-primary/10'
                                        }`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-lg font-black tracking-tight ${notification.isRead ? 'text-gray-700' : 'text-gray-900 group-hover:text-primary transition-colors'}`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest bg-gray-100 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    {notification.category}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {new Date(notification.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-2xl">
                                            {notification.message}
                                        </p>
                                        <div className="pt-4 flex items-center justify-between border-t border-gray-50/50 mt-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <Button variant="ghost" className="h-auto p-0 font-black text-xs text-primary uppercase tracking-widest gap-1 flex items-center group/btn">
                                                View Details <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                                        <MoreHorizontal size={18} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl w-40">
                                                    <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5" onClick={() => markAllAsRead()}>
                                                        <Check size={14} /> Mark as read
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => deleteNotification(notification.id)}>
                                                        <Trash2 size={14} /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm">
                            <Bell size={40} className="text-gray-200" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-gray-400 uppercase tracking-tight">No Notifications</h3>
                            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-1">Check back later for updates</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
