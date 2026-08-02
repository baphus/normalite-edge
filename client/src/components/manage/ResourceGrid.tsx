import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionEmpty, CollectionError } from './CollectionState';

/**
 * The card-grid counterpart to `ResourceTable`.
 *
 * Both manager pages had grown their own private copy of this — same wrapper,
 * same three-state preamble, same card shell — so a fix to one never reached
 * the other. `CollectionState` was extracted to stop the *states* diverging;
 * this stops the container diverging too.
 *
 * It owns the four states and the responsive columns. The card itself is a
 * render prop, because a manager card (status + kebab + meta) and a reviewee
 * card (category + a decisive action) genuinely differ — only the frame is
 * shared.
 *
 * Unlike `ResourceTable` this does not paginate: the grid is a browse surface
 * where scrolling is the expected interaction. Callers that need bounded
 * output should use the table.
 */

export interface ResourceGridProps<T> {
    rows: T[];
    getRowId: (row: T) => string;
    renderCard: (row: T) => React.ReactNode;

    /** Accessible description of the collection. Visually hidden. */
    caption: string;

    state: 'loading' | 'error' | 'ready';
    error?: string | null;
    onRetry?: () => void;

    /** True when any filter or search term is narrowing the list. */
    filtersActive?: boolean;
    onClearFilters?: () => void;

    emptyTitle: string;
    emptyDescription: string;
    emptyAction?: React.ReactNode;

    /** Placeholder cards drawn while loading. */
    skeletonCount?: number;
}

const GRID_CLASSES = 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3';

function ResourceGridInner<T>({
    rows,
    getRowId,
    renderCard,
    caption,
    state,
    error,
    onRetry,
    filtersActive = false,
    onClearFilters,
    emptyTitle,
    emptyDescription,
    emptyAction,
    skeletonCount = 6,
}: ResourceGridProps<T>) {
    // ── Error ────────────────────────────────────────────────────────────────
    if (state === 'error') {
        return <CollectionError message={error || 'Something went wrong'} onRetry={onRetry} />;
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    // Skeleton cards rather than a "Loading…" line: the shape of what is coming
    // is the point, and it keeps this state distinguishable from empty at a glance.
    if (state === 'loading') {
        return (
            <>
                <div className={GRID_CLASSES} aria-hidden="true">
                    {Array.from({ length: skeletonCount }).map((_, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <Skeleton className="h-4 w-20 rounded" />
                                <Skeleton className="h-4 w-16 rounded" />
                            </div>
                            <Skeleton className="h-4 w-3/4 rounded" />
                            <Skeleton className="h-3 w-1/2 rounded" />
                            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                                <Skeleton className="h-3 rounded" />
                                <Skeleton className="h-3 rounded" />
                            </div>
                            <Skeleton className="mt-1 h-8 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
                <span className="sr-only" role="status">
                    Loading…
                </span>
            </>
        );
    }

    // ── Empty / no match ─────────────────────────────────────────────────────
    if (rows.length === 0) {
        return (
            <CollectionEmpty
                filtersActive={filtersActive}
                onClearFilters={onClearFilters}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                emptyAction={emptyAction}
            />
        );
    }

    // ── Ready ────────────────────────────────────────────────────────────────
    return (
        <ul className={GRID_CLASSES} aria-label={caption}>
            {rows.map((row) => (
                <li key={getRowId(row)} className="flex">
                    {renderCard(row)}
                </li>
            ))}
        </ul>
    );
}

export { ResourceGridInner as ResourceGrid };
