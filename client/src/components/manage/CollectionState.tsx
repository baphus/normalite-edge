import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The empty / no-match / error presentations, shared by ResourceTable and the
 * secondary grid views so the two cannot drift apart.
 *
 * Every presentation keeps its shared frame but lets the caller own the
 * iconography and copy through optional props, so a page can warm up a state
 * ("You've completed all exams") without forking the shared component.
 */

export const CollectionError: React.FC<{
    message: string;
    onRetry?: () => void;
    icon?: React.ReactNode;
    description?: string;
}> = ({ message, onRetry, icon, description }) => (
    <div className="rounded-xl border border-red-200 bg-white px-6 py-10 text-center">
        {icon ?? <AlertCircle size={22} className="mx-auto mb-3 text-red-500" aria-hidden="true" />}
        <p className="text-[13px] font-semibold text-slate-900">{message}</p>
        <p className="mt-1 text-[12px] text-slate-500">
            {description ?? 'Check your connection and try again.'}
        </p>
        {onRetry && (
            <Button
                variant="outline"
                className="mt-4 h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                onClick={onRetry}
            >
                Retry
            </Button>
        )}
    </div>
);

interface CollectionEmptyProps {
    /** True when a filter, search term, or scope is narrowing the list. */
    filtersActive: boolean;
    onClearFilters?: () => void;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction?: React.ReactNode;
    /** Optional icon rendered above the title when no filter is narrowing the list. */
    emptyIcon?: React.ReactNode;
    /** Optional icon rendered above the title when a filter is narrowing the list. */
    filtersIcon?: React.ReactNode;
    filtersTitle?: string;
    filtersDescription?: string;
    filtersActionLabel?: string;
}

export const CollectionEmpty: React.FC<CollectionEmptyProps> = ({
    filtersActive,
    onClearFilters,
    emptyTitle,
    emptyDescription,
    emptyAction,
    emptyIcon,
    filtersIcon,
    filtersTitle,
    filtersDescription,
    filtersActionLabel,
}) => (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-12 text-center">
        {filtersActive ? (
            <>
                {filtersIcon}
                <p className="text-[13px] font-semibold text-slate-900">
                    {filtersTitle ?? 'No matches for these filters'}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                    {filtersDescription ?? 'Try widening your search or clearing the active filters.'}
                </p>
                {onClearFilters && (
                    <Button
                        variant="outline"
                        className="mt-4 h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                        onClick={onClearFilters}
                    >
                        {filtersActionLabel ?? 'Clear filters'}
                    </Button>
                )}
            </>
        ) : (
            <>
                {emptyIcon}
                <p className="text-[13px] font-semibold text-slate-900">{emptyTitle}</p>
                <p className="mt-1 text-[12px] text-slate-500">{emptyDescription}</p>
                {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
            </>
        )}
    </div>
);
