import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Timer,
    ArrowLeft,
    ArrowRight,
    Send,
    School,
    BookOpen,
    Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

interface Question {
    id: string;
    text: string;
    choices: string[];
    correctAnswer?: string;
    explanation?: string;
}

interface Exam {
    id: string;
    title: string;
    subject: string;
    timeLimit: number;
    totalItems: number;
    questions: Question[];
}

const SECTION_CONFIG: Record<string, { color: string, icon: React.ElementType, banner: string }> = {
    'Professional Education': {
        color: 'text-amber-700',
        icon: School,
        banner: 'bg-amber-50 border-amber-100 text-amber-700'
    },
    'General Education': {
        color: 'text-blue-700',
        icon: BookOpen,
        banner: 'bg-blue-50 border-blue-100 text-blue-700'
    },
    'Major Subject': {
        color: 'text-purple-700',
        icon: Brain,
        banner: 'bg-purple-50 border-purple-100 text-purple-700'
    }
};

const TakeExamPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<Exam | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                // Fetch from real API: wait for ID, default to seed exam if no ID
                const examId = id || 'exam-general-education';
                const response = await api.get(`/exams/${examId}?questions=true`);
                const fetchedExam = response.data.data;

                // Sort questions by orderIndex if available
                if (fetchedExam.questions) {
                    fetchedExam.questions.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
                }

                setExam(fetchedExam);
                setTimeLeft((fetchedExam.timeLimit || 60) * 60);
            } catch (error) {
                console.error('Failed to fetch exam', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [id]);

    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading || !exam) return <div>Loading exam...</div>;

    const currentQuestion = exam.questions[currentIndex] || { text: '', choices: [], section: '' };
    const section = SECTION_CONFIG[exam.subject] || SECTION_CONFIG['Professional Education'];
    const SectionIcon = section.icon;

    const handleOptionSelect = (optionIndex: number) => {
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: optionIndex
        }));
    };

    const handleFinish = async () => {
        try {
            await api.post(`/attempts`, {
                examId: exam.id,
                answers: answers,
                timeSpent: (exam.timeLimit * 60) - timeLeft
            });
            navigate(`/exams/${exam.id}/result`, { state: { answers, exam } });
        } catch (error) {
            console.error('Failed to submit attempt', error);
            // Fallback navigate
            navigate(`/exams/${exam.id}/result`, { state: { answers, exam } });
        }
    };

    const answeredCount = Object.keys(answers).length;

    return (
        <div className="flex flex-col h-screen -m-6 md:-m-8 md:p-0 overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{exam.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 bg-primary/5">
                            Standard Mode
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                        <Timer size={20} className="text-gray-400" />
                        <span className="font-mono font-black text-primary text-xl">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Question Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                Question {currentIndex + 1} of {exam.questions.length}
                            </span>
                            <Progress value={((currentIndex + 1) / exam.questions.length) * 100} className="w-32 h-2" />
                        </div>

                        <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
                            <div className={`px-8 py-4 flex items-center gap-3 border-b ${section.banner}`}>
                                <SectionIcon size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">{exam.subject || 'Exam'}</span>
                            </div>
                            <CardContent className="p-8 md:p-12">
                                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 leading-relaxed mb-10">
                                    {currentQuestion.text}
                                </h3>

                                <div className="grid gap-4">
                                    {(currentQuestion.choices || []).map((option, idx) => {
                                        const isSelected = answers[currentIndex] === idx;
                                        const label = String.fromCharCode(65 + idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`group flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                                    : 'border-gray-100 bg-white hover:border-primary/20 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
                                                    }`}>
                                                    {label}
                                                </div>
                                                <span className={`text-base font-medium ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                                                    {option}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-100">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentIndex === 0}
                                        className="h-12 px-6 rounded-xl font-bold text-gray-500 gap-2"
                                    >
                                        <ArrowLeft size={18} /> Previous
                                    </Button>

                                    {currentIndex === exam.questions.length - 1 ? (
                                        <Button
                                            onClick={handleFinish}
                                            className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/25 gap-2"
                                        >
                                            Submit Exam <Send size={18} />
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setCurrentIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                            className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/25 gap-2"
                                        >
                                            Next Question <ArrowRight size={18} />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Right Sidebar - Navigator */}
                <aside className="w-80 border-l border-gray-100 bg-white flex flex-col shrink-0 hidden lg:flex">
                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-900 uppercase tracking-wider text-xs">Question Navigator</h3>
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-bold">
                                    {answeredCount} / {exam.questions.length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {exam.questions.map((_, idx) => {
                                    const isCurrent = currentIndex === idx;
                                    const isAnswered = answers[idx] !== undefined;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-10 rounded-xl text-xs font-black transition-all duration-200 ${isCurrent
                                                ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-4 ring-primary/10 scale-110 z-10'
                                                : isAnswered
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Legend</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-primary" /> Current
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200" /> Answered
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-gray-50 border border-gray-100" /> Unanswered
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 mt-auto">
                            <Button
                                onClick={handleFinish}
                                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                Submit Final Exam
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TakeExamPage;
