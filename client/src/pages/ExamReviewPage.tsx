import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Brain,
    School,
    HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

interface QuestionReview {
    id: number;
    text: string;
    options: string[];
    userAnswer: number | null;
    correctAnswer: number;
    section: string;
    rationalization: string;
}

const SECTION_CONFIG: Record<string, { color: string, icon: React.ElementType, bgColor: string, dotColor: string }> = {
    'Professional Education': {
        color: 'text-purple-600',
        icon: School,
        bgColor: 'bg-purple-50',
        dotColor: 'bg-purple-500'
    },
    'General Education': {
        color: 'text-blue-600',
        icon: BookOpen,
        bgColor: 'bg-blue-50',
        dotColor: 'bg-blue-500'
    },
    'Major Subject': {
        color: 'text-orange-600',
        icon: Brain,
        bgColor: 'bg-orange-50',
        dotColor: 'bg-orange-500'
    }
};

const ExamReviewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect'>('all');
    const [filterSection, setFilterSection] = useState<string>('all');
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

    const questions: QuestionReview[] = [];

    const filteredQuestions = questions.filter(q => {
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'correct' && q.userAnswer === q.correctAnswer) ||
            (filterStatus === 'incorrect' && q.userAnswer !== q.correctAnswer);
        const matchesSection = filterSection === 'all' || q.section === filterSection;
        return matchesStatus && matchesSection;
    });

    const toggleExpand = (id: number) => {
        setExpandedQuestion(expandedQuestion === id ? null : id);
    };

    return (
        <div className="flex flex-col gap-6 font-lexend pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/exams/${id}/result`)}
                        className="rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeft size={24} className="text-gray-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mistake Analysis</h1>
                        <p className="text-sm text-gray-500 font-medium">Exam Review Mode</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                    <div className="text-center">
                        <div className="text-red-500 font-black text-xl leading-none">0</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Mistakes</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-center">
                        <div className="text-gray-900 font-black text-xl leading-none">0<span className="text-xs font-normal text-gray-400">/0</span></div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Score</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-center">
                        <div className="text-green-600 font-black text-xl leading-none">0%</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Accuracy</div>
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-2">
                    <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('all')}
                        className={`font-bold rounded-xl h-10 px-4 ${filterStatus === 'all' ? 'bg-primary' : 'border-gray-200'}`}
                    >
                        View All
                    </Button>
                    <Button
                        variant={filterStatus === 'incorrect' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('incorrect')}
                        className={`font-bold rounded-xl h-10 px-4 ${filterStatus === 'incorrect' ? 'bg-red-500 hover:bg-red-600' : 'border-gray-200'}`}
                    >
                        Incorrect Only
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">Filter Section:</span>
                    <Select value={filterSection} onValueChange={setFilterSection}>
                        <SelectTrigger className="w-50 h-10 border-gray-200 rounded-xl font-bold bg-white">
                            <SelectValue placeholder="All Sections" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="all">All Sections</SelectItem>
                            <SelectItem value="General Education">General Education</SelectItem>
                            <SelectItem value="Professional Education">Professional Education</SelectItem>
                            <SelectItem value="Major Subject">Major Subject</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-4">
                {filteredQuestions.map((q) => {
                    const isCorrect = q.userAnswer === q.correctAnswer;
                    const config = SECTION_CONFIG[q.section] || SECTION_CONFIG['General Education'];
                    const isExpanded = expandedQuestion === q.id;

                    return (
                        <Card
                            key={q.id}
                            className={`border-gray-100 shadow-sm overflow-hidden rounded-2xl transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/10' : ''}`}
                        >
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleExpand(q.id)}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {q.id}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{q.section}</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {q.text}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {isCorrect ? (
                                        <CheckCircle2 size={18} className="text-green-500" />
                                    ) : (
                                        <XCircle size={18} className="text-red-500" />
                                    )}
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-300" /> : <ChevronDown size={20} className="text-gray-300" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <CardContent className="p-6 bg-gray-50/50 border-t border-gray-100 space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question</h4>
                                        <p className="text-gray-900 font-semibold leading-relaxed">{q.text}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* User's Answer */}
                                        <div className={`p-4 rounded-2xl border-2 ${isCorrect
                                            ? 'border-green-200 bg-green-50/50'
                                            : 'border-red-200 bg-red-50/50'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {isCorrect ? <CheckCircle2 size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />}
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                    Your Answer {isCorrect ? '(Correct)' : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {q.userAnswer !== null ? `${String.fromCharCode(65 + q.userAnswer)}. ${q.options[q.userAnswer]}` : 'Skipped'}
                                            </p>
                                        </div>

                                        {/* Correct Answer (if user got it wrong or skipped) */}
                                        {!isCorrect && (
                                            <div className="p-4 rounded-2xl border-2 border-green-200 bg-green-50/50">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 size={16} className="text-green-600" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600">
                                                        Correct Answer
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {String.fromCharCode(65 + q.correctAnswer)}. {q.options[q.correctAnswer]}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info size={18} className="text-blue-600" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                                Rationalization & Explanation
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {q.rationalization}
                                        </p>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}

                {filteredQuestions.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <HelpCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-gray-900">No questions found</h3>
                            <p className="text-sm text-gray-500 font-medium">Adjust your filters to see more results.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/exams/${id}/result`)}
                    className="font-bold text-gray-500 gap-2 px-0 hover:bg-transparent hover:text-primary"
                >
                    <ArrowLeft size={20} /> Back to Summary
                </Button>

                <Button
                    variant="link"
                    className="font-black text-primary p-0"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to Top
                </Button>
            </div>
        </div>
    );
};

export default ExamReviewPage;
