import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpDown,
    BarChart3,
    Calendar,
    Clock3,
    Download,
    FileQuestion,
    Search,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface ExamDetails {
    id: string;
    title?: string;
    questionCount?: number;
    totalItems?: number;
    duration?: number;
    timeLimit?: number;
    status?: string;
    creator?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
}

interface AttemptItem {
    id: string;
    status: string;
    score?: number | null;
    percentage?: number | null;
    attemptNo?: number;
    submittedAt?: string | null;
    startedAt?: string;
    user?: {
        id: string;
        name?: string;
        email?: string;
        programTrack?: string | null;
        profilePicture?: string | null;
    };
}

interface SubmissionAnalytics {
    examStatus: {
        status: string;
        canStudentsSubmit: boolean;
        message: string;
        scheduleEnd?: string | null;
        closeOnDeadline?: boolean;
    };
    submissionStats: {
        submittedCount: number;
        averageCompletionSeconds: number;
        slowestQuestion: {
            questionId: string;
            orderNo: number;
            questionText: string;
            averageAnswerSeconds?: number | null;
            section?: string | null;
        } | null;
    };
    questionStats: Array<{
        questionId: string;
        orderNo: number;
        section?: string | null;
        questionText: string;
        rightCount: number;
        wrongCount: number;
        unansweredCount: number;
        answeredCount: number;
        averageAnswerSeconds?: number | null;
    }>;
}

type QuestionSortMode = 'hardest' | 'slowest' | 'original';

const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return 'N/A';
    return dateValue.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatPercent = (value?: number | null) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0.00%';
    return `${numeric.toFixed(2)}%`;
};

const formatDuration = (seconds?: number | null) => {
    const numeric = Math.max(0, Math.round(Number(seconds || 0)));
    if (!numeric) return 'N/A';

    const hours = Math.floor(numeric / 3600);
    const minutes = Math.floor((numeric % 3600) / 60);
    const remainingSeconds = numeric % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
};

const truncateQuestion = (value?: string, maxLength = 110) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Question unavailable';
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const escapeCsvValue = (value: string | number | null | undefined) => {
    const normalized = String(value ?? '');
    if (!/[",\n]/.test(normalized)) return normalized;
    return `"${normalized.replace(/"/g, '""')}"`;
};

const getAvatarFallback = (name?: string) => {
    const cleaned = (name || '').trim();
    if (!cleaned) return 'U';
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getAvatarUrl = (name?: string, explicit?: string | null) => {
    if (explicit) return explicit;
    const encoded = encodeURIComponent(name || 'User');
    return `https://ui-avatars.com/api/?name=${encoded}&background=random&rounded=true`;
};

const ManageExamSubmissionsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [submissionAnalytics, setSubmissionAnalytics] = useState<SubmissionAnalytics | null>(null);
    const [search, setSearch] = useState('');
    const [questionSortMode, setQuestionSortMode] = useState<QuestionSortMode>('hardest');

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError('Missing exam ID.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const [examResponse, attemptsResponse, analyticsResponse] = await Promise.all([
                    api.get(`/exams/${id}`),
                    api.get('/attempts', { params: { examId: id, page: 1, limit: 500 } }),
                    api.get(`/exams/${id}/submission-analytics`),
                ]);

                setExam((examResponse.data?.data || null) as ExamDetails | null);
                setAttempts((attemptsResponse.data?.data || []) as AttemptItem[]);
                setSubmissionAnalytics((analyticsResponse.data?.data || null) as SubmissionAnalytics | null);
            } catch (loadErr) {
                console.error('Failed to load exam submissions page', loadErr);
                setError('Unable to load submissions right now.');
                setExam(null);
                setAttempts([]);
                setSubmissionAnalytics(null);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const submittedAttempts = useMemo(() => {
        return attempts
            .filter((attempt) => attempt.status === 'SUBMITTED')
            .slice()
            .sort((first, second) => {
                const left = new Date(first.submittedAt || first.startedAt || 0).getTime();
                const right = new Date(second.submittedAt || second.startedAt || 0).getTime();
                return right - left;
            });
    }, [attempts]);

    const allAttemptsSorted = useMemo(() => {
        return attempts
            .slice()
            .sort((first, second) => {
                const left = new Date(first.submittedAt || first.startedAt || 0).getTime();
                const right = new Date(second.submittedAt || second.startedAt || 0).getTime();
                return right - left;
            });
    }, [attempts]);

    const filteredAttempts = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return allAttemptsSorted;

        return allAttemptsSorted.filter((attempt) => {
            const name = attempt.user?.name?.toLowerCase() || '';
            const email = attempt.user?.email?.toLowerCase() || '';
            const track = attempt.user?.programTrack?.toLowerCase() || '';
            return name.includes(term) || email.includes(term) || track.includes(term);
        });
    }, [allAttemptsSorted, search]);

    const attemptSummary = useMemo(() => {
        const total = attempts.length;
        const submitted = submittedAttempts.length;
        const inProgress = attempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length;
        const uniqueStudents = new Set(
            attempts
                .map((attempt) => attempt.user?.id)
                .filter((userId): userId is string => Boolean(userId))
        ).size;

        const scores = submittedAttempts.map((attempt) => Number(attempt.percentage || 0));
        const averageScore = scores.length > 0
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
            total,
            submitted,
            inProgress,
            uniqueStudents,
            averageScore,
            highestScore,
            lowestScore,
        };
    }, [attempts, submittedAttempts]);

    const scoreDistribution = useMemo(() => {
        const bins = [
            { label: '0-49', min: 0, max: 49.99, count: 0 },
            { label: '50-59', min: 50, max: 59.99, count: 0 },
            { label: '60-69', min: 60, max: 69.99, count: 0 },
            { label: '70-79', min: 70, max: 79.99, count: 0 },
            { label: '80-89', min: 80, max: 89.99, count: 0 },
            { label: '90-100', min: 90, max: 100, count: 0 },
        ];

        for (const attempt of submittedAttempts) {
            const score = Number(attempt.percentage || 0);
            const bin = bins.find((item) => score >= item.min && score <= item.max);
            if (bin) bin.count += 1;
        }

        const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

        return bins.map((bin) => ({
            ...bin,
            width: Math.max((bin.count / maxCount) * 100, bin.count > 0 ? 8 : 0),
        }));
    }, [submittedAttempts]);

    const submissionsByDay = useMemo(() => {
        const labels = Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            date.setHours(0, 0, 0, 0);
            return date;
        });

        const values = labels.map((date) => {
            const next = new Date(date);
            next.setDate(next.getDate() + 1);
            const count = submittedAttempts.filter((attempt) => {
                const when = new Date(attempt.submittedAt || attempt.startedAt || 0);
                return when >= date && when < next;
            }).length;

            return {
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
            };
        });

        const maxCount = Math.max(...values.map((value) => value.count), 1);
        return values.map((value) => ({
            ...value,
            height: Math.max((value.count / maxCount) * 100, value.count > 0 ? 10 : 0),
        }));
    }, [submittedAttempts]);

    const canManageSubmissions = useMemo(() => {
        if (!exam) return false;
        if (user?.role === 'ADMIN') return true;
        return Boolean(exam.creator?.id && exam.creator.id === user?.id);
    }, [exam, user?.id, user?.role]);

    const submissionStatus = submissionAnalytics?.examStatus;
    const questionStats = submissionAnalytics?.questionStats || [];
    const slowestQuestion = submissionAnalytics?.submissionStats?.slowestQuestion || null;
    const enrichedQuestionStats = useMemo(() => {
        return questionStats
            .map((question) => {
                const totalResponses = question.rightCount + question.wrongCount + question.unansweredCount;
                const wrongRate = totalResponses > 0 ? (question.wrongCount / totalResponses) * 100 : 0;
                const correctRate = totalResponses > 0 ? (question.rightCount / totalResponses) * 100 : 0;
                const unansweredRate = totalResponses > 0 ? (question.unansweredCount / totalResponses) * 100 : 0;

                return {
                    ...question,
                    totalResponses,
                    wrongRate,
                    correctRate,
                    unansweredRate,
                };
            });
    }, [questionStats]);

    const rankedQuestionStats = useMemo(() => {
        return enrichedQuestionStats.slice().sort((left, right) => {
            if (right.wrongRate !== left.wrongRate) {
                return right.wrongRate - left.wrongRate;
            }
            if (right.wrongCount !== left.wrongCount) {
                return right.wrongCount - left.wrongCount;
            }
            if (left.correctRate !== right.correctRate) {
                return left.correctRate - right.correctRate;
            }
            return left.orderNo - right.orderNo;
        });
    }, [enrichedQuestionStats]);

    const questionAnalyticsRows = useMemo(() => {
        if (questionSortMode === 'original') {
            return enrichedQuestionStats.slice().sort((left, right) => left.orderNo - right.orderNo);
        }

        if (questionSortMode === 'slowest') {
            return enrichedQuestionStats.slice().sort((left, right) => {
                const rightTime = right.averageAnswerSeconds || 0;
                const leftTime = left.averageAnswerSeconds || 0;
                if (rightTime !== leftTime) {
                    return rightTime - leftTime;
                }
                if (right.wrongRate !== left.wrongRate) {
                    return right.wrongRate - left.wrongRate;
                }
                if (right.wrongCount !== left.wrongCount) {
                    return right.wrongCount - left.wrongCount;
                }
                if (left.correctRate !== right.correctRate) {
                    return left.correctRate - right.correctRate;
                }
                return left.orderNo - right.orderNo;
            });
        }

        return rankedQuestionStats;
    }, [enrichedQuestionStats, questionSortMode, rankedQuestionStats]);

    const hardestQuestion = rankedQuestionStats[0] || null;

    const handleExportQuestionAnalytics = () => {
        if (questionAnalyticsRows.length === 0) {
            return;
        }

        const header = [
            'Question No',
            'Section',
            'Question Text',
            'Right Count',
            'Wrong Count',
            'Unanswered Count',
            'Right Rate %',
            'Wrong Rate %',
            'Unanswered Rate %',
            'Average Answer Time',
        ];

        const rows = questionAnalyticsRows.map((question) => [
            question.orderNo,
            question.section || '',
            question.questionText,
            question.rightCount,
            question.wrongCount,
            question.unansweredCount,
            question.correctRate.toFixed(2),
            question.wrongRate.toFixed(2),
            question.unansweredRate.toFixed(2),
            formatDuration(question.averageAnswerSeconds),
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (exam?.title || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        link.href = downloadUrl;
        link.download = `${safeTitle || 'exam'}-question-analytics-${questionSortMode}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">Loading submissions...</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => navigate(`/manage-exams/${id}/view`)}
                    >
                        <ArrowLeft size={15} />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight">All Submissions</h1>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {exam?.title || 'Mock Exam'} &middot; Students, scores, and analytics.
                        </p>
                    </div>
                </div>
                <Link to={`/manage-exams/${id}/view`}>
                    <Button variant="outline" className="h-8 rounded-md border-gray-200 text-xs font-semibold">
                        Back to Exam Details
                    </Button>
                </Link>
            </header>

            {user?.role === 'REVIEWER' && !canManageSubmissions && (
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-gray-600">Read-only view for submissions from another reviewer&apos;s exam.</p>
                        <Badge variant="outline" className="font-semibold text-[9px] uppercase tracking-widest border-gray-200 text-gray-500">
                            Read-only
                        </Badge>
                    </CardContent>
                </Card>
            )}

            {error ? (
                <Card className="rounded-lg border-red-100 bg-red-50/40">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <p className="text-xs font-semibold text-red-700">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/manage-exams')} className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50">
                            Back to Exams
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            {!error && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Attempts</p><p className="text-2xl font-black text-gray-900 mt-1">{attemptSummary.total}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</p><p className="text-2xl font-black text-gray-900 mt-1">{attemptSummary.submitted}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Students</p><p className="text-2xl font-black text-gray-900 mt-1">{attemptSummary.uniqueStudents}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Average Score</p><p className="text-2xl font-black text-gray-900 mt-1">{formatPercent(attemptSummary.averageScore)}</p></CardContent></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr,1fr] gap-3">
                        <Card className={`rounded-lg border ${submissionStatus?.canStudentsSubmit ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Submission Status</p>
                                        <h3 className="mt-1 text-lg font-black text-gray-900">
                                            {submissionStatus?.canStudentsSubmit ? 'Students can still submit' : 'Students can no longer submit'}
                                        </h3>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-black uppercase tracking-widest ${submissionStatus?.canStudentsSubmit ? 'border-emerald-300 bg-white text-emerald-700' : 'border-rose-300 bg-white text-rose-700'}`}
                                    >
                                        {submissionStatus?.status || exam?.status || 'N/A'}
                                    </Badge>
                                </div>
                                <p className="text-xs font-semibold text-gray-700">
                                    {submissionStatus?.message || 'Submission availability is unavailable.'}
                                </p>
                                <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                    <span className="rounded-full bg-white px-3 py-1 border border-black/5">
                                        Deadline: {submissionStatus?.scheduleEnd ? formatDate(submissionStatus.scheduleEnd) : 'No deadline'}
                                    </span>
                                    <span className="rounded-full bg-white px-3 py-1 border border-black/5">
                                        Auto-close: {submissionStatus?.closeOnDeadline ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-lg border-gray-100 bg-white">
                            <CardContent className="p-5 space-y-2.5">
                                <div className="flex items-center gap-2 text-gray-900">
                                    <Clock3 size={14} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Average Completion Time</p>
                                </div>
                                <p className="text-2xl font-black text-gray-900">
                                    {formatDuration(submissionAnalytics?.submissionStats?.averageCompletionSeconds)}
                                </p>
                                <p className="text-xs font-semibold text-gray-500">
                                    Based on submitted attempts only.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-lg border-gray-100 bg-white">
                            <CardContent className="p-5 space-y-2.5">
                                <div className="flex items-center gap-2 text-gray-900">
                                    <FileQuestion size={14} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Highest Time Question</p>
                                </div>
                                <p className="text-sm font-black text-gray-900">
                                    {slowestQuestion ? `Question ${slowestQuestion.orderNo}` : 'N/A'}
                                </p>
                                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                                    {slowestQuestion ? truncateQuestion(slowestQuestion.questionText, 72) : 'No answer timing data available yet.'}
                                </p>
                                <p className="text-xs font-black text-gray-900">
                                    {slowestQuestion?.averageAnswerSeconds ? `${formatDuration(slowestQuestion.averageAnswerSeconds)} average time to answer` : 'N/A'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <Card className="rounded-lg border-gray-100 bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <BarChart3 size={13} /> Score Distribution
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">Submitted Only</Badge>
                                </div>
                                <div className="space-y-2.5">
                                    {scoreDistribution.map((bin) => (
                                        <div key={bin.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                                                <span>{bin.label}</span>
                                                <span>{bin.count}</span>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${bin.width}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-lg border-gray-100 bg-white">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar size={13} /> Submissions (Last 7 Days)
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">Trend</Badge>
                                </div>
                                <div className="h-44 flex items-end gap-2">
                                    {submissionsByDay.map((day) => (
                                        <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="w-full flex-1 flex items-end">
                                                <div
                                                    className="w-full rounded-md bg-primary/85 min-h-1"
                                                    style={{ height: `${day.height}%` }}
                                                    title={`${day.label}: ${day.count}`}
                                                />
                                            </div>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center leading-tight">
                                                {day.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Student Submission Details</h3>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search student, email, track"
                                        className="h-8 rounded-md pl-8 border-gray-200 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div className="rounded-xl border border-gray-100 p-3"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exam Status</p><p className="text-sm font-black text-gray-900 mt-1">{submissionStatus?.canStudentsSubmit ? 'Open for submissions' : 'Closed for submissions'}</p></div>
                                <div className="rounded-xl border border-gray-100 p-3"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Questions</p><p className="text-sm font-black text-gray-900 mt-1">{Number(exam?.questionCount || exam?.totalItems || 0)}</p></div>
                                <div className="rounded-xl border border-gray-100 p-3"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p><p className="text-sm font-black text-gray-900 mt-1">{Number(exam?.timeLimit || exam?.duration || 0)} min</p></div>
                            </div>

                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Student</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Program</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Attempt #</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Score</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Raw</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAttempts.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-6 text-center text-sm font-semibold text-gray-500">
                                                    No attempts found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAttempts.map((attempt) => {
                                                const studentName = attempt.user?.name?.trim() || 'Unknown User';
                                                const studentEmail = attempt.user?.email?.trim() || 'No email';
                                                const studentProgram = attempt.user?.programTrack?.trim() || 'N/A';

                                                return (
                                                    <tr key={attempt.id} className="border-b border-gray-100 last:border-none">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={getAvatarUrl(studentName, attempt.user?.profilePicture)} alt={studentName} />
                                                                    <AvatarFallback className="text-[10px] font-black">{getAvatarFallback(studentName)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-900 truncate">{studentName}</p>
                                                                    <p className="text-xs text-gray-500 truncate">{studentEmail}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">{studentProgram}</td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">{attempt.attemptNo ?? '—'}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`font-black text-[10px] uppercase tracking-widest ${
                                                                    attempt.status === 'SUBMITTED'
                                                                        ? 'border-green-200 text-green-700 bg-green-50'
                                                                        : 'border-amber-200 text-amber-700 bg-amber-50'
                                                                }`}
                                                            >
                                                                {attempt.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-black text-gray-900">
                                                            {attempt.status === 'SUBMITTED' ? formatPercent(attempt.percentage) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                                            {attempt.status === 'SUBMITTED' ? Number(attempt.score || 0) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                                            {formatDate(attempt.submittedAt || attempt.startedAt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4 md:p-5 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Question Outcome Analytics</h3>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                        Review by hardest question, slowest question, or original question order, then export the current view.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                        {submissionAnalytics?.submissionStats?.submittedCount || 0} submitted attempts
                                    </Badge>
                                    <div className="w-full sm:w-44">
                                        <Select value={questionSortMode} onValueChange={(value) => setQuestionSortMode(value as QuestionSortMode)}>
                                            <SelectTrigger className="h-8 rounded-md border-gray-200 text-xs font-semibold">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <ArrowUpDown size={12} />
                                                    <SelectValue placeholder="Sort questions" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hardest">Hardest first</SelectItem>
                                                <SelectItem value="slowest">Slowest first</SelectItem>
                                                <SelectItem value="original">Original order</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-8 rounded-md border-gray-200 text-xs font-semibold"
                                        onClick={handleExportQuestionAnalytics}
                                        disabled={questionAnalyticsRows.length === 0}
                                    >
                                        <Download size={13} /> Export CSV
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hardest Question Right Now</p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {hardestQuestion ? `Question ${hardestQuestion.orderNo}` : 'N/A'}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">
                                        {hardestQuestion ? truncateQuestion(hardestQuestion.questionText, 88) : 'No submitted question analytics yet.'}
                                    </p>
                                    <p className="text-xs font-black text-rose-700 mt-2">
                                        {hardestQuestion ? `${hardestQuestion.wrongRate.toFixed(1)}% wrong answers` : 'N/A'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">How To Read This</p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">
                                        Each row shows the exact count of students who answered correctly, answered incorrectly, or skipped the question, plus a visual distribution bar.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Question</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Outcome Mix</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Right</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Wrong</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Unanswered</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Avg. Time to Answer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questionAnalyticsRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold text-gray-500">
                                                    No submitted question analytics yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            questionAnalyticsRows.map((question) => (
                                                <tr key={question.questionId} className="border-b border-gray-100 last:border-none align-top">
                                                    <td className="px-4 py-3 min-w-80">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-gray-900">Question {question.orderNo}</p>
                                                            <p className="text-xs font-semibold text-gray-700 leading-relaxed">{truncateQuestion(question.questionText)}</p>
                                                            {question.section ? (
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{question.section}</p>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 min-w-52">
                                                        <div className="space-y-2">
                                                            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 flex">
                                                                <div
                                                                    className="h-full bg-emerald-500"
                                                                    style={{ width: `${question.correctRate}%` }}
                                                                    title={`Right: ${question.correctRate.toFixed(1)}%`}
                                                                />
                                                                <div
                                                                    className="h-full bg-rose-500"
                                                                    style={{ width: `${question.wrongRate}%` }}
                                                                    title={`Wrong: ${question.wrongRate.toFixed(1)}%`}
                                                                />
                                                                <div
                                                                    className="h-full bg-amber-400"
                                                                    style={{ width: `${question.unansweredRate}%` }}
                                                                    title={`Unanswered: ${question.unansweredRate.toFixed(1)}%`}
                                                                />
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                                                <span className="text-emerald-700">{question.correctRate.toFixed(0)}% right</span>
                                                                <span className="text-rose-700">{question.wrongRate.toFixed(0)}% wrong</span>
                                                                <span className="text-amber-700">{question.unansweredRate.toFixed(0)}% unanswered</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-black text-emerald-700">{question.rightCount}</td>
                                                    <td className="px-4 py-3 text-xs font-black text-rose-700">{question.wrongCount}</td>
                                                    <td className="px-4 py-3 text-xs font-black text-amber-700">{question.unansweredCount}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatDuration(question.averageAnswerSeconds)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default ManageExamSubmissionsPage;
