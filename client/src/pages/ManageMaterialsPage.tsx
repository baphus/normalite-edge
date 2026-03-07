import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Trash2,
    Eye,
    Users,
    BookOpen,
    Calendar,
    UserRound,
    LayoutGrid,
    List,
    Loader2,
    SlidersHorizontal,
    Edit,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import api from '@/lib/axios';
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
    category: 'General Education' | 'Professional Education' | 'Specialization' | 'No Category';
    categoryCode?: 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION' | null;
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
        categoryCode: (deck.categoryCode as Deck['categoryCode']) || null,
        visibility: (deck.visibility as Deck['visibility']) || 'DRAFT',
        totalItems: typeof deck.totalItems === 'number' ? deck.totalItems : 0,
        tracks,
        creator: deck.creator,
        createdAt: deck.createdAt ? String(deck.createdAt) : new Date().toISOString(),
    };
};

const ManageMaterialsPage: React.FC = () => {
    const { user } = useAuth();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [categoryFilter, setCategoryFilter] = useState<'all' | 'General Education' | 'Professional Education' | 'Specialization'>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
    const [search, setSearch] = useState('');
    const [deleteDeckTarget, setDeleteDeckTarget] = useState<Deck | null>(null);

    const fetchManagedDecks = async () => {
        setIsLoading(true);

        try {
            setError(null);
            let response;
            let usedFallback = false;

            try {
                response = await api.get('/decks/managed', {
                    params: { page: 1, limit: 100 },
                });
            } catch (requestError: any) {
                const statusCode = requestError?.response?.status;
                const shouldFallbackToDecks = statusCode === 404 && user?.role === 'ADMIN';

                if (!shouldFallbackToDecks) {
                    throw requestError;
                }

                usedFallback = true;
                response = await api.get('/decks', {
                    params: { page: 1, limit: 100 },
                });
            }

            const payload = response.data?.data;
                const items = (Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.items)
                    ? payload.items
                    : []) as Array<Partial<Deck> & Record<string, any>>;
                setDecks(items.map(normalizeDeckItem));

            if (usedFallback) {
                toast.info('Loaded materials using compatibility mode.');
            }
        } catch (err) {
            console.error('Failed to load managed materials', err);
            setError('Unable to load materials right now. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchManagedDecks();
    }, [user]);

    const formatVisibilityTracks = (tracks: Track[]) => {
        if (!tracks || tracks.length === 0) {
            return 'All Program Tracks';
        }

        return tracks.map((track) => track.name).join(', ');
    };

    const getDisplayCreatorName = (deck: Deck) => {
        if (user?.role === 'REVIEWER' && deck.creator?.id === user?.id) return 'You';
        return deck.creator?.name
            || `${deck.creator?.firstName || ''} ${deck.creator?.lastName || ''}`.trim()
            || 'Unknown author';
    };

    const countByCategory = useMemo(() => {
        return {
            all: decks.length,
            'General Education': decks.filter((deck) => deck.category === 'General Education').length,
            'Professional Education': decks.filter((deck) => deck.category === 'Professional Education').length,
            Specialization: decks.filter((deck) => deck.category === 'Specialization').length,
        };
    }, [decks]);

    const handleDelete = (deck: Deck) => {
        setDeleteDeckTarget(deck);
    };

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

    const filteredDecks = decks.filter((deck) => {
        const matchesCategory = categoryFilter === 'all' || deck.category === categoryFilter;
        const matchesVisibility = visibilityFilter === 'all' || deck.visibility === visibilityFilter;
        const term = search.trim().toLowerCase();

        const matchesSearch =
            term.length === 0
            || deck.title.toLowerCase().includes(term)
            || (deck.description || '').toLowerCase().includes(term)
            || (deck.tracks || []).some((track) => (track.name || '').toLowerCase().includes(term));

        return matchesCategory && matchesVisibility && matchesSearch;
    });

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (categoryFilter !== 'all') count += 1;
        if (visibilityFilter !== 'all') count += 1;
        if (search.trim().length > 0) count += 1;
        return count;
    }, [categoryFilter, visibilityFilter, search]);

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Material Library</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Manage and organize review materials for each program track.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-56 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={13} />
                        <Input
                            placeholder="Search materials..."
                            className="pl-8 h-8 rounded-md border-gray-200 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-8 rounded-md border-gray-200 font-semibold gap-1.5 text-xs bg-white"
                            >
                                <SlidersHorizontal size={13} /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[320px] rounded-lg p-3 space-y-3">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as typeof categoryFilter)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="General Education">General Education ({countByCategory['General Education']})</SelectItem>
                                        <SelectItem value="Professional Education">Professional Education ({countByCategory['Professional Education']})</SelectItem>
                                        <SelectItem value="Specialization">Specialization ({countByCategory.Specialization})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Visibility</Label>
                                <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Visibility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Visibility</SelectItem>
                                        <SelectItem value="PUBLISHED">Published</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCategoryFilter('all');
                                        setVisibilityFilter('all');
                                        setSearch('');
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-white">
                        <Button
                            type="button"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 rounded text-xs"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={12} className="mr-1" /> Grid
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 rounded text-xs"
                            onClick={() => setViewMode('list')}
                        >
                            <List size={12} className="mr-1" /> List
                        </Button>
                    </div>
                    <Link to="/materials/create">
                        <Button className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold gap-1.5 text-xs px-3">
                            <Plus size={13} /> Create Deck
                        </Button>
                    </Link>
                </div>
            </header>

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2' : 'flex flex-col gap-3 mt-2'}>
                {isLoading && (
                    <Card className="border-gray-100 rounded-[2rem] bg-white">
                        <CardContent className="p-6 text-sm text-gray-500 font-medium flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" /> Loading materials...
                        </CardContent>
                    </Card>
                )}

                {!isLoading && error && (
                    <Card className="border-red-100 rounded-lg bg-white">
                        <CardContent className="p-4 text-center space-y-2">
                            <p className="text-xs font-semibold text-red-700">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => fetchManagedDecks()} className="h-8 rounded-md border-red-200 text-red-700 hover:bg-red-50 text-xs">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && filteredDecks.length === 0 && (
                    <Card className="border-gray-100 rounded-lg bg-white">
                        <CardContent className="p-6 text-center space-y-1.5">
                            <p className="text-sm font-bold text-gray-800">No materials found</p>
                            <p className="text-xs text-gray-500 font-medium">Adjust your filters or create a new study material.</p>
                            <Link to="/materials/create" className="inline-flex mt-2">
                                <Button className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold gap-1.5 text-xs">
                                    <Plus size={13} /> Create Study Material
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && filteredDecks.map((deck) => (
                    <Card key={deck.id} className={`group border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 overflow-hidden bg-white h-full ${viewMode === 'grid' ? 'rounded-lg' : 'rounded-lg'}`}>
                        <CardContent className="p-3 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider text-primary border-primary/20 bg-primary/5 rounded px-1.5 max-w-[70%] truncate">
                                    Show to: {formatVisibilityTracks(deck.tracks)}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <Badge
                                        className={`font-semibold text-[9px] uppercase tracking-wider border-none ${
                                            deck.visibility === 'PUBLISHED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                deck.visibility === 'PUBLISHED' ? 'bg-green-600' : 'bg-amber-600'
                                            }`}
                                        />
                                        {deck.visibility}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-gray-400">
                                                <MoreHorizontal size={15} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-lg border-gray-100 shadow-lg w-40">
                                            <Link to={`/materials/${deck.id}/view`}>
                                                <DropdownMenuItem className="cursor-pointer text-xs font-semibold py-2 gap-2">
                                                    <Eye size={13} /> View
                                                </DropdownMenuItem>
                                            </Link>
                                            <Link to={`/materials/${deck.id}/edit`}>
                                                <DropdownMenuItem className="cursor-pointer text-xs font-semibold py-2 gap-2">
                                                    <Edit size={13} /> Manage Deck
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(deck)}
                                                className="cursor-pointer text-xs font-semibold py-2 text-red-600 focus:text-red-600 focus:bg-red-50 gap-2"
                                            >
                                                <Trash2 size={13} /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-2">
                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                                    {deck.title}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-medium truncate">
                                    {deck.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-100 mb-2">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <BookOpen size={11} /> Flashcards
                                    </p>
                                    <p className="text-xs font-semibold text-gray-700">{deck.totalItems} Items</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <Users size={11} /> Category
                                    </p>
                                    <p className="text-xs font-semibold text-gray-700 truncate">{deck.category}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <UserRound size={11} /> Author
                                    </span>
                                    <span className="text-[11px] font-semibold text-gray-900 truncate max-w-[60%] text-right">
                                        {getDisplayCreatorName(deck)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <Calendar size={11} /> Created
                                    </span>
                                    <span className="text-[11px] font-semibold text-gray-900">
                                        {new Date(deck.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </div>

                            <div className={`mt-auto ${viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-2 justify-end'}`}>
                                <Link to={`/materials/${deck.id}/view`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button
                                        variant="outline"
                                        className={`h-8 rounded-md border-gray-200 font-semibold text-xs gap-1.5 ${viewMode === 'grid' ? 'w-full' : 'px-3'}`}
                                    >
                                        <Eye size={13} /> View
                                    </Button>
                                </Link>
                                <Link to={`/materials/${deck.id}/edit`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button className={`h-8 rounded-md bg-primary/5 hover:bg-primary/10 text-primary border-none font-semibold text-xs gap-1.5 ${viewMode === 'grid' ? 'w-full' : 'px-3'}`}>
                                        <Edit size={13} /> Edit Deck
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!isLoading && !error && (
                    <Link to="/materials/create" className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/50 transition-all group min-h-[160px]">
                        <div className="bg-white p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Plus size={20} className="text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-xs text-gray-900">Create New Material</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 max-w-[180px]">Start a new study material for your reviewees</p>
                        </div>
                    </Link>
                )}
            </div>

            <ConfirmDialog
                open={deleteDeckTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteDeckTarget(null); }}
                title="Delete Material"
                description={`Delete "${deleteDeckTarget?.title ?? ''}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default ManageMaterialsPage;
