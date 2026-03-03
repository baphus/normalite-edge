import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Bookmark,
    BookOpen,
    Layers,
    SlidersHorizontal,
    LayoutGrid,
    List,
    GalleryHorizontalEnd,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StudyDeck {
    id: string;
    title: string;
    description: string;
    category: string;
    tracks: string[];
    cardCount: number;
    isBookmarked: boolean;
}

const getCategoryStyle = (category: string) => {
    if (category === 'Professional Education')
        return 'bg-amber-50 text-amber-600 border-amber-100 border';
    if (category === 'General Education')
        return 'bg-blue-50 text-blue-600 border-blue-100 border';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100 border';
};

const StudyHubPage: React.FC = () => {
    const navigate = useNavigate();
    const [decks, setDecks] = useState<StudyDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'default' | 'most_cards' | 'least_cards'>('default');
    const [showSaved, setShowSaved] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const fetchDecks = async () => {
            try {
                const response = await api.get('/decks?limit=100');
                const deckItems = response.data?.data?.items || response.data?.data || [];
                const formattedDecks: StudyDeck[] = deckItems.map((deck: any) => ({
                    id: deck.id,
                    title: deck.title,
                    description: deck.description || `${deck.subject || 'General'} Deck`,
                    category: deck.subject || 'General',
                    tracks: Array.isArray(deck.tracks)
                        ? deck.tracks.map((track: any) => track.code || track.name)
                        : [],
                    cardCount: deck.totalItems || deck.questions?.length || 0,
                    isBookmarked: false,
                }));
                setDecks(formattedDecks);
            } catch (error) {
                console.error('Failed to fetch study decks', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDecks();
    }, []);

    const toggleBookmark = (id: string) => {
        setDecks((prev) =>
            prev.map((deck) =>
                deck.id === id ? { ...deck, isBookmarked: !deck.isBookmarked } : deck
            )
        );
    };

    const categoryOptions = useMemo(
        () => Array.from(new Set(decks.map((d) => d.category))).sort((a, b) => a.localeCompare(b)),
        [decks]
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (categoryFilter !== 'all') count++;
        if (sortBy !== 'default') count++;
        if (showSaved) count++;
        if (search.trim().length > 0) count++;
        return count;
    }, [categoryFilter, sortBy, showSaved, search]);

    const filteredDecks = useMemo(() => {
        const term = search.toLowerCase();
        let result = decks.filter((deck) => {
            const matchesSearch =
                deck.title.toLowerCase().includes(term) ||
                deck.description.toLowerCase().includes(term) ||
                deck.tracks.some((t) => t.toLowerCase().includes(term));
            const matchesCategory = categoryFilter === 'all' || deck.category === categoryFilter;
            const matchesSaved = !showSaved || deck.isBookmarked;
            return matchesSearch && matchesCategory && matchesSaved;
        });
        if (sortBy === 'most_cards') result = [...result].sort((a, b) => b.cardCount - a.cardCount);
        if (sortBy === 'least_cards') result = [...result].sort((a, b) => a.cardCount - b.cardCount);
        return result;
    }, [decks, search, categoryFilter, showSaved, sortBy]);

    const renderDeckCard = (deck: StudyDeck) => {
        if (viewMode === 'list') {
            return (
                <Card
                    key={deck.id}
                    className="group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white rounded-md"
                >
                    <CardContent className="p-3 flex items-center gap-4">
                        <div className="shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <BookOpen size={15} className="text-primary" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate leading-tight">
                                {deck.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 font-medium">{deck.category}</span>
                                {deck.tracks.length > 0 && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        &middot; {deck.tracks.slice(0, 2).join(', ')}{deck.tracks.length > 2 ? ` +${deck.tracks.length - 2}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                            <div className="text-center">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cards</p>
                                <p className="text-xs font-bold text-gray-700">{deck.cardCount}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => toggleBookmark(deck.id)}
                                className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${deck.isBookmarked ? 'text-primary bg-primary/5' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                                <Bookmark size={14} fill={deck.isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs rounded-md font-semibold gap-1 border-gray-200"
                                onClick={() => navigate(`/study/${deck.id}?mode=flashcards`)}
                            >
                                <Layers size={11} /> Flashcards
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 px-3 text-xs rounded-md font-semibold gap-1 bg-primary hover:bg-primary/90 text-white"
                                onClick={() => navigate(`/study/${deck.id}?mode=study`)}
                            >
                                <BookOpen size={11} /> Study
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card
                key={deck.id}
                className="group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white rounded-lg overflow-hidden flex flex-col"
            >
                <CardContent className="p-3 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                            variant="outline"
                            className={`text-[9px] font-semibold uppercase tracking-wider rounded px-1.5 max-w-[70%] truncate ${getCategoryStyle(deck.category)}`}
                        >
                            {deck.category}
                        </Badge>
                        <button
                            onClick={() => toggleBookmark(deck.id)}
                            className={`shrink-0 transition-all hover:scale-110 ${deck.isBookmarked ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                            <Bookmark size={15} fill={deck.isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight mb-1 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                        {deck.title}
                    </h3>

                    <p className="text-[10px] text-gray-500 font-medium mb-2 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                        {deck.description}
                    </p>

                    {deck.tracks.length > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium mb-2 truncate">
                            {deck.tracks.slice(0, 3).join(' · ')}{deck.tracks.length > 3 ? ` +${deck.tracks.length - 3}` : ''}
                        </p>
                    )}

                    <div className="py-2 border-y border-gray-100 mb-2">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <GalleryHorizontalEnd size={10} /> Cards
                            </p>
                            <p className="text-xs font-semibold text-gray-700">{deck.cardCount} Items</p>
                        </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-1.5">
                        <Button
                            variant="outline"
                            className="h-8 rounded-md font-semibold text-xs gap-1.5 border-gray-200 text-gray-600 hover:text-primary hover:border-primary/30"
                            onClick={() => navigate(`/study/${deck.id}?mode=flashcards`)}
                        >
                            <Layers size={12} /> Flashcards
                        </Button>
                        <Button
                            className="h-8 rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                            onClick={() => navigate(`/study/${deck.id}?mode=study`)}
                        >
                            <BookOpen size={12} /> Study
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Study Hub</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Browse and study flashcard decks for your LET preparation.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-52 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={13} />
                        <Input
                            placeholder="Search decks or topics..."
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
                        <DropdownMenuContent align="end" className="w-64 rounded-xl p-4 space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categoryOptions.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Sort By</Label>
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="most_cards">Most Cards</SelectItem>
                                        <SelectItem value="least_cards">Least Cards</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Saved Only</Label>
                                <button
                                    onClick={() => setShowSaved((v) => !v)}
                                    className={`flex items-center gap-2 text-xs font-semibold px-3 h-8 rounded-md border w-full transition-colors ${showSaved ? 'border-primary/30 bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <Bookmark size={13} fill={showSaved ? 'currentColor' : 'none'} />
                                    {showSaved ? 'Showing saved decks' : 'Show saved decks'}
                                </button>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-semibold"
                                    onClick={() => {
                                        setCategoryFilter('all');
                                        setSortBy('default');
                                        setShowSaved(false);
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
                </div>
            </header>

            {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1' : 'flex flex-col gap-2 mt-1'}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="border-gray-100 bg-white rounded-lg">
                            <CardContent className="p-3 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-28 rounded" />
                                    <Skeleton className="h-4 w-4 rounded" />
                                </div>
                                <Skeleton className="h-8 w-full rounded" />
                                <Skeleton className="h-3 w-3/4 rounded" />
                                <div className="pt-2 border-t border-gray-50">
                                    <Skeleton className="h-8 rounded" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Skeleton className="h-8 rounded" />
                                    <Skeleton className="h-8 rounded" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredDecks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 mt-1">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <BookOpen size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-900">No decks found</h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {activeFilterCount > 0
                                ? 'Try adjusting your filters or search query.'
                                : 'No study decks are available yet.'}
                        </p>
                    </div>
                    {activeFilterCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold border-gray-200"
                            onClick={() => { setSearch(''); setCategoryFilter('all'); setSortBy('default'); setShowSaved(false); }}
                        >
                            Clear All Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1' : 'flex flex-col gap-2 mt-1'}>
                    {filteredDecks.map((deck) => renderDeckCard(deck))}
                </div>
            )}
        </div>
    );
};

export default StudyHubPage;
