import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, BookOpen } from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { categoryToneClasses } from '@/lib/categoryTone';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ManageToolbar,
    type ActiveFilterChip,
    type ManageView,
} from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';
import { ResourceGrid } from '@/components/manage/ResourceGrid';
import { cn } from '@/lib/utils';

interface StudyDeck {
    id: string;
    title: string;
    description: string;
    category: string;
    categoryCode?: string | null;
    cardCount: number;
}

interface DeckResponse {
    id: string;
    title: string;
    description?: string | null;
    subject?: string | null;
    category?: string | null;
    categoryCode?: string | null;
    totalItems?: number;
    questions?: unknown[];
}

const StudyHubPage: React.FC = () => {
    const navigate = useNavigate();
    const [decks, setDecks] = useState<StudyDeck[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [view, setView] = useState<ManageView>('grid');

    const fetchDecks = useCallback(async () => {
        setLoadState('loading');
        setLoadError(null);
        try {
            // A single `limit=100` request silently dropped everything past the
            // first page. The server scopes reviewees to their own track, so the
            // walked set is already narrow.
            const { items } = await fetchAllPages<DeckResponse>((page, limit) =>
                api.get('/decks', { params: { page, limit } }),
            );
            setDecks(
                items.map((deck) => ({
                    id: deck.id,
                    title: deck.title,
                    description: deck.description || `${deck.subject || 'General'} deck`,
                    category: deck.category || 'No category',
                    categoryCode: deck.categoryCode ?? null,
                    cardCount: deck.totalItems ?? deck.questions?.length ?? 0,
                })),
            );
            setLoadState('ready');
        } catch (error) {
            console.error('Failed to fetch study decks', error);
            setLoadError('We could not load your study decks.');
            setLoadState('error');
        }
    }, []);

    useEffect(() => {
        void fetchDecks();
    }, [fetchDecks]);

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

    const renderCategoryBadge = useCallback(
        (deck: StudyDeck) => (
            <span
                className={cn(
                    'inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                    categoryToneClasses(deck.category, deck.categoryCode),
                )}
            >
                {deck.category}
            </span>
        ),
        [],
    );

    /**
     * Two actions, not three. The old "View" button is now the title link, which
     * is how both manager grids already work; what remains is the pair a reviewee
     * actually came for, with the quiz as the primary.
     */
    const renderActions = useCallback(
        (deck: StudyDeck, options?: { fullWidth?: boolean; stacked?: boolean }) => (
            <div
                className={cn(
                    'flex items-center gap-1.5',
                    options?.fullWidth ? 'w-full' : 'justify-end',
                    options?.stacked ? 'flex-col' : '',
                )}
            >
                <Button
                    variant="outline"
                    className={cn(
                        'h-10 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700',
                        options?.fullWidth ? 'flex-1' : '',
                    )}
                    onClick={() => navigate(`/study/${deck.id}?mode=flashcards`)}
                >
                    <BookOpen size={13} aria-hidden="true" /> Cards
                </Button>
                <Button
                    className={cn(
                        'h-10 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90',
                        options?.fullWidth ? 'flex-1' : '',
                    )}
                    onClick={() => navigate(`/study/${deck.id}?mode=study`)}
                >
                    <Brain size={13} aria-hidden="true" /> Quiz
                </Button>
            </div>
        ),
        [navigate],
    );

    const columns = useMemo<ResourceColumn<StudyDeck>[]>(
        () => [
            {
                id: 'title',
                header: 'Deck',
                primary: true,
                sortable: true,
                sortValue: (deck) => deck.title,
                cell: (deck) => (
                    <Link
                        to={`/study/${deck.id}/view`}
                        className="line-clamp-2 font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {deck.title}
                    </Link>
                ),
            },
            {
                id: 'description',
                header: 'Description',
                cell: (deck) => <span className="line-clamp-1 text-slate-500">{deck.description}</span>,
            },
            {
                id: 'category',
                header: 'Category',
                className: 'w-44',
                stacked: true,
                sortable: true,
                sortValue: (deck) => deck.category,
                cell: renderCategoryBadge,
                stackedCell: (deck) => deck.category,
            },
            {
                id: 'cards',
                header: 'Cards',
                className: 'w-20 tabular-nums',
                stacked: true,
                sortable: true,
                sortValue: (deck) => deck.cardCount,
                cell: (deck) => deck.cardCount,
                stackedCell: (deck) => `${deck.cardCount} cards`,
            },
        ],
        [renderCategoryBadge],
    );

    const renderCard = useCallback(
        (deck: StudyDeck) => (
            <div className="flex min-h-[180px] h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-2">{renderCategoryBadge(deck)}</div>

                <div className="min-w-0">
                    <Link
                        to={`/study/${deck.id}/view`}
                        className="line-clamp-2 text-[14px] font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {deck.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-400">{deck.description}</p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-[12px]">
                    <dt className="text-slate-400">Cards</dt>
                    <dd className="font-semibold tabular-nums text-slate-700">{deck.cardCount}</dd>
                </div>

                <div className="pt-1">{renderActions(deck, { fullWidth: true, stacked: true })}</div>
            </div>
        ),
        [renderActions, renderCategoryBadge],
    );

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Study hub"
                description="Browse flashcard decks and sharpen your LET preparation."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search decks or topics…"
                searchLabel="Search study decks"
                inlineFilters={
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger
                            className="h-8 w-40 rounded-lg border-slate-200 bg-white text-[12px]"
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
                }
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                view={view}
                onViewChange={setView}
            />

            {view === 'table' ? (
                <ResourceTable
                    rows={visibleDecks}
                    columns={columns}
                    getRowId={(deck) => deck.id}
                    caption="Study decks available to you"
                    state={loadState}
                    error={loadError}
                    onRetry={() => void fetchDecks()}
                    filtersActive={chips.length > 0}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No decks yet"
                    emptyDescription="No study decks are assigned to your program yet."
                    rowActions={(deck) => renderActions(deck)}
                    resetKey={`${search}|${categoryFilter}`}
                />
            ) : (
                <ResourceGrid
                    rows={visibleDecks}
                    getRowId={(deck) => deck.id}
                    renderCard={renderCard}
                    caption="Study decks available to you"
                    state={loadState}
                    error={loadError}
                    onRetry={() => void fetchDecks()}
                    filtersActive={chips.length > 0}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No decks yet"
                    emptyDescription="No study decks are assigned to your program yet."
                />
            )}
        </div>
    );
};

export default StudyHubPage;
