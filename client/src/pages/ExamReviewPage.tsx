import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    MinusCircle,
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

const SECTION_DOTS: Record<string, string> = {
    'Professional Education': 'bg-purple-500',
    'General Education': 'bg-blue-500',
    'Major Subject': 'bg-orange-500',
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

                const sortedQuestions = (review.exam?.questions || [])
                    .slice()
                    .sort((first: any, second: any) => Number(first.orderNo ?? 0) - Number(second.orderNo ?? 0));

                const parsedQuestions: QuestionReview[] = sortedQuestions.map((question: any, index: number) => {
                    const rawSection = question.section;
                    const sectionName = typeof rawSection === 'string'
                        ? rawSection
                        : rawSection?.title || '';

                    return {
                        id: question.id,
                        orderNo: index + 1,
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
        <div className="flex flex-col gap-4 pb-10 max-w-4xl">            {/* Header */}
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/exams/${id}/result${attemptId ? `?attemptId=${attemptId}` : ''}`)}
                        className="h-8 w-8 rounded-lg shrink-0"
                    >
                        <ArrowLeft size={16} className="text-gray-500" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-gray-900">Answer Review</h1>
                        <p className="text-xs text-gray-400 font-medium">Question-by-question breakdown</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> {metrics.correct}
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <XCircle size={12} /> {metrics.incorrect}
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-xs font-bold text-gray-500">{metrics.accuracy}%</span>
                    </div>
                    {submittedAttempts.length > 1 && (
                        <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg border-gray-200 w-44">
                                <SelectValue placeholder="Select attempt" />
                            </SelectTrigger>
                            <SelectContent>
                                {submittedAttempts.map((attempt, index) => (
                                    <SelectItem key={attempt.id} value={attempt.id} className="text-xs">
                                        Attempt {attempt.attemptNo || submittedAttempts.length - index} &middot; {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'No date'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </header>
            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'correct', 'incorrect'] as const).map((status) => {
                    const labels = { all: 'All', correct: 'Correct', incorrect: 'Incorrect' };
                    const counts = { all: questions.length, correct: metrics.correct, incorrect: metrics.incorrect };
                    const active = filterStatus === status;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`h-7 px-3 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${active ? (status === 'incorrect' ? 'bg-red-500 text-white' : status === 'correct' ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {labels[status]}
                            <span className={`text-[10px] font-bold px-1 rounded ${active ? 'bg-white/20' : 'bg-gray-200 text-gray-400'}`}>{counts[status]}</span>
                        </button>
                    );
                })}
                <div className="ml-auto">
                    <Select value={filterSection} onValueChange={setFilterSection}>
                        <SelectTrigger className="h-7 text-xs font-semibold rounded-md border-gray-200 w-40">
                            <SelectValue placeholder="All Sections" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">All Sections</SelectItem>
                            {sectionOptions.map((sec) => (
                                <SelectItem key={sec} value={sec} className="text-xs">{sec}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {/* Question List */}
            <div className="flex flex-col gap-1.5">
                {filteredQuestions.map((q) => {
                    const isCorrect = q.userAnswer === q.correctAnswer;
                    const isSkipped = !q.userAnswer;
                    const dotColor = SECTION_DOTS[q.section] || 'bg-gray-400';
                    const isExpanded = expandedQuestion === q.id;
                    return (
                        <Card key={q.id} className={`border shadow-none overflow-hidden rounded-xl transition-all ${isExpanded ? 'border-primary/20 shadow-sm' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(q.id)}>
                                {isCorrect ? (<CheckCircle2 size={15} className="text-emerald-500 shrink-0" />) : isSkipped ? (<MinusCircle size={15} className="text-amber-400 shrink-0" />) : (<XCircle size={15} className="text-red-500 shrink-0" />)}
                                <span className="text-[11px] font-black text-gray-400 shrink-0 w-5 text-right">{q.orderNo}</span>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <p className="flex-1 text-xs font-medium text-gray-800 truncate min-w-0">{q.text}</p>
                                {!isExpanded && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {!isCorrect && !isSkipped && (<span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">{q.userAnswer} &rarr; {q.correctAnswer}</span>)}
                                        {isSkipped && (<span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Skipped</span>)}
                                    </div>
                                )}
                                {isExpanded ? (<ChevronUp size={14} className="text-gray-300 shrink-0" />) : (<ChevronDown size={14} className="text-gray-300 shrink-0" />)}
                            </div>
                            {isExpanded && (
                                <CardContent className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50 space-y-3">
                                    <p className="text-xs font-semibold text-gray-800 leading-relaxed pt-3">{q.text}</p>
                                    {q.imageUrl && (
                                        <div className="rounded-lg border border-gray-200 bg-white p-2">
                                            <img src={q.imageUrl} alt="Question attachment" className="max-h-52 w-auto max-w-full rounded object-contain" />
                                        </div>
                                    )}
                                    <div className="grid gap-1.5">
                                        {q.options.map((opt, idx) => {
                                            const label = String.fromCharCode(65 + idx);
                                            const isUserPick = q.userAnswer === label;
                                            const isCorrectChoice = q.correctAnswer === label;
                                            let style = 'border-gray-200 bg-white text-gray-600';
                                            if (isCorrectChoice) style = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                                            else if (isUserPick && !isCorrect) style = 'border-red-300 bg-red-50 text-red-700';
                                            return (
                                                <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium ${style}`}>
                                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black shrink-0 ${isCorrectChoice ? 'bg-emerald-600 text-white' : isUserPick && !isCorrect ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</span>
                                                    <span className="flex-1">{opt}</span>
                                                    {isCorrectChoice && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                                                    {isUserPick && !isCorrectChoice && <XCircle size={13} className="text-red-500 shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
                                        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide mb-1">Explanation</p>
                                            <p className="text-xs text-gray-700 leading-relaxed font-medium">{q.rationalization}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
                {filteredQuestions.length === 0 && (
                    <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <HelpCircle size={22} className="text-gray-300" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700">No questions found</p>
                            <p className="text-xs text-gray-400 font-medium">Adjust your filters to see results.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamReviewPage;
