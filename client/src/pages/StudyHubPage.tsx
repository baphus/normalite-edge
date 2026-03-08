import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Bookmark,
    BookOpen,
    LayoutGrid,
    List,
    Eye,
    GalleryHorizontalEnd,
    X,
    Brain,
    SlidersHorizontal,
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

type SortOption = 'default' | 'most_cards' | 'least_cards';

const CATEGORY_STYLES: Record<string, { accent: string; bg: string; text: string; border: string }> = {
    'Professional Education': { accent: 'from-amber-400 to-orange-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'General Education':      { accent: 'from-blue-400 to-sky-400',    bg: 'bg-blue-50',  text: 'text-blue-700',   border: 'border-blue-200'  },
    'Specialization':         { accent: 'from-violet-400 to-purple-400', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};
const DEFAULT_STYLE = { accent: 'from-emerald-400 to-teal-400', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };

const getCategoryStyle = (category: string) => CATEGORY_STYLES[category] ?? DEFAULT_STYLE;

const StudyHubPage: React.FC = () => {
    const navigate = useNavigate();
    const [decks, setDecks] = useState<StudyDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState<SortOption>('default');
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

    const hasActiveFilters = categoryFilter !== 'all' || sortBy !== 'default' || showSaved || search.trim().length > 0;

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (categoryFilter !== 'all') count++;
        if (sortBy !== 'default') count++;
        if (showSaved) count++;
        return count;
    }, [categoryFilter, sortBy, showSaved]);

    const filteredDecks = useMemo(() => {
        const term = search.toLowerCase();
        let result = decks.filter((deck) => {
            const matchesSearch =
                !term ||
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

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('all');
        setSortBy('default');
        setShowSaved(false);
    };

    /* ── Grid card ── */
    const renderGridCard = (deck: StudyDeck) => {
        const style = getCategoryStyle(deck.category);
        return (
            <Card
                key={deck.id}
                className="group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white rounded-lg overflow-hidden flex flex-col"
            >
                <div className={`h-1 w-full bg-gradient-to-r ${style.accent} shrink-0`} />
                <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge className={`text-[9px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border shadow-none ${style.bg} ${style.text} ${style.border}`}>
                            {deck.category}
                        </Badge>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleBookmark(deck.id); }}
                            className={`shrink-0 p-1 rounded transition-all hover:scale-110 ${deck.isBookmarked ? 'text-primary' : 'text-gray-200 hover:text-gray-400'}`}
                            title={deck.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                            <Bookmark size={14} fill={deck.isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug mb-1.5 line-clamp-2">
                        {deck.title}
                    </h3>

                    <p className="text-[10px] text-gray-500 font-medium mb-2 line-clamp-2 leading-relaxed">
                        {deck.description}
                    </p>

                    {deck.tracks.length > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium mb-2 truncate">
                            {deck.tracks.slice(0, 2).join(' · ')}{deck.tracks.length > 2 ? ` +${deck.tracks.length - 2}` : ''}
                        </p>
                    )}

                    <div className="mt-auto">
                        <div className="flex items-center gap-1.5 py-2 border-y border-gray-100 mb-2">
                            <GalleryHorizontalEnd size={12} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-700">{deck.cardCount}</span>
                            <span className="text-[10px] font-semibold text-gray-400">items</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <Button
                                variant="outline"
                                className="h-8 rounded-md font-semibold text-xs border-gray-200 text-gray-600 hover:text-primary hover:border-primary/30"
                                onClick={() => navigate(`/study/${deck.id}/view`)}
                                title="View deck details"
                                aria-label="View deck details"
                            >
                                <Eye size={13} />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 rounded-md font-semibold text-xs border-gray-200 text-gray-600 hover:text-primary hover:border-primary/30"
                                onClick={() => navigate(`/study/${deck.id}?mode=flashcards`)}
                                title="Study with flashcards"
                                aria-label="Study with flashcards"
                            >
                                <BookOpen size={13} />
                            </Button>
                            <Button
                                className="h-8 rounded-md font-semibold text-xs bg-primary hover:bg-primary/90 text-white"
                                onClick={() => navigate(`/study/${deck.id}?mode=study`)}
                                title="Begin quiz"
                                aria-label="Begin quiz"
                            >
                                <Brain size={13} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    /* ── List card ── */
    const renderListCard = (deck: StudyDeck) => {
        const style = getCategoryStyle(deck.category);
        return (
            <Card
                key={deck.id}
                className="group border-gray-100 hover:border-primary/20 hover:shadow-sm transition-all duration-200 bg-white rounded-md overflow-hidden"
            >
                <div className="flex items-center gap-0 pr-4">
                    <div className={`w-1 self-stretch bg-gradient-to-b ${style.accent} rounded-l-full`} />
                    <div className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                                    {deck.category}
                                </span>
                                {deck.tracks.length > 0 && (
                                    <span className="text-[10px] text-gray-400 font-medium truncate hidden sm:block">
                                        {deck.tracks.slice(0, 2).join(' · ')}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug truncate mt-0.5">
                                {deck.title}
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-1.5 shrink-0">
                            <GalleryHorizontalEnd size={12} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-700">{deck.cardCount}</span>
                            <span className="text-[10px] font-semibold text-gray-400">items</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(deck.id); }}
                                className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${deck.isBookmarked ? 'text-primary bg-primary/5' : 'text-gray-200 hover:text-gray-400'}`}
                            >
                                <Bookmark size={13} fill={deck.isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-xs rounded-md font-semibold border-gray-200"
                                onClick={() => navigate(`/study/${deck.id}/view`)}
                                title="View deck details"
                                aria-label="View deck details"
                            >
                                <Eye size={12} />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-xs rounded-md font-semibold border-gray-200"
                                onClick={() => navigate(`/study/${deck.id}?mode=flashcards`)}
                                title="Study with flashcards"
                                aria-label="Study with flashcards"
                            >
                                <BookOpen size={12} />
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 w-8 p-0 text-xs rounded-md font-semibold bg-primary hover:bg-primary/90 text-white"
                                onClick={() => navigate(`/study/${deck.id}?mode=study`)}
                                title="Begin quiz"
                                aria-label="Begin quiz"
                            >
                                <Brain size={12} />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">

            {/* ── Page header ── */}
            <header data-guide="study-header" className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Study Hub</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Browse flashcard decks and sharpen your LET preparation.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div data-guide="study-search" className="relative w-full sm:w-52 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={13} />
                        <Input
                            placeholder="Search decks or topics..."
                            className="pl-8 h-8 rounded-md border-gray-200 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                onClick={() => setSearch('')}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                data-guide="study-filters"
                                className="h-8 rounded-md border-gray-200 font-semibold gap-1.5 text-xs bg-white"
                            >
                                <SlidersHorizontal size={13} /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
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
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default Order</SelectItem>
                                        <SelectItem value="most_cards">Most Items</SelectItem>
                                        <SelectItem value="least_cards">Fewest Items</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Saved Only</Label>
                                <button
                                    onClick={() => setShowSaved((v) => !v)}
                                    className={`flex items-center gap-2 text-xs font-semibold px-3 h-8 rounded-md border w-full transition-colors ${
                                        showSaved
                                            ? 'border-primary/30 bg-primary/5 text-primary'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <Bookmark size={13} fill={showSaved ? 'currentColor' : 'none'} />
                                    {showSaved ? 'Showing saved decks' : 'Show saved decks'}
                                </button>
                            </div>
                            {activeFilterCount > 0 && (
                                <div className="pt-2 flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs font-semibold"
                                        onClick={clearFilters}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-white">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`h-7 px-2.5 rounded flex items-center transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`h-7 px-2.5 rounded flex items-center transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List size={12} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Category pills ── */}
            {!loading && categoryOptions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    <button
                        onClick={() => setCategoryFilter('all')}
                        className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-semibold border transition-all ${
                            categoryFilter === 'all'
                                ? 'bg-gray-900 text-white border-transparent'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                        All
                    </button>
                    {categoryOptions.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                            className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-semibold border transition-all ${
                                categoryFilter === cat
                                    ? 'bg-gray-900 text-white border-transparent'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Results count ── */}
            {!loading && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 -mt-1">
                    {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'}{hasActiveFilters ? ' found' : ' available'}
                </p>
            )}

            {/* ── Content ── */}
            {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="border-gray-100 bg-white rounded-lg overflow-hidden">
                            <div className="h-1 w-full bg-gray-100" />
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-5 w-28 rounded" />
                                    <Skeleton className="h-5 w-5 rounded" />
                                </div>
                                <Skeleton className="h-5 w-full rounded" />
                                <Skeleton className="h-4 w-3/4 rounded" />
                                <div className="pt-2 border-t border-gray-50 flex gap-2">
                                    <Skeleton className="h-8 flex-1 rounded-md" />
                                    <Skeleton className="h-8 flex-1 rounded-md" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredDecks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">No decks found</h3>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {hasActiveFilters ? 'Try adjusting your filters or search.' : 'No study decks available yet.'}
                        </p>
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md text-xs font-semibold border-gray-200"
                            onClick={clearFilters}
                        >
                            <X size={12} className="mr-1" /> Clear All Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div data-guide="study-results" className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
                    {filteredDecks.map((deck) => viewMode === 'grid' ? renderGridCard(deck) : renderListCard(deck))}
                </div>
            )}
        </div>
    );
};

export default StudyHubPage;
