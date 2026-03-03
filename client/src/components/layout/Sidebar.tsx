import React, { useMemo, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    Video,
    Bell,
    Settings,
    ShieldCheck,
    Users,
    LogOut,
    CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles: string[];
}

interface NavGroup {
    label: string;
    roles: string[];
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: 'General',
        roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'],
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
        ],
    },
    {
        label: 'Review',
        roles: ['REVIEWEE'],
        items: [
            { name: 'Study Hub', href: '/study', icon: BookOpen, roles: ['REVIEWEE'] },
            { name: 'Exams', href: '/exams', icon: FileText, roles: ['REVIEWEE'] },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ['REVIEWEE'] },
            { name: 'Conferences', href: '/conferences', icon: Video, roles: ['REVIEWEE'] },
        ],
    },
    {
        label: 'Content',
        roles: ['ADMIN', 'REVIEWER'],
        items: [
            { name: 'Materials', href: '/materials', icon: BookOpen, roles: ['ADMIN', 'REVIEWER'] },
            { name: 'Exams', href: '/manage-exams', icon: FileText, roles: ['ADMIN', 'REVIEWER'] },
            { name: 'Students', href: '/students', icon: Users, roles: ['ADMIN', 'REVIEWER'] },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ['ADMIN', 'REVIEWER'] },
            { name: 'Conferences', href: '/conferences', icon: Video, roles: ['ADMIN', 'REVIEWER'] },
        ],
    },
    {
        label: 'Admin',
        roles: ['ADMIN'],
        items: [
            { name: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
            { name: 'Audit Logs', href: '/admin/logs', icon: ShieldCheck, roles: ['ADMIN'] },
        ],
    },
    {
        label: 'System',
        roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'],
        items: [
            { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
            { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
        ],
    },
];

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [imgError, setImgError] = useState(false);
    const normalizedRole = (user?.role || '').trim().toUpperCase();

    const visibleGroups = useMemo(() => {
        if (!user) return [];
        return navGroups
            .filter(group => group.roles.includes(normalizedRole))
            .map(group => ({
                ...group,
                items: group.items.filter(item => item.roles.includes(normalizedRole)),
            }))
            .filter(group => group.items.length > 0);
    }, [user, normalizedRole]);

    const userInitials = user?.name
        ? user.name.trim().split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
        : 'U';

    const roleLabel: Record<string, string> = { ADMIN: 'Admin', REVIEWER: 'Reviewer', REVIEWEE: 'Reviewee' };

    return (
        <div className="flex flex-col w-[218px] shrink-0 h-screen bg-[#0d0f14] border-r border-white/[0.06]">
            {/* Brand */}
            <Link to="/dashboard" className="flex items-center gap-2.5 px-4 h-12 border-b border-white/[0.06] shrink-0 hover:opacity-80 transition-opacity">
                <div className="h-6 w-6 overflow-hidden rounded-sm shrink-0">
                    <img
                        src="/NormaliteEdgeLogo.png"
                        alt="Normalite EDGE logo"
                        className="h-full w-auto max-w-none object-cover object-left"
                    />
                </div>
                <span className="text-[13px] font-bold text-white tracking-tight truncate">Normalite EDGE</span>
            </Link>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
                {visibleGroups.map((group) => (
                    <div key={group.label}>
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25 select-none">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.href}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        cn(
                                            'relative flex items-center gap-2.5 px-2.5 h-8 text-[12.5px] rounded-md transition-colors font-medium',
                                            isActive
                                                ? 'bg-white/10 text-white'
                                                : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                                        )
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
                                            )}
                                            <item.icon className="w-[14px] h-[14px] shrink-0" />
                                            <span className="flex-1 truncate">{item.name}</span>
                                            {item.href === '/notifications' && unreadCount > 0 && (
                                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User / Footer */}
            <div className="shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-2.5 px-2.5 h-10 rounded-md transition-colors w-full',
                            isActive ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                        )
                    }
                >
                    {user?.picture && !imgError ? (
                        <img
                            src={user.picture}
                            alt="Profile"
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {userInitials}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white/90 truncate leading-tight">{user?.name}</p>
                        <p className="text-[10px] text-white/35 font-medium leading-tight">
                            {normalizedRole ? roleLabel[normalizedRole] ?? normalizedRole : ''}
                        </p>
                    </div>
                </NavLink>
                <button
                    onClick={logout}
                    className="flex items-center gap-2.5 w-full px-2.5 h-8 text-[12px] font-medium text-white/40 hover:text-red-400 hover:bg-white/[0.04] rounded-md transition-colors"
                >
                    <LogOut className="w-[14px] h-[14px] shrink-0" />
                    Sign out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
