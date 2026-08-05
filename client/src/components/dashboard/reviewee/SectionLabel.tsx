import React from 'react';
import { cn } from '@/lib/utils';

interface SectionLabelProps {
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

/**
 * Design-system section header: 11px uppercase slate label. This is the one
 * size role permitted below the 12px floor (headers are scanned, not read).
 */
export const SectionLabel: React.FC<SectionLabelProps> = ({ children, action, className }) => (
    <div className={cn('mb-2 flex items-center justify-between gap-3', className)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {children}
        </p>
        {action}
    </div>
);

export default SectionLabel;
