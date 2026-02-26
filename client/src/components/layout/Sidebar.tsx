import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    Video,
    Bell,
    Settings,
    ShieldCheck,
    Users,
    LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles: string[];
}

const navItems: NavItem[] = [
    // Common for all (after approval)
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },

    // Reviewee specific
    { name: 'Study', href: '/study', icon: BookOpen, roles: ['REVIEWEE'] },
    { name: 'Exams', href: '/exams', icon: FileText, roles: ['REVIEWEE'] },

    // Reviewer/Admin specific
    { name: 'Manage Materials', href: '/materials', icon: BookOpen, roles: ['ADMIN', 'REVIEWER'] },
    { name: 'Manage Exams', href: '/manage-exams', icon: FileText, roles: ['ADMIN', 'REVIEWER'] },

    // Admin specific
    { name: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'System Logs', href: '/admin/logs', icon: ShieldCheck, roles: ['ADMIN'] },

    // Common
    { name: 'Conferences', href: '/conferences', icon: Video, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
];

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    const filteredNavItems = useMemo(() => navItems.filter(item =>
        user && item.roles.includes(user.role)
    ), [user]);

    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                const response = await api.get('/notifications/unread-count');
                const count = Number(response.data?.data?.unreadCount || 0);
                setUnreadCount(count);
            } catch {
                setUnreadCount(0);
            }
        };

        if (user) {
            loadUnreadCount();
        }
    }, [user, location.pathname]);

    return (
        <div className="flex flex-col w-64 h-screen bg-white border-r border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="p-6">
                <div className="flex items-center gap-3 text-primary">
                    <div className="h-10 w-10 overflow-hidden rounded-sm">
                        <img
                            src="/NormaliteEdgeLogo.png"
                            alt="Normalite EDGE logo mark"
                            className="h-full w-auto max-w-none object-cover object-left"
                        />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <h2 className="text-primary text-base font-extrabold tracking-tight">Normalite EDGE</h2>
                        <p className="text-primary/90 text-[10px] font-medium">Everyday Digital Guide to Excellence</p>
                    </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider px-1">
                    {user?.role === 'REVIEWEE' ? 'Reviewee Portal' : user?.role === 'REVIEWER' ? 'Reviewer Portal' : 'Admin Portal'}
                </p>
            </div>

            <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "relative flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary font-semibold border-r-4 border-r-primary"
                                    : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-800"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1">{item.name}</span>
                        {item.href === '/notifications' && unreadCount > 0 && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100 mt-auto">
                <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {user?.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate capitalize">{user?.role.toLowerCase()}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
