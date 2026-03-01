import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    Search,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
    const [search, setSearch] = useState('');

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
                const [examResponse, attemptsResponse] = await Promise.all([
                    api.get(`/exams/${id}`),
                    api.get('/attempts', { params: { examId: id, page: 1, limit: 500 } }),
                ]);

                setExam((examResponse.data?.data || null) as ExamDetails | null);
                setAttempts((attemptsResponse.data?.data || []) as AttemptItem[]);
            } catch (loadErr) {
                console.error('Failed to load exam submissions page', loadErr);
                setError('Unable to load submissions right now.');
                setExam(null);
                setAttempts([]);
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

    const analytics = useMemo(() => {
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
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Attempts</p><p className="text-2xl font-black text-gray-900 mt-1">{analytics.total}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</p><p className="text-2xl font-black text-gray-900 mt-1">{analytics.submitted}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Students</p><p className="text-2xl font-black text-gray-900 mt-1">{analytics.uniqueStudents}</p></CardContent></Card>
                        <Card className="rounded-lg border-gray-100 bg-white"><CardContent className="p-4"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Average Score</p><p className="text-2xl font-black text-gray-900 mt-1">{formatPercent(analytics.averageScore)}</p></CardContent></Card>
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
                                <div className="rounded-xl border border-gray-100 p-3"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exam Status</p><p className="text-sm font-black text-gray-900 mt-1">{exam?.status || 'N/A'}</p></div>
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
                </>
            )}
        </div>
    );
};

export default ManageExamSubmissionsPage;
