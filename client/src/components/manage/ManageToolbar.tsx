import React from 'react';
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type ManageView = 'table' | 'grid';

export interface ToolbarSegment {
    value: string;
    label: string;
    count: number;
}

export interface ActiveFilterChip {
    id: string;
    label: string;
    onClear: () => void;
}

interface ManageToolbarProps {
    /**
     * Omitted when the toolbar sits inside a detail-page tab panel, which already
     * has the page's single <h1>. A second one there would break heading order,
     * so the panel supplies its own visually-hidden <h2> instead.
     */
    title?: string;
    description?: string;

    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    searchLabel: string;

    /** Ownership switch. Omitted entirely when not applicable (e.g. admins). */
    segments?: ToolbarSegment[];
    segmentValue?: string;
    onSegmentChange?: (value: string) => void;
    segmentLabel?: string;

    /** The two promoted filters, rendered inline in the toolbar. */
    inlineFilters?: React.ReactNode;
    /** The remaining filters, rendered inside the popover. */
    popoverFilters?: React.ReactNode;
    /** Contextual title shown above the popover's filter controls. */
    filterPopoverTitle?: string;
    /** Optional brief instruction for multi-select filters. */
    filterPopoverDescription?: string;
    activeFilterCount: number;

    chips: ActiveFilterChip[];
    onClearAll: () => void;

    /**
     * Omitted where the collection has no meaningful card form — a panel whose
     * records carry no decisive per-record action ships table-only. See §6.
     */
    view?: ManageView;
    onViewChange?: (view: ManageView) => void;

    /** Omitted on reviewee-facing surfaces, which browse rather than author. */
    createAction?: React.ReactNode;
}

/** Consistent label + control pairing for filters inside the popover. */
export const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
}) => (
    <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {label}
        </span>
        {children}
    </div>
);

interface CheckboxFilterGroupProps {
    label: string;
    options: string[];
    value: string[];
    onValueChange: (value: string[]) => void;
    emptyLabel?: string;
    compact?: boolean;
}

/** A Jira-style multi-select filter: values are toggled with checkboxes and surfaced as active chips. */
export const CheckboxFilterGroup: React.FC<CheckboxFilterGroupProps> = ({
    label,
    options,
    value,
    onValueChange,
    emptyLabel = 'No options available',
    compact = false,
}) => {
    const groupId = React.useId();
    const toggle = (option: string) => {
        onValueChange(value.includes(option)
            ? value.filter((selected) => selected !== option)
            : [...value, option]);
    };

    return (
        <fieldset className={cn(compact ? 'min-w-0' : 'rounded-lg border border-slate-200 bg-white p-2.5')}>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</legend>
            <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-500">
                    {value.length > 0 ? `${value.length} selected` : 'All'}
                </span>
                {value.length > 0 && (
                    <button type="button" onClick={() => onValueChange([])} className="rounded px-1 text-[11px] font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        Clear
                    </button>
                )}
            </div>
            {options.length > 0 ? (
                <div className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto pr-1">
                    {options.map((option, index) => {
                        const inputId = `${groupId}-${index}`;
                        return (
                            <div key={option} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-slate-50">
                                <Checkbox id={inputId} checked={value.includes(option)} onCheckedChange={() => toggle(option)} className="mt-0.5" />
                                <label htmlFor={inputId} className="cursor-pointer break-words text-[12px] leading-5 text-slate-700">{option}</label>
                            </div>
                        );
                    })}
                </div>
            ) : <p className="text-[12px] text-slate-500">{emptyLabel}</p>}
        </fieldset>
    );
};

export const ManageToolbar: React.FC<ManageToolbarProps> = ({
    title,
    description,
    search,
    onSearchChange,
    searchPlaceholder,
    searchLabel,
    segments,
    segmentValue,
    onSegmentChange,
    segmentLabel = 'Filter by owner',
    inlineFilters,
    popoverFilters,
    filterPopoverTitle = 'Filters',
    filterPopoverDescription,
    activeFilterCount,
    chips,
    onClearAll,
    view,
    onViewChange,
    createAction,
}) => (
    <div className="flex flex-col gap-3">
        {(title || createAction) && (
            <div className="flex flex-wrap items-start justify-between gap-3">
                {title && (
                    <div>
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">{title}</h1>
                        {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
                    </div>
                )}
                {createAction}
            </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
            {segments && segments.length > 0 && onSegmentChange && (
                <div
                    role="group"
                    aria-label={segmentLabel}
                    className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-0.5 scrollbar-hide"
                >
                    {segments.map((segment) => {
                        const isActive = segment.value === segmentValue;
                        return (
                            <button
                                key={segment.value}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => onSegmentChange(segment.value)}
                                className={cn(
                                    'shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                    isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                                )}
                            >
                                {segment.label}
                                <span
                                    className={cn(
                                        'ml-1.5 tabular-nums',
                                        isActive ? 'text-white/70' : 'text-slate-400',
                                    )}
                                >
                                    {segment.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="group relative w-full sm:w-56">
                <Search
                    size={14}
                    aria-hidden="true"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                />
                <Input
                    aria-label={searchLabel}
                    placeholder={searchPlaceholder}
                    className="h-8 rounded-lg border-slate-200 pl-8 pr-8 text-[13px]"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <X size={13} aria-hidden="true" />
                    </button>
                )}
            </div>

            {inlineFilters}

            {popoverFilters && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-[12px] font-semibold"
                        >
                            <SlidersHorizontal size={13} aria-hidden="true" /> Filters
                            {activeFilterCount > 0 && (
                                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-h-[calc(100vh-4rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl p-0">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                            <div>
                                <p className="text-[13px] font-semibold text-slate-900">{filterPopoverTitle}</p>
                                {filterPopoverDescription && <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{filterPopoverDescription}</p>}
                            </div>
                            {activeFilterCount > 0 && (
                                <button type="button" onClick={onClearAll} className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                                    Clear all
                                </button>
                            )}
                        </div>
                        <div className="space-y-2 p-3">{popoverFilters}</div>
                    </PopoverContent>
                </Popover>
            )}

            {view && onViewChange && (
            <div
                role="group"
                aria-label="View mode"
                className="ml-auto hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 sm:flex"
            >
                <button
                    type="button"
                    aria-pressed={view === 'table'}
                    aria-label="Table view"
                    onClick={() => onViewChange('table')}
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        view === 'table'
                            ? 'bg-primary text-white'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    )}
                >
                    <List size={13} aria-hidden="true" /> Table
                </button>
                <button
                    type="button"
                    aria-pressed={view === 'grid'}
                    aria-label="Grid view"
                    onClick={() => onViewChange('grid')}
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        view === 'grid'
                            ? 'bg-primary text-white'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    )}
                >
                    <LayoutGrid size={13} aria-hidden="true" /> Grid
                </button>
            </div>
            )}
        </div>

        {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((chip) => (
                    <button
                        key={chip.id}
                        type="button"
                        onClick={chip.onClear}
                        aria-label={`Remove filter: ${chip.label}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white py-0.5 pl-2 pr-1 text-[12px] text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {chip.label}
                        <X size={11} aria-hidden="true" className="text-slate-400" />
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onClearAll}
                    className="rounded px-1.5 py-0.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    Clear all
                </button>
            </div>
        )}
    </div>
);

export default ManageToolbar;
