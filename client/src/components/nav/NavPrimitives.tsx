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
                'relative flex items-center rounded-lg transition-colors font-medium',
                isHorizontal
                    ? 'flex-col justify-center gap-1 px-2 py-1.5 text-[11px]'
                    : 'gap-3 px-2.5 h-9 text-[13px]',
                isActive
                    ? isHorizontal
                        ? 'text-primary'
                        : 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/6 hover:text-slate-900 dark:hover:text-white/80'
            )}
        >
            {/* Animated active indicator — shared layoutId creates the pill fly-between effect */}
            {isActive && (
                <ActiveIndicator
                    direction={direction}
                    reducedMotion={shouldReduceMotion}
                />
            )}

            <Icon className={cn('shrink-0', isHorizontal ? 'h-[18px] w-[18px]' : 'h-[18px] w-[18px]')} />
            <span className="truncate">{label}</span>
            {badge}
        </NavLink>
    );
};

/* ─── ActiveIndicator ───────────────────────────────────────────────── */

interface ActiveIndicatorProps {
    direction: 'horizontal' | 'vertical';
    reducedMotion: boolean;
}

/**
 * The animated pill behind the active nav item.
 * Uses `layoutId="nav-active"` so only one pill exists visually across
 * all NavItem instances — it springs to the new position on route change.
 */
const ActiveIndicator: React.FC<ActiveIndicatorProps> = ({
    direction,
    reducedMotion,
}) => {
    if (direction === 'vertical') {
        return (
            <motion.span
                layoutId="nav-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary"
                transition={
                    reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 380, damping: 30 }
                }
            />
        );
    }

    return (
        <motion.span
            layoutId="nav-active"
            className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
            transition={
                reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 380, damping: 30 }
            }
        />
    );
};
