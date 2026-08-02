import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronsUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ResourceColumn<T> {
    id: string;
    header: string;
    /** Rendered inside the <td> on the desktop table. */
    cell: (row: T) => React.ReactNode;
    /** Applied to both the <th> and <td> — use for width and alignment. */
    className?: string;
    sortable?: boolean;
    /** Value used for client-side sorting. Required when sortable. */
    sortValue?: (row: T) => string | number;
    /** Line 1, left — the title/link column. Exactly one column should set this. */
    primary?: boolean;
    /** Line 1, right — the status column. At most one column should set this. */
    status?: boolean;
    /** Included in the line 2 meta strip of the narrow-viewport stacked row. */
    stacked?: boolean;
    /** Overrides `cell` when rendering the narrow-viewport meta strip. */
    stackedCell?: (row: T) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100];

export interface ResourceTableProps<T> {
    rows: T[];
    columns: ResourceColumn<T>[];
    getRowId: (row: T) => string;
    /** Accessible description of the table. Visually hidden. */
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

    /** Trailing actions cell (kebab). Clicks inside are not treated as row clicks. */
    rowActions?: (row: T) => React.ReactNode;

    /**
     * Changing this string resets pagination to page 1 — pass a serialisation of
     * the active filters so filtering never strands the user on an empty page.
     */
    resetKey?: string;

    initialSort?: { columnId: string; direction: SortDirection };
}

function compareValues(a: string | number, b: string | number): number {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function ResourceTableInner<T>({
    rows,
    columns,
    getRowId,
    caption,
    state,
    error,
    onRetry,
    filtersActive = false,
    onClearFilters,
    emptyTitle,
    emptyDescription,
    emptyAction,
    rowActions,
    resetKey,
    initialSort,
}: ResourceTableProps<T>) {
    const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(
        initialSort ?? null,
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    // Filtering or resizing the page must send the user back to page 1, otherwise a
    // narrowed result set can strand them on a page that no longer exists. Adjusted
    // during render (React's documented pattern) rather than in an effect, so there
    // is no intermediate paint on the stale page.
    const paginationResetKey = `${resetKey ?? ''}|${pageSize}`;
    const [lastResetKey, setLastResetKey] = useState(paginationResetKey);
    if (lastResetKey !== paginationResetKey) {
        setLastResetKey(paginationResetKey);
        setPage(1);
    }

    const sortedRows = useMemo(() => {
        if (!sort) return rows;
        const column = columns.find((candidate) => candidate.id === sort.columnId);
        if (!column?.sortValue) return rows;
        const sortValue = column.sortValue;
        const factor = sort.direction === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => compareValues(sortValue(a), sortValue(b)) * factor);
    }, [rows, columns, sort]);

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = useMemo(
        () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
        [sortedRows, safePage, pageSize],
    );

    const primaryColumn = columns.find((column) => column.primary) ?? columns[0];
    const statusColumn = columns.find((column) => column.status);
    const stackedColumns = columns.filter((column) => column.stacked);
    const columnCount = columns.length + (rowActions ? 1 : 0);

    const toggleSort = (columnId: string) => {
        setSort((current) => {
            if (!current || current.columnId !== columnId) return { columnId, direction: 'asc' };
            if (current.direction === 'asc') return { columnId, direction: 'desc' };
            return null;
        });
        setPage(1);
    };

    const ariaSortFor = (columnId: string): React.AriaAttributes['aria-sort'] => {
        if (!sort || sort.columnId !== columnId) return 'none';
        return sort.direction === 'asc' ? 'ascending' : 'descending';
    };

    // ── Error ────────────────────────────────────────────────────────────────
    if (state === 'error') {
        return (
            <div className="rounded-xl border border-red-200 bg-white px-6 py-10 text-center">
                <AlertCircle size={22} className="mx-auto mb-3 text-red-500" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-slate-900">{error || 'Something went wrong'}</p>
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
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    if (state === 'loading') {
        return (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden lg:block">
                    <table className="w-full">
                        <caption className="sr-only">{caption}</caption>
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/60">
                                {columns.map((column) => (
                                    <th
                                        key={column.id}
                                        scope="col"
                                        className={cn(
                                            'h-9 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500',
                                            column.className,
                                        )}
                                    >
                                        {column.header}
                                    </th>
                                ))}
                                {rowActions && <th scope="col" className="w-10" />}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 8 }).map((_, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                                    {Array.from({ length: columnCount }).map((__, cellIndex) => (
                                        <td key={cellIndex} className="px-3 py-2.5">
                                            <Skeleton className={cn('h-3.5', cellIndex === 0 ? 'w-3/4' : 'w-2/3')} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="divide-y divide-slate-100 lg:hidden" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="space-y-2 px-3 py-3">
                            <Skeleton className="h-3.5 w-2/3" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
                <span className="sr-only" role="status">Loading…</span>
            </div>
        );
    }

    // ── Empty / no match ─────────────────────────────────────────────────────
    if (sortedRows.length === 0) {
        return (
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
    }

    // ── Ready ────────────────────────────────────────────────────────────────
    const firstRowIndex = (safePage - 1) * pageSize + 1;
    const lastRowIndex = Math.min(safePage * pageSize, sortedRows.length);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                    <caption className="sr-only">{caption}</caption>
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60">
                            {columns.map((column) => (
                                <th
                                    key={column.id}
                                    scope="col"
                                    aria-sort={column.sortable ? ariaSortFor(column.id) : undefined}
                                    className={cn(
                                        'h-9 px-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500',
                                        column.className,
                                    )}
                                >
                                    {column.sortable && column.sortValue ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(column.id)}
                                            className="inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                                        >
                                            {column.header}
                                            {!sort || sort.columnId !== column.id ? (
                                                <ChevronsUpDown size={11} className="text-slate-300" aria-hidden="true" />
                                            ) : sort.direction === 'asc' ? (
                                                <ArrowUp size={11} className="text-primary" aria-hidden="true" />
                                            ) : (
                                                <ArrowDown size={11} className="text-primary" aria-hidden="true" />
                                            )}
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                            {rowActions && (
                                <th scope="col" className="w-10">
                                    <span className="sr-only">Actions</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row) => (
                            <tr
                                key={getRowId(row)}
                                className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.id}
                                        className={cn('px-3 py-2 align-middle text-[13px] text-slate-700', column.className)}
                                    >
                                        {column.cell(row)}
                                    </td>
                                ))}
                                {rowActions && (
                                    <td className="px-1 py-2 text-right align-middle">{rowActions(row)}</td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Narrow viewport: two-line stacked rows */}
            <ul className="divide-y divide-slate-100 lg:hidden">
                {pageRows.map((row) => (
                    <li key={getRowId(row)} className="flex items-start gap-2 px-3 py-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 text-[13px] font-semibold text-slate-900">
                                    {primaryColumn.cell(row)}
                                </div>
                                {statusColumn && <div className="shrink-0">{statusColumn.cell(row)}</div>}
                            </div>
                            {stackedColumns.length > 0 && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-slate-500">
                                    {stackedColumns.map((column, index) => (
                                        <React.Fragment key={column.id}>
                                            {index > 0 && <span aria-hidden="true">·</span>}
                                            <span>{(column.stackedCell ?? column.cell)(row)}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                        {rowActions && <div className="shrink-0">{rowActions(row)}</div>}
                    </li>
                ))}
            </ul>

            {/* Pagination footer */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-slate-500" role="status">
                    Showing <span className="font-semibold text-slate-700">{firstRowIndex}–{lastRowIndex}</span> of{' '}
                    <span className="font-semibold text-slate-700">{sortedRows.length}</span>
                </p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-slate-500">Rows</span>
                        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                            <SelectTrigger
                                className="h-7 w-16 rounded-lg border-slate-200 bg-white text-[12px]"
                                aria-label="Rows per page"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map((size) => (
                                    <SelectItem key={size} value={String(size)} className="text-[12px]">
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0"
                            disabled={safePage <= 1}
                            onClick={() => setPage(safePage - 1)}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={14} aria-hidden="true" />
                        </Button>
                        <span className="px-1 text-[12px] tabular-nums text-slate-500">
                            {safePage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(safePage + 1)}
                            aria-label="Next page"
                        >
                            <ChevronRight size={14} aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const ResourceTable = ResourceTableInner;
export default ResourceTableInner;
