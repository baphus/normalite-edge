import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    Settings,
    HelpCircle,
    CheckCircle2,
    Shuffle,
    RotateCcw,
    Trophy,
    Info,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

interface StudyItem {
    id: number;
    question: string;
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

    const [examTitle, setExamTitle] = useState('');

    useEffect(() => {
        const fetchDeck = async () => {
            try {
                const deckId = id || 'exam-general-education';
                const response = await api.get(`/exams/${deckId}?questions=true`);
                const exam = response.data.data;
                setExamTitle(exam.title);

                const questions = exam.questions || [];
                questions.sort((a: any, b: any) => a.orderIndex - b.orderIndex);

                const formattedItems: StudyItem[] = questions.map((q: any) => {
                    const options = q.choices || [];
                    const answerIndex = options.indexOf(q.correctAnswer);
                    return {
                        id: q.id,
                        question: q.text,
                        options: options,
                        answer: answerIndex >= 0 ? answerIndex : 0,
                        rationalization: q.explanation || "No explanation provided."
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

    if (loading || items.length === 0) return <div className="p-10 text-center">Loading study session...</div>;

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

    if (showResults) {
        const correctCount = items.filter((_, idx) => userAnswers[idx] === items[idx].answer).length;
        const scorePercent = Math.round((correctCount / items.length) * 100);

        return (
            <div className="max-w-3xl mx-auto py-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                    <CardContent className="p-12 text-center space-y-8">
                        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-50 text-green-500">
                            <Trophy size={48} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-gray-900">Study Session Complete!</h2>
                            <p className="text-gray-500 font-medium">You've mastered these concepts. Excellent work!</p>
                        </div>

                        {isStudyMode && (
                            <div className="inline-flex items-center gap-6 px-8 py-5 rounded-3xl bg-primary/5 border border-primary/10">
                                <div className={`text-5xl font-black ${scorePercent >= 75 ? 'text-green-600' : 'text-primary'}`}>
                                    {scorePercent}%
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accuracy</p>
                                    <p className="text-lg font-bold text-gray-700">{correctCount} / {items.length} correct</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                onClick={handleRestart}
                                className="h-14 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black shadow-xl shadow-primary/20 gap-2"
                            >
                                <RotateCcw size={20} /> Restart Session
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/study')}
                                className="h-14 rounded-2xl border-gray-200 font-black gap-2"
                            >
                                <ArrowLeft size={20} /> Back to Hub
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4">Concept Review</h3>
                    {items.map((item, idx) => (
                        <Card key={idx} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <h4 className="font-bold text-gray-900">{idx + 1}. {item.question}</h4>
                                    {isStudyMode && (
                                        <Badge variant={userAnswers[idx] === item.answer ? 'default' : 'destructive'} className="font-black">
                                            {userAnswers[idx] === item.answer ? 'Correct' : 'Incorrect'}
                                        </Badge>
                                    )}
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                                    <p className="text-[10px] font-black text-blue-600 uppercase">Correct Concept</p>
                                    <p className="text-sm font-bold text-gray-900">{item.options[item.answer]}</p>
                                    <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">{item.rationalization}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen -m-6 md:-m-8 md:p-0 overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/study')} className="rounded-full">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{examTitle || 'Study Session'}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5">
                                {mode === 'flashcards' ? 'Flashcard Mode' : 'Quiz Mode'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full text-gray-400">
                        <Settings size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/study')} className="rounded-full text-gray-400">
                        <X size={20} />
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                            <span>{isStudyMode ? 'Question' : 'Card'} {currentIndex + 1} of {items.length}</span>
                            <span className="text-primary">{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {!isStudyMode ? (
                        /* FLASHCARD MODE */
                        <div
                            className="relative w-full aspect-[16/10] md:aspect-[2/1] perspective-1000 group cursor-pointer"
                            onClick={() => setIsFlipped(!isFlipped)}
                            style={{ perspective: '1000px' }}
                        >
                            <div
                                className="relative w-full h-full transition-all duration-700"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                }}
                            >
                                {/* Front */}
                                <Card
                                    className="absolute inset-0 border-none shadow-2xl rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-white overflow-hidden"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-50" />
                                    <Badge variant="secondary" className="mb-8 font-black tracking-widest text-gray-400 bg-gray-50 border-gray-100">QUESTION</Badge>
                                    <h3 className="text-2xl md:text-4xl font-semibold text-gray-900 leading-relaxed font-lexend max-w-2xl">
                                        {currentItem.question}
                                    </h3>
                                    <div className="absolute bottom-8 text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest flex items-center gap-2">
                                        <HelpCircle size={14} /> Click to flip
                                    </div>
                                </Card>
                                {/* Back */}
                                <Card
                                    className="absolute inset-0 border-none shadow-2xl rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-white overflow-hidden"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
                                    <Badge className="mb-8 font-black tracking-widest bg-green-50 text-green-600 border-green-100">CORRECT ANSWER</Badge>
                                    <h3 className="text-3xl md:text-5xl font-black text-primary leading-tight font-lexend mb-6">
                                        {currentItem.options[currentItem.answer]}
                                    </h3>
                                    <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-xl">
                                        {currentItem.rationalization}
                                    </p>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        /* QUIZ MODE */
                        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                            <CardContent className="p-8 md:p-16">
                                <Badge className="mb-8 font-black tracking-widest bg-primary/10 text-primary border-primary/20">QUESTION {currentIndex + 1}</Badge>
                                <h3 className="text-xl md:text-3xl font-bold text-gray-900 leading-relaxed font-lexend mb-12 border-b border-gray-100 pb-10">
                                    {currentItem.question}
                                </h3>

                                <div className="grid gap-4">
                                    {currentItem.options.map((option, idx) => {
                                        const isSelected = userAnswers[currentIndex] === idx;
                                        const isCorrect = idx === currentItem.answer;
                                        const hasAnswered = userAnswers[currentIndex] !== undefined;

                                        let style = 'border-gray-100 bg-white hover:border-primary/20 hover:bg-gray-50';
                                        if (hasAnswered) {
                                            if (isCorrect) style = 'border-green-500 bg-green-50 ring-4 ring-green-50 shadow-lg';
                                            else if (isSelected) style = 'border-red-500 bg-red-50 ring-4 ring-red-50';
                                        } else if (isSelected) {
                                            style = 'border-primary bg-primary/5';
                                        }

                                        const label = String.fromCharCode(65 + idx);
                                        return (
                                            <button
                                                key={idx}
                                                disabled={hasAnswered}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`group flex items-center gap-5 p-5 rounded-3xl border-2 text-left transition-all duration-300 ${style}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${hasAnswered && isCorrect ? 'bg-green-500 text-white' :
                                                    hasAnswered && isSelected ? 'bg-red-500 text-white' :
                                                        'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
                                                    }`}>
                                                    {label}
                                                </div>
                                                <span className={`text-base font-medium ${hasAnswered && isCorrect ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                                                    {option}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {userAnswers[currentIndex] !== undefined && (
                                    <div className="mt-10 p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-2">
                                            <Info size={18} className="text-indigo-600" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Explanation</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {currentItem.rationalization}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Controls */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="h-16 rounded-3xl border-gray-200 font-black text-gray-500 shadow-sm gap-2"
                        >
                            <ArrowLeft size={20} /> Previous
                        </Button>

                        <div className="hidden md:flex items-center justify-center">
                            {!isStudyMode ? (
                                <Button
                                    onClick={() => setShowResults(true)}
                                    variant="outline"
                                    className="h-16 px-10 rounded-3xl border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-gray-500 font-black shadow-sm gap-2 transition-colors"
                                >
                                    <X size={20} /> End Session
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    className="h-16 rounded-3xl font-black text-primary hover:bg-primary/5 gap-2"
                                >
                                    <Shuffle size={20} /> Randomize
                                </Button>
                            )}
                        </div>

                        <Button
                            onClick={handleNext}
                            className="h-16 rounded-3xl bg-white border border-gray-200 text-gray-900 font-black shadow-sm hover:bg-gray-50 gap-2"
                        >
                            {currentIndex === items.length - 1 ? (
                                <>Finish Session <CheckCircle2 size={20} className="text-green-500" /></>
                            ) : (
                                <>Next Item <ChevronRight size={20} /></>
                            )}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudySessionPage;
