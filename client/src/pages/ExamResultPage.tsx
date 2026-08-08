import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Clock,
    TrendingUp,
    RotateCcw,
    Info,
    ChevronDown,
    ChevronUp,
    HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';
import { useStreakContext } from '@/contexts/StreakContext';
import ConfettiCelebration from '@/components/ConfettiCelebration';

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

interface AttemptOption {
    id: string;
    attemptNo?: number;
    submittedAt?: string | null;
    percentage?: number | null;
}

interface AttemptListItem extends AttemptOption {
    status?: string;
}

interface ResultStats {
    totalQuestions: number;
    correct: number;
    incorrect: number;
    skipped: number;
    answered: number;
    accuracy: number;
}

interface ResultSection {
    sectionId?: string | null;
    name: string;
    total: number;
    correct: number;
    answered: number;
    incorrect: number;
    skipped: number;
    score: number;
}

interface ResultQuestionDetail {
    id: string;
    orderNo: number;
    section: string;
    questionText: string;
    imageUrl?: string | null;
    choices?: string[];
    userChoice: string | null;
    correctChoice: string | null;
    isCorrect: boolean;
    rationalization?: string | null;
}

interface ExamResultPayload {
    id: string;
    examId: string;
    attemptNo?: number;
    submittedAt?: string | null;
    timeSpentSeconds?: number | null;
    percentage?: number | null;
    exam?: {
        id?: string;
        title?: string;
    };
    stats: ResultStats;
    sections?: ResultSection[];
    questionDetails?: ResultQuestionDetail[];
}

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

interface ReviewQuestionApi {
    id: string;
    orderNo?: number | string | null;
    questionText?: string | null;
    imageUrl?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    section?: string | { title?: string | null } | null;
    rationalization?: string | null;
}

interface ReviewPayload {
    answers?: Record<string, string>;
    answerMeta?: Record<string, { elapsedSeconds?: number | null }>;
    timeSpentSeconds?: number | null;
    exam?: {
        questions?: ReviewQuestionApi[];
    };
}

interface ApiErrorLike {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

interface SectionBreakdownCard {
    name: string;
    total: number;
    correct: number;
    incorrect: number;
    skipped: number;
    elapsedSeconds: number;
    accuracy: number;
}

const ExamResultPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { refetchStreak } = useStreakContext();
    // Confetti should only fire when arriving straight from a submission,
    // not when revisiting a finished exam's result (ExamsPage, dropdown switches, etc.).
    const justSubmittedRef = useRef(
        Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted)
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(searchParams.get('attemptId'));
    const [submittedAttempts, setSubmittedAttempts] = useState<AttemptOption[]>([]);
    const [result, setResult] = useState<ExamResultPayload | null>(null);
    const [reviewQuestions, setReviewQuestions] = useState<QuestionReview[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [previousAttempt, setPreviousAttempt] = useState<{
        attemptNo: number;
        score: number;
        percentage: number;
        submittedAt: string | null;
    } | null>(null);
    const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect'>('all');
    const [filterSection, setFilterSection] = useState<string>('all');
    const [collapsedQuestions, setCollapsedQuestions] = useState<Record<string, boolean>>({});
    const [collapsedExplanations, setCollapsedExplanations] = useState<Record<string, boolean>>({});

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

                const attempts = (attemptsResponse.data.data || []) as AttemptListItem[];
                const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED') as AttemptOption[];

                if (submitted.length === 0) {
                    throw new Error('No submitted result found for this exam yet.');
                }

                setSubmittedAttempts(submitted);

                const queryAttemptId = searchParams.get('attemptId');
                const selected = queryAttemptId && submitted.some((attempt) => attempt.id === queryAttemptId)
                    ? queryAttemptId
                    : submitted[0].id;

                setAttemptId(selected);
                setSearchParams({ attemptId: selected }, { replace: true });
            } catch (requestError: unknown) {
                const apiError = requestError as ApiErrorLike;
                const message = apiError?.response?.data?.message || apiError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadAttemptOptions();
    }, [id, searchParams, setSearchParams]);

    useEffect(() => {
        if (id) {
            api.get(`/attempts/previous?examId=${id}&currentAttemptId=${attemptId || ''}`)
                .then((res) => setPreviousAttempt(res.data.data))
                .catch(() => {});
        }
    }, [id, attemptId]);

    useEffect(() => {
        api.get('/settings/system')
            .then((res) => setAllowMultipleAttempts(Boolean(res.data?.data?.allowMultipleAttempts)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchResult = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);
                const resultResponse = await api.get(`/attempts/${attemptId}/result`);
                setResult(resultResponse.data.data);
                if (justSubmittedRef.current) {
                    justSubmittedRef.current = false;
                    setShowConfetti(true);
                    refetchStreak();
                }
            } catch (requestError: unknown) {
                const apiError = requestError as ApiErrorLike;
                const message = apiError?.response?.data?.message || apiError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [attemptId]);

    // Review data is supplementary to the result payload (it adds per-question
    // elapsed timing). A failure here must never take down the whole page.
    useEffect(() => {
        const fetchReview = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);

                const reviewResponse = await api.get(`/attempts/${attemptId}`);
                const review = reviewResponse.data.data as ReviewPayload;
                const answerMap = (review.answers || {}) as Record<string, string>;
                const answerMeta = (review.answerMeta || {}) as Record<string, { elapsedSeconds?: number | null }>;

                setCollapsedQuestions({});
                setCollapsedExplanations({});

                const sortedQuestions = (review.exam?.questions || [])
                    .slice()
                    .sort((first, second) => Number(first.orderNo ?? 0) - Number(second.orderNo ?? 0));

                const parsedQuestions: QuestionReview[] = sortedQuestions.map((question, index) => {
                    const rawSection = question.section;
                    const sectionName = typeof rawSection === 'string'
                        ? rawSection
                        : rawSection?.title || '';
                    const metadata = answerMeta[question.id] || {};

                    return {
                        id: question.id,
                        orderNo: index + 1,
                        text: question.questionText || '',
                        imageUrl: question.imageUrl || null,
                        options: [question.choiceA, question.choiceB, question.choiceC, question.choiceD].map((choice) => String(choice || '')),
                        userAnswer: answerMap[question.id] || null,
                        correctAnswer: question.correctChoice || '',
                        section: sectionName.trim() || 'Main section',
                        rationalization: question.rationalization || 'No explanation provided.',
                        elapsedSeconds: typeof metadata.elapsedSeconds === 'number' ? metadata.elapsedSeconds : null,
                    };
                });

                setReviewQuestions(parsedQuestions);
            } catch {
                // Review data is best-effort; keep whatever the result payload offers.
            } finally {
                setLoading(false);
            }
        };

        fetchReview();
    }, [attemptId]);

    const selectedAttemptMeta = useMemo(
        () => submittedAttempts.find((attempt) => attempt.id === attemptId) || null,
        [submittedAttempts, attemptId]
    );

    const handleAttemptChange = (nextAttemptId: string) => {
        setAttemptId(nextAttemptId);
        setSearchParams({ attemptId: nextAttemptId }, { replace: true });
    };

    const results = useMemo(() => {
        if (!result) {
            return {
                totalQuestions: 0,
                correct: 0,
                incorrect: 0,
                skipped: 0,
                score: '0%',
                date: 'N/A',
                timeSpent: '00:00:00',
                avgTime: '0s',
            };
        }

        const timeSpentSeconds = result.timeSpentSeconds || 0;
        const h = Math.floor(timeSpentSeconds / 3600);
        const m = Math.floor((timeSpentSeconds % 3600) / 60);
        const s = Math.floor(timeSpentSeconds % 60);
        const avgPerQuestion = result.stats.totalQuestions > 0
            ? Math.round(timeSpentSeconds / result.stats.totalQuestions)
            : 0;

        return {
            totalQuestions: result.stats.totalQuestions,
            correct: result.stats.correct,
            incorrect: result.stats.incorrect,
            skipped: result.stats.skipped,
            score: `${Number(result.percentage || result.stats.accuracy || 0).toFixed(2)}%`,
            date: result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A',
            timeSpent: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
            avgTime: `${avgPerQuestion}s`,
        };
    }, [result]);

    // Normalized question details from the result payload. Used as a fallback
    // for the question review when the dedicated review payload is unavailable.
    const questionDetails = useMemo<ResultQuestionDetail[]>(() => {
        const asNumber = (value: unknown) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const normalized = (result?.questionDetails || [])
            .slice()
            .sort((first, second) => asNumber(first.orderNo) - asNumber(second.orderNo))
            .map((question, index) => ({
                ...question,
                orderNo: index + 1,
                section: String(question.section || '').trim() || 'Main section',
            }));

        const effectiveSections = Array.from(new Set(normalized.map((question) => question.section).filter(Boolean)));
        return effectiveSections.length <= 1
            ? normalized.map((question) => ({ ...question, section: '' }))
            : normalized;
    }, [result?.questionDetails]);

    const fallbackReviewQuestions = useMemo<QuestionReview[]>(() => {
        return questionDetails.map((question) => ({
            id: question.id,
            orderNo: question.orderNo,
            text: question.questionText || '',
            imageUrl: question.imageUrl || null,
            options: (question.choices || []).map((choice) => String(choice || '')),
            userAnswer: question.userChoice,
            correctAnswer: question.correctChoice || '',
            section: question.section || 'Main section',
            rationalization: question.rationalization || 'No explanation provided.',
            elapsedSeconds: null,
        }));
    }, [questionDetails]);

    const questions = reviewQuestions.length > 0 ? reviewQuestions : fallbackReviewQuestions;

    const sectionOptions = useMemo(() => {
        return Array.from(new Set(questions.map((question) => question.section).filter(Boolean)));
    }, [questions]);

    const reviewMetrics = useMemo(() => {
        const total = questions.length;
        const correct = questions.filter((question) => question.userAnswer === question.correctAnswer).length;
        const answered = questions.filter((question) => Boolean(question.userAnswer)).length;
        const incorrect = answered - correct;
        const skipped = Math.max(total - answered, 0);

        return { total, correct, incorrect, skipped };
    }, [questions]);

    const sectionReviewGroups = useMemo(() => {
        const groups = new Map<string, {
            name: string;
            total: number;
            correct: number;
            incorrect: number;
            skipped: number;
            elapsedSeconds: number;
        }>();

        for (const question of questions) {
            const sectionName = question.section || 'Main section';
            if (!groups.has(sectionName)) {
                groups.set(sectionName, {
                    name: sectionName,
                    total: 0,
                    correct: 0,
                    incorrect: 0,
                    skipped: 0,
                    elapsedSeconds: 0,
                });
            }

            const group = groups.get(sectionName)!;
            const isCorrect = question.userAnswer === question.correctAnswer;
            const isSkipped = !question.userAnswer;
            group.total += 1;
            group.correct += isCorrect ? 1 : 0;
            group.incorrect += !isCorrect && !isSkipped ? 1 : 0;
            group.skipped += isSkipped ? 1 : 0;
            group.elapsedSeconds += Math.max(0, Number(question.elapsedSeconds || 0));
        }

        return Array.from(groups.values());
    }, [questions]);

    const sectionBreakdown = useMemo<SectionBreakdownCard[]>(() => {
        if (questions.length > 0) {
            return sectionReviewGroups.map((group) => ({
                name: group.name,
                total: group.total,
                correct: group.correct,
                incorrect: group.incorrect,
                skipped: group.skipped,
                elapsedSeconds: group.elapsedSeconds,
                accuracy: group.total > 0 ? (group.correct / group.total) * 100 : 0,
            }));
        }

        return (result?.sections || [])
            .filter((section) => section?.name)
            .map((section) => ({
                name: String(section.name || '').trim(),
                total: section.total,
                correct: section.correct,
                incorrect: section.incorrect,
                skipped: section.skipped,
                elapsedSeconds: 0,
                accuracy: Number(section.score || 0),
            }));
    }, [questions, sectionReviewGroups, result?.sections]);

    const filteredQuestions = questions.filter((question) => {
        const matchesStatus = filterStatus === 'all'
            || (filterStatus === 'correct' && question.userAnswer === question.correctAnswer)
            || (filterStatus === 'incorrect' && Boolean(question.userAnswer) && question.userAnswer !== question.correctAnswer);
        const matchesSection = filterSection === 'all' || question.section === filterSection;
        return matchesStatus && matchesSection;
    });

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

    const showCorrectMetric = results.correct > 0;
    const showIncorrectMetric = results.incorrect > 0;
    const showSkippedMetric = results.skipped > 0;

    if (loading) {
        return (
            <div className="flex flex-col gap-5 pb-10 max-w-6xl" data-testid="exam-result-skeleton">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-3 w-56" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-44 rounded-lg" />
                </div>
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="space-y-4 lg:col-span-8">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                    <div className="space-y-3 lg:col-span-4">
                        <Skeleton className="h-56 w-full rounded-xl" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-red-600 font-semibold">{error || 'Unable to load result.'}</p>
                <Button variant="outline" onClick={() => navigate('/exams')}>Back to Exams</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 pb-10 max-w-6xl">
            {previousAttempt && allowMultipleAttempts && (
                <Card className="border-slate-200 shadow-sm rounded-xl p-4 mb-3">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-2">Previous Attempt</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>Attempt {previousAttempt.attemptNo}</span>
                        <span className="font-semibold">{Number(previousAttempt.percentage || 0).toFixed(1)}%</span>
                        <span>{previousAttempt.submittedAt ? new Date(previousAttempt.submittedAt).toLocaleDateString() : '—'}</span>
                    </div>
                </Card>
            )}

            {/* Header */}
            <header data-guide="exam-result-header" className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/exams')} className="h-8 w-8 rounded-lg shrink-0">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-slate-900 truncate">{result.exam?.title || 'Exam Result'}</h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Submitted {results.date}
                            {selectedAttemptMeta?.attemptNo ? ` · Attempt ${selectedAttemptMeta.attemptNo}` : ''}
                        </p>
                    </div>
                </div>
                <div data-guide="exam-result-actions" className="flex items-center gap-2 shrink-0">
                    {submittedAttempts.length > 1 && (
                        <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                            <SelectTrigger data-guide="exam-result-attempt-selector" className="h-8 text-xs font-semibold rounded-lg border-slate-200 w-44">
                                <SelectValue placeholder="Select attempt" />
                            </SelectTrigger>
                            <SelectContent>
                                {submittedAttempts.map((attempt, index) => (
                                    <SelectItem key={attempt.id} value={attempt.id} className="text-xs">
                                        Attempt {attempt.attemptNo || submittedAttempts.length - index} · {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '—'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {allowMultipleAttempts && (() => {
                        const maxAttempts = 3; // matches server default
                        const attemptsLeft = maxAttempts - submittedAttempts.length;
                        return (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={attemptsLeft <= 0}
                                onClick={() => navigate(`/exams/${id}/take`)}
                                className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 gap-1.5"
                            >
                                <RotateCcw size={12} /> Retake {submittedAttempts.length > 0 && `(${submittedAttempts.length}/${maxAttempts})`}
                            </Button>
                        );
                    })()}
                </div>
            </header>

            {/* Score Hero */}
            <div data-guide="exam-result-score-hero" className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="text-5xl font-semibold leading-none text-slate-900">
                        {results.score}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">{results.correct} correct out of {results.totalQuestions} questions</p>
                    </div>
                </div>
                <div className="sm:ml-auto flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                    {showCorrectMetric && (
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600" /> {results.correct} Correct</span>
                    )}
                    {showIncorrectMetric && (
                        <span className="flex items-center gap-1.5"><XCircle size={13} className="text-red-500" /> {results.incorrect} Incorrect</span>
                    )}
                    {showSkippedMetric && (
                        <span className="flex items-center gap-1.5"><MinusCircle size={13} className="text-amber-500" /> {results.skipped} Skipped</span>
                    )}
                    <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> {results.timeSpent}</span>
                    <span className="flex items-center gap-1.5"><TrendingUp size={13} className="text-slate-400" /> {results.avgTime}/q</span>
                </div>
            </div>

            {/* Section Breakdown */}
            {sectionBreakdown.length > 1 && (
                <Card data-guide="exam-result-section-breakdown" className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Section Breakdown</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                        {sectionBreakdown.map((section) => {
                            const dotColor = SECTION_DOTS[section.name] || 'bg-slate-400';
                            return (
                                <div key={section.name} className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-slate-800">{section.name}</p>
                                                <p className="text-xs font-medium text-slate-400">{formatDuration(section.elapsedSeconds, 'No timing data')}</p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold text-slate-700">{section.accuracy.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={section.accuracy} className="h-1.5 mt-2" />
                                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                                        <div className="rounded-md bg-emerald-50 px-2 py-1">
                                            <p className="text-xs font-semibold text-emerald-700">{section.correct}</p>
                                            <p className="text-[11px] font-semibold uppercase text-emerald-600">Correct</p>
                                        </div>
                                        <div className="rounded-md bg-red-50 px-2 py-1">
                                            <p className="text-xs font-semibold text-red-600">{section.incorrect}</p>
                                            <p className="text-[11px] font-semibold uppercase text-red-500">Wrong</p>
                                        </div>
                                        <div className="rounded-md bg-amber-50 px-2 py-1">
                                            <p className="text-xs font-semibold text-amber-700">{section.skipped}</p>
                                            <p className="text-[11px] font-semibold uppercase text-amber-600">Skipped</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Question Review */}
            <section data-guide="exam-result-question-review" className="space-y-3">
                <header className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Question Review</h3>
                    <span className="text-xs text-slate-400 font-medium">{filteredQuestions.length} shown</span>
                </header>

                <div data-guide="exam-review-filters" className="flex items-center gap-2 flex-wrap">
                    {(['all', 'correct', 'incorrect'] as const).map((status) => {
                        const labels = { all: 'All', correct: 'Correct', incorrect: 'Incorrect' };
                        const counts = { all: questions.length, correct: reviewMetrics.correct, incorrect: reviewMetrics.incorrect };
                        const active = filterStatus === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`h-7 px-3 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${active ? (status === 'incorrect' ? 'bg-red-500 text-white' : status === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {labels[status]}
                                <span className={`text-xs font-semibold px-1 rounded ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-400'}`}>{counts[status]}</span>
                            </button>
                        );
                    })}
                    {sectionOptions.length > 1 && (
                        <div className="ml-auto">
                            <Select value={filterSection} onValueChange={setFilterSection}>
                                <SelectTrigger className="h-7 text-xs font-semibold rounded-md border-slate-200 w-40">
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

                <div data-guide="exam-review-list" className="flex flex-col gap-3">
                    {filteredQuestions.map((q, questionIndex) => {
                        const isCorrect = q.userAnswer === q.correctAnswer;
                        const isSkipped = !q.userAnswer;
                        const dotColor = SECTION_DOTS[q.section] || 'bg-slate-400';
                        const isExpanded = !collapsedQuestions[q.id];
                        const isExplanationExpanded = !collapsedExplanations[q.id];
                        const isFirstInSection = questionIndex === 0 || filteredQuestions[questionIndex - 1]?.section !== q.section;
                        const sectionGroup = sectionReviewGroups.find((group) => group.name === q.section);
                        const sectionAccuracy = sectionGroup && sectionGroup.total > 0
                            ? (sectionGroup.correct / sectionGroup.total) * 100
                            : 0;

                        return (
                            <React.Fragment key={q.id}>
                            {isFirstInSection && (
                                <div className="mt-4 first:mt-0 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            Section {sectionReviewGroups.findIndex((group) => group.name === q.section) + 1}: {q.section}
                                        </p>
                                        <p className="text-xs font-medium text-slate-400">{sectionGroup?.total || 0} questions</p>
                                    </div>
                                    <span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                                        {sectionGroup?.correct || 0}/{sectionGroup?.total || 0} · {sectionAccuracy.toFixed(0)}%
                                    </span>
                                </div>
                            )}
                            <Card key={q.id} className={`border shadow-none overflow-hidden rounded-xl transition-all ${isExpanded ? 'border-primary/20 shadow-sm' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(q.id)}>
                                    {isCorrect ? (<CheckCircle2 size={15} className="text-emerald-500 shrink-0" />) : isSkipped ? (<MinusCircle size={15} className="text-amber-400 shrink-0" />) : (<XCircle size={15} className="text-red-500 shrink-0" />)}
                                    <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-5 text-right">{q.orderNo}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                    <p className="flex-1 text-xs font-medium text-slate-800 truncate min-w-0">{q.text}</p>
                                    {!isExpanded && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {typeof q.elapsedSeconds === 'number' && q.elapsedSeconds > 0 && (
                                                <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">{formatDuration(q.elapsedSeconds)}</span>
                                            )}
                                            {!isCorrect && !isSkipped && (<span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">{q.userAnswer} → {q.correctAnswer}</span>)}
                                            {isSkipped && (<span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Skipped</span>)}
                                        </div>
                                    )}
                                    {isExpanded ? (<ChevronUp size={14} className="text-slate-300 shrink-0" />) : (<ChevronDown size={14} className="text-slate-300 shrink-0" />)}
                                </div>
                                {isExpanded && (
                                    <CardContent className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                        <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-3">{q.text}</p>
                                        {q.imageUrl && (
                                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                                <img src={q.imageUrl} alt="Question attachment" className="max-h-52 w-auto max-w-full rounded object-contain" />
                                            </div>
                                        )}
                                        <div className="grid gap-1.5">
                                            {q.options.map((opt, idx) => {
                                                const label = String.fromCharCode(65 + idx);
                                                const isUserPick = q.userAnswer === label;
                                                const isCorrectChoice = q.correctAnswer === label;
                                                let style = 'border-slate-200 bg-white text-slate-600';
                                                if (isCorrectChoice) style = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                                                else if (isUserPick && !isCorrect) style = 'border-red-300 bg-red-50 text-red-700';
                                                return (
                                                    <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium ${style}`}>
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-semibold shrink-0 ${isCorrectChoice ? 'bg-emerald-600 text-white' : isUserPick && !isCorrectChoice ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{label}</span>
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
                                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Explanation</p>
                                                        <p className="text-xs text-blue-500 font-medium">
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
                                                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{q.rationalization}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                            </React.Fragment>
                        );
                    })}

                    {filteredQuestions.length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                                <HelpCircle size={22} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">No questions found</p>
                                <p className="text-xs text-slate-400 font-medium">Adjust your filters to see results.</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <ConfettiCelebration trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        </div>
    );
};

export default ExamResultPage;
