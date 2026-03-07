import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    RotateCcw,
    Trophy,
    Info,
    ChevronLeft,
    ChevronRight,
    Repeat2,
    CheckCircle2,
    XCircle,
    Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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

    const [items, setItems] = useState<StudyItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deckTitle, setDeckTitle] = useState('');

    const isStudyMode = mode === 'study';

    useEffect(() => {
        const fetchDeck = async () => {
            try {
                if (!id) { setItems([]); setLoading(false); return; }
                const response = await api.get(`/decks/${id}?questions=true`);
                const deck = response.data.data;
                setDeckTitle(deck.title);
                const questions = deck.questions || [];
                questions.sort((a: any, b: any) => a.orderNo - b.orderNo);
                const formattedItems: StudyItem[] = questions.map((q: any) => {
                    const options = [q.choiceA, q.choiceB, q.choiceC, q.choiceD].filter(Boolean);
                    const answerIndex = ['A', 'B', 'C', 'D'].indexOf(q.correctChoice);
                    return {
                        id: q.id,
                        question: q.questionText,
                        imageUrl: q.imageUrl || null,
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
            const item = items[currentIndex];
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

    if (loading) {
        return (
            <div className="flex items-center justify-center -mx-5 -mt-4 h-screen bg-gray-50 font-lexend">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading session…</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center -mx-5 -mt-4 h-screen bg-gray-50 font-lexend gap-4">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Repeat2 size={24} />
                </div>
                <div className="text-center space-y-1">
                    <div className="text-sm font-bold text-gray-800">No items found</div>
                    <p className="text-xs text-gray-400">This deck has no cards yet.</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => navigate('/study')}>
                    <ArrowLeft size={13} className="mr-1" /> Back to Study Hub
                </Button>
            </div>
        );
    }

    const currentItem = items[currentIndex];
    const progress = ((currentIndex + 1) / items.length) * 100;

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
            <div className="flex flex-col -mx-5 -mt-4 h-screen bg-gray-50 font-lexend overflow-hidden">
                <header className="bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy size={16} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">Session Complete</p>
                            <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{deckTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleRestart}
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg"
                        >
                            <RotateCcw size={12} /> Restart
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold gap-1.5 border-gray-200 rounded-lg"
                            onClick={() => navigate('/study')}
                        >
                            <ArrowLeft size={12} /> Hub
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto p-5 space-y-4">
                        {isStudyMode && (
                            <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                                <div className={`h-1.5 w-full ${scoreBarColor}`} />
                                <CardContent className="p-6 flex items-center gap-5">
                                    <div className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 ${scoreBg}`}>
                                        <span className={`text-2xl font-black leading-none ${scoreColor}`}>{scorePercent}%</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Score</span>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <p className="text-base font-bold text-gray-900">
                                            {correctCount} of {items.length} correct
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {scorePercent >= 75 ? 'Great job! Keep it up.' :
                                             scorePercent >= 50 ? 'Good effort. Review missed items.' :
                                             'Keep practicing to improve.'}
                                        </p>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Review</h3>
                            {items.map((item, idx) => {
                                const isCorrect = userAnswers[idx] === item.answer;
                                const userAnswerIdx = userAnswers[idx];
                                return (
                                    <Card key={idx} className="border-gray-100 rounded-xl overflow-hidden bg-white">
                                        <div className={`h-0.5 w-full ${isStudyMode ? (isCorrect ? 'bg-emerald-400' : 'bg-red-400') : 'bg-primary/30'}`} />
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <span className="shrink-0 w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">
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
                                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-2 ml-8">
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={`Item ${idx + 1}`}
                                                        className="max-h-40 w-auto max-w-full rounded object-contain"
                                                    />
                                                </div>
                                            )}
                                            {isStudyMode && (
                                                <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {item.options.map((opt, oi) => {
                                                        const isAns = oi === item.answer;
                                                        const isUsr = oi === userAnswerIdx;
                                                        let cls = 'border-gray-100 bg-gray-50 text-gray-400';
                                                        if (isAns) cls = 'border-emerald-200 bg-emerald-50 text-emerald-800';
                                                        else if (isUsr && !isAns) cls = 'border-red-200 bg-red-50 text-red-600 line-through';
                                                        return (
                                                            <div key={oi} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${cls}`}>
                                                                <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${isAns ? 'bg-emerald-500 text-white' : isUsr ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                                    {OPTION_LABELS[oi]}
                                                                </span>
                                                                {opt}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="ml-8 p-2.5 rounded-lg bg-blue-50 border border-blue-100 flex gap-2">
                                                <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                                <p className="text-[11px] text-gray-600 leading-relaxed">{item.rationalization}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Session screen ── */
    return (
        <div className="flex flex-col -mx-5 -mt-4 h-screen overflow-hidden bg-gray-50 font-lexend">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 shrink-0 rounded-lg text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft size={16} />
                    </Button>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{deckTitle || 'Study Session'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{currentIndex + 1} / {items.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`hidden sm:flex text-[9px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5 border-none ${isStudyMode ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isStudyMode ? 'Quiz' : 'Flashcards'}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700"
                    >
                        <X size={15} />
                    </Button>
                </div>
            </header>

            {/* Progress */}
            <div className="bg-white border-b border-gray-100 px-5 py-2.5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-primary shrink-0 w-8 text-right">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-5">
                <div className="max-w-2xl mx-auto space-y-4">
                    {!isStudyMode ? (
                        /* ── FLASHCARD MODE ── */
                        <>
                            <div
                                className="w-full cursor-pointer select-none"
                                onClick={() => setIsFlipped(!isFlipped)}
                                style={{ perspective: '1000px' }}
                            >
                                <div
                                    className="relative w-full transition-all duration-500"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                        minHeight: '320px',
                                    }}
                                >
                                    {/* Front */}
                                    <Card
                                        className="absolute inset-0 border-gray-100 shadow-sm rounded-2xl bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-amber-300 rounded-t-2xl" />
                                        <Badge variant="outline" className="mb-5 text-[9px] font-bold uppercase tracking-widest text-gray-400 border-gray-200">
                                            Question
                                        </Badge>
                                        <p className="text-base md:text-lg font-semibold text-gray-900 leading-relaxed max-w-lg">
                                            {currentItem.question}
                                        </p>
                                        {currentItem.imageUrl && (
                                            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-2">
                                                <img
                                                    src={currentItem.imageUrl}
                                                    alt={`Flashcard ${currentIndex + 1}`}
                                                    className="max-h-48 w-auto max-w-full rounded-lg object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="absolute bottom-5 flex items-center gap-1.5 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                                            <Repeat2 size={12} /> Space or tap to flip
                                        </div>
                                    </Card>

                                    {/* Back */}
                                    <Card
                                        className="absolute inset-0 border-gray-100 shadow-sm rounded-2xl bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-t-2xl" />
                                        <Badge className="mb-5 text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border-none">
                                            Answer
                                        </Badge>
                                        <p className="text-xl md:text-2xl font-black text-primary leading-snug mb-4">
                                            {currentItem.options[currentItem.answer]}
                                        </p>
                                        <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                                            {currentItem.rationalization}
                                        </p>
                                        <div className="absolute bottom-5 flex items-center gap-1.5 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                                            <Repeat2 size={12} /> Tap to flip back
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            <p className="text-center text-[11px] font-semibold text-gray-400">
                                Card {currentIndex + 1} of {items.length}
                            </p>
                        </>
                    ) : (
                        /* ── QUIZ MODE ── */
                        <Card className="border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                            <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 to-violet-300" />
                            <CardContent className="p-5 md:p-7 space-y-5">
                                <div className="flex items-center justify-center">
                                    <span className="inline-flex h-7 items-center rounded-full bg-violet-50 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                                        Question {currentIndex + 1}
                                    </span>
                                </div>

                                <div className="space-y-3 text-center">
                                    <p className="text-2xl md:text-4xl font-black text-gray-900 leading-tight md:leading-[1.2]">
                                        {currentItem.question}
                                    </p>
                                    {currentItem.imageUrl && (
                                        <div className="mx-auto max-w-xl rounded-xl border border-gray-100 bg-gray-50 p-2">
                                            <img
                                                src={currentItem.imageUrl}
                                                alt={`Question ${currentIndex + 1}`}
                                                className="max-h-56 w-auto max-w-full rounded-lg object-contain mx-auto"
                                            />
                                        </div>
                                    )}

                                    {userAnswers[currentIndex] !== undefined && (
                                        <div className="mx-auto max-w-xl rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Rationalization</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">{currentItem.rationalization}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {currentItem.options.map((option, idx) => {
                                        const isSelected = userAnswers[currentIndex] === idx;
                                        const isCorrect = idx === currentItem.answer;
                                        const hasAnswered = userAnswers[currentIndex] !== undefined;

                                        let choiceStyle = 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 text-gray-800 cursor-pointer';
                                        if (hasAnswered) {
                                            if (isCorrect) choiceStyle = 'border-emerald-300 bg-emerald-50 text-emerald-900 cursor-default';
                                            else if (isSelected) choiceStyle = 'border-red-300 bg-red-50 text-red-700 cursor-default';
                                            else choiceStyle = 'border-gray-100 bg-gray-50/50 text-gray-400 cursor-default';
                                        }

                                        let labelStyle = 'bg-gray-100 text-gray-600';
                                        if (hasAnswered && isCorrect) labelStyle = 'bg-emerald-500 text-white';
                                        else if (hasAnswered && isSelected && !isCorrect) labelStyle = 'bg-red-400 text-white';

                                        return (
                                            <button
                                                key={idx}
                                                disabled={hasAnswered}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`rounded-2xl border p-4 md:p-5 text-left transition-all duration-150 min-h-28 md:min-h-36 ${choiceStyle}`}
                                            >
                                                <div className="flex h-full flex-col justify-between gap-3">
                                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${labelStyle}`}>
                                                        {OPTION_LABELS[idx]}
                                                    </span>
                                                    <span className="text-sm md:text-base font-semibold leading-snug">{option}</span>
                                                    <span className="h-5 flex items-center">
                                                        {hasAnswered && isCorrect && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                                                        {hasAnswered && isSelected && !isCorrect && <XCircle size={16} className="text-red-500 shrink-0" />}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="h-9 px-4 rounded-xl border-gray-200 font-semibold text-xs gap-1.5 text-gray-600"
                        >
                            <ChevronLeft size={14} /> Prev
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setShowResults(true)}
                            className="h-9 px-4 rounded-xl border-gray-200 font-semibold text-xs text-gray-400 hover:text-red-500 hover:border-red-200 ml-auto"
                        >
                            <X size={13} className="mr-1" /> End
                        </Button>

                        <Button
                            onClick={handleNext}
                            className="h-9 px-4 rounded-xl font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                        >
                            {currentIndex === items.length - 1 ? (
                                <>Finish <CheckCircle2 size={13} /></>
                            ) : (
                                <>Next <ChevronRight size={14} /></>
                            )}
                        </Button>
                    </div>

                    {/* Dot indicators */}
                    {items.length <= 20 && (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                                    className={`rounded-full transition-all duration-200 ${
                                        idx === currentIndex
                                            ? 'w-5 h-2 bg-primary'
                                            : isStudyMode && userAnswers[idx] !== undefined
                                                ? userAnswers[idx] === items[idx].answer
                                                    ? 'w-2 h-2 bg-emerald-400'
                                                    : 'w-2 h-2 bg-red-400'
                                                : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Keyboard hint */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300 font-medium">
                        <Keyboard size={11} />
                        {isStudyMode ? 'A B C D to answer · ← → to navigate' : 'Space to flip · ← → to navigate'}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudySessionPage;

