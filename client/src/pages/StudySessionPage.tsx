import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowRight,
    X,
    RotateCcw,
    Trophy,
    Info,
    Repeat2,
    CheckCircle2,
    XCircle,
    Shuffle,
    FlipHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMotionPreference } from '@/contexts/MotionContext';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { saveDeckProgress, type DeckProgress } from '@/lib/offline-store';
import { queueProgress } from '@/lib/offline-sync';
import { useDeckCache } from '@/hooks/useDeckCache';
import api from '@/lib/axios';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const shuffleArray = (arr: number[]) => {
    const next = [...arr];
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
};

interface StudyItem {
    id: string;
    question: string;
    imageUrl?: string | null;
    options: string[];
    answer: number;
    rationalization: string;
}

const StudySessionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'study';
    const navigate = useNavigate();
    const { reducedMotion } = useMotionPreference();
    const { isOffline } = useDeckCache(id);
    const [showConfetti, setShowConfetti] = useState(false);

    const [items, setItems] = useState<StudyItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [showRationalization, setShowRationalization] = useState(true);
    const [loading, setLoading] = useState(true);
    const [deckTitle, setDeckTitle] = useState('');
    const [isShuffled, setIsShuffled] = useState(false);
    const [flashOrder, setFlashOrder] = useState<number[]>([]);

    const isStudyMode = mode === 'study';

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
        setShowRationalization(true);
    }, [currentIndex]);

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
                if (e.key === 'ArrowLeft') {
                    if (currentIndex > 0) { setCurrentIndex(p => p - 1); setIsFlipped(false); }
                } else if (e.key === 'ArrowRight') {
                    if (currentIndex < items.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); }
                    else setShowResults(true);
                } else {
                    const labelIdx = OPTION_LABELS.indexOf(e.key.toUpperCase());
                    if (labelIdx >= 0 && labelIdx < item.options.length && userAnswers[currentIndex] === undefined) {
                        setUserAnswers(prev => ({ ...prev, [currentIndex]: labelIdx }));
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showResults, loading, items, currentIndex, isStudyMode, userAnswers]);

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
        }
    }, [showResults]);

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

    const answerTextClass = rationaleLength > 200
        ? 'text-xl md:text-2xl'
        : 'text-2xl md:text-4xl';

    const rationalizationTextClass = rationaleLength > 700
        ? 'text-xs md:text-sm'
        : rationaleLength > 300
            ? 'text-xs md:text-sm'
            : rationaleLength > 180
            ? 'text-sm md:text-base'
            : 'text-base md:text-lg';

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

    const handleOptionSelect = (idx: number) => {
        if (userAnswers[currentIndex] !== undefined) return;
        setUserAnswers(prev => ({ ...prev, [currentIndex]: idx }));
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
        const scoreColor =
            scorePercent >= 75 ? 'text-emerald-600' :
            scorePercent >= 50 ? 'text-amber-500' :
            'text-red-500';
        const scoreBg =
            scorePercent >= 75 ? 'bg-emerald-50 border-emerald-200' :
            scorePercent >= 50 ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200';
        const scoreBarColor =
            scorePercent >= 75 ? 'bg-emerald-400' :
            scorePercent >= 50 ? 'bg-amber-400' :
            'bg-red-400';

        return (
            <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50 font-lexend">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Trophy size={16} className="text-primary" />
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
                            <RotateCcw size={12} /> Restart
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
                        {isStudyMode && (
                            <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                                <div className={`h-1.5 w-full ${scoreBarColor}`} />
                                <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                                    <div className={`flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border-2 ${scoreBg}`}>
                                        <span className={`text-2xl font-semibold leading-none ${scoreColor}`}>{scorePercent}%</span>
                                        <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Score</span>
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
                                                className={`h-full rounded-full ${scoreBarColor}`}
                                                style={{ width: `${scorePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-2">
                            <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Review</h3>
                            {items.map((item, idx) => {
                                const isCorrect = userAnswers[idx] === item.answer;
                                const userAnswerIdx = userAnswers[idx];
                                return (
                                    <Card key={idx} className="overflow-hidden rounded-xl border-slate-200 bg-white">
                                        <div className={`h-0.5 w-full ${isStudyMode ? (isCorrect ? 'bg-emerald-400' : 'bg-red-400') : 'bg-primary/30'}`} />
                                        <CardContent className="space-y-3 p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                                                    {idx + 1}
                                                </span>
                                                <p className="flex-1 text-sm font-semibold leading-snug text-slate-900">
                                                    {item.question}
                                                    {isStudyMode && (
                                                        <span className="ml-2 inline-block align-middle">
                                                            {isCorrect
                                                                ? <CheckCircle2 size={14} className="inline text-emerald-500" />
                                                                : <XCircle size={14} className="inline text-red-500" />}
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
                                            {isStudyMode && (
                                                <div className="ml-8 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                    {item.options.map((opt, oi) => {
                                                        const isAns = oi === item.answer;
                                                        const isUsr = oi === userAnswerIdx;
                                                        let cls = 'border-slate-200 bg-slate-50 text-slate-400';
                                                        if (isAns) cls = 'border-emerald-200 bg-emerald-50 text-emerald-800';
                                                        else if (isUsr && !isAns) cls = 'border-red-200 bg-red-50 text-red-600 line-through';
                                                        return (
                                                            <div key={oi} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${cls}`}>
                                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-xs font-semibold ${isAns ? 'bg-emerald-500 text-white' : isUsr ? 'bg-red-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                    {OPTION_LABELS[oi]}
                                                                </span>
                                                                {opt}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="ml-8 flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5">
                                                <Info size={12} className="mt-0.5 shrink-0 text-blue-400" />
                                                <p className="text-xs leading-relaxed text-slate-600">{item.rationalization}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
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
                        /* ── FLASHCARD MODE ── */
                        <div className="flex min-h-0 flex-1 flex-col">
                            {/* Card flip */}
                            <div
                                className="flex min-h-0 w-full flex-1 cursor-pointer select-none flex-col justify-center"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <div
                                    className="relative h-[50vh] min-h-[320px] w-full sm:min-h-[380px] md:h-[52vh]"
                                    style={{ perspective: '1200px' }}
                                >
                                    <motion.div
                                        className="relative h-full w-full"
                                        style={{ transformStyle: 'preserve-3d' }}
                                        initial={false}
                                        animate={reducedMotion ? {} : { rotateY: isFlipped ? 180 : 0 }}
                                        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
                                    >
                                        {/* Front */}
                                        <motion.div
                                            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-amber-200 bg-amber-50 p-4 text-center shadow-sm md:p-10"
                                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                            animate={{ opacity: reducedMotion ? (isFlipped ? 0 : 1) : 1 }}
                                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
                                        >
                                            <div className="absolute top-3 md:top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-600/70 md:text-sm">
                                                <Repeat2 size={16} /> Question
                                            </div>
                                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                                                <p className={`${questionTextClass} mb-4 max-w-3xl font-semibold leading-tight text-amber-950 md:mb-6`}>
                                                    {currentItem.question}
                                                </p>
                                                {currentItem.imageUrl && (
                                                    <div className="inline-flex min-h-0 flex-shrink rounded-xl border-2 border-amber-200 bg-white p-2">
                                                        <img
                                                            src={currentItem.imageUrl}
                                                            alt={`Flashcard ${currentIndex + 1}`}
                                                            className="max-h-[20vh] w-auto rounded-lg object-contain md:max-h-[24vh]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700/60 md:bottom-5">
                                                Space or tap to flip
                                            </div>
                                        </motion.div>

                                        {/* Back */}
                                        <motion.div
                                            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm md:p-10"
                                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', rotateY: reducedMotion ? 0 : 180 }}
                                            animate={{ opacity: reducedMotion ? (isFlipped ? 1 : 0) : 1 }}
                                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
                                        >
                                            <div className="absolute top-3 md:top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600/70 md:text-sm">
                                                <Repeat2 size={16} /> Answer
                                            </div>
                                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                                                <p className={`${answerTextClass} mb-4 shrink-0 font-semibold leading-tight text-emerald-900 md:mb-6`}>
                                                    {currentItem.options[currentItem.answer]}
                                                </p>
                                                <div className="w-full max-w-2xl rounded-xl border-2 border-emerald-100 bg-white/50 p-4 md:p-5">
                                                    <p className={`${rationalizationTextClass} font-semibold leading-relaxed text-emerald-700/80`}>
                                                        {currentItem.rationalization}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700/60 md:bottom-5">
                                                Tap to flip back
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Card dots / position — wrapped, never scrolls horizontally */}
                            <div className="mt-3 flex min-h-7 items-center justify-center gap-1.5 px-1 flex-wrap">
                                {items.length <= 24 && items.map((_, idx) => {
                                    const isActive = idx === currentIndex;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentIndex(idx);
                                                setIsFlipped(false);
                                            }}
                                            className={`h-2.5 rounded-full transition-all ${isActive ? 'w-6 bg-slate-900' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
                                            aria-label={`Go to card ${idx + 1}`}
                                        />
                                    );
                                })}
                            </div>

                            {/* Bottom controls — thumb-reachable */}
                            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-4">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                    disabled={currentIndex === 0}
                                    className="h-11 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:px-5"
                                >
                                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFlipped((v) => !v);
                                    }}
                                    className="h-11 flex-1 rounded-xl border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 sm:max-w-[180px]"
                                    aria-label="Flip card"
                                >
                                    <FlipHorizontal size={16} className="mr-1.5" />
                                    <span className="hidden sm:inline">Flip</span>
                                    <span className="sm:hidden">Flip</span>
                                </Button>

                                <Button
                                    size="lg"
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="h-11 rounded-xl bg-primary px-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:px-6"
                                >
                                    {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                                </Button>
                            </div>

                            {/* Shuffle control */}
                            <div className="mt-2 flex shrink-0 items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleShuffle();
                                    }}
                                    className={`h-8 rounded-lg px-3 text-xs font-semibold ${
                                        isShuffled
                                            ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-500/90'
                                            : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                                    }`}
                                >
                                    <Shuffle size={14} className="mr-1.5" />
                                    {isShuffled ? 'Shuffled' : 'Shuffle'}
                                </Button>
                                <p className="hidden text-xs font-semibold uppercase tracking-wider text-amber-700/80 sm:block">
                                    Tap card or press Space to flip
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* ── QUIZ MODE ── */
                        <div className="flex min-h-0 w-full flex-1 flex-col">
                            {/* Question & Image */}
                            <div data-guide="session-question-card" className="mb-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-1">
                                <div className="flex w-full flex-col items-center justify-center px-2">
                                    <span className="mb-4 inline-flex h-8 shrink-0 items-center rounded-lg bg-slate-100 px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                                        Question {currentIndex + 1}
                                    </span>
                                    <h3 className={`${questionTextClass} text-center font-semibold leading-tight text-slate-900`}>
                                        {currentItem.question}
                                    </h3>
                                </div>

                                {currentItem.imageUrl && (
                                    <div className="flex min-h-0 w-full items-center justify-center">
                                        <div className="inline-flex max-h-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                                            <img
                                                src={currentItem.imageUrl}
                                                alt="Question attachment"
                                                className="max-h-[18vh] w-auto rounded-lg object-contain md:max-h-[22vh]"
                                            />
                                        </div>
                                    </div>
                                )}

                                {userAnswers[currentIndex] !== undefined && (
                                    <div className="mx-auto mt-1 w-full max-w-2xl shrink-0 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRationalization((v) => !v)}
                                            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-blue-600"
                                        >
                                            <span>Rationalization</span>
                                            <span className="text-[10px]">{showRationalization ? '▲ Hide' : '▼ Show'}</span>
                                        </button>
                                        {showRationalization && (
                                            <p className={`mt-2 ${rationalizationTextClass} font-medium leading-relaxed text-blue-900`}>{currentItem.rationalization}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Choices Grid */}
                            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                {currentItem.options.length === 0 && (
                                    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:col-span-2">
                                        This question has no answer choices yet. Please update the deck item in deck management.
                                    </div>
                                )}
                                {currentItem.options.map((opt, idx) => {
                                    const isSelected = userAnswers[currentIndex] === idx;
                                    const hasAnswer = userAnswers[currentIndex] !== undefined;
                                    const isCorrect = idx === currentItem.answer;
                                    const isWrongSelection = hasAnswer && isSelected && !isCorrect;

                                    const pastelThemes = [
                                        { bg: 'bg-rose-50', hover: 'hover:bg-rose-100', border: 'border-rose-200', text: 'text-rose-950', iconBg: 'bg-rose-100', iconText: 'text-rose-700', activeRing: 'ring-rose-400' },
                                        { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-950', iconBg: 'bg-blue-100', iconText: 'text-blue-700', activeRing: 'ring-blue-400' },
                                        { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', border: 'border-amber-200', text: 'text-amber-950', iconBg: 'bg-amber-100', iconText: 'text-amber-700', activeRing: 'ring-amber-400' },
                                        { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-950', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700', activeRing: 'ring-emerald-400' }
                                    ];

                                    let theme = pastelThemes[idx % pastelThemes.length];

                                    if (hasAnswer) {
                                        if (isCorrect) {
                                            theme = { bg: 'bg-emerald-100', hover: '', border: 'border-emerald-500', text: 'text-emerald-950', iconBg: 'bg-emerald-500', iconText: 'text-white', activeRing: 'ring-emerald-500' };
                                        } else if (isWrongSelection) {
                                            theme = { bg: 'bg-red-100', hover: '', border: 'border-red-500', text: 'text-red-950', iconBg: 'bg-red-500', iconText: 'text-white', activeRing: 'ring-red-500' };
                                        } else {
                                            theme = { bg: 'bg-slate-50', hover: '', border: 'border-slate-200', text: 'text-slate-400', iconBg: 'bg-slate-100', iconText: 'text-slate-400', activeRing: 'ring-transparent' };
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={hasAnswer}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={`group relative flex min-h-[80px] items-center justify-start rounded-xl border-2 p-3 text-left transition-all duration-150 md:min-h-[88px] md:p-3.5 ${
                                                isSelected && !hasAnswer
                                                    ? `ring-2 ring-offset-2 ${theme.activeRing} scale-[1.01] z-10`
                                                    : !hasAnswer ? `shadow-sm hover:-translate-y-0.5 ${theme.hover}` : ''
                                            } ${theme.bg} ${theme.border} ${theme.text}`}
                                        >
                                            <div className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors md:mr-4 md:h-10 md:w-10 md:text-base ${theme.iconBg} ${theme.iconText}`}>
                                                {OPTION_LABELS[idx]}
                                            </div>
                                            <span className="flex-1 break-words text-sm font-semibold leading-snug md:text-[15px]">
                                                {opt}
                                            </span>
                                            {hasAnswer && isCorrect && <CheckCircle2 size={24} className="ml-2 shrink-0 text-emerald-500" />}
                                            {hasAnswer && isWrongSelection && <XCircle size={24} className="ml-2 shrink-0 text-red-500" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Navigation Footer */}
                            <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-4">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </Button>

                                {/* Indicators — wrap, never scrolls horizontally */}
                                {items.length <= 20 && (
                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                        {items.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                                                className={`rounded-full transition-all duration-200 ${
                                                    idx === currentIndex
                                                        ? 'h-2 w-5 bg-slate-900'
                                                        : userAnswers[idx] !== undefined
                                                            ? userAnswers[idx] === items[idx].answer
                                                                ? 'h-2 w-2 bg-emerald-400'
                                                                : 'h-2 w-2 bg-red-400'
                                                            : 'h-2 w-2 bg-slate-200 hover:bg-slate-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="flex shrink-0 items-center gap-3">
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                                    >
                                        {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudySessionPage;
