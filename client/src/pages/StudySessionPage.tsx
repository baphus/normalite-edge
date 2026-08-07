import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    RotateCcw,
    Trophy,
    Repeat2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { saveDeckProgress, type DeckProgress } from '@/lib/offline-store';
import { queueProgress } from '@/lib/offline-sync';
import { useDeckCache } from '@/hooks/useDeckCache';
import { useStreakContext } from '@/contexts/StreakContext';
import api from '@/lib/axios';
import FlashcardMode from './study/FlashcardMode';
import QuizMode from './study/QuizMode';
import { OPTION_LABELS, shuffleArray } from './study/types';
import type { StudyItem } from './study/types';

const StudySessionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'study';
    const navigate = useNavigate();
    const { isOffline } = useDeckCache(id);
    const { refetchStreak } = useStreakContext();
    const [showConfetti, setShowConfetti] = useState(false);

    const [items, setItems] = useState<StudyItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deckTitle, setDeckTitle] = useState('');
    const [isShuffled, setIsShuffled] = useState(false);
    const [flashOrder, setFlashOrder] = useState<number[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const isStudyMode = mode === 'study';
    // Map the route mode to the server's DeckSessionMode enum.
    const sessionMode = mode === 'study' ? 'VIEW' : mode.toUpperCase();

    useEffect(() => {
        setFlashOrder(items.map((_, idx) => idx));
    }, [items]);

    useEffect(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowResults(false);
        setIsShuffled(false);
        if (items.length > 0) {
            setFlashOrder(items.map((_, idx) => idx));
        }
    }, [id, mode, items.length]);

    useEffect(() => {
        const fetchDeck = async () => {
            try {
                if (!id) { setItems([]); setLoading(false); return; }
                const response = await api.get(`/decks/${id}?questions=true`);
                const deck = response.data.data;
                setDeckTitle(deck.title);
                const questions = deck.questions || [];
                questions.sort((a: any, b: any) => (a.orderNo ?? a.order_no ?? 0) - (b.orderNo ?? b.order_no ?? 0));
                const formattedItems: StudyItem[] = questions.map((q: any) => {
                    const optionObject = q.options && typeof q.options === 'object' && !Array.isArray(q.options)
                        ? q.options
                        : null;

                    const arrayOptions = Array.isArray(q.options) ? q.options : [];

                    const rawOptions = [
                        q.choiceA ?? q.choice_a ?? optionObject?.A ?? optionObject?.a ?? arrayOptions[0],
                        q.choiceB ?? q.choice_b ?? optionObject?.B ?? optionObject?.b ?? arrayOptions[1],
                        q.choiceC ?? q.choice_c ?? optionObject?.C ?? optionObject?.c ?? arrayOptions[2],
                        q.choiceD ?? q.choice_d ?? optionObject?.D ?? optionObject?.d ?? arrayOptions[3],
                    ].map((opt) => (typeof opt === 'string' ? opt.trim() : ''));

                    let options = rawOptions.filter((opt) => opt.length > 0);
                    if (options.length === 0 && q.answerText) {
                        options = [String(q.answerText)];
                    }

                    const correctChoiceRaw = String(q.correctChoice ?? q.correct_choice ?? '').trim().toUpperCase();
                    let answerIndex = ['A', 'B', 'C', 'D'].indexOf(correctChoiceRaw);

                    if (answerIndex < 0 && q.answerText && options.length > 0) {
                        const fallbackIdx = options.findIndex(
                            (opt) => opt.toLowerCase() === String(q.answerText).trim().toLowerCase()
                        );
                        answerIndex = fallbackIdx >= 0 ? fallbackIdx : 0;
                    }

                    return {
                        id: q.id,
                        question: q.questionText ?? q.question_text ?? 'Untitled question',
                        imageUrl: q.imageUrl ?? q.image_url ?? null,
                        options,
                        answer: answerIndex >= 0 ? answerIndex : 0,
                        rationalization: q.rationalization || 'No explanation provided.',
                    };
                });
                setItems(formattedItems);
            } catch (error) {
                console.error('Failed to fetch study deck', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDeck();
    }, [id]);

    // Start a deck session on the server so completion can be recorded for
    // streaks. Best-effort: only when online, and never for an empty deck or a
    // session we already started. Skipped entirely when offline — the local
    // IndexedDB progress path covers that case.
    useEffect(() => {
        if (isOffline || loading || showResults || items.length === 0 || sessionId) return;
        let cancelled = false;
        api.post(`/decks/${id}/sessions/start`, { mode: sessionMode })
            .then((response) => {
                const newSessionId: string | undefined = response.data?.data?.id;
                if (!cancelled && newSessionId) setSessionId(newSessionId);
            })
            .catch((error) => {
                if (!cancelled) console.error('Failed to start deck session', error);
            });
        return () => {
            cancelled = true;
        };
    }, [id, mode, sessionMode, items.length, loading, isOffline, showResults, sessionId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (showResults || loading) return;
            const mappedIndex = isStudyMode ? currentIndex : flashOrder[currentIndex] ?? currentIndex;
            const item = items[mappedIndex];
            if (!item) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (!isStudyMode) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    setIsFlipped(f => !f);
                } else if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setIsFlipped(false); }
                } else if (e.key === 'ArrowRight') {
                    if (currentIndex < items.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
                    else setShowResults(true);
                }
            } else {
                // Quiz keyboard shortcuts (A-D selection) handled by QuizMode.
                // Arrow keys still handled here for cross-mode consistency.
                if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setIsFlipped(false); }
                } else if (e.key === 'ArrowRight') {
                    if (currentIndex < items.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
                    else setShowResults(true);
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showResults, loading, items, currentIndex, isStudyMode, userAnswers, flashOrder]);

    // Persist deck progress locally and queue it for sync when offline.
    const persistProgress = useCallback(async (cardsViewed: number) => {
        if (!id || items.length === 0) return;
        const progress: DeckProgress = {
            deckId: id,
            cardsViewed,
            completion: Math.min(100, Math.round((cardsViewed / items.length) * 100)),
            lastAccessed: Date.now(),
        };
        try {
            await saveDeckProgress(progress);
        } catch {
            return;
        }
        if (isOffline) {
            try {
                await queueProgress({ ...progress, totalItems: items.length });
            } catch {
                // Local read-model is already stored; sync catches up when back online.
            }
        }
    }, [id, items.length, isOffline]);

    // Record progress whenever a new card becomes active.
    useEffect(() => {
        if (items.length === 0) return;
        void persistProgress(Math.min(currentIndex + 1, items.length));
    }, [persistProgress, currentIndex, items.length]);

    // Celebrate when the deck is completed.
    useEffect(() => {
        if (showResults) {
            setShowConfetti(true);
            refetchStreak();
            // Tell the server the session is complete so the streak increments.
            // Fire-and-forget: the streak fetch already happens optimistically,
            // and a failed end call must not block the results screen.
            if (sessionId && !isOffline) {
                const payloadItems = items.map((item, idx) => {
                    const selected = userAnswers[idx];
                    return {
                        questionId: item.id,
                        wasViewed: true,
                        selectedChoice: (selected !== undefined ? OPTION_LABELS[selected] : null) as 'A' | 'B' | 'C' | 'D' | null,
                        isCorrect: selected !== undefined ? selected === item.answer : null,
                    };
                });
                api.patch(`/decks/sessions/${sessionId}/end`, {
                    status: 'COMPLETED',
                    currentIndex: items.length - 1,
                    score: items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length,
                    totalItems: items.length,
                    items: payloadItems,
                }, {
                    // tz: client's UTC offset in minutes (e.g. -480 for UTC+8). The
                    // server uses it to record the streak on the user's local date.
                    params: { tz: new Date().getTimezoneOffset() },
                }).catch((error) => {
                    console.error('Failed to end deck session', error);
                });
            }
        }
    }, [showResults, refetchStreak, sessionId, isOffline, items, userAnswers]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 font-lexend" data-testid="study-session-skeleton">
                <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-3 sm:px-5">
                    <div className="flex items-center gap-3 min-w-0">
                        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                        <div className="min-w-0 space-y-1.5">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
                </header>
                <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="w-full flex-1 rounded-xl" />
                    <div className="flex shrink-0 items-center justify-between gap-2">
                        <Skeleton className="h-11 w-28 rounded-xl" />
                        <Skeleton className="h-11 w-28 rounded-xl" />
                        <Skeleton className="h-11 w-28 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 font-lexend">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Repeat2 size={24} />
                </div>
                <div className="space-y-1 text-center">
                    <div className="text-sm font-semibold text-slate-800">No items found</div>
                    <p className="text-xs text-slate-400">This deck has no cards yet.</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => navigate('/study')}>
                    <ArrowLeft size={13} className="mr-1" /> Back to Study Hub
                </Button>
            </div>
        );
    }

    const currentItemIndex = isStudyMode ? currentIndex : flashOrder[currentIndex] ?? currentIndex;
    const currentItem = items[currentItemIndex];
    const progress = ((currentIndex + 1) / items.length) * 100;
    const questionLength = currentItem?.question?.length || 0;
    const rationaleLength = currentItem?.rationalization?.length || 0;

    const questionTextClass = questionLength > 360
        ? 'text-sm md:text-lg'
        : questionLength > 220
            ? 'text-base md:text-xl'
            : questionLength > 140
            ? 'text-lg md:text-2xl'
            : 'text-xl md:text-3xl';

    const rationalizationTextClass = rationaleLength > 700
        ? 'text-xs md:text-sm'
        : rationaleLength > 300
            ? 'text-xs md:text-sm'
            : rationaleLength > 180
            ? 'text-sm md:text-base'
            : 'text-base md:text-lg';

    const answerTextClass = rationaleLength > 200
        ? 'text-xl md:text-2xl'
        : 'text-2xl md:text-4xl';

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            setShowResults(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const handleToggleShuffle = () => {
        const base = items.map((_, idx) => idx);
        if (isShuffled) {
            setFlashOrder(base);
            setIsShuffled(false);
        } else {
            setFlashOrder(shuffleArray(base));
            setIsShuffled(true);
        }
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setUserAnswers({});
        setShowResults(false);
        setIsFlipped(false);
    };

    /* ── Results screen ── */
    if (showResults) {
        const correctCount = items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length;
        const scorePercent = Math.round((correctCount / items.length) * 100);

        return (
            <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 font-lexend">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Trophy size={16} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight text-slate-900">Session Complete</p>
                            <p className="truncate text-xs font-medium text-slate-400 max-w-[180px]">{deckTitle}</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            onClick={handleRestart}
                            size="sm"
                            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90"
                        >
                            <RotateCcw size={12} /> Retake
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 rounded-lg border-slate-200 px-3 text-xs font-semibold"
                            onClick={() => navigate('/study')}
                        >
                            <ArrowLeft size={12} /> Hub
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-2xl space-y-4 p-3 sm:p-5">
                        {/* Score card — staged reveal: this appears first */}
                        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                            <div className="h-1.5 w-full bg-slate-200" />
                            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                                <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50">
                                    <span className="text-2xl font-semibold leading-none text-slate-900">{scorePercent}%</span>
                                    <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Score</span>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <p className="text-base font-semibold text-slate-900">
                                        {correctCount} of {items.length} correct
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {scorePercent >= 75 ? 'Great job! Keep it up.' :
                                         scorePercent >= 50 ? 'Good effort. Review missed items.' :
                                         'Keep practicing to improve.'}
                                    </p>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{ width: `${scorePercent}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Per-question review */}
                        <div className="space-y-2">
                            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Review</h3>
                            {items.map((item, idx) => {
                                const isCorrect = userAnswers[idx] === item.answer;
                                const userAnswerIdx = userAnswers[idx];
                                return (
                                    <Card key={idx} className="overflow-hidden rounded-xl border-slate-200 bg-white">
                                        <div className="h-0.5 w-full bg-slate-200" />
                                        <CardContent className="space-y-3 p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold text-slate-500">
                                                    {idx + 1}
                                                </span>
                                                <p className="flex-1 text-sm font-semibold leading-snug text-slate-900">
                                                    {item.question}
                                                    {isStudyMode && (
                                                        <span className="ml-2 inline-block align-middle text-[11px] font-semibold uppercase tracking-wider">
                                                            {isCorrect ? (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                                    <CheckCircle2 size={13} /> Correct
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-red-600">
                                                                    <XCircle size={13} /> Wrong
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {item.imageUrl && (
                                                <div className="ml-8 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={`Item ${idx + 1}`}
                                                        className="max-h-40 w-auto max-w-full rounded object-contain"
                                                    />
                                                </div>
                                            )}
                                            <div className="ml-8 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                {item.options.map((opt, oi) => {
                                                    const isAns = oi === item.answer;
                                                    const isUsr = oi === userAnswerIdx;
                                                    let cls = 'border-slate-200 bg-slate-50 text-slate-500';
                                                    if (isAns) cls = 'border-slate-900 bg-slate-900 text-white';
                                                    else if (isUsr && !isAns) cls = 'border-red-300 bg-red-50 text-red-600 line-through';
                                                    return (
                                                        <div key={oi} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${cls}`}>
                                                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[11px] font-semibold ${isAns ? 'bg-white text-slate-900' : isUsr ? 'bg-red-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                {OPTION_LABELS[oi]}
                                                            </span>
                                                            {opt}
                                                            {isAns && <CheckCircle2 size={12} className="ml-auto shrink-0 text-white" />}
                                                            {isUsr && !isAns && <XCircle size={12} className="ml-auto shrink-0 text-red-400" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="ml-8 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                                <p className="text-xs leading-relaxed text-slate-600">{item.rationalization}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Prominent Retake at bottom */}
                        <div className="flex justify-center pb-4">
                            <Button
                                onClick={handleRestart}
                                className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                            >
                                <RotateCcw size={16} className="mr-2" /> Retake Quiz
                            </Button>
                        </div>
                    </div>
                </div>
                {showConfetti && <ConfettiCelebration trigger={showConfetti} onComplete={() => setShowConfetti(false)} />}
            </div>
        );
    }

    /* ── Session screen ── */
    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 font-lexend">
            {/* Header */}
            <header data-guide="session-header" className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-slate-700"
                    >
                        <ArrowLeft size={16} />
                    </Button>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight text-slate-900">{deckTitle || 'Study Session'}</p>
                        <p className="text-xs font-medium text-slate-400">{currentIndex + 1} / {items.length}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Badge className={`hidden rounded-full border-none px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider sm:flex ${isStudyMode ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isStudyMode ? 'Quiz' : 'Flashcards'}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                        <X size={15} />
                    </Button>
                </div>
            </header>

            {/* Progress */}
            <div data-guide="session-progress" className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold text-primary">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Main content */}
            <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 p-3 sm:p-6">
                <div className="mx-auto flex h-full w-full max-w-4xl flex-col space-y-4">
                    {!isStudyMode ? (
                        <FlashcardMode
                            items={items}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            isFlipped={isFlipped}
                            setIsFlipped={setIsFlipped}
                            flashOrder={flashOrder}
                            isShuffled={isShuffled}
                            handleToggleShuffle={handleToggleShuffle}
                            handleNext={handleNext}
                            handlePrev={handlePrev}
                            questionTextClass={questionTextClass}
                            answerTextClass={answerTextClass}
                            rationalizationTextClass={rationalizationTextClass}
                        />
                    ) : (
                        <QuizMode
                            items={items}
                            currentIndex={currentIndex}
                            userAnswers={userAnswers}
                            setUserAnswers={setUserAnswers}
                            handleNext={handleNext}
                            handlePrev={handlePrev}
                            questionTextClass={questionTextClass}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudySessionPage;
