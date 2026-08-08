import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterField } from '@/components/manage/ManageToolbar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

export type FilterPublishedValue = 'all' | 'last_7_days' | 'last_30_days';

interface FilterSheetProps {
    /** Distinct categories present in the exam list. */
    categories: string[];
    /** Current category filter value ('all' when none applied). */
    category: string;
    onCategoryChange: (value: string) => void;
    /** Current date-published filter value ('all' when none applied). */
    published: FilterPublishedValue;
    onPublishedChange: (value: FilterPublishedValue) => void;
    /** Number of exams matching the active filters — shown on the confirm button. */
    resultCount: number;
}

/**
 * Mobile-only bottom sheet for the exam filters. The trigger is hidden on
 * desktop (`sm:hidden`), where the same two filters stay inline in the toolbar.
 * Filter state is fully controlled by the caller and mirrored into the URL
 * search params, so the sheet only edits the shared state.
 */
const FilterSheet: React.FC<FilterSheetProps> = ({
    categories,
    category,
    onCategoryChange,
    published,
    onPublishedChange,
    resultCount,
}) => {
    const activeCount = (category !== 'all' ? 1 : 0) + (published !== 'all' ? 1 : 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-[12px] font-semibold sm:hidden"
                >
                    <SlidersHorizontal size={13} aria-hidden="true" />
                    Filters
                    {activeCount > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent side="bottom" className="flex max-h-[85vh] flex-col rounded-t-xl p-0 font-lexend">
                {/* Drag handle — visual affordance only; the overlay closes on tap-out. */}
                <div className="shrink-0 pt-3" aria-hidden="true">
                    <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
                </div>

                <SheetHeader className="shrink-0 px-4 pb-1 pr-10 pt-3 text-left">
                    <SheetTitle className="text-[16px] font-semibold tracking-tight text-slate-900">
                        Filters
                    </SheetTitle>
                    <SheetDescription className="text-[12px] text-slate-500">
                        Narrow exams by category and publish date
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <FilterField label="Category">
                        <Select value={category} onValueChange={onCategoryChange}>
                            <SelectTrigger
                                className="h-9 w-full rounded-lg border-slate-200 bg-white text-[13px]"
                                aria-label="Filter by category"
                            >
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                <SelectItem value="all" className="text-[13px]">
                                    All categories
                                </SelectItem>
                                {categories.map((item) => (
                                    <SelectItem key={item} value={item} className="text-[13px]">
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FilterField>

                    <FilterField label="Date published">
                        <Select
                            value={published}
                            onValueChange={(value) => onPublishedChange(value as FilterPublishedValue)}
                        >
                            <SelectTrigger
                                className="h-9 w-full rounded-lg border-slate-200 bg-white text-[13px]"
                                aria-label="Filter by publish date"
                            >
                                <SelectValue placeholder="All dates" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                <SelectItem value="all" className="text-[13px]">
                                    All dates
                                </SelectItem>
                                <SelectItem value="last_7_days" className="text-[13px]">
                                    Last 7 days
                                </SelectItem>
                                <SelectItem value="last_30_days" className="text-[13px]">
                                    Last 30 days
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                </div>

                {/* Confirm footer — pinned so the button never scrolls out of reach. */}
                <div className="shrink-0 border-t border-slate-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                    <SheetClose asChild>
                        <Button className="h-10 w-full rounded-lg bg-primary text-[13px] font-semibold text-white hover:bg-primary/90">
                            Show {resultCount} {resultCount === 1 ? 'result' : 'results'}
                        </Button>
                    </SheetClose>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default FilterSheet;
