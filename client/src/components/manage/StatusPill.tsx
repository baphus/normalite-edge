import React from 'react';
import { cn } from '@/lib/utils';

/**
 * `live`/`draft`/`closed`/`archived` describe a resource's publication state.
 * `success`/`pending` describe a unit of work — an attempt that is submitted or
 * still running. They share the publication tones' colours, but exist under
 * their own names so a caller styling an attempt does not have to write
 * `tone="live"` and leave the next reader wondering whether it is a bug.
 */
export type StatusTone =
    | 'live'
    | 'draft'
    | 'closed'
    | 'archived'
    | 'neutral'
    | 'success'
    | 'pending';

const EMERALD = { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' };
const AMBER = { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
const SLATE = { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
    live: EMERALD,
    draft: AMBER,
    closed: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' },
    archived: SLATE,
    neutral: SLATE,
    success: EMERALD,
    pending: AMBER,
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
