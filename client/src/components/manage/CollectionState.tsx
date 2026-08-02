import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The empty / no-match / error presentations, shared by ResourceTable and the
 * secondary grid views so the two cannot drift apart.
 */

export const CollectionError: React.FC<{ message: string; onRetry?: () => void }> = ({
    message,
    onRetry,
}) => (
    <div className="rounded-xl border border-red-200 bg-white px-6 py-10 text-center">
        <AlertCircle size={22} className="mx-auto mb-3 text-red-500" aria-hidden="true" />
        <p className="text-[13px] font-semibold text-slate-900">{message}</p>
        <p className="mt-1 text-[12px] text-slate-500">Check your connection and try again.</p>
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
}

export const CollectionEmpty: React.FC<CollectionEmptyProps> = ({
    filtersActive,
    onClearFilters,
    emptyTitle,
    emptyDescription,
    emptyAction,
}) => (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-12 text-center">
        {filtersActive ? (
            <>
                <p className="text-[13px] font-semibold text-slate-900">No matches for these filters</p>
                <p className="mt-1 text-[12px] text-slate-500">
                    Try widening your search or clearing the active filters.
                </p>
                {onClearFilters && (
                    <Button
                        variant="outline"
                        className="mt-4 h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                        onClick={onClearFilters}
                    >
                        Clear filters
                    </Button>
                )}
            </>
        ) : (
            <>
                <p className="text-[13px] font-semibold text-slate-900">{emptyTitle}</p>
                <p className="mt-1 text-[12px] text-slate-500">{emptyDescription}</p>
                {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
            </>
        )}
    </div>
);
