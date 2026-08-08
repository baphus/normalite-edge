import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, WifiOff } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { CollectionEmpty } from '@/components/manage/CollectionState';
import { useDeckCache } from '@/hooks/useDeckCache';
import type { DeckCache } from '@/lib/offline-store';

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

interface DeckCreator {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
}

/**
 * The page's render model. Both the server's `DeckDetails` shape and the
 * offline store's `DeckCache` are assignable to it, so fetched and cached
 * material render through the same JSX.
 */
interface DeckView {
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    visibility?: string | null;
    tracks?: DeckTrack[];
    program_track?: string | null;
    creator?: DeckCreator;
    createdAt?: string | null;
    questions: DeckQuestion[];
}

const BackToStudyHub: React.FC = () => (
    <Link
        to="/study"
        className="inline-flex w-fit items-center gap-1 rounded text-[12px] text-slate-500 transition-all duration-150 hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
    >
        <ArrowLeft size={12} aria-hidden="true" /> Study hub
    </Link>
);

const RevieweeMaterialViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deck, setDeck] = useState<DeckView | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [studyModalOpen, setStudyModalOpen] = useState(false);
    const [shuffle, setShuffle] = useState(false);

    const { cachedDeck, cacheDeck, isOffline } = useDeckCache(id);

    // The fetch effect must not re-run when the cache or connectivity state
    // settles — those are only consulted in the catch branch — so read them
    // through refs.
    const cachedDeckRef = useRef<DeckCache | null>(null);
    const isOfflineRef = useRef(isOffline);
    useEffect(() => {
        cachedDeckRef.current = cachedDeck;
    }, [cachedDeck]);
    useEffect(() => {
        isOfflineRef.current = isOffline;
    }, [isOffline]);

    const loadDeck = useCallback(() => {
        if (!id) {
            Promise.resolve().then(() => {
                setError('Missing material ID.');
                setLoading(false);
            });
            return Promise.resolve();
        }

        // All state updates run in promise callbacks so the effect that kicks
        // off the load performs no synchronous setState calls.
        return Promise.resolve()
            .then(() => {
                setLoading(true);
                setError('');
                setFromCache(false);
                return api.get(`/decks/${id}?questions=true`);
            })
            .then(async (response) => {
                const data = (response.data?.data || null) as DeckView | null;
                setDeck(data);

                // Persist the fresh copy for the next outage. Exam content is never
                // cached; study decks are, so offline review stays possible.
                if (data) {
                    await cacheDeck({
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        subject: undefined,
                        category: data.category,
                        visibility: data.visibility,
                        tracks: data.tracks,
                        program_track: data.program_track,
                        creator: data.creator,
                        createdAt: data.createdAt ?? undefined,
                        questions: data.questions,
                        cachedAt: Date.now(),
                    });
                }
            })
            .catch((loadErr) => {
                console.error('Failed to load reviewee material details', loadErr);
                // The cache exists precisely for this moment. Show it when offline
                // rather than an error the reviewee cannot act on.
                if (isOfflineRef.current && cachedDeckRef.current) {
                    setDeck(cachedDeckRef.current as DeckView);
                    setFromCache(true);
                } else {
                    setError('Unable to load material details right now.');
                    setDeck(null);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id, cacheDeck]);

    useEffect(() => {
        void loadDeck();
    }, [loadDeck]);

    const questions = useMemo(
        () =>
            (deck?.questions || [])
                .slice()
                .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0)),
        [deck],
    );

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
            <div className="flex flex-col gap-3 px-4 pb-6 font-lexend sm:px-6 lg:px-8">
                <BackToStudyHub />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-80 rounded-lg" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-[92px] rounded-xl" />
                    ))}
                </div>
                <span className="sr-only" role="status">Loading material…</span>
            </div>
        );
    }

    if (error || !deck) {
        return (
            <div className="flex flex-col gap-3 px-4 pb-6 font-lexend sm:px-6 lg:px-8">
                {/* The header is not rendered on this branch, so the only route
                    back would otherwise be the sidebar. */}
                <BackToStudyHub />
                <CollectionEmpty
                    filtersActive={false}
                    emptyTitle={error || 'Material not found'}
                    emptyDescription={
                        error
                            ? 'Check your connection and try again.'
                            : 'This material may have been removed.'
                    }
                    emptyAction={
                        error ? (
                            <Button
                                variant="outline"
                                className="h-8 rounded-lg border-slate-200 text-[12px] font-semibold active:scale-[0.97] transition-all duration-150"
                                onClick={() => void loadDeck()}
                            >
                                Retry
                            </Button>
                        ) : undefined
                    }
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 px-4 pb-20 font-lexend sm:px-6 lg:px-8">
            {/* Offline notice — the cached copy is served, say so up front. */}
            {fromCache && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <WifiOff size={13} className="shrink-0 text-amber-600" aria-hidden="true" />
                    <p className="text-[12px] font-medium text-amber-800">
                        You're offline — showing the last saved version of this material.
                    </p>
                </div>
            )}

            {/* Header */}
            <header data-guide="material-header" className="flex flex-col gap-2">
                <BackToStudyHub />

                <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                    {deck.title || 'Untitled material'}
                </h1>

                <p className="text-[13px] font-medium text-slate-600">
                    {questionCount} card{questionCount !== 1 ? 's' : ''}
                </p>
            </header>

            {/* Description */}
            {deck.description && (
                <p className="text-[14px] leading-relaxed text-slate-600 border-l-2 border-slate-200 pl-3">{deck.description}</p>
            )}

            {/* Questions */}
            <section data-guide="material-question-list" className="flex flex-col gap-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Question List
                </h2>

                {questions.length === 0 ? (
                    <CollectionEmpty
                        filtersActive={false}
                        emptyTitle="No questions yet"
                        emptyDescription="This material has no questions yet."
                    />
                ) : (
                    <div className="space-y-3">
                        {questions.map((question, index) => {
                            const correctAnswer = getCorrectAnswer(question);
                            return (
                                <Card
                                    key={question.id}
                                    className="rounded-xl border-slate-200 bg-white p-5"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[14px] font-semibold text-slate-900 leading-relaxed">
                                                {question.questionText || 'No question text available.'}
                                            </p>
                                            {question.imageUrl ? (
                                                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                                    <img
                                                        src={question.imageUrl}
                                                        alt={`Question ${index + 1}`}
                                                        className="max-h-56 w-auto max-w-full rounded-md object-contain bg-white"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="flex items-baseline gap-1.5 border-l-2 border-emerald-400 pl-3">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                                Correct answer
                                            </span>
                                            <span className="text-[14px] font-semibold text-slate-800">
                                                {correctAnswer.label}. {correctAnswer.value}
                                            </span>
                                        </div>

                                        {question.rationalization ? (
                                            <div className="rounded-lg bg-slate-50 border-l-2 border-slate-300 p-3">
                                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.06em] mb-1">
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

            {/* Study mode picker */}
            <Dialog open={studyModalOpen} onOpenChange={setStudyModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start studying</DialogTitle>
                        <DialogDescription>Choose a study mode for this deck.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="shuffle-toggle" className="text-[13px] font-semibold text-slate-700">Shuffle cards</label>
                        <Switch
                            id="shuffle-toggle"
                            checked={shuffle}
                            onCheckedChange={setShuffle}
                        />
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                        <Button
                            variant="outline"
                            className="h-10 justify-start gap-2 rounded-lg border-slate-200 text-[13px] font-semibold active:scale-[0.97] transition-all duration-150"
                            onClick={() => navigate(`/study/${id}?mode=study${shuffle ? '&shuffle=1' : ''}`)}
                        >
                            <Brain size={14} aria-hidden="true" /> Quiz
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 justify-start gap-2 rounded-lg border-slate-200 text-[13px] font-semibold active:scale-[0.97] transition-all duration-150"
                            onClick={() => navigate(`/study/${id}?mode=flashcards${shuffle ? '&shuffle=1' : ''}`)}
                        >
                            <BookOpen size={14} aria-hidden="true" /> Flashcard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Floating Study Button — mobile: fixed above bottom tab bar, desktop: sticky at viewport bottom within scroll area */}
            <div
                className="pointer-events-none fixed inset-x-4 bottom-24 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] lg:sticky lg:bottom-6 lg:z-30 lg:inset-x-auto lg:top-auto lg:mx-auto lg:w-fit lg:block lg:pb-0"
            >
                <Button
                    data-guide="material-start-btn"
                    className="pointer-events-auto h-11 gap-2.5 rounded-full bg-gradient-to-r from-primary to-primary/90 px-7 text-[14px] font-bold text-white shadow-lg shadow-primary/30 ring-1 ring-white/20 ring-offset-1 ring-offset-background transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 animate-float-breathe"
                    onClick={() => setStudyModalOpen(true)}
                    disabled={questionCount === 0}
                >
                    <BookOpen size={17} aria-hidden="true" /> Study
                </Button>
            </div>
        </div>
    );
};

export default RevieweeMaterialViewPage;
