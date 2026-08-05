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
    GraduationCap,
    Building2,
    Tags,
    User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatUserDisplayName } from '@/lib/formatUserDisplayName';
import { cn } from '@/lib/utils';
import { NavItem } from '@/components/nav/NavPrimitives';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface NavItemDef {
    name: string;
    href: string;
    icon: React.ElementType;
    roles: string[];
}

interface NavGroup {
    label: string;
    roles: string[];
    items: NavItemDef[];
}

interface SidebarProps {
    isMobile?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

/* ─── Navigation structure ──────────────────────────────────────────── */

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
        ],
    },
    {
        label: 'Profile',
        roles: ['REVIEWEE'],
        items: [
            { name: 'Profile', href: '/profile', icon: User, roles: ['REVIEWEE'] },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays, roles: ['REVIEWEE'] },
            { name: 'Conferences', href: '/conferences', icon: Video, roles: ['REVIEWEE'] },
            { name: 'Settings', href: '/settings', icon: Settings, roles: ['REVIEWEE'] },
            { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['REVIEWEE'] },
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
            { name: 'Programs', href: '/admin/programs', icon: GraduationCap, roles: ['ADMIN'] },
            { name: 'Campuses', href: '/admin/campuses', icon: Building2, roles: ['ADMIN'] },
            { name: 'Categories', href: '/admin/categories', icon: Tags, roles: ['ADMIN'] },
            { name: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
            { name: 'Audit Logs', href: '/admin/logs', icon: ShieldCheck, roles: ['ADMIN'] },
        ],
    },
    {
        label: 'System',
        roles: ['ADMIN', 'REVIEWER'],
        items: [
            { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'REVIEWER'] },
            { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'REVIEWER'] },
        ],
    },
];

/* ─── Component ─────────────────────────────────────────────────────── */

const Sidebar: React.FC<SidebarProps> = ({
    isMobile = false,
    isOpen = false,
    onClose,
}) => {
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

    const displayName = formatUserDisplayName({
        name: user?.name,
        firstName: user?.firstName,
        middleInitial: user?.middleInitial,
        lastName: user?.lastName,
        suffix: user?.suffix,
    });

    const userInitials = displayName
        ? displayName.trim().split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
        : 'U';

    const profileMeta = useMemo(() => {
        if (!user) return { lineOne: '', lineTwo: '' };

        if (normalizedRole === 'REVIEWEE') {
            const lineOne = user.campus || 'Campus not set';
            const lineTwo = [
                user.program || user.programTrack || user.program_track || '',
                [user.yearLevel, user.section ? `Section ${user.section}` : ''].filter(Boolean).join(' - '),
            ]
                .filter(Boolean)
                .join(' • ');
            return { lineOne, lineTwo };
        }

        if (normalizedRole === 'REVIEWER') {
            return { lineOne: user.campus || 'Reviewer Portal', lineTwo: '' };
        }

        if (normalizedRole === 'ADMIN') {
            return { lineOne: 'Admin Portal', lineTwo: '' };
        }

        return { lineOne: normalizedRole, lineTwo: '' };
    }, [user, normalizedRole]);

    return (
        <aside
            data-guide="sidebar-nav"
            className={cn(
                'flex flex-col border-r border-slate-200 dark:border-white/6 bg-white dark:bg-[#0d0f14]',
                isMobile
                    ? 'fixed inset-y-0 left-0 z-50 h-dvh w-72 max-w-[86vw] shrink-0 shadow-2xl transition-transform duration-200 ease-out lg:hidden'
                    : 'sticky top-0 h-dvh w-64 shrink-0 self-start',
                isMobile && (isOpen ? 'translate-x-0' : '-translate-x-full')
            )}
        >
            {/* ── Brand ── */}
            <Link
                to="/dashboard"
                className="flex items-center gap-2.5 px-4 h-12 border-b border-slate-200 dark:border-white/6 shrink-0 hover:opacity-80 transition-opacity"
                onClick={() => {
                    if (isMobile) onClose?.();
                }}
            >
                <div className="h-6 w-6 overflow-hidden rounded-sm shrink-0">
                    <img
                        src="/NormaliteEdgeLogo.png"
                        alt="Normalite EDGE logo"
                        className="h-full w-auto max-w-none object-cover object-left"
                    />
                </div>
                <span className="text-[13px] font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                    Normalite EDGE
                </span>
            </Link>

            {/* ── Nav ── */}
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
                {visibleGroups.map((group) => (
                    <div key={group.label}>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25 select-none">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavItem
                                    key={item.href}
                                    to={item.href}
                                    icon={item.icon}
                                    label={item.name}
                                    direction="vertical"
                                    onClick={() => {
                                        if (isMobile) onClose?.();
                                    }}
                                    data-guide-nav={item.href}
                                    badge={
                                        item.href === '/notifications' && unreadCount > 0 ? (
                                            <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Profile footer ── */}
            <div className="shrink-0 border-t border-slate-200 dark:border-white/6 p-3 space-y-2">
                <NavLink
                    to="/profile"
                    data-guide="profile-entry"
                    onClick={() => {
                        if (isMobile) onClose?.();
                    }}
                    className={({ isActive }) =>
                        cn(
                            'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors w-full',
                            isActive
                                ? 'bg-slate-100 dark:bg-white/10'
                                : 'hover:bg-slate-50 dark:hover:bg-white/6'
                        )
                    }
                >
                    {user?.picture && !imgError ? (
                        <img
                            src={user.picture}
                            alt="Profile"
                            className="mt-0.5 h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20 shrink-0"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white shrink-0">
                            {userInitials}
                        </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-[12px] font-semibold leading-tight text-slate-900 dark:text-white/95">
                            {displayName}
                        </p>
                        {profileMeta.lineOne && (
                            <p className="truncate text-xs font-medium leading-tight text-slate-500 dark:text-white/55">
                                {profileMeta.lineOne}
                            </p>
                        )}
                        {profileMeta.lineTwo && (
                            <p className="line-clamp-2 text-xs font-medium leading-tight text-slate-400 dark:text-white/40">
                                {profileMeta.lineTwo}
                            </p>
                        )}
                    </div>
                </NavLink>
                <button
                    onClick={() => {
                        if (isMobile) onClose?.();
                        logout();
                    }}
                    className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-slate-400 dark:text-white/45 transition-colors hover:bg-red-50 dark:hover:bg-white/4 hover:text-red-500 dark:hover:text-red-400"
                >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
