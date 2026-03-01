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

const ManageMaterialsPage: React.FC = () => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [categoryFilter, setCategoryFilter] = useState<'all' | 'General Education' | 'Professional Education' | 'Specialization'>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
    const [search, setSearch] = useState('');

    const fetchManagedDecks = async () => {
        setIsLoading(true);

        try {
            setError(null);
            const response = await api.get('/decks/managed', {
                params: { page: 1, limit: 100 },
            });

            const items = (response.data?.data || []) as Deck[];
            setDecks(items);
        } catch (err) {
            console.error('Failed to load managed materials', err);
            setError('Unable to load materials right now. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchManagedDecks();
    }, []);

    const formatVisibilityTracks = (tracks: Track[]) => {
        if (!tracks || tracks.length === 0) {
            return 'All Program Tracks';
        }

        return tracks.map((track) => track.name).join(', ');
    };

    const countByCategory = useMemo(() => {
        return {
            all: decks.length,
            'General Education': decks.filter((deck) => deck.category === 'General Education').length,
            'Professional Education': decks.filter((deck) => deck.category === 'Professional Education').length,
            Specialization: decks.filter((deck) => deck.category === 'Specialization').length,
        };
    }, [decks]);

    const handleDelete = async (deck: Deck) => {
        const approved = window.confirm(`Delete "${deck.title}"? This action cannot be undone.`);
        if (!approved) return;

        try {
            await api.delete(`/decks/${deck.id}`);
            setDecks((prev) => prev.filter((item) => item.id !== deck.id));
        } catch (err) {
            console.error('Failed to delete deck', err);
            alert('Failed to delete material. Please try again.');
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
            || deck.tracks.some((track) => track.name.toLowerCase().includes(term));

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
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Material Library</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Manage and organize custom review decks for each program track.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-60 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="Search materials..."
                            className="pl-10 h-10 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl border-gray-200 font-bold gap-2"
                            >
                                <SlidersHorizontal size={16} /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[320px] rounded-xl p-4 space-y-3">
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
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-1 bg-white">
                        <Button
                            type="button"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            className="h-8 px-3 rounded-lg"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={14} className="mr-1" /> Grid
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            className="h-8 px-3 rounded-lg"
                            onClick={() => setViewMode('list')}
                        >
                            <List size={14} className="mr-1" /> List
                        </Button>
                    </div>
                    <Link to="/materials/create">
                        <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2">
                            <Plus size={18} /> Create Deck
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
                    <Card className="border-red-100 rounded-2xl bg-white">
                        <CardContent className="p-6 text-center space-y-3">
                            <p className="text-sm font-bold text-red-700">{error}</p>
                            <Button variant="outline" onClick={() => fetchManagedDecks()} className="rounded-lg border-red-200 text-red-700 hover:bg-red-50">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && filteredDecks.length === 0 && (
                    <Card className="border-gray-100 rounded-2xl bg-white">
                        <CardContent className="p-8 text-center space-y-2">
                            <p className="text-sm font-black text-gray-800 uppercase tracking-widest">No materials found</p>
                            <p className="text-xs text-gray-500 font-medium">Adjust your filters or create a new custom deck.</p>
                            <Link to="/materials/create" className="inline-flex mt-3">
                                <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2">
                                    <Plus size={14} /> Create Custom Deck
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && !error && filteredDecks.map((deck) => (
                    <Card key={deck.id} className={`group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden bg-white h-full ${viewMode === 'grid' ? 'rounded-2xl' : 'rounded-xl'}`}>
                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3 gap-2">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5 rounded-md px-1.5 max-w-[70%] truncate">
                                    Show to: {formatVisibilityTracks(deck.tracks)}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <Badge
                                        className={`font-black text-[10px] uppercase tracking-widest border-none ${
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                                <MoreHorizontal size={18} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl w-44">
                                            <Link to={`/materials/${deck.id}/edit`}>
                                                <DropdownMenuItem className="cursor-pointer text-xs font-bold py-2.5 gap-2">
                                                    <Edit size={14} /> Manage Deck
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(deck)}
                                                className="cursor-pointer text-xs font-bold py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 gap-2"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="space-y-2 mb-3 min-h-18">
                                <h3 className="text-base font-black text-gray-900 group-hover:text-primary transition-colors leading-tight h-10 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                                    {deck.title}
                                </h3>
                                <p className="text-[11px] text-gray-600 font-semibold truncate">
                                    {deck.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100 mb-3 min-h-18.5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <BookOpen size={12} /> Flashcards
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{deck.totalItems} Items</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Users size={12} /> Category
                                    </p>
                                    <p className="text-sm font-bold text-gray-700 truncate">{deck.category}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-3 min-h-16.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UserRound size={12} /> Author
                                    </span>
                                    <span className="text-xs font-black text-gray-900 truncate max-w-[60%] text-right">
                                        {deck.creator?.name
                                            || `${deck.creator?.firstName || ''} ${deck.creator?.lastName || ''}`.trim()
                                            || 'Unknown author'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} /> Created
                                    </span>
                                    <span className="text-xs font-black text-gray-900">
                                        {new Date(deck.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </div>

                            <div className={`mt-auto ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex items-center gap-3 justify-end'}`}>
                                <Link to={`/materials/${deck.id}/view`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button
                                        variant="outline"
                                        className={`h-10 rounded-xl border-gray-200 font-black text-xs gap-2 ${viewMode === 'grid' ? 'w-full' : 'px-4'}`}
                                    >
                                        <Eye size={14} /> View
                                    </Button>
                                </Link>
                                <Link to={`/materials/${deck.id}/edit`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button className={`h-10 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border-none font-black text-xs gap-2 ${viewMode === 'grid' ? 'w-full' : 'px-4'}`}>
                                        <Edit size={14} /> Edit Deck
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!isLoading && !error && (
                    <Link to="/materials/create" className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-primary/2 hover:border-primary/50 transition-all group min-h-52.5">
                        <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Plus size={24} className="text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-gray-900 uppercase tracking-tight">Create New Material</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest max-w-52.5">Start a new custom flashcard deck for your reviewees</p>
                        </div>
                    </Link>
                )}
            </div>

        </div>
    );
};

export default ManageMaterialsPage;
