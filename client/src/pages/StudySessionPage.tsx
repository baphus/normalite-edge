import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
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
        ? 'text-2xl md:text-3xl'
        : 'text-3xl md:text-5xl';

    const rationalizationTextClass = rationaleLength > 700
        ? 'text-[11px] md:text-xs'
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
            <header data-guide="session-header" className="bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between shrink-0 gap-4">
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
            <div data-guide="session-progress" className="bg-white border-b border-gray-100 px-5 py-2.5 shrink-0">
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
            <main className="flex-1 overflow-hidden p-4 md:p-6 bg-gray-50 flex flex-col">
                <div className="max-w-4xl mx-auto w-full h-full flex flex-col space-y-4">
                    {!isStudyMode ? (
                        /* ── FLASHCARD MODE ── */
                        <div className="flex-1 min-h-0 flex flex-col">
                            <div
                                className="w-full flex-1 flex flex-col justify-center cursor-pointer select-none min-h-0"
                                onClick={() => setIsFlipped(!isFlipped)}
                                style={{ perspective: '2000px' }}
                            >
                                <div
                                    className="relative w-full h-[46vh] md:h-[50vh] transition-all duration-500 ease-out"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                    }}
                                >
                                    {/* Front */}
                                    <div
                                        className="absolute inset-0 rounded-3xl bg-amber-50 border-4 border-amber-200 shadow-sm flex flex-col items-center justify-center p-6 md:p-12 text-center overflow-hidden hover:bg-amber-100 transition-colors"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <div className="absolute top-6 flex items-center gap-2 text-amber-600/60 font-black uppercase tracking-widest text-sm">
                                            <Repeat2 size={16} /> Question
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                                            <p className={`${questionTextClass} font-black text-amber-950 leading-tight mb-4 md:mb-6`}>
                                                {currentItem.question}
                                            </p>
                                            {currentItem.imageUrl && (
                                                <div className="rounded-xl border-2 border-amber-200 bg-white p-2 inline-flex flex-shrink min-h-0">
                                                    <img
                                                        src={currentItem.imageUrl}
                                                        alt={`Flashcard ${currentIndex + 1}`}
                                                        className="h-auto w-auto max-h-[20vh] md:max-h-[24vh] object-contain rounded-lg"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-6 flex items-center gap-2 text-amber-700/50 font-bold uppercase tracking-wider text-xs">
                                            Space or tap to flip
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div
                                        className="absolute inset-0 rounded-3xl bg-emerald-50 border-4 border-emerald-200 shadow-sm flex flex-col items-center justify-center p-6 md:p-12 text-center overflow-hidden hover:bg-emerald-100 transition-colors"
                                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                    >
                                        <div className="absolute top-6 flex items-center gap-2 text-emerald-600/60 font-black uppercase tracking-widest text-sm">
                                            <Repeat2 size={16} /> Answer
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                                            <p className={`${answerTextClass} font-black text-emerald-900 leading-tight mb-4 md:mb-6 shrink-0`}>
                                                {currentItem.options[currentItem.answer]}
                                            </p>
                                            <div className="bg-white/50 p-4 md:p-5 rounded-2xl border-2 border-emerald-100 w-full max-w-2xl">
                                                <p className={`${rationalizationTextClass} font-bold text-emerald-700/80 leading-relaxed`}>
                                                    {currentItem.rationalization}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-6 flex items-center gap-2 text-emerald-700/50 font-bold uppercase tracking-wider text-xs">
                                            Tap to flip back
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between w-full mt-6 shrink-0 pt-4 border-t border-gray-200">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                    disabled={currentIndex === 0}
                                    className="h-11 px-5 text-sm font-bold gap-2 rounded-xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </Button>
                                <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest hidden sm:block">
                                    Card {currentIndex + 1} / {items.length}
                                </p>
                                <Button
                                    size="lg"
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="h-11 px-6 text-sm font-black rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm gap-2"
                                >
                                    {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ── QUIZ MODE ── */
                        <div className="flex-1 flex flex-col min-h-0 w-full">
                            {/* Question & Image */}
                            <div data-guide="session-question-card" className="flex-1 flex flex-col items-center justify-center min-h-0 gap-3 py-1 mb-3">
                                <div className="w-full px-2 flex flex-col items-center justify-center">
                                    <span className="inline-flex h-8 items-center rounded-lg bg-gray-100 px-4 text-xs font-black uppercase tracking-widest text-gray-500 mb-4 shrink-0">
                                        Question {currentIndex + 1}
                                    </span>
                                    <h3 className={`${questionTextClass} font-black text-gray-900 leading-tight text-center`}>
                                        {currentItem.question}
                                    </h3>
                                </div>

                                {currentItem.imageUrl && (
                                    <div className="flex-1 min-h-0 w-full flex justify-center items-center">
                                        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white p-1.5 inline-flex max-h-full">
                                            <img
                                                src={currentItem.imageUrl}
                                                alt="Question attachment"
                                                className="h-full w-auto max-h-[18vh] md:max-h-[22vh] object-contain rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {userAnswers[currentIndex] !== undefined && (
                                    <div className="w-full max-w-2xl mx-auto rounded-xl bg-blue-50 border-2 border-blue-200 px-4 py-3 mt-1 shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1.5">Rationalization</p>
                                        <p className={`${rationalizationTextClass} font-semibold text-blue-900 leading-relaxed`}>{currentItem.rationalization}</p>
                                    </div>
                                )}
                            </div>

                            {/* Choices Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
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
                                            theme = { ...theme, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', iconBg: 'bg-gray-100', iconText: 'text-gray-400', activeRing: 'ring-transparent' };
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={hasAnswer}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={`group relative flex items-center justify-start p-3 md:p-3.5 min-h-[72px] md:min-h-[88px] rounded-xl border-2 text-left transition-all duration-150 ${
                                                isSelected && !hasAnswer
                                                    ? `ring-2 ring-offset-2 ${theme.activeRing} scale-[1.01] z-10`
                                                    : !hasAnswer ? `shadow-sm hover:-translate-y-0.5 ${theme.hover}` : ''
                                            } ${theme.bg} ${theme.border} ${theme.text}`}
                                        >
                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-sm md:text-base shrink-0 mr-3 md:mr-4 transition-colors ${theme.iconBg} ${theme.iconText}`}>
                                                {OPTION_LABELS[idx]}
                                            </div>
                                            <span className="text-sm md:text-[15px] font-bold leading-snug break-words flex-1">
                                                {opt}
                                            </span>
                                            {hasAnswer && isCorrect && <CheckCircle2 size={24} className="text-emerald-500 ml-2 shrink-0" />}
                                            {hasAnswer && isWrongSelection && <XCircle size={24} className="text-red-500 ml-2 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Navigation Footer */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 shrink-0">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="h-11 px-5 text-sm font-bold gap-2 rounded-xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </Button>
                                
                                {/* Indicators */}
                                {items.length <= 20 && (
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        {items.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                                                className={`rounded-full transition-all duration-200 ${
                                                    idx === currentIndex
                                                        ? 'w-5 h-2 bg-gray-900'
                                                        : userAnswers[idx] !== undefined
                                                            ? userAnswers[idx] === items[idx].answer
                                                                ? 'w-2 h-2 bg-emerald-400'
                                                                : 'w-2 h-2 bg-red-400'
                                                            : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        className="h-11 px-6 text-sm font-black rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm gap-2"
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

