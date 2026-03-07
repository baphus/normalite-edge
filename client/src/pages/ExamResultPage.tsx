import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Clock,
    TrendingUp,
    RotateCcw,
    FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

const SECTION_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
    'Professional Education': { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
    'General Education':      { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
    'Major Subject':          { dot: 'bg-orange-500', bg: 'bg-orange-50',  text: 'text-orange-700' },
};

interface AttemptOption {
    id: string;
    attemptNo?: number;
    submittedAt?: string | null;
    percentage?: number | null;
}

const ExamResultPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(searchParams.get('attemptId'));
    const [submittedAttempts, setSubmittedAttempts] = useState<AttemptOption[]>([]);
    const [result, setResult] = useState<any | null>(null);

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
                    throw new Error('No submitted result found for this exam yet.');
                }

                setSubmittedAttempts(submitted);

                const queryAttemptId = searchParams.get('attemptId');
                const selected = queryAttemptId && submitted.some((attempt) => attempt.id === queryAttemptId)
                    ? queryAttemptId
                    : submitted[0].id;

                setAttemptId(selected);
                setSearchParams({ attemptId: selected }, { replace: true });
            } catch (requestError: any) {
                const message = requestError?.response?.data?.message || requestError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadAttemptOptions();
    }, [id, setSearchParams]);

    useEffect(() => {
        const fetchResult = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);
                const resultResponse = await api.get(`/attempts/${attemptId}/result`);
                setResult(resultResponse.data.data);
            } catch (requestError: any) {
                const message = requestError?.response?.data?.message || requestError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
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

    const sections: any[] = useMemo(() => {
        const normalizedSections = (result?.sections || [])
            .filter((section: any) => section?.name)
            .map((section: any) => ({
                ...section,
                name: String(section.name || '').trim(),
            }));

        return normalizedSections.length <= 1 ? [] : normalizedSections;
    }, [result?.sections]);

    const questionDetails: any[] = useMemo(() => {
        const asNumber = (value: unknown) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const normalized = (result?.questionDetails || [])
            .slice()
            .sort((first: any, second: any) => asNumber(first.orderNo) - asNumber(second.orderNo))
            .map((question: any, index: number) => ({
                ...question,
                orderNo: index + 1,
                section: String(question.section || '').trim() || 'Main section',
            }));

        const effectiveSections = Array.from(new Set(normalized.map((question: any) => question.section).filter(Boolean)));
        return effectiveSections.length <= 1
            ? normalized.map((question: any) => ({ ...question, section: '' }))
            : normalized;
    }, [result?.questionDetails]);
    const safeTotal = results.totalQuestions > 0 ? results.totalQuestions : 1;
    const correctPercent = (results.correct / safeTotal) * 100;
    const incorrectPercent = (results.incorrect / safeTotal) * 100;
    const skippedPercent = (results.skipped / safeTotal) * 100;
    const showCorrectMetric = results.correct > 0;
    const showIncorrectMetric = results.incorrect > 0;
    const showSkippedMetric = results.skipped > 0;
    const pieChartStyle: React.CSSProperties = {
        background: `conic-gradient(
            #16a34a 0deg ${correctPercent * 3.6}deg,
            #ef4444 ${correctPercent * 3.6}deg ${(correctPercent + incorrectPercent) * 3.6}deg,
            #f59e0b ${(correctPercent + incorrectPercent) * 3.6}deg 360deg
        )`,
    };

    if (loading) {
        return <div className="p-6 text-sm text-gray-500">Loading exam result...</div>;
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
            {/* Header */}
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/exams')} className="h-8 w-8 rounded-lg shrink-0">
                        <ArrowLeft size={16} className="text-gray-500" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-gray-900 truncate">{result.exam?.title || 'Exam Result'}</h1>
                        <p className="text-xs text-gray-400 font-medium">
                            Submitted {results.date}
                            {selectedAttemptMeta?.attemptNo ? ` · Attempt ${selectedAttemptMeta.attemptNo}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {submittedAttempts.length > 1 && (
                        <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg border-gray-200 w-44">
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
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/exams/${id}/take`)}
                        className="h-8 px-3 text-xs font-semibold rounded-lg border-gray-200 gap-1.5"
                    >
                        <RotateCcw size={12} /> Retake
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigate(`/exams/${id}/review?attemptId=${attemptId}`)}
                        className="h-8 px-3 text-xs font-bold rounded-lg bg-primary text-white gap-1.5"
                    >
                        <FileSearch size={12} /> Review Answers
                    </Button>
                </div>
            </header>

            {/* Score Hero */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="text-5xl font-black leading-none text-gray-900">
                        {results.score}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">{results.correct} correct out of {results.totalQuestions} questions</p>
                    </div>
                </div>
                <div className="sm:ml-auto flex flex-wrap gap-4 text-xs font-semibold text-gray-600">
                    {showCorrectMetric && (
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600" /> {results.correct} Correct</span>
                    )}
                    {showIncorrectMetric && (
                        <span className="flex items-center gap-1.5"><XCircle size={13} className="text-red-500" /> {results.incorrect} Incorrect</span>
                    )}
                    {showSkippedMetric && (
                        <span className="flex items-center gap-1.5"><MinusCircle size={13} className="text-amber-500" /> {results.skipped} Skipped</span>
                    )}
                    <span className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" /> {results.timeSpent}</span>
                    <span className="flex items-center gap-1.5"><TrendingUp size={13} className="text-gray-400" /> {results.avgTime}/q</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Section Breakdown + Questions */}
                <div className="lg:col-span-8 flex min-h-0 flex-col gap-5">

                    {/* Section Breakdown */}
                    {sections.length > 0 && (
                        <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Section Breakdown</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {sections.map((sec, idx) => {
                                    const colors = SECTION_COLORS[sec.name] || { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-700' };
                                    const pct = Number(sec.score || 0);
                                    return (
                                        <div key={idx} className="px-4 py-3 flex items-center gap-4">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-gray-800 truncate pr-3">{sec.name}</span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] font-semibold text-gray-400">{sec.correct}/{sec.total}</span>
                                                        <span className="text-xs font-black text-gray-700">{pct.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <Progress value={pct} className="h-1.5" />
                                            </div>
                                            {sec.incorrect > 0 && (
                                                <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">{sec.incorrect} wrong</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Question Snapshot */}
                    <section className="space-y-3">
                        <header className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Question Snapshot</h3>
                            <span className="text-[10px] text-gray-400 font-medium">{questionDetails.length} questions</span>
                        </header>

                        {questionDetails.length === 0 ? (
                            <div className="p-5 text-xs text-gray-400 font-medium text-center">No question data available.</div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {questionDetails.map((q) => {
                                    const state = q.isCorrect ? 'correct' : q.userChoice ? 'incorrect' : 'skipped';
                                    const stateStyle = {
                                        correct:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Correct' },
                                        incorrect: { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-600 border-red-100',             label: 'Wrong' },
                                        skipped:   { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-100',       label: 'Skipped' },
                                    }[state];
                                    return (
                                        <Card key={q.id} className="border-gray-200 shadow-none rounded-lg overflow-hidden">
                                            <div className="flex items-start gap-3 px-4 py-3">
                                                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${stateStyle.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{q.questionText}</p>
                                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${stateStyle.badge}`}>{stateStyle.label}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        Q{q.orderNo}
                                                        {q.section && <> · {q.section}</>}
                                                        {!q.isCorrect && q.userChoice && (
                                                            <> · You chose <span className="font-bold text-red-500">{q.userChoice}</span> · Correct: <span className="font-bold text-emerald-600">{q.correctChoice}</span></>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right: Stat Cards */}
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
                                        <span className="text-sm font-black text-emerald-700">{results.correct}</span>
                                    </div>
                                )}
                                {showIncorrectMetric && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <XCircle size={14} className="text-red-500" /> Incorrect
                                        </div>
                                        <span className="text-sm font-black text-red-600">{results.incorrect}</span>
                                    </div>
                                )}
                                {showSkippedMetric && (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <MinusCircle size={14} className="text-amber-500" /> Skipped
                                        </div>
                                        <span className="text-sm font-black text-amber-600">{results.skipped}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                        <Clock size={14} className="text-gray-400" /> Time Spent
                                    </div>
                                    <span className="text-sm font-black text-gray-700 font-mono">{results.timeSpent}</span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                        <TrendingUp size={14} className="text-gray-400" /> Avg / Question
                                    </div>
                                    <span className="text-sm font-black text-gray-700">{results.avgTime}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="border-gray-200 shadow-sm rounded-xl p-4 space-y-4">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Answer Breakdown</h3>
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative flex h-44 w-44 items-center justify-center rounded-full" style={pieChartStyle}>
                                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Score</span>
                                        <span className="text-2xl font-black text-gray-900">{results.score}</span>
                                    </div>
                                </div>
                                <div className="w-full space-y-2">
                                    {showCorrectMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-emerald-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Correct
                                            </div>
                                            <span className="font-black text-emerald-700">{results.correct} · {correctPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                    {showIncorrectMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-red-600">
                                                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Incorrect
                                            </div>
                                            <span className="font-black text-red-600">{results.incorrect} · {incorrectPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                    {showSkippedMetric && (
                                        <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Skipped
                                            </div>
                                            <span className="font-black text-amber-700">{results.skipped} · {skippedPercent.toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ExamResultPage;
