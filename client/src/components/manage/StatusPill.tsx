import React from 'react';
import { cn } from '@/lib/utils';

export type StatusTone = 'live' | 'draft' | 'closed' | 'archived' | 'neutral';

const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
    live: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
    draft: { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    closed: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' },
    archived: { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    neutral: { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

interface StatusPillProps {
    tone: StatusTone;
    label: string;
    className?: string;
}

/**
 * Status is always conveyed by dot + text, never colour alone (WCAG 1.4.1).
 */
export const StatusPill: React.FC<StatusPillProps> = ({ tone, label, className }) => {
    const tokens = TONE_CLASSES[tone];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                tokens.pill,
                className,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tokens.dot)} aria-hidden="true" />
            {label}
        </span>
    );
};

export default StatusPill;
