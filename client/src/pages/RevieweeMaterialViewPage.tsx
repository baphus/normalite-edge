import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    Check,
    CheckCircle2,
    Layers,
    Users,
    UserRound,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatShortDate } from '@/lib/formatters';

interface DeckQuestion {
    id: string;
    orderNo?: number;
    questionText: string;
    imageUrl?: string | null;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
}

interface DeckTrack {
    id?: string;
    name: string;
    code?: string | null;
}

interface DeckDetails {
    id: string;
    title: string;
    description?: string | null;
    category?: string;
    visibility?: string;
    tracks?: DeckTrack[];
    program_track?: string | null;
    creator?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
    createdAt?: string;
    questions?: DeckQuestion[];
}

const RevieweeMaterialViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

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
                console.error('Failed to load reviewee material details', loadErr);
                setError('Unable to load material details right now.');
                setDeck(null);
            } finally {
                setLoading(false);
            }
        };

        loadDeck();
    }, [id]);

    const questions = useMemo(() => {
        return (deck?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0));
    }, [deck]);

    const visibleToLabel = useMemo(() => {
        const tracks = deck?.tracks || [];
        if (tracks.length > 0) {
            return tracks.map((t) => (t.code ? `${t.name} (${t.code})` : t.name)).join(', ');
        }
        if (deck?.program_track?.trim()) return deck.program_track;
        return 'All Programs';
    }, [deck]);

    const creatorName = useMemo(() => {
        if (!deck?.creator) return 'Unknown author';
        return (
            deck.creator.name ||
            `${deck.creator.firstName || ''} ${deck.creator.lastName || ''}`.trim() ||
            'Unknown author'
        );
    }, [deck]);

    const questionCount = questions.length;

    const getCorrectAnswer = (question: DeckQuestion) => {
        const optionMap = {
            A: question.choiceA,
            B: question.choiceB,
            C: question.choiceC,
            D: question.choiceD,
        } as const;

        const correctKey = question.correctChoice || 'A';
        const correctValue = optionMap[correctKey] || 'No answer available.';

        return {
            label: correctKey,
            value: correctValue,
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">
                        Loading material details...
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            {/* Header */}
            <header data-guide="material-header" className="flex items-start gap-2.5 sm:items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    onClick={() => navigate('/study')}
                >
                    <ArrowLeft size={15} />
                </Button>
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Material Details</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Review material content, answers, and rationalizations.
                    </p>
                </div>
            </header>

            {error ? (
                <Card className="rounded-lg border-red-100 bg-red-50/40">
                    <CardContent className="p-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-red-700">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/study')}
                            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                        >
                            Back to Study Hub
                        </Button>
                    </CardContent>
                </Card>
            ) : !deck ? (
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">
                        Material not found.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Metadata */}
                    <Card data-guide="material-metadata" className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">
                                    {deck.category || 'No Category'}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`font-black text-[10px] uppercase tracking-widest ${
                                        deck.visibility === 'published'
                                            ? 'border-green-200 text-green-700 bg-green-50'
                                            : 'border-amber-200 text-amber-700 bg-amber-50'
                                    }`}
                                >
                                    {deck.visibility === 'published' ? 'Published' : 'Draft'}
                                </Badge>
                            </div>

                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                                    {deck.title || 'Untitled Material'}
                                </h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {deck.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={12} /> Flashcards
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{questionCount}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Users size={12} /> Visible To
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">
                                        {visibleToLabel}
                                    </p>
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
                                        {formatShortDate(deck.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions */}
                    <section data-guide="material-question-list" className="space-y-3">
                        <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">
                            Question List
                        </h3>

                        {questions.length === 0 ? (
                            <Card className="rounded-lg border-gray-100 bg-white">
                                <CardContent className="p-4 text-xs font-semibold text-gray-500">
                                    This material has no questions yet.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const correctAnswer = getCorrectAnswer(question);
                                    return (
                                        <Card key={question.id} className="rounded-lg border-slate-200 bg-white p-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                                                        Question {index + 1}
                                                    </p>
                                                    <p className="text-[13px] font-medium text-gray-900 mt-1 leading-relaxed">
                                                        {question.questionText || 'No question text available.'}
                                                    </p>
                                                    {question.imageUrl ? (
                                                        <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/40 p-2">
                                                            <img
                                                                src={question.imageUrl}
                                                                alt={`Question ${index + 1}`}
                                                                className="max-h-56 w-auto max-w-full rounded-md object-contain bg-white"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                                                    <Check size={14} className="text-green-600 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                                                            Correct
                                                        </p>
                                                        <p className="text-[13px] font-medium text-green-900 mt-0.5">
                                                            {correctAnswer.label}. {correctAnswer.value}
                                                        </p>
                                                    </div>
                                                </div>

                                                {question.rationalization ? (
                                                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                                                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                                                            Rationalization
                                                        </p>
                                                        <p className="text-[13px] font-medium text-slate-700 leading-relaxed">
                                                            {question.rationalization}
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Action Footer */}
                    <Card data-guide="material-actions" className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <p className="text-xs font-semibold text-gray-500">
                                {questionCount > 0
                                    ? `This material contains ${questionCount} flashcard${questionCount !== 1 ? 's' : ''}. Ready to begin?`
                                    : 'No questions available to quiz on.'}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    className="h-8 rounded-md border-gray-200 font-semibold text-xs"
                                    onClick={() => navigate('/study')}
                                >
                                    Back
                                </Button>
                                <Button
                                    data-guide="material-start-btn"
                                    className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
                                    disabled={questionCount === 0}
                                    onClick={() => navigate(`/study/${id}?mode=study`)}
                                >
                                    <BookOpen size={13} /> Begin Quiz
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default RevieweeMaterialViewPage;
