import React from 'react';
import { cn } from '@/lib/utils';

interface MetricTileProps {
    label: string;
    /**
     * The formatted value. Pass `null` for "no data" rather than a zero — an exam
     * nobody has submitted has no average score, and rendering `0.00%` tells a
     * manager the cohort failed when in fact the cohort has not sat it.
     */
    value: string | null;
    /** Optional qualifier below the value — a denominator, not decoration. */
    hint?: string;
    className?: string;
}

/**
 * A single headline number. Owns the design system's `Metric value (display)`
 * type role so no page has to reconstruct it: 24px at weight 600, tabular
 * figures, and an 11px uppercase label.
 *
 * `tabular-nums` is not optional. Four tiles in a row with proportional digits
 * shift horizontally against each other as the values change.
 */
export const MetricTile: React.FC<MetricTileProps> = ({ label, value, hint, className }) => (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {label}
        </p>
        <p className="mt-1.5 text-[24px] font-semibold leading-tight tabular-nums text-slate-900">
            {value ?? <span className="text-slate-300">—</span>}
        </p>
        {hint && <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>}
    </div>
);

export default MetricTile;
