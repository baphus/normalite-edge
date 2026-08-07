import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    Repeat2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    const shuffleParam = searchParams.get('shuffle');
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
    const [flashOrder, setFlashOrder] = useState<number[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [selfAssessment, setSelfAssessment] = useState<Record<number, 'got_it' | 'review'>>({});
    const [resultFilter, setResultFilter] = useState<'all' | 'wrong' | 'got_it' | 'review'>('all');
    // Used by the "Review answers" button to scroll the results screen down to
    // the always-visible per-question review list.
    const reviewSectionRef = useRef<HTMLDivElement | null>(null);
    // When set, the session studies this shuffled review subset instead of the
    // full deck. Set by handleReviewAgain; cleared on deck/mode change.
    const [reviewOnlyItems, setReviewOnlyItems] = useState<StudyItem[] | null>(null);

    const isStudyMode = mode === 'study';
    // Map the route mode to the server's DeckSessionMode enum.
    const sessionMode = mode === 'study' ? 'VIEW' : mode.toUpperCase();
    // The cards currently being studied. A "review again" round overrides the
    // full deck with the (shuffled) subset marked for review.
    const sessionItems = reviewOnlyItems ?? items;

    useEffect(() => {
        const effective = reviewOnlyItems ?? items;
        if (effective.length > 0) {
            // Review rounds are already shuffled in handleReviewAgain, so keep
            // their identity order here rather than shuffling again.
            if (shuffleParam && !reviewOnlyItems) {
                setFlashOrder(shuffleArray(effective.map((_, idx) => idx)));
            } else {
                setFlashOrder(effective.map((_, idx) => idx));
            }
        }
    }, [items, reviewOnlyItems, shuffleParam]);

    useEffect(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowResults(false);
        setReviewOnlyItems(null);
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
            const item = sessionItems[mappedIndex];
            if (!item) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select, [role="button"], summary')) return;

            if (!isStudyMode) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    setIsFlipped(f => !f);
                } else if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setIsFlipped(false); }
                } else if (e.key === 'ArrowRight') {
                    if (currentIndex < sessionItems.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
                    else setShowResults(true);
                }
            } else {
                // Quiz keyboard shortcuts (A-D selection) handled by QuizMode.
                // Arrow keys still handled here for cross-mode consistency.
                if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setIsFlipped(false); }
                } else if (e.key === 'ArrowRight') {
                    if (currentIndex < sessionItems.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
                    else setShowResults(true);
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showResults, loading, sessionItems, currentIndex, isStudyMode, userAnswers, flashOrder]);

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

    // Record progress whenever a new card becomes active. Review rounds are
    // skipped: the full-deck progress was already recorded on the primary run.
    useEffect(() => {
        if (items.length === 0 || reviewOnlyItems) return;
        void persistProgress(Math.min(currentIndex + 1, items.length));
    }, [persistProgress, currentIndex, items.length, reviewOnlyItems]);

    // Celebrate when the deck is completed. Flashcard completion stays calm and
    // minimal (no confetti); only quiz completion celebrates.
    useEffect(() => {
        if (showResults) {
            refetchStreak();
            // Tell the server the session is complete so the streak increments.
            // Fire-and-forget: the streak fetch already happens optimistically,
            // and a failed end call must not block the results screen. Only the
            // primary run ends the session — review rounds must not re-end it.
            if (sessionId && !isOffline && !reviewOnlyItems) {
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
            if (isStudyMode) {
                const score = Math.round(
                    (items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length / items.length) * 100
                );
                // Confetti only for strong scores (≥75%). Perfect scores also
                // get the "Perfect score!" message on the results screen.
                setShowConfetti(score >= 75);
            }
        }
    }, [showResults, refetchStreak, sessionId, isOffline, items, userAnswers, isStudyMode, reviewOnlyItems]);

    // Quiz results default to showing wrong answers first when any exist.
    // In flashcard mode this filter is unused, so it is left untouched there.
    useEffect(() => {
        if (!showResults || !isStudyMode) return;
        const hasWrong = items.some((item, idx) => userAnswers[idx] !== undefined && userAnswers[idx] !== item.answer);
        setResultFilter(hasWrong ? 'wrong' : 'all');
    }, [showResults, isStudyMode, items, userAnswers]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50 font-lexend" data-testid="study-session-skeleton">
                <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="ml-auto h-8 w-8 shrink-0 rounded-lg" />
                </header>
                <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                    <Skeleton className="h-0.5 w-full rounded-full" />
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
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 font-lexend">
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
    const currentItem = sessionItems[currentItemIndex];
    const progress = ((currentIndex + 1) / sessionItems.length) * 100;
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
        ? 'text-sm md:text-base'
        : rationaleLength > 300
            ? 'text-sm md:text-base'
            : rationaleLength > 180
            ? 'text-sm md:text-base'
            : 'text-base md:text-lg';

    const answerTextClass = rationaleLength > 200
        ? 'text-xl md:text-2xl'
        : 'text-2xl md:text-4xl';

    const handleNext = () => {
        if (currentIndex < sessionItems.length - 1) {
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

    // Restart the flashcard session with only the cards the user marked
    // "Review again", shuffled. Recursive: subsequent rounds can filter down
    // again, so review subsets can keep looping until nothing is left to review.
    const handleReviewAgain = () => {
        const reviewItems = sessionItems.filter((_, idx) => selfAssessment[idx] === 'review');
        if (reviewItems.length === 0) return;
        const shuffledOrder = shuffleArray(reviewItems.map((_, idx) => idx));
        const shuffledItems = shuffledOrder.map((idx) => reviewItems[idx]);
        setReviewOnlyItems(shuffledItems);
        setFlashOrder(shuffledItems.map((_, idx) => idx));
        setCurrentIndex(0);
        setIsFlipped(false);
        setSelfAssessment({});
        setUserAnswers({});
        setShowResults(false);
        setResultFilter('all');
    };

    /* ── Results screen ── */
    if (showResults) {
        // Flashcard sessions get a calm, minimal completion screen: stat row +
        // actions. No confetti, no score wheel, no per-question breakdown.
        if (!isStudyMode) {
            const reviewCount = Object.values(selfAssessment).filter((v) => v === 'review').length;
            return (
                <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50 font-lexend">
                    {/* Minimal header — deck title + back arrow only */}
                    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/study')}
                            className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-slate-700"
                            aria-label="Back to Study Hub"
                        >
                            <ArrowLeft size={16} />
                        </Button>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-slate-900">
                            {deckTitle || 'Study Session'}
                        </p>
                    </header>

                    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
                        {/* Stat row — "{N} cards reviewed" as primary headline */}
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <CheckCircle2 size={26} />
                            </div>
                            <div className="text-4xl font-bold leading-none tabular-nums text-slate-900">
                                {sessionItems.length}
                            </div>
                            <div className="text-sm font-medium text-slate-500">
                                cards reviewed
                            </div>
                        </div>

                        {/* Calm message below the stat row */}
                        <p className="mt-5 max-w-xs text-center text-sm text-slate-500">
                            {reviewCount > 0 ? 'All done for now.' : 'Great session.'}
                        </p>

                        {/* Actions */}
                        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
                            <Button
                                onClick={() => navigate('/study')}
                                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                            >
                                Done
                            </Button>
                            {reviewCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleReviewAgain}
                                    className="h-11 w-full rounded-xl text-sm font-semibold"
                                >
                                    Review {reviewCount} marked card{reviewCount === 1 ? '' : 's'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        /* ── Quiz completion screen ── */
        const correctCount = items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length;
        const scorePercent = Math.round((correctCount / items.length) * 100);
        const reviewCount = Object.values(selfAssessment).filter((v) => v === 'review').length;

        const filteredItems = items.map((item, idx) => ({ item, idx })).filter(({ idx }) => {
            if (resultFilter === 'all') return true;
            if (resultFilter === 'wrong') {
                return userAnswers[idx] !== undefined && userAnswers[idx] !== items[idx].answer;
            }
            return selfAssessment[idx] === resultFilter;
        });

        return (
            <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50 font-lexend">
                {/* Minimal header — deck title + back arrow only */}
                <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-slate-700"
                        aria-label="Back to Study Hub"
                    >
                        <ArrowLeft size={16} />
                    </Button>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-slate-900">
                        {deckTitle || 'Study Session'}
                    </p>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-2xl space-y-4 p-3 sm:p-5">
                        {/* Score card — staged reveal: this appears first */}
                        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                            <div className="h-1.5 w-full bg-slate-200" />
                            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                                <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50">
                                    <span className="text-2xl font-semibold tabular-nums leading-none text-slate-900">{scorePercent}%</span>
                                    <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Score</span>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <p className="text-2xl font-bold leading-tight text-slate-900">
                                        {scorePercent}% correct
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {correctCount} of {items.length} correct
                                    </p>
                                    {reviewCount > 0 && (
                                        <p className="text-xs text-amber-600 font-medium">
                                            {reviewCount} marked for review
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        {scorePercent === 100 ? 'Perfect score! You nailed every question.' :
                                         scorePercent >= 75 ? 'You really know your stuff!' :
                                         scorePercent >= 50 ? "You're building a strong foundation." :
                                         'Every session makes you stronger.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Per-question review — always visible below the score card */}
                        <div ref={reviewSectionRef} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Review</h3>
                                <div className="flex gap-1 ml-auto">
                                    {(['all', 'wrong', 'got_it', 'review'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setResultFilter(filter)}
                                            className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                                                resultFilter === filter
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                            aria-pressed={resultFilter === filter}
                                        >
                                            {filter === 'all' ? 'All' : filter === 'wrong' ? 'Wrong' : filter === 'got_it' ? 'Got it' : 'Review'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {filteredItems.map(({ item, idx }) => {
                                const isCorrect = userAnswers[idx] === item.answer;
                                const userAnswerIdx = userAnswers[idx];
                                const assessment = selfAssessment[idx];
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
                                                    <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-semibold uppercase tracking-wider">
                                                        {isStudyMode && (isCorrect ? (
                                                            <span className="text-emerald-600">
                                                                <CheckCircle2 size={13} /> Correct
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-600">
                                                                <XCircle size={13} /> Wrong
                                                            </span>
                                                        ))}
                                                        {assessment && (
                                                            <span className={`ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                                                                assessment === 'got_it'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                {assessment === 'got_it' ? 'Got it' : 'Review'}
                                                            </span>
                                                        )}
                                                    </span>
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

                        {/* Actions — Done (primary) + Review answers (secondary, only when wrong answers exist) */}
                        <div className="space-y-2 pb-4">
                            <Button
                                onClick={() => navigate('/study')}
                                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                            >
                                Done
                            </Button>
                            {correctCount < items.length && (
                                <Button
                                    variant="outline"
                                    onClick={() => reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="h-11 w-full rounded-xl text-sm font-semibold"
                                >
                                    Review answers
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {showConfetti && <ConfettiCelebration trigger={showConfetti} onComplete={() => setShowConfetti(false)} />}
            </div>
        );
    }

    /* ── Session screen ── */
    return (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50 font-lexend">
            {/* Compact header */}
            <header data-guide="session-header" className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/study')}
                    className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-slate-700"
                    aria-label="Back to Study Hub"
                >
                    <ArrowLeft size={16} />
                </Button>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-slate-900">
                    {deckTitle || 'Study Session'}
                </p>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/study')}
                    className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-700"
                    aria-label="Close session"
                >
                    <X size={15} />
                </Button>
            </header>

            {/* Thin progress bar at top edge */}
            <div data-guide="session-progress" className="shrink-0 bg-white px-3 py-1.5 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-500">
                        {currentIndex + 1} / {sessionItems.length}
                    </span>
                </div>
            </div>

            {/* Main content */}
            <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50 p-3 sm:p-6">
                <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
                    {!isStudyMode ? (
                        <FlashcardMode
                            items={sessionItems}
                            currentIndex={currentIndex}
                            isFlipped={isFlipped}
                            setIsFlipped={setIsFlipped}
                            flashOrder={flashOrder}
                            handleNext={handleNext}
                            handlePrev={handlePrev}
                            questionTextClass={questionTextClass}
                            answerTextClass={answerTextClass}
                            rationalizationTextClass={rationalizationTextClass}
                            selfAssessment={selfAssessment}
                            setSelfAssessment={setSelfAssessment}
                        />
                    ) : (
                        <QuizMode
                            items={sessionItems}
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
