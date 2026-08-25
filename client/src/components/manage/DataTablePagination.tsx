import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZES = [25, 50, 100];

function pageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const items: Array<number | 'ellipsis'> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) items.push('ellipsis');
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < totalPages - 1) items.push('ellipsis');
    items.push(totalPages);

    return items;
}

interface DataTablePaginationProps {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    itemLabel?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Shared pagination controls for both client- and server-paginated data
 * tables. The compact page window is deliberately consistent with Jira's
 * familiar navigation pattern.
 */
export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    itemLabel = 'items',
    disabled = false,
    className,
}) => {
    const safeTotalPages = Math.max(1, totalPages);
    const safePage = Math.min(Math.max(1, page), safeTotalPages);
    const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const lastItem = Math.min(safePage * pageSize, totalItems);

    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
            <p className="text-[12px] text-slate-500" role="status">
                Showing <span className="font-semibold text-slate-700">{firstItem}–{lastItem}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> {itemLabel}
            </p>
            <div className="flex items-center gap-3">
                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-slate-500">Rows</span>
                        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
                            <SelectTrigger className="h-7 w-16 rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Rows per page">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((size) => <SelectItem key={size} value={String(size)} className="text-[12px]">{size}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <nav className="flex items-center gap-0.5" aria-label="Pagination">
                    <Button variant="outline" className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0" disabled={disabled || safePage <= 1} onClick={() => onPageChange(safePage - 1)} aria-label="Previous page">
                        <ChevronLeft size={14} aria-hidden="true" />
                    </Button>
                    {pageItems(safePage, safeTotalPages).map((item, index) => item === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} aria-hidden="true" className="inline-flex h-7 w-5 items-center justify-center text-[12px] text-slate-400">…</span>
                    ) : (
                        <button key={item} type="button" aria-label={`Page ${item}`} aria-current={item === safePage ? 'page' : undefined} onClick={() => onPageChange(item)} disabled={disabled} className={cn('inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50', item === safePage ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                            {item}
                        </button>
                    ))}
                    <Button variant="outline" className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0" disabled={disabled || safePage >= safeTotalPages} onClick={() => onPageChange(safePage + 1)} aria-label="Next page">
                        <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                </nav>
            </div>
        </div>
    );
};

export default DataTablePagination;
