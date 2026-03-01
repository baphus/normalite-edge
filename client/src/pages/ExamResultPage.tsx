import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Clock,
    TrendingUp,
    ChevronRight,
    Search,
    BookOpen,
    Brain,
    School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';

const SECTION_CONFIG: Record<string, { color: string, icon: React.ElementType, bgColor: string, borderColor: string }> = {
    'Professional Education': {
        color: 'text-purple-600',
        icon: School,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100'
    },
    'General Education': {
        color: 'text-blue-600',
        icon: BookOpen,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100'
    },
    'Major Subject': {
        color: 'text-orange-600',
        icon: Brain,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-100'
    }
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

    const sections: any[] = result?.sections || [];
    const questionDetails: any[] = result?.questionDetails || [];
    const safeTotal = results.totalQuestions > 0 ? results.totalQuestions : 1;

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
        <div className="flex flex-col gap-6 font-lexend pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/exams')}
                        className="rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeft size={24} className="text-gray-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Result</h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Completed on {results.date}
                            {selectedAttemptMeta?.attemptNo ? ` • Attempt ${selectedAttemptMeta.attemptNo}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                        <SelectTrigger className="w-55 rounded-xl border-gray-200 font-bold">
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
                    <Button variant="outline" className="font-bold border-gray-200 rounded-xl gap-2">
                        <Download size={18} /> Download PDF
                    </Button>
                    <Button
                        onClick={() => navigate(`/exams/${id}/take`)}
                        className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                    >
                        Retake Exam
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side - Performance Breakdown */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-primary" />
                            Sub-Category Performance
                        </h3>
                    </div>

                    <div className="grid gap-4">
                        {sections.map((sec, idx) => {
                            const config = SECTION_CONFIG[sec.name] || SECTION_CONFIG['General Education'];
                            const Icon = config.icon;
                            return (
                                <Card key={idx} className="border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow rounded-2xl">
                                    <div className="p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-2xl ${config.bgColor} flex items-center justify-center ${config.color} shrink-0`}>
                                                    <Icon size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{sec.name}</h4>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {sec.total} Questions &bull; <span className="text-red-500">{sec.incorrect} mistakes</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-gray-900">{sec.score}%</span>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase">{sec.correct}/{sec.total}</div>
                                                </div>
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div
                                                        className="bg-green-500 h-full rounded-full"
                                                        style={{ width: `${sec.score}%` }}
                                                    />
                                                </div>
                                                <Button size="icon" variant="ghost" className="rounded-full text-gray-300" onClick={() => navigate(`/exams/${id}/review?attemptId=${attemptId}`)}>
                                                    <ChevronRight size={20} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        {sections.length === 0 && (
                            <Card className="border-gray-100 shadow-sm rounded-2xl">
                                <div className="p-8 text-center text-sm text-gray-500 font-medium">
                                    No section performance data is available yet.
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="mt-2 space-y-3">
                        <h3 className="text-lg font-black text-gray-900">Question Review Snapshot</h3>
                        {questionDetails.length === 0 ? (
                            <Card className="border-gray-100 shadow-sm rounded-2xl">
                                <div className="p-6 text-sm text-gray-500 font-medium">
                                    No question-level review data available.
                                </div>
                            </Card>
                        ) : (
                            questionDetails.map((question) => (
                                <Card key={question.id} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                                    <div className="p-5 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Question #{question.orderNo} • {question.section || 'General Section'}
                                            </p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${question.isCorrect ? 'bg-green-50 text-green-700' : question.userChoice ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {question.isCorrect ? 'Correct' : question.userChoice ? 'Incorrect' : 'Skipped'}
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold text-gray-900">{question.questionText}</p>

                                        {question.imageUrl && (
                                            <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
                                                <img
                                                    src={question.imageUrl}
                                                    alt="Question attachment"
                                                    className="max-h-80 w-auto max-w-full rounded-lg border border-gray-100 object-contain bg-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>

                    <div className="mt-4">
                        <Button
                            onClick={() => navigate(`/exams/${id}/review?attemptId=${attemptId}`)}
                            className="w-full h-14 bg-primary hover:bg-primary/95 text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Search size={20} />
                            See Detailed Question Analysis
                        </Button>
                    </div>
                </div>

                {/* Right Side - Summary Stats */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <Card className="border-gray-100 shadow-sm rounded-3xl p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />

                        <h3 className="font-black text-gray-900 mb-6 relative">Overall Performance</h3>

                        <div className="flex flex-col items-center mb-8">
                            <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                                {/* SVG Pie Chart Placeholder */}
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="transparent" stroke="#F59E0B" strokeWidth="4" />
                                    <circle cx="18" cy="18" r="16" fill="transparent" stroke="#EF4444" strokeWidth="4" strokeDasharray={`${((results.correct + results.incorrect) / safeTotal) * 100} 100`} />
                                    <circle cx="18" cy="18" r="16" fill="transparent" stroke="#16A34A" strokeWidth="4" strokeDasharray={`${(results.correct / safeTotal) * 100} 100`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-gray-900">{results.score}</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accuracy</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> Correct</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Incorrect</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Skipped</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-green-50/50 border border-green-100">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={18} className="text-green-600" />
                                    <span className="text-sm font-bold text-gray-700">Correct Answers</span>
                                </div>
                                <span className="text-lg font-black text-green-700">{results.correct}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100">
                                <div className="flex items-center gap-3">
                                    <XCircle size={18} className="text-red-600" />
                                    <span className="text-sm font-bold text-gray-700">Incorrect Answers</span>
                                </div>
                                <span className="text-lg font-black text-red-700">{results.incorrect}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                                <div className="flex items-center gap-3">
                                    <MinusCircle size={18} className="text-amber-600" />
                                    <span className="text-sm font-bold text-gray-700">Skipped Questions</span>
                                </div>
                                <span className="text-lg font-black text-amber-700">{results.skipped}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Time Elapsed</p>
                                <div className="flex items-center gap-2 text-gray-900 font-black">
                                    <Clock size={16} className="text-primary" />
                                    {results.timeSpent}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Avg. Time/Q</p>
                                <div className="flex items-center gap-2 text-gray-900 font-black">
                                    <TrendingUp size={16} className="text-primary" />
                                    {results.avgTime}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10 shadow-none rounded-3xl p-6">
                        <div className="flex gap-4">
                            <div className="shrink-0">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-gray-900">Great job!</h4>
                                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                        Complete more exams to generate personalized performance insights.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ExamResultPage;
