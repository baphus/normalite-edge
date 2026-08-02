import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManageToolbar, type ActiveFilterChip, type ManageView } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';
import { StatusPill } from '@/components/manage/StatusPill';
import { ResourceGrid } from '@/components/manage/ResourceGrid';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { formatShortDate } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Track {
    id: string;
    name: string;
    code?: string | null;
}

interface Deck {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    categoryCode?: string | null;
    visibility: 'DRAFT' | 'PUBLISHED';
    totalItems: number;
    tracks: Track[];
    creator?: {
        id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
    createdAt: string;
}

const normalizeDeckItem = (deck: Partial<Deck> & Record<string, any>): Deck => {
    const rawTracks = Array.isArray(deck.tracks)
        ? deck.tracks
        : Array.isArray(deck.trackLinks)
            ? deck.trackLinks.map((link: any) => link?.track).filter(Boolean)
            : [];

    const tracks: Track[] = rawTracks
        .filter((track: any) => track && typeof track === 'object')
        .map((track: any) => ({
            id: String(track.id ?? ''),
            name: String(track.name ?? track.code ?? 'Unknown Track'),
            code: track.code ?? null,
        }))
        .filter((track) => track.id.length > 0 || track.name.length > 0);

    return {
        id: String(deck.id ?? ''),
        title: String(deck.title ?? 'Untitled Material'),
        description: deck.description ?? null,
        category: (deck.category as Deck['category']) || 'No Category',
        categoryCode: deck.categoryCode ?? null,
        visibility: (deck.visibility as Deck['visibility']) || 'DRAFT',
        totalItems: typeof deck.totalItems === 'number' ? deck.totalItems : 0,
        tracks,
        creator: deck.creator,
        createdAt: deck.createdAt ? String(deck.createdAt) : new Date().toISOString(),
    };
};

const formatVisibilityTracks = (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return 'All program tracks';
    return tracks.map((track) => track.name).join(', ');
};


const ManageMaterialsPage: React.FC = () => {
    const { user } = useAuth();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<ManageView>('table');

    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
    const [search, setSearch] = useState('');
    const [deleteDeckTarget, setDeleteDeckTarget] = useState<Deck | null>(null);

    const userRole = user?.role;

    const fetchManagedDecks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            let result;
            let usedFallback = false;

            try {
                result = await fetchAllPages<Partial<Deck> & Record<string, any>>((page, limit) =>
                    api.get('/decks/managed', { params: { page, limit } }),
                );
            } catch (requestError: any) {
                const statusCode = requestError?.response?.status;
                if (!(statusCode === 404 && userRole === 'ADMIN')) throw requestError;

                usedFallback = true;
                result = await fetchAllPages<Partial<Deck> & Record<string, any>>((page, limit) =>
                    api.get('/decks', { params: { page, limit } }),
                );
            }

            setDecks(result.items.map(normalizeDeckItem));

            if (usedFallback) toast.info('Loaded materials using compatibility mode.');
            if (result.truncated) {
                toast.warning('This library is unusually large — some materials may not be shown.');
            }
        } catch (err) {
            console.error('Failed to load managed materials', err);
            setError('Could not load materials');
        } finally {
            setIsLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        if (!user) return;
        void fetchManagedDecks();
    }, [user, fetchManagedDecks]);

    const getDisplayCreatorName = useCallback(
        (deck: Deck) => {
            if (user?.role === 'REVIEWER' && deck.creator?.id === user?.id) return 'You';
            return (
                deck.creator?.name
                || `${deck.creator?.firstName || ''} ${deck.creator?.lastName || ''}`.trim()
                || 'Unknown author'
            );
        },
        [user?.id, user?.role],
    );

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        decks.forEach((deck) => {
            const category = deck.category || 'No Category';
            counts[category] = (counts[category] || 0) + 1;
        });
        return counts;
    }, [decks]);

    const categoryOptions = useMemo(
        () =>
            Array.from(new Set(decks.map((deck) => deck.category || 'No Category'))).sort((a, b) =>
                a.localeCompare(b),
            ),
        [decks],
    );

    const confirmDelete = async () => {
        if (!deleteDeckTarget) return;
        const target = deleteDeckTarget;
        setDeleteDeckTarget(null);
        try {
            await api.delete(`/decks/${target.id}`);
            setDecks((prev) => prev.filter((item) => item.id !== target.id));
            toast.success(`"${target.title}" has been deleted.`);
        } catch (err) {
            console.error('Failed to delete deck', err);
            toast.error('Failed to delete material. Please try again.');
        }
    };

    const filteredDecks = useMemo(
        () =>
            decks.filter((deck) => {
                const matchesCategory = categoryFilter === 'all' || deck.category === categoryFilter;
                const matchesVisibility = visibilityFilter === 'all' || deck.visibility === visibilityFilter;
                const term = search.trim().toLowerCase();
                const matchesSearch =
                    term.length === 0
                    || deck.title.toLowerCase().includes(term)
                    || (deck.description || '').toLowerCase().includes(term)
                    || (deck.tracks || []).some((track) => (track.name || '').toLowerCase().includes(term));

                return matchesCategory && matchesVisibility && matchesSearch;
            }),
        [decks, categoryFilter, visibilityFilter, search],
    );

    const clearAllFilters = useCallback(() => {
        setCategoryFilter('all');
        setVisibilityFilter('all');
        setSearch('');
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
        if (visibilityFilter !== 'all') {
            next.push({
                id: 'visibility',
                label: `Visibility: ${visibilityFilter === 'PUBLISHED' ? 'Published' : 'Draft'}`,
                onClear: () => setVisibilityFilter('all'),
            });
        }
        return next;
    }, [search, categoryFilter, visibilityFilter]);

    const renderRowActions = useCallback(
        (deck: Deck) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                        aria-label={`Actions for ${deck.title}`}
                    >
                        <MoreHorizontal size={15} aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg">
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2 text-[12px] font-semibold">
                        <Link to={`/materials/${deck.id}/view`}>
                            <Eye size={13} aria-hidden="true" /> View
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2 text-[12px] font-semibold">
                        <Link to={`/materials/${deck.id}/edit`}>
                            <Edit size={13} aria-hidden="true" /> Edit deck
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setDeleteDeckTarget(deck)}
                        className="cursor-pointer gap-2 py-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                    >
                        <Trash2 size={13} aria-hidden="true" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
        [],
    );

    const columns = useMemo<ResourceColumn<Deck>[]>(
        () => [
            {
                id: 'title',
                header: 'Title',
                primary: true,
                sortable: true,
                sortValue: (deck) => deck.title,
                className: 'min-w-[240px]',
                cell: (deck) => (
                    <div className="min-w-0">
                        <Link
                            to={`/materials/${deck.id}/view`}
                            className="block truncate font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                        >
                            {deck.title}
                        </Link>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                            {formatVisibilityTracks(deck.tracks)}
                        </p>
                    </div>
                ),
            },
            {
                id: 'visibility',
                header: 'Visibility',
                status: true,
                sortable: true,
                sortValue: (deck) => deck.visibility,
                className: 'w-[120px]',
                cell: (deck) => (
                    <StatusPill
                        tone={deck.visibility === 'PUBLISHED' ? 'live' : 'draft'}
                        label={deck.visibility === 'PUBLISHED' ? 'Published' : 'Draft'}
                    />
                ),
            },
            {
                id: 'category',
                header: 'Category',
                sortable: true,
                stacked: true,
                sortValue: (deck) => deck.category,
                className: 'w-[160px]',
                cell: (deck) => <span className="block truncate">{deck.category}</span>,
            },
            {
                id: 'items',
                header: 'Items',
                sortable: true,
                stacked: true,
                sortValue: (deck) => deck.totalItems,
                className: 'w-[80px] tabular-nums',
                cell: (deck) => deck.totalItems,
                stackedCell: (deck) => `${deck.totalItems} items`,
            },
            {
                id: 'author',
                header: 'Author',
                sortable: true,
                sortValue: (deck) => getDisplayCreatorName(deck),
                className: 'w-[150px]',
                cell: (deck) => <span className="block truncate">{getDisplayCreatorName(deck)}</span>,
            },
            {
                id: 'created',
                header: 'Created',
                sortable: true,
                stacked: true,
                sortValue: (deck) => new Date(deck.createdAt).getTime(),
                className: 'w-[120px] whitespace-nowrap',
                cell: (deck) => formatShortDate(deck.createdAt),
            },
        ],
        [getDisplayCreatorName],
    );

    const renderDeckCard = useCallback(
        (deck: Deck) => (
            <Card className="h-full w-full rounded-xl border-slate-200 bg-white shadow-none transition-colors hover:border-primary/30">
                <CardContent className="flex h-full flex-col gap-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                        <StatusPill
                            tone={deck.visibility === 'PUBLISHED' ? 'live' : 'draft'}
                            label={deck.visibility === 'PUBLISHED' ? 'Published' : 'Draft'}
                        />
                        {renderRowActions(deck)}
                    </div>
                    <div className="min-w-0">
                        <Link
                            to={`/materials/${deck.id}/view`}
                            className="line-clamp-2 text-[13px] font-semibold text-slate-900 transition-colors hover:text-primary"
                        >
                            {deck.title}
                        </Link>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">
                            {formatVisibilityTracks(deck.tracks)}
                        </p>
                    </div>
                    <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[12px]">
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Items</dt>
                            <dd className="font-semibold text-slate-700 tabular-nums">{deck.totalItems}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Category</dt>
                            <dd className="truncate font-semibold text-slate-700">{deck.category}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Author</dt>
                            <dd className="truncate font-semibold text-slate-700">{getDisplayCreatorName(deck)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Created</dt>
                            <dd className="font-semibold text-slate-700">{formatShortDate(deck.createdAt)}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        ),
        [getDisplayCreatorName, renderRowActions],
    );

    const createAction = (
        <Button asChild className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90">
            <Link to="/materials/create">
                <Plus size={13} aria-hidden="true" /> Create deck
            </Link>
        </Button>
    );

    const tableState = isLoading ? 'loading' : error ? 'error' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Material library"
                description="Manage and organise review materials for each program track."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search materials…"
                searchLabel="Search materials"
                inlineFilters={
                    <>
                        <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}>
                            <SelectTrigger className="h-8 w-[140px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by visibility">
                                <SelectValue placeholder="Visibility" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All visibility</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-8 w-[170px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by category">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories ({decks.length})</SelectItem>
                                {categoryOptions.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category} ({categoryCounts[category] || 0})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                }
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                view={view}
                onViewChange={setView}
                createAction={createAction}
            />

            {view === 'table' ? (
                <ResourceTable
                    rows={filteredDecks}
                    columns={columns}
                    getRowId={(deck) => deck.id}
                    caption="Study materials you manage"
                    state={tableState}
                    error={error}
                    onRetry={() => void fetchManagedDecks()}
                    filtersActive={chips.length > 0}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No materials yet"
                    emptyDescription="Create your first study material for your reviewees."
                    emptyAction={createAction}
                    rowActions={renderRowActions}
                    resetKey={`${search}|${categoryFilter}|${visibilityFilter}`}
                />
            ) : (
                <ResourceGrid
                    rows={filteredDecks}
                    getRowId={(deck) => deck.id}
                    renderCard={renderDeckCard}
                    caption="Study materials you manage"
                    state={tableState}
                    error={error}
                    onRetry={() => void fetchManagedDecks()}
                    filtersActive={chips.length > 0}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No materials yet"
                    emptyDescription="Create your first study material for your reviewees."
                    emptyAction={createAction}
                />
            )}

            <ConfirmDialog
                open={deleteDeckTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteDeckTarget(null);
                }}
                title="Delete material"
                description={`Delete "${deleteDeckTarget?.title ?? ''}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default ManageMaterialsPage;
