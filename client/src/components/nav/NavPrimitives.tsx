import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useMotionPreference } from '@/contexts/MotionContext';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
    direction?: 'horizontal' | 'vertical';
    badge?: React.ReactNode;
    onClick?: () => void;
    'data-guide-nav'?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function useIsActive(to: string): boolean {
    const { pathname } = useLocation();
    if (to === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(to);
}

/* ─── NavItem ───────────────────────────────────────────────────────── */

/**
 * A pressable nav link with icon + label.
 * Uses NavLink for route matching and motion for tap feedback.
 * Respects reduced motion preferences.
 * Renders its own ActiveIndicator when active — the shared layoutId
 * across all NavItem instances creates the spring animation between items.
 */
export const NavItem: React.FC<NavItemProps> = ({
    to,
    icon: Icon,
    label,
    direction = 'vertical',
    badge,
    onClick,
    'data-guide-nav': dataGuideNav,
}) => {
    const { reducedMotion: shouldReduceMotion } = useMotionPreference();
    const isActive = useIsActive(to);
    const isHorizontal = direction === 'horizontal';

    return (
        <NavLink
            to={to}
            onClick={onClick}
            data-guide-nav={dataGuideNav}
            className={cn(
                'relative flex items-center rounded-lg font-medium transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0d0f14]',
                isHorizontal
                    ? 'min-h-14 flex-1 flex-col justify-center gap-0.5 px-1 text-xs'
                    : 'gap-3 px-2.5 h-9 text-[13px]',
                isActive
                    ? isHorizontal
                        ? 'text-primary'
                        : 'bg-primary/10 text-primary'
                    : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/6 hover:text-slate-900 dark:hover:text-white/80'
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'relative flex shrink-0 items-center justify-center',
                    isHorizontal ? 'h-8 w-8' : 'h-6 w-6 rounded-md',
                    isActive && !isHorizontal && 'bg-primary text-white'
                )}
            >
                {isActive && isHorizontal && (
                    <ActiveIndicator reducedMotion={shouldReduceMotion} />
                )}
                <Icon className={cn('relative z-10 h-[18px] w-[18px]')} />
            </span>
            <span className="truncate">{label}</span>
            {badge}
        </NavLink>
    );
};

/* ─── ActiveIndicator ───────────────────────────────────────────────── */

interface ActiveIndicatorProps {
    reducedMotion: boolean;
}

/**
 * The animated selection capsule behind the active mobile tab icon. It uses a
 * shared layout id, preserving a single, calm transition as the active tab
 * changes. Desktop uses a persistent high-contrast row treatment instead.
 */
const ActiveIndicator: React.FC<ActiveIndicatorProps> = ({
    reducedMotion,
}) => {
    return (
        <motion.span
            layoutId="nav-active"
            className="absolute inset-0 rounded-full bg-primary/12"
            transition={
                reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 380, damping: 30 }
            }
        />
    );
};
