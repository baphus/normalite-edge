import React from 'react';
import { LayoutDashboard, BookOpen, FileText, CalendarDays, User } from 'lucide-react';
import { NavItem } from './NavPrimitives';

/* ─── BottomTabBar ──────────────────────────────────────────────────── */

const tabs = [
    { label: 'Study', icon: BookOpen, to: '/study' },
    { label: 'Exam', icon: FileText, to: '/exams' },
    { label: 'Home', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
    { label: 'Profile', icon: User, to: '/profile' },
] as const;

/**
 * Floating bottom tab bar for mobile (below lg breakpoint).
 *
 * It intentionally sits in its own material layer so the page can scroll behind
 * it, while the dashboard layout reserves enough room for the bar and iOS home
 * indicator. The parent DashboardLayout controls visibility.
 */
const BottomTabBar: React.FC = () => {
    return (
        <nav
            aria-label="Primary navigation"
            className="fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 px-3 lg:hidden"
        >
            <div className="mx-auto flex min-h-16 max-w-xl items-stretch justify-around rounded-xl bg-white/82 px-1 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:bg-[#17181d]/82 dark:shadow-[0_8px_24px_rgba(0,0,0,0.36)]">
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
