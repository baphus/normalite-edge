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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

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

    useEffect(() => {
        const fetchDeck = async () => {
            try {
                if (!id) { setItems([]); return; }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 font-lexend">
                <div className="text-sm text-gray-400 font-medium">Loading session...</div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 font-lexend gap-3">
                <div className="text-sm font-bold text-gray-800">No items found</div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => navigate('/study')}>
                    <ArrowLeft size={13} className="mr-1" /> Back to Study Hub
                </Button>
            </div>
        );
    }

    const currentItem = items[currentIndex];
    const progress = ((currentIndex + 1) / items.length) * 100;
    const isStudyMode = mode === 'study';

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

    /* â”€â”€ Results screen â”€â”€ */
    if (showResults) {
        const correctCount = items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length;
        const scorePercent = Math.round((correctCount / items.length) * 100);
        const scoreColor = scorePercent >= 75 ? 'text-green-600' : scorePercent >= 50 ? 'text-amber-600' : 'text-red-500';

        return (
            <div className="flex flex-col gap-4 font-lexend pb-6 max-w-3xl mx-auto">
                {/* Result summary card */}
                <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy size={28} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 tracking-tight">Session Complete!</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{deckTitle}</p>
                        </div>
                        {isStudyMode && (
                            <div className="flex items-center gap-6 px-6 py-3 rounded-lg bg-gray-50 border border-gray-100">
                                <div className={`text-3xl font-black ${scoreColor}`}>{scorePercent}%</div>
                                <div className="text-left space-y-0.5">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Accuracy</p>
                                    <p className="text-sm font-bold text-gray-700">{correctCount} / {items.length} correct</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={handleRestart}
                                className="flex-1 h-9 rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                            >
                                <RotateCcw size={13} /> Restart
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/study')}
                                className="flex-1 h-9 rounded-md font-semibold text-xs gap-1.5 border-gray-200"
                            >
                                <ArrowLeft size={13} /> Back to Hub
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Review list */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Review</h3>
                    {items.map((item, idx) => {
                        const isCorrect = userAnswers[idx] === item.answer;
                        return (
                            <Card key={idx} className="border-gray-100 rounded-lg overflow-hidden">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">
                                            <span className="text-gray-400 mr-1.5">{idx + 1}.</span>{item.question}
                                        </p>
                                        {isStudyMode && (
                                            isCorrect
                                                ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                                                : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                    {item.imageUrl ? (
                                        <div className="rounded-md border border-gray-100 bg-gray-50/30 p-2">
                                            <img
                                                src={item.imageUrl}
                                                alt={`Review item ${idx + 1}`}
                                                className="max-h-48 w-auto max-w-full rounded-md object-contain bg-white"
                                            />
                                        </div>
                                    ) : null}
                                    <div className="p-3 rounded-md bg-blue-50 border border-blue-100 space-y-1">
                                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Answer</p>
                                        <p className="text-xs font-bold text-gray-900">{item.options[item.answer]}</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">{item.rationalization}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    /* â”€â”€ Session screen â”€â”€ */
    return (
        <div className="flex flex-col h-screen -m-6 md:-m-8 overflow-hidden bg-gray-50 font-lexend">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 md:px-6 h-14 flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 shrink-0 rounded-md text-gray-500"
                    >
                        <ArrowLeft size={16} />
                    </Button>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{deckTitle || 'Study Session'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{isStudyMode ? 'Quiz Mode' : 'Flashcard Mode'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-gray-400 hidden sm:block">
                        {currentIndex + 1} / {items.length}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="h-8 w-8 rounded-md text-gray-400 hover:text-gray-600"
                    >
                        <X size={15} />
                    </Button>
                </div>
            </header>

            {/* Progress */}
            <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-2 shrink-0">
                <div className="flex items-center gap-3">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-semibold text-primary shrink-0">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto space-y-4">

                    {!isStudyMode ? (
                        /* â”€â”€ FLASHCARD MODE â”€â”€ */
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
                                        minHeight: '240px',
                                    }}
                                >
                                    {/* Front */}
                                    <Card
                                        className="absolute inset-0 border-gray-100 shadow-sm rounded-xl bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-1 bg-primary rounded-t-xl" />
                                        <Badge variant="outline" className="mb-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 border-gray-200">
                                            Question
                                        </Badge>
                                        <p className="text-base md:text-lg font-semibold text-gray-900 leading-relaxed">
                                            {currentItem.question}
                                        </p>
                                        {currentItem.imageUrl ? (
                                            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50/30 p-2">
                                                <img
                                                    src={currentItem.imageUrl}
                                                    alt={`Flashcard ${currentIndex + 1}`}
                                                    className="max-h-56 w-auto max-w-full rounded-md object-contain bg-white"
                                                />
                                            </div>
                                        ) : null}
                                        <div className="absolute bottom-4 flex items-center gap-1.5 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                                            <Repeat2 size={12} /> Tap to flip
                                        </div>
                                    </Card>

                                    {/* Back */}
                                    <Card
                                        className="absolute inset-0 border-gray-100 shadow-sm rounded-xl bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-1 bg-green-500 rounded-t-xl" />
                                        <Badge className="mb-4 text-[9px] font-bold uppercase tracking-widest bg-green-50 text-green-600 border-none">
                                            Answer
                                        </Badge>
                                        <p className="text-lg md:text-xl font-bold text-primary leading-snug mb-3">
                                            {currentItem.options[currentItem.answer]}
                                        </p>
                                        <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                                            {currentItem.rationalization}
                                        </p>
                                        <div className="absolute bottom-4 flex items-center gap-1.5 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                                            <Repeat2 size={12} /> Tap to flip back
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Flashcard counter */}
                            <p className="text-center text-[11px] font-semibold text-gray-400">
                                Card {currentIndex + 1} of {items.length}
                            </p>
                        </>
                    ) : (
                        /* â”€â”€ QUIZ MODE â”€â”€ */
                        <Card className="border-gray-100 shadow-sm rounded-xl bg-white overflow-hidden">
                            <CardContent className="p-4 md:p-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 w-6 text-right">
                                        {currentIndex + 1}.
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm md:text-base font-semibold text-gray-900 leading-relaxed">
                                            {currentItem.question}
                                        </p>
                                        {currentItem.imageUrl ? (
                                            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50/30 p-2">
                                                <img
                                                    src={currentItem.imageUrl}
                                                    alt={`Question ${currentIndex + 1}`}
                                                    className="max-h-56 w-auto max-w-full rounded-md object-contain bg-white"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="grid gap-2 pl-9">
                                    {currentItem.options.map((option, idx) => {
                                        const isSelected = userAnswers[currentIndex] === idx;
                                        const isCorrect = idx === currentItem.answer;
                                        const hasAnswered = userAnswers[currentIndex] !== undefined;
                                        const label = String.fromCharCode(65 + idx);

                                        let choiceStyle = 'border-gray-200 bg-white hover:border-primary/30 hover:bg-primary/5 text-gray-700';
                                        if (hasAnswered) {
                                            if (isCorrect) choiceStyle = 'border-green-400 bg-green-50 text-gray-900 shadow-sm';
                                            else if (isSelected) choiceStyle = 'border-red-400 bg-red-50 text-gray-900';
                                            else choiceStyle = 'border-gray-100 bg-white text-gray-400 cursor-default';
                                        }

                                        let labelStyle = 'bg-gray-100 text-gray-500';
                                        if (hasAnswered && isCorrect) labelStyle = 'bg-green-500 text-white';
                                        else if (hasAnswered && isSelected) labelStyle = 'bg-red-500 text-white';

                                        return (
                                            <button
                                                key={idx}
                                                disabled={hasAnswered}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm font-medium transition-all duration-150 ${choiceStyle}`}
                                            >
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${labelStyle}`}>
                                                    {label}
                                                </span>
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>

                                {userAnswers[currentIndex] !== undefined && (
                                    <div className="ml-9 p-3 rounded-lg bg-blue-50 border border-blue-100 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-1.5">
                                            <Info size={12} className="text-blue-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Explanation</span>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                            {currentItem.rationalization}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Navigation controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="h-9 px-4 rounded-md border-gray-200 font-semibold text-xs gap-1.5 text-gray-600"
                        >
                            <ChevronLeft size={14} /> Prev
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setShowResults(true)}
                            className="h-9 px-4 rounded-md border-gray-200 font-semibold text-xs text-gray-400 hover:text-red-500 hover:border-red-200 ml-auto"
                        >
                            <X size={13} className="mr-1" /> End
                        </Button>

                        <Button
                            onClick={handleNext}
                            className="h-9 px-4 rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                        >
                            {currentIndex === items.length - 1 ? (
                                <>Finish <CheckCircle2 size={13} /></>
                            ) : (
                                <>Next <ChevronRight size={14} /></>
                            )}
                        </Button>
                    </div>

                    {/* Jump-to / item dots (if small set) */}
                    {items.length <= 20 && (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                                    className={`rounded-full transition-all ${
                                        idx === currentIndex
                                            ? 'w-4 h-2 bg-primary'
                                            : isStudyMode && userAnswers[idx] !== undefined
                                                ? userAnswers[idx] === items[idx].answer
                                                    ? 'w-2 h-2 bg-green-400'
                                                    : 'w-2 h-2 bg-red-400'
                                                : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudySessionPage;
