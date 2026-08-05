import React from 'react';
import { LayoutDashboard, BookOpen, FileText, User } from 'lucide-react';
import { NavItem } from './NavPrimitives';

/* ─── BottomTabBar ──────────────────────────────────────────────────── */

const tabs = [
    { label: 'Home', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Study', icon: BookOpen, to: '/study' },
    { label: 'Exams', icon: FileText, to: '/exams' },
    { label: 'Profile', icon: User, to: '/profile' },
] as const;

/**
 * Fixed bottom tab bar for mobile (below lg breakpoint).
 * Calendar and Conferences are accessible from the Profile page, NOT as tabs.
 * The parent DashboardLayout controls visibility — this component always renders
 * but is hidden via CSS at lg+.
 */
const BottomTabBar: React.FC = () => {
    return (
        <nav
            aria-label="Primary navigation"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 dark:border-white/6 bg-white/80 backdrop-blur-xl dark:bg-[#0d0f14]/80 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
            <div className="flex items-stretch justify-around px-2 pt-1">
                {tabs.map((tab) => (
                    <NavItem
                        key={tab.to}
                        to={tab.to}
                        icon={tab.icon}
                        label={tab.label}
                        direction="horizontal"
                        data-guide-nav={tab.to}
                    />
                ))}
            </div>
        </nav>
    );
};

export default BottomTabBar;
