import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bookmark, BookOpen, Layers, Plus } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StudyDeck {
    id: string;
    title: string;
    description: string;
    category: string;
    tracks: string[];
    cardCount: number;
    isBookmarked: boolean;
    isNew?: boolean;
}

const StudyHubPage: React.FC = () => {
    useAuth();
    const [decks, setDecks] = useState<StudyDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');

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
                    isNew: true,
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

    const filteredDecks = decks.filter((deck: StudyDeck) => {
        const term = search.toLowerCase();
        const matchesSearch =
            deck.title.toLowerCase().includes(term) ||
            deck.description.toLowerCase().includes(term) ||
            deck.tracks.some((track) => track.toLowerCase().includes(term));
        const matchesCategory =
            category === 'all' ||
            (category === 'saved' ? deck.isBookmarked : deck.category === category);
        return matchesSearch && matchesCategory;
    });

    const categories = [
        { id: 'all', label: 'All Decks' },
        { id: 'Professional Education', label: 'Prof. Education' },
        { id: 'General Education', label: 'Gen. Education' },
        { id: 'Specialization', label: 'Specialization' },
        { id: 'saved', label: 'Saved', icon: <Bookmark size={14} /> },
    ];

    const toggleBookmark = (id: string) => {
        setDecks((prev: StudyDeck[]) =>
            prev.map((deck: StudyDeck) =>
                deck.id === id ? { ...deck, isBookmarked: !deck.isBookmarked } : deck
            )
        );
    };

    return (
        <div className="flex flex-col gap-6 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Study Hub</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Master your LET preparation with focused study sessions.</p>
                </div>
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <Input
                        placeholder="Search decks, topics, or subjects..."
                        className="pl-11 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="flex items-center border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`py-3.5 px-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${category === cat.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-gray-600 font-medium'
                            }`}
                    >
                        {cat.icon}
                        {cat.label}
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${category === cat.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {cat.id === 'all' ? decks.length :
                                cat.id === 'saved' ? decks.filter((d: StudyDeck) => d.isBookmarked).length :
                                    decks.filter((d: StudyDeck) => d.category === cat.id).length}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {filteredDecks.map((deck: StudyDeck) => (
                        <Card
                            key={deck.id}
                            className="group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col"
                        >
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest border-2 ${deck.category === 'Professional Education' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            deck.category === 'General Education' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                            {deck.category}
                                        </Badge>
                                        {deck.isNew && (
                                            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-bold py-0.5">NEW</Badge>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleBookmark(deck.id)}
                                        className={`${deck.isBookmarked ? 'text-primary' : 'text-gray-300'} hover:scale-110 transition-all`}
                                    >
                                        <Bookmark size={20} fill={deck.isBookmarked ? "currentColor" : "none"} />
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-tight">
                                    {deck.title}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 flex-1 line-clamp-2 font-medium">
                                    {deck.description}
                                </p>

                                {deck.tracks.length > 0 && (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">
                                        Tracks: {deck.tracks.join(', ')}
                                    </p>
                                )}

                                <div className="pt-4 mt-auto border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={14} className="text-gray-300" />
                                        {deck.cardCount} Cards
                                    </span>
                                    <div className="flex gap-2">
                                        <Link to={`/study/${deck.id}?mode=flashcards`}>
                                            <Button
                                                variant="ghost"
                                                className="h-9 px-3 text-xs font-bold text-primary hover:bg-primary/5 flex gap-1.5"
                                            >
                                                <Layers size={14} /> Flashcards
                                            </Button>
                                        </Link>
                                        <Link to={`/study/${deck.id}?mode=study`}>
                                            <Button className="h-9 px-3 text-xs font-bold bg-primary hover:bg-primary/95 text-white flex gap-1.5 shadow-md shadow-primary/10">
                                                <BookOpen size={14} /> Study
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Link
                        to="/study/custom-deck"
                        className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/50 transition-all group"
                    >
                        <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Plus size={32} className="text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-sm text-gray-900 uppercase tracking-tight">Create Custom Deck</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">Personalize your review</p>
                        </div>
                    </Link>
                </div>
            )}

            {filteredDecks.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Bookmark size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No decks found</h3>
                    <p className="text-sm text-gray-400 mt-1 font-medium italic">"The only way to learn is to study."</p>
                    <Button
                        variant="outline"
                        onClick={() => { setSearch(''); setCategory('all'); }}
                        className="mt-6 font-bold h-11 px-8 rounded-xl border-gray-200"
                    >
                        View All Decks
                    </Button>
                </div>
            )}
        </div>
    );
};

export default StudyHubPage;
