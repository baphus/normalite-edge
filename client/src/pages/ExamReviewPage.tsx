import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import api from '@/lib/axios';

interface QuestionReview {
    id: string;
    orderNo: number;
    text: string;
    imageUrl?: string | null;
    options: string[];
    userAnswer: string | null;
    correctAnswer: string;
    section: string;
    rationalization: string;
}

interface AttemptOption {
    id: string;
    attemptNo?: number;
    submittedAt?: string | null;
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(searchParams.get('attemptId'));
    const [submittedAttempts, setSubmittedAttempts] = useState<AttemptOption[]>([]);
    const [questions, setQuestions] = useState<QuestionReview[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect'>('all');
    const [filterSection, setFilterSection] = useState<string>('all');
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

    useEffect(() => {
        const loadAttemptOptions = async () => {
            if (!id) {
                setError('Missing exam id.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const attemptsResponse = await api.get('/attempts', {
                    params: {
                        examId: id,
                        page: 1,
                        limit: 200,
                    },
                });

                const attempts = (attemptsResponse.data.data || []) as any[];
                const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED') as AttemptOption[];
                if (submitted.length === 0) {
                    throw new Error('No submitted attempt available for review.');
                }

                setSubmittedAttempts(submitted);

                const queryAttemptId = searchParams.get('attemptId');
                const selected = queryAttemptId && submitted.some((attempt) => attempt.id === queryAttemptId)
                    ? queryAttemptId
                    : submitted[0].id;

                setAttemptId(selected);
                setSearchParams({ attemptId: selected }, { replace: true });
            } catch (requestError: any) {
                const message = requestError?.response?.data?.message || requestError?.message || 'Failed to load review data.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadAttemptOptions();
    }, [id, setSearchParams]);

    useEffect(() => {
        const fetchReview = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);

                const reviewResponse = await api.get(`/attempts/${attemptId}`);
                const review = reviewResponse.data.data;
                const answerMap = (review.answers || {}) as Record<string, string>;

                const parsedQuestions: QuestionReview[] = (review.exam?.questions || []).map((question: any) => {
                    const rawSection = question.section;
                    const sectionName = typeof rawSection === 'string'
                        ? rawSection
                        : rawSection?.title || '';

                    return {
                        id: question.id,
                        orderNo: question.orderNo,
                        text: question.questionText,
                        imageUrl: question.imageUrl || null,
                        options: [question.choiceA, question.choiceB, question.choiceC, question.choiceD],
                        userAnswer: answerMap[question.id] || null,
                        correctAnswer: question.correctChoice,
                        section: sectionName.trim() || 'General Section',
                        rationalization: question.rationalization || 'No explanation provided.',
                    };
                });

                setQuestions(parsedQuestions);
            } catch (requestError: any) {
                const message = requestError?.response?.data?.message || requestError?.message || 'Failed to load review data.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchReview();
    }, [attemptId]);

    const handleAttemptChange = (nextAttemptId: string) => {
        setAttemptId(nextAttemptId);
        setSearchParams({ attemptId: nextAttemptId }, { replace: true });
    };

    const sectionOptions = useMemo(() => {
        return Array.from(new Set(questions.map((question) => question.section))).sort();
    }, [questions]);

    const metrics = useMemo(() => {
        const total = questions.length;
        const correct = questions.filter((question) => question.userAnswer === question.correctAnswer).length;
        const answered = questions.filter((question) => Boolean(question.userAnswer)).length;
        const incorrect = answered - correct;
        const accuracy = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

        return { total, correct, incorrect, accuracy };
    }, [questions]);

    const filteredQuestions = questions.filter(q => {
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'correct' && q.userAnswer === q.correctAnswer) ||
            (filterStatus === 'incorrect' && q.userAnswer !== q.correctAnswer);
        const matchesSection = filterSection === 'all' || q.section === filterSection;
        return matchesStatus && matchesSection;
    });

    const toggleExpand = (questionId: string) => {
        setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
    };

    if (loading) {
        return <div className="p-6 text-sm text-gray-500">Loading exam review...</div>;
    }

    if (error) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-red-600 font-semibold">{error}</p>
                <Button variant="outline" onClick={() => navigate('/exams')}>Back to Exams</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 font-lexend pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/exams/${id}/result${attemptId ? `?attemptId=${attemptId}` : ''}`)}
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
                    <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                        <SelectTrigger className="w-57.5 h-10 border-gray-200 rounded-xl font-bold bg-white">
                            <SelectValue placeholder="Select attempt" />
                        </SelectTrigger>
                        <SelectContent>
                            {submittedAttempts.map((attempt, index) => (
                                <SelectItem key={attempt.id} value={attempt.id}>
                                    Attempt {attempt.attemptNo || submittedAttempts.length - index} • {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'No date'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="text-center">
                        <div className="text-red-500 font-black text-xl leading-none">{metrics.incorrect}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Mistakes</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-center">
                        <div className="text-gray-900 font-black text-xl leading-none">{metrics.correct}<span className="text-xs font-normal text-gray-400">/{metrics.total}</span></div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Score</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-center">
                        <div className="text-green-600 font-black text-xl leading-none">{metrics.accuracy}%</div>
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
                            {sectionOptions.map((sectionName) => (
                                <SelectItem key={sectionName} value={sectionName}>{sectionName}</SelectItem>
                            ))}
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
                                        {q.orderNo}
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
                                        {q.imageUrl && (
                                            <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
                                                <img
                                                    src={q.imageUrl}
                                                    alt="Question attachment"
                                                    className="max-h-80 w-auto max-w-full rounded-xl border border-gray-100 object-contain bg-white"
                                                />
                                            </div>
                                        )}
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
                                                {q.userAnswer !== null
                                                    ? `${q.userAnswer}. ${q.options[(q.userAnswer.charCodeAt(0) - 65)] || ''}`
                                                    : 'Skipped'}
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
                                                    {q.correctAnswer}. {q.options[(q.correctAnswer.charCodeAt(0) - 65)] || ''}
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
                    onClick={() => navigate(`/exams/${id}/result${attemptId ? `?attemptId=${attemptId}` : ''}`)}
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
