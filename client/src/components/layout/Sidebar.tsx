import React from 'react';
import { NavLink } from 'react-router-dom';
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
    Trophy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
    { name: 'Study Materials', href: '/study', icon: BookOpen, roles: ['REVIEWEE'] },
    { name: 'Exams', href: '/exams', icon: FileText, roles: ['REVIEWEE'] },
    { name: 'Achievements', href: '/achievements', icon: Trophy, roles: ['REVIEWEE'] },

    // Reviewer/Admin specific
    { name: 'Manage Materials', href: '/materials', icon: BookOpen, roles: ['ADMIN', 'REVIEWER'] },
    { name: 'Manage Exams', href: '/manage-exams', icon: FileText, roles: ['ADMIN', 'REVIEWER'] },

    // Admin specific
    { name: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'System Logs', href: '/admin/logs', icon: ShieldCheck, roles: ['ADMIN'] },

    // Common
    { name: 'Video Conferencing', href: '/conferences', icon: Video, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'REVIEWER', 'REVIEWEE'] },
];

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();

    const filteredNavItems = navItems.filter(item =>
        user && item.roles.includes(user.role)
    );

    return (
        <div className="flex flex-col w-64 h-screen bg-primary text-primary-foreground border-r">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <ShieldCheck className="text-secondary w-8 h-8" />
                    <span className="text-white">Normalite</span>
                    <span className="text-secondary">EDGE</span>
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10 mt-auto">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                        {user?.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate capitalize">{user?.role.toLowerCase()}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
