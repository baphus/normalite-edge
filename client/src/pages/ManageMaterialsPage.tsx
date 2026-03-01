import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Loader2,
    Trash2,
    Eye,
    Users,
    BookOpen,
    Calendar,
    UserRound,
    FolderOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';

interface Track {
    id: string;
    name: string;
    code?: string | null;
}

interface DeckQuestion {
    id: string;
    questionText: string;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
}

interface Deck {
    id: string;
    title: string;
    description?: string | null;
    category: 'General Education' | 'Professional Education' | 'Specialization';
    categoryCode?: 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION';
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categoryFilter, setCategoryFilter] = useState<'all' | 'General Education' | 'Professional Education' | 'Specialization'>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
    const [search, setSearch] = useState('');

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [previewQuestions, setPreviewQuestions] = useState<DeckQuestion[]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const fetchManagedDecks = async (refresh = false) => {
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

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
            setIsRefreshing(false);
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

    const handlePreview = async (deck: Deck) => {
        setSelectedDeck(deck);
        setPreviewQuestions([]);
        setPreviewError(null);
        setIsPreviewLoading(true);
        setIsPreviewOpen(true);

        try {
            const response = await api.get(`/decks/${deck.id}`);
            const fetchedDeck = response.data?.data;
            setPreviewQuestions((fetchedDeck?.questions || []) as DeckQuestion[]);
        } catch (err) {
            console.error('Failed to load deck preview', err);
            setPreviewError('Unable to load deck preview.');
        } finally {
            setIsPreviewLoading(false);
        }
    };

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

    const firstPreviewQuestion = previewQuestions[0];
    const previewChoices = [
        { key: 'A', value: firstPreviewQuestion?.choiceA },
        { key: 'B', value: firstPreviewQuestion?.choiceB },
        { key: 'C', value: firstPreviewQuestion?.choiceC },
        { key: 'D', value: firstPreviewQuestion?.choiceD },
    ].filter((item) => !!item.value);

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Manage Materials</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Create and manage published/draft custom decks for reviewees.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="Search materials..."
                            className="pl-10 h-10 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link to="/materials/create">
                        <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2 px-4 text-[11px] uppercase tracking-widest">
                            <Plus size={16} /> Create Custom Deck
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={() => fetchManagedDecks(true)}
                        disabled={isRefreshing}
                        className="h-10 rounded-xl border-gray-200 font-black text-[10px] uppercase tracking-widest"
                    >
                        {isRefreshing ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                        Refresh
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([
                    { label: 'All', value: 'all', count: countByCategory.all },
                    { label: 'General Education', value: 'General Education', count: countByCategory['General Education'] },
                    { label: 'Professional Education', value: 'Professional Education', count: countByCategory['Professional Education'] },
                    { label: 'Specialization', value: 'Specialization', count: countByCategory.Specialization },
                ] as const).map((category) => (
                    <button
                        key={category.value}
                        onClick={() => setCategoryFilter(category.value)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            categoryFilter === category.value
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{category.label}</span>
                            <span className="text-xs font-black text-primary">{category.count}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {([
                    { label: 'All Visibility', value: 'all' },
                    { label: 'Published', value: 'PUBLISHED' },
                    { label: 'Draft', value: 'DRAFT' },
                ] as const).map((item) => (
                    <button
                        key={item.value}
                        onClick={() => setVisibilityFilter(item.value)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            visibilityFilter === item.value
                                ? 'border-primary/30 text-primary bg-primary/5'
                                : 'border-gray-200 text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <Card className="border-gray-200 rounded-2xl">
                    <CardContent className="py-12 flex items-center justify-center gap-2 text-gray-500 font-medium">
                        <Loader2 size={18} className="animate-spin" /> Loading materials...
                    </CardContent>
                </Card>
            ) : error ? (
                <Card className="border-red-200 rounded-2xl">
                    <CardContent className="py-10 text-center space-y-3">
                        <p className="text-sm font-bold text-red-700">{error}</p>
                        <Button variant="outline" onClick={() => fetchManagedDecks()} className="rounded-lg border-red-200 text-red-700 hover:bg-red-50">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : filteredDecks.length === 0 ? (
                <Card className="border-gray-200 rounded-2xl">
                    <CardContent className="py-12 text-center space-y-2">
                        <p className="text-sm font-black text-gray-800 uppercase tracking-widest">No materials found</p>
                        <p className="text-xs text-gray-500 font-medium">Adjust your filters or create a new custom deck.</p>
                        <Link to="/materials/create" className="inline-flex mt-3">
                            <Button className="h-9 rounded-lg bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest">
                                <Plus size={14} className="mr-1" /> Create Custom Deck
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDecks.map((deck) => (
                        <Card key={deck.id} className="border-gray-200 rounded-2xl hover:border-primary/30 transition-colors bg-white">
                            <CardContent className="p-4 flex flex-col h-full gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge
                                            className={`font-black text-[9px] uppercase tracking-widest border-none ${
                                                deck.category === 'Professional Education'
                                                    ? 'bg-amber-50 text-amber-600'
                                                    : deck.category === 'General Education'
                                                        ? 'bg-blue-50 text-blue-600'
                                                        : 'bg-emerald-50 text-emerald-600'
                                            }`}
                                        >
                                            {deck.category}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={`font-black text-[9px] uppercase tracking-widest ${
                                                deck.visibility === 'PUBLISHED'
                                                    ? 'border-green-200 text-green-700 bg-green-50'
                                                    : 'border-gray-200 text-gray-600 bg-gray-50'
                                            }`}
                                        >
                                            {deck.visibility}
                                        </Badge>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 p-1.5 rounded-xl">
                                            <Link to={`/materials/${deck.id}/edit`}>
                                                <DropdownMenuItem className="cursor-pointer text-xs font-semibold">
                                                    Manage Deck
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(deck)}
                                                className="cursor-pointer text-xs font-semibold text-red-600 focus:text-red-600 focus:bg-red-50"
                                            >
                                                <Trash2 size={14} className="mr-1.5" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-base font-black text-gray-900 leading-tight line-clamp-2">{deck.title}</h3>
                                    <p className="text-xs text-gray-500 font-medium line-clamp-2 min-h-8">
                                        {deck.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="space-y-1.5 text-[11px] text-gray-600 font-medium">
                                    <div className="flex items-start gap-2">
                                        <Users size={13} className="mt-0.5 text-gray-400" />
                                        <span className="line-clamp-2">Visible to: {formatVisibilityTracks(deck.tracks)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={13} className="text-gray-400" />
                                        <span>{deck.totalItems} flashcards</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserRound size={13} className="text-gray-400" />
                                        <span>
                                            {deck.creator?.name
                                                || `${deck.creator?.firstName || ''} ${deck.creator?.lastName || ''}`.trim()
                                                || 'Unknown author'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={13} className="text-gray-400" />
                                        <span>
                                            {new Date(deck.createdAt).toLocaleDateString('en-PH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 mt-auto flex items-center justify-end gap-2 border-t border-gray-100">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(deck)}
                                        className="rounded-lg h-8 px-3 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <Eye size={13} className="mr-1" /> Preview
                                    </Button>
                                    <Link to={`/materials/${deck.id}/edit`}>
                                        <Button size="sm" className="rounded-lg h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/95">
                                            Manage
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-2xl rounded-2xl border-gray-200 font-lexend p-0 overflow-hidden bg-white">
                    <div className="p-5 border-b border-gray-100">
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-2.5 py-1">
                                    {selectedDeck?.category}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                    {selectedDeck?.visibility}
                                </Badge>
                            </div>
                            <DialogTitle className="text-xl font-black text-gray-900 leading-tight">
                                {selectedDeck?.title}
                            </DialogTitle>
                            <DialogDescription className="font-medium text-gray-500 mt-1 text-sm">
                                {selectedDeck?.description || 'No description provided.'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <FolderOpen size={13} />
                            Visibility: {selectedDeck ? formatVisibilityTracks(selectedDeck.tracks) : '—'}
                        </div>

                        {isPreviewLoading ? (
                            <div className="h-40 rounded-xl border border-gray-200 flex items-center justify-center text-sm text-gray-500 gap-2">
                                <Loader2 size={16} className="animate-spin" /> Loading preview...
                            </div>
                        ) : previewError ? (
                            <div className="h-40 rounded-xl border border-red-200 bg-red-50/40 flex items-center justify-center text-sm text-red-700 font-medium">
                                {previewError}
                            </div>
                        ) : !firstPreviewQuestion ? (
                            <div className="h-40 rounded-xl border border-gray-200 bg-gray-50/40 flex items-center justify-center text-sm text-gray-500 font-medium text-center px-4">
                                This material has no flashcards yet. Open Manage to add questions.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">First Question</p>
                                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">{firstPreviewQuestion.questionText}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {previewChoices.map((choice) => {
                                        const isCorrect = choice.key === firstPreviewQuestion.correctChoice;
                                        return (
                                            <div
                                                key={choice.key}
                                                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                                    isCorrect
                                                        ? 'border-green-200 bg-green-50 text-green-800'
                                                        : 'border-gray-200 bg-white text-gray-700'
                                                }`}
                                            >
                                                <span className="font-black mr-1.5">{choice.key}.</span>
                                                {choice.value}
                                            </div>
                                        );
                                    })}
                                </div>

                                {firstPreviewQuestion.rationalization ? (
                                    <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-600 font-medium leading-relaxed">
                                        <span className="font-black text-gray-800">Rationalization:</span> {firstPreviewQuestion.rationalization}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="rounded-lg h-9 font-black uppercase tracking-widest text-[10px]">
                            Close
                        </Button>
                        {selectedDeck ? (
                            <Link to={`/materials/${selectedDeck.id}/edit`}>
                                <Button className="rounded-lg h-9 bg-primary hover:bg-primary/95 text-white font-black px-4 uppercase tracking-widest text-[10px]">
                                    Manage Deck
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageMaterialsPage;
