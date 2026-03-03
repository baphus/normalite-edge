import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, FolderOpen, UserRound } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Track {
    id: string;
    name: string;
    code?: string | null;
}

interface DeckQuestion {
    id: string;
    orderNo?: number;
    questionText: string;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
}

interface DeckDetails {
    id: string;
    title: string;
    description?: string | null;
    category: 'General Education' | 'Professional Education' | 'Specialization' | 'No Category';
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
    questions?: DeckQuestion[];
}

const MaterialViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deck, setDeck] = useState<DeckDetails | null>(null);

    useEffect(() => {
        const loadDeck = async () => {
            if (!id) {
                setError('Missing material ID.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response = await api.get(`/decks/${id}?questions=true`);
                setDeck((response.data?.data || null) as DeckDetails | null);
            } catch (loadErr) {
                console.error('Failed to load deck details', loadErr);
                setError('Unable to load material details right now.');
                setDeck(null);
            } finally {
                setLoading(false);
            }
        };

        loadDeck();
    }, [id]);

    const visibleTo = useMemo(() => {
        if (!deck?.tracks || deck.tracks.length === 0) return 'All Program Tracks';
        return deck.tracks.map((track) => track.name).join(', ');
    }, [deck]);

    const creatorName = useMemo(() => {
        if (!deck?.creator) return 'Unknown author';
        if (user?.role === 'REVIEWER' && deck.creator.id === user?.id) return 'You';
        return deck.creator.name
            || `${deck.creator.firstName || ''} ${deck.creator.lastName || ''}`.trim()
            || 'Unknown author';
    }, [deck, user?.id, user?.role]);

    const questions = useMemo(() => {
        return (deck?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0));
    }, [deck]);

    if (loading) {
        return (
            <div className="flex flex-col gap-5 font-lexend pb-8">
                <Card className="rounded-2xl border-gray-100 bg-white">
                    <CardContent className="p-6 text-sm font-semibold text-gray-500">Loading material details...</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => navigate('/materials')}
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Material Details</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Full question and answer view for this study material.</p>
                    </div>
                </div>
                {deck ? (
                    <div className="flex items-center gap-2">
                        <Link to={`/materials/${deck.id}/edit`}>
                            <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2">
                                Manage Deck
                            </Button>
                        </Link>
                    </div>
                ) : null}
            </header>

            {error ? (
                <Card className="rounded-2xl border-red-100 bg-red-50/40">
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-red-700">{error}</p>
                        <Button variant="outline" onClick={() => navigate('/materials')} className="border-red-200 text-red-700 hover:bg-red-50">
                            Back to Materials
                        </Button>
                    </CardContent>
                </Card>
            ) : !deck ? (
                <Card className="rounded-2xl border-gray-100 bg-white">
                    <CardContent className="p-6 text-sm font-semibold text-gray-500">Material not found.</CardContent>
                </Card>
            ) : (
                <>
                    <Card className="rounded-2xl border-gray-100 bg-white">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">
                                    {deck.category}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`font-black text-[10px] uppercase tracking-widest ${
                                        deck.visibility === 'PUBLISHED'
                                            ? 'border-green-200 text-green-700 bg-green-50'
                                            : 'border-amber-200 text-amber-700 bg-amber-50'
                                    }`}
                                >
                                    {deck.visibility}
                                </Badge>
                            </div>

                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{deck.title}</h2>
                                <p className="text-sm text-gray-600 font-medium mt-1">{deck.description || 'No description provided.'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <BookOpen size={12} /> Flashcards
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{deck.totalItems}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <FolderOpen size={12} /> Visibility
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">{visibleTo}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UserRound size={12} /> Author
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{creatorName}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} /> Created
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {new Date(deck.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <section className="space-y-3">
                        <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">All Questions and Answers</h3>

                        {questions.length === 0 ? (
                            <Card className="rounded-2xl border-gray-100 bg-white">
                                <CardContent className="p-6 text-sm font-semibold text-gray-500">
                                    This material has no flashcards yet.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const options = [
                                        { key: 'A', value: question.choiceA },
                                        { key: 'B', value: question.choiceB },
                                        { key: 'C', value: question.choiceC },
                                        { key: 'D', value: question.choiceD },
                                    ].filter((option) => Boolean(option.value));

                                    return (
                                        <Card key={question.id} className="rounded-2xl border-gray-100 bg-white">
                                            <CardContent className="p-5 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        Question {index + 1}
                                                    </p>
                                                    <p className="text-sm md:text-base font-bold text-gray-900 mt-1 leading-relaxed">
                                                        {question.questionText || 'No question text available.'}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {options.map((option) => {
                                                        const isCorrect = option.key === question.correctChoice;
                                                        return (
                                                            <div
                                                                key={`${question.id}-${option.key}`}
                                                                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                                                    isCorrect
                                                                        ? 'border-green-200 bg-green-50 text-green-800'
                                                                        : 'border-gray-200 bg-white text-gray-700'
                                                                }`}
                                                            >
                                                                <span className="font-black mr-1.5">{option.key}.</span>
                                                                {option.value}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-xs text-gray-600 font-medium leading-relaxed">
                                                    <span className="font-black text-gray-800">Rationalization: </span>
                                                    {question.rationalization || 'No explanation provided.'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default MaterialViewPage;
