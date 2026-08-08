import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type ActiveFilterChip, FilterField } from '@/components/manage/ManageToolbar';
import { ResourceGrid } from '@/components/manage/ResourceGrid';
import { cn } from '@/lib/utils';

interface StudyDeck {
    id: string;
    title: string;
    description: string;
    category: string;
    categoryCode?: string | null;
    color?: string | null;
    cardCount: number;
}

interface DeckResponse {
    id: string;
    title: string;
    description?: string | null;
    subject?: string | null;
    category?: string | null;
    categoryCode?: string | null;
    color?: string | null;
    totalItems?: number;
    questions?: unknown[];
}

const StudyHubPage: React.FC = () => {
    const [decks, setDecks] = useState<StudyDeck[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categoryColors, setCategoryColors] = useState<Record<string, string | null>>({});

    const fetchDecks = useCallback(() => {
        // All state updates run in promise callbacks so the effect that kicks
        // off the fetch performs no synchronous setState calls.
        Promise.resolve()
            .then(() => {
                setLoadState('loading');
                setLoadError(null);
                // A single `limit=100` request silently dropped everything past the
                // first page. The server scopes reviewees to their own track, so the
                // walked set is already narrow.
                return fetchAllPages<DeckResponse>((page, limit) =>
                    api.get('/decks', { params: { page, limit } }),
                );
            })
            .then(({ items }) => {
                setDecks(
                    items.map((deck) => ({
                        id: deck.id,
                        title: deck.title,
                        description: deck.description || '',
                        category: deck.category || 'No category',
                        categoryCode: deck.categoryCode ?? null,
                        cardCount: deck.totalItems ?? deck.questions?.length ?? 0,
                    })),
                );
                setLoadState('ready');
            })
            .catch((error) => {
                console.error('Failed to fetch study decks', error);
                setLoadError('We could not load your study decks.');
                setLoadState('error');
            });
    }, []);

    useEffect(() => {
        void fetchDecks();
    }, [fetchDecks]);

    useEffect(() => {
        api.get('/categories')
            .then((res) => {
                const cats = res.data.data || [];
                const map: Record<string, string | null> = {};
                for (const cat of cats) {
                    map[cat.name] = cat.color ?? null;
                }
                setCategoryColors(map);
            })
            .catch(() => {
                // silent — cards fall back to the neutral slate tone
            });
    }, []);

    const categoryOptions = useMemo(
        () => Array.from(new Set(decks.map((deck) => deck.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [decks],
    );

    const visibleDecks = useMemo(() => {
        const term = search.trim().toLowerCase();
        return decks.filter((deck) => {
            const matchesSearch =
                !term ||
                deck.title.toLowerCase().includes(term) ||
                deck.description.toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'all' || deck.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [decks, search, categoryFilter]);

    const clearAllFilters = useCallback(() => {
        setSearch('');
        setCategoryFilter('all');
    }, []);

    const chips = useMemo(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim().length > 0) {
            next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        }
        if (categoryFilter !== 'all') {
            next.push({
                id: 'category',
                label: `Category: ${categoryFilter}`,
                onClear: () => setCategoryFilter('all'),
            });
        }
        return next;
    }, [search, categoryFilter]);

    const activeFilterCount = chips.length;

    /**
     * The whole card is the link — clicking anywhere on it opens the deck in
     * view mode, matching the minimal reviewee card style. No action buttons,
     * no category badge: category is muted text above the title.
     */
    const renderCard = useCallback(
        (deck: StudyDeck) => (
            <Link
                to={`/study/${deck.id}/view`}
                className="flex min-h-[160px] h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                style={
                    categoryColors[deck.category]
                        ? { borderLeftColor: categoryColors[deck.category]!, borderLeftWidth: '3px' }
                        : undefined
                }
            >
                <span
                    className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                    style={categoryColors[deck.category] ? { color: categoryColors[deck.category]! } : undefined}
                >
                    {deck.category}
                </span>
                <span className="line-clamp-2 text-[14px] font-semibold text-slate-900">{deck.title}</span>
                {deck.description && (
                    <p className="line-clamp-2 text-[12px] text-slate-400">{deck.description}</p>
                )}
                <span className="mt-auto self-end text-[12px] tabular-nums text-slate-500">
                    {deck.cardCount} card{deck.cardCount !== 1 ? 's' : ''}
                </span>
            </Link>
        ),
        [categoryColors],
    );

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <header className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">Study hub</h1>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Browse flashcard decks and sharpen your LET preparation.
                        </p>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-[12px] font-semibold',
                                    activeFilterCount > 0 && 'border-primary/30 text-primary',
                                )}
                            >
                                <SlidersHorizontal size={13} aria-hidden="true" /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 rounded-xl p-3">
                            <div className="space-y-3">
                                <FilterField label="Search">
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search decks or topics…"
                                        aria-label="Search study decks"
                                        className="h-8 w-full rounded-lg border-slate-200 text-[13px]"
                                    />
                                </FilterField>
                                <FilterField label="Category">
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger
                                            className="h-8 w-full rounded-lg border-slate-200 bg-white text-[12px]"
                                            aria-label="Filter by category"
                                        >
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[12px]">
                                                All categories
                                            </SelectItem>
                                            {categoryOptions.map((category) => (
                                                <SelectItem key={category} value={category} className="text-[12px]">
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FilterField>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {chips.map((chip) => (
                        <span
                            key={chip.id}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white py-0.5 pl-2 pr-1 text-[12px] text-slate-600"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={chip.onClear}
                                aria-label={`Remove filter: ${chip.label}`}
                                className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <X size={11} aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="rounded px-1.5 py-0.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        Clear all
                    </button>
                </div>
            )}

            <ResourceGrid
                rows={visibleDecks}
                getRowId={(deck) => deck.id}
                renderCard={renderCard}
                caption="Study decks available to you"
                state={loadState}
                error={loadError}
                onRetry={() => void fetchDecks()}
                filtersActive={activeFilterCount > 0}
                onClearFilters={clearAllFilters}
                emptyTitle="No decks yet"
                emptyDescription="No study decks are assigned to your program yet."
            />
        </div>
    );
};

export default StudyHubPage;
