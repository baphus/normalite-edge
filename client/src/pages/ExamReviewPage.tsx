import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Info,
    Clock3,
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
    SelectValue,
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
    elapsedSeconds: number | null;
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

const formatDuration = (seconds?: number | null, fallback = 'No timing data') => {
    const numeric = Math.max(0, Math.round(Number(seconds || 0)));
    if (!numeric) return fallback;

    const minutes = Math.floor(numeric / 60);
    const remainingSeconds = numeric % 60;

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
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
    const [collapsedQuestions, setCollapsedQuestions] = useState<Record<string, boolean>>({});
    const [collapsedExplanations, setCollapsedExplanations] = useState<Record<string, boolean>>({});
    const [reviewMeta, setReviewMeta] = useState<{ timeSpentSeconds?: number | null } | null>(null);

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
    }, [id, searchParams, setSearchParams]);

    useEffect(() => {
        const fetchReview = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);

                const reviewResponse = await api.get(`/attempts/${attemptId}`);
                const review = reviewResponse.data.data;
                const answerMap = (review.answers || {}) as Record<string, string>;
                const answerMeta = (review.answerMeta || {}) as Record<string, { elapsedSeconds?: number | null }>;

                setCollapsedQuestions({});
                setCollapsedExplanations({});
                setReviewMeta({ timeSpentSeconds: review.timeSpentSeconds ?? null });

                const sortedQuestions = (review.exam?.questions || [])
                    .slice()
                    .sort((first: any, second: any) => Number(first.orderNo ?? 0) - Number(second.orderNo ?? 0));

                const parsedQuestions: QuestionReview[] = sortedQuestions.map((question: any, index: number) => {
                    const rawSection = question.section;
                    const sectionName = typeof rawSection === 'string'
                        ? rawSection
                        : rawSection?.title || '';
                    const metadata = answerMeta[question.id] || {};

                    return {
                        id: question.id,
                        orderNo: index + 1,
                        text: question.questionText,
                        imageUrl: question.imageUrl || null,
                        options: [question.choiceA, question.choiceB, question.choiceC, question.choiceD],
                        userAnswer: answerMap[question.id] || null,
                        correctAnswer: question.correctChoice,
                        section: sectionName.trim() || 'Main section',
                        rationalization: question.rationalization || 'No explanation provided.',
                        elapsedSeconds: typeof metadata.elapsedSeconds === 'number' ? metadata.elapsedSeconds : null,
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
        return Array.from(new Set(questions.map((question) => question.section).filter(Boolean))).sort();
    }, [questions]);

    const metrics = useMemo(() => {
        const total = questions.length;
        const correct = questions.filter((question) => question.userAnswer === question.correctAnswer).length;
        const answered = questions.filter((question) => Boolean(question.userAnswer)).length;
        const incorrect = answered - correct;
        const skipped = Math.max(total - answered, 0);
        const accuracy = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

        return { total, correct, incorrect, skipped, accuracy };
    }, [questions]);

    const safeTotal = metrics.total > 0 ? metrics.total : 1;
    const correctPercent = (metrics.correct / safeTotal) * 100;
    const incorrectPercent = (metrics.incorrect / safeTotal) * 100;
    const skippedPercent = (metrics.skipped / safeTotal) * 100;
    const showCorrectMetric = metrics.correct > 0;
    const showIncorrectMetric = metrics.incorrect > 0;
    const showSkippedMetric = metrics.skipped > 0;
    const hasOutcomeMetrics = showCorrectMetric || showIncorrectMetric || showSkippedMetric;
    const pieChartStyle: React.CSSProperties = {
        background: `conic-gradient(
            #16a34a 0deg ${correctPercent * 3.6}deg,
            #ef4444 ${correctPercent * 3.6}deg ${(correctPercent + incorrectPercent) * 3.6}deg,
            #f59e0b ${(correctPercent + incorrectPercent) * 3.6}deg 360deg
        )`,
    };

    const filteredQuestions = questions.filter((question) => {
        const matchesStatus = filterStatus === 'all'
            || (filterStatus === 'correct' && question.userAnswer === question.correctAnswer)
            || (filterStatus === 'incorrect' && Boolean(question.userAnswer) && question.userAnswer !== question.correctAnswer);
        const matchesSection = filterSection === 'all' || question.section === filterSection;
        return matchesStatus && matchesSection;
    });

    const hardestQuestion = useMemo(() => {
        // For a single-attempt review, "hardest" prioritizes incorrect answers,
        // then uses longest answer time as the tie-breaker.
        const incorrectQuestions = questions.filter((question) => (
            Boolean(question.userAnswer) && question.userAnswer !== question.correctAnswer
        ));

        const sortByDifficulty = (left: QuestionReview, right: QuestionReview) => {
            const leftTime = left.elapsedSeconds || 0;
            const rightTime = right.elapsedSeconds || 0;

            if (rightTime !== leftTime) return rightTime - leftTime;
            return left.orderNo - right.orderNo;
        };

        if (incorrectQuestions.length > 0) {
            return incorrectQuestions.slice().sort(sortByDifficulty)[0] || null;
        }

        return questions.slice().sort(sortByDifficulty)[0] || null;
    }, [questions]);

    const toggleExpand = (questionId: string) => {
        setCollapsedQuestions((current) => ({
            ...current,
            [questionId]: !current[questionId],
        }));
    };

    const toggleExplanation = (questionId: string) => {
        setCollapsedExplanations((current) => ({
            ...current,
            [questionId]: !current[questionId],
        }));
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
        <div className="flex flex-col gap-4 pb-10 max-w-6xl">
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
                        {showCorrectMetric && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 size={12} /> {metrics.correct}
                            </span>
                        )}
                        {showIncorrectMetric && (
                            <>
                                {showCorrectMetric && <span className="text-gray-200">|</span>}
                                <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                    <XCircle size={12} /> {metrics.incorrect}
                                </span>
                            </>
                        )}
                        {showSkippedMetric && (
                            <>
                                {(showCorrectMetric || showIncorrectMetric) && <span className="text-gray-200">|</span>}
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                                    <MinusCircle size={12} /> {metrics.skipped}
                                </span>
                            </>
                        )}
                        {hasOutcomeMetrics && <span className="text-gray-200">|</span>}
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
                                        Attempt {attempt.attemptNo || submittedAttempts.length - index} · {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'No date'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </header>

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
                {sectionOptions.length > 1 && (
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
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <main className="lg:col-span-8 space-y-3">
                    <header className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Answer Snapshot</h3>
                        <span className="text-[10px] text-gray-400 font-medium">{filteredQuestions.length} shown</span>
                    </header>

                    {filteredQuestions.map((q) => {
                        const isCorrect = q.userAnswer === q.correctAnswer;
                        const isSkipped = !q.userAnswer;
                        const dotColor = SECTION_DOTS[q.section] || 'bg-gray-400';
                        const isExpanded = !collapsedQuestions[q.id];
                        const isExplanationExpanded = !collapsedExplanations[q.id];

                        return (
                            <Card key={q.id} className={`border shadow-none overflow-hidden rounded-xl transition-all ${isExpanded ? 'border-primary/20 shadow-sm' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(q.id)}>
                                    {isCorrect ? (<CheckCircle2 size={15} className="text-emerald-500 shrink-0" />) : isSkipped ? (<MinusCircle size={15} className="text-amber-400 shrink-0" />) : (<XCircle size={15} className="text-red-500 shrink-0" />)}
                                    <span className="text-[11px] font-black text-gray-400 shrink-0 w-5 text-right">{q.orderNo}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                    <p className="flex-1 text-xs font-medium text-gray-800 truncate min-w-0">{q.text}</p>
                                    {!isExpanded && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {typeof q.elapsedSeconds === 'number' && q.elapsedSeconds > 0 && (
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">{formatDuration(q.elapsedSeconds)}</span>
                                            )}
                                            {!isCorrect && !isSkipped && (<span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">{q.userAnswer} → {q.correctAnswer}</span>)}
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
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black shrink-0 ${isCorrectChoice ? 'bg-emerald-600 text-white' : isUserPick && !isCorrectChoice ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</span>
                                                        <span className="flex-1">{opt}</span>
                                                        {isCorrectChoice && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                                                        {isUserPick && !isCorrectChoice && <XCircle size={13} className="text-red-500 shrink-0" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => toggleExplanation(q.id)}
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Info size={13} className="text-blue-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Explanation</p>
                                                        <p className="text-[10px] text-blue-500 font-medium">
                                                            {isExplanationExpanded ? 'Hide explanation' : 'Show explanation'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isExplanationExpanded ? (
                                                    <ChevronUp size={14} className="text-blue-400 shrink-0" />
                                                ) : (
                                                    <ChevronDown size={14} className="text-blue-400 shrink-0" />
                                                )}
                                            </button>
                                            {isExplanationExpanded && (
                                                <div className="border-t border-blue-100 px-3 py-2.5">
                                                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{q.rationalization}</p>
                                                </div>
                                            )}
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
                </main>

                <aside className="lg:col-span-4 lg:sticky lg:top-5 lg:self-start lg:h-fit">
                    <div className="flex flex-col gap-3">
                        <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Summary</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {showCorrectMetric && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <CheckCircle2 size={14} className="text-emerald-600" /> Correct
                                        </div>
                                        <span className="text-sm font-black text-emerald-700">{metrics.correct}</span>
                                    </div>
                                )}
                                {showIncorrectMetric && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <XCircle size={14} className="text-red-500" /> Incorrect
                                        </div>
                                        <span className="text-sm font-black text-red-600">{metrics.incorrect}</span>
                                    </div>
                                )}
                                {showSkippedMetric && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <MinusCircle size={14} className="text-amber-500" /> Skipped
                                        </div>
                                        <span className="text-sm font-black text-amber-700">{metrics.skipped}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                        <Clock3 size={14} className="text-gray-400" /> Attempt Time
                                    </div>
                                    <span className="text-sm font-black text-gray-700">{formatDuration(reviewMeta?.timeSpentSeconds, '--')}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="border-gray-200 shadow-sm rounded-xl p-4 space-y-4">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Answer Breakdown</h3>
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative flex h-44 w-44 items-center justify-center rounded-full" style={pieChartStyle}>
                                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Accuracy</span>
                                        <span className="text-2xl font-black text-gray-900">{metrics.accuracy.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="w-full space-y-2">
                                    {showCorrectMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-emerald-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Correct
                                            </div>
                                            <span className="font-black text-emerald-700">{metrics.correct} · {correctPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                    {showIncorrectMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-red-600">
                                                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Incorrect
                                            </div>
                                            <span className="font-black text-red-600">{metrics.incorrect} · {incorrectPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                    {showSkippedMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Skipped
                                            </div>
                                            <span className="font-black text-amber-700">{metrics.skipped} · {skippedPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Hardest Question</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                <p className="text-sm font-black text-gray-900">
                                    {hardestQuestion ? `Question ${hardestQuestion.orderNo}` : '--'}
                                </p>
                                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                                    {hardestQuestion ? hardestQuestion.text : 'No questions available for this attempt.'}
                                </p>
                                <p className="text-xs font-black text-gray-700">
                                    {hardestQuestion
                                        ? `You thought ${formatDuration(hardestQuestion.elapsedSeconds, '0s')} for this question.`
                                        : 'No timing data available.'}
                                </p>
                                <p className="text-[10px] font-medium text-gray-400">
                                    Based on incorrect answers first, then time spent.
                                </p>
                            </div>
                        </Card>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ExamReviewPage;
