import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Grid2X2,
    Layers,
    Play,
    RotateCcw,
    TrendingUp,
    Users,
    UserRound,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ExamTrack {
    id?: string;
    name: string;
    code?: string | null;
}

interface ExamSection {
    id?: string;
    title?: string;
    orderNo?: number;
}

interface ExamDetails {
    id: string;
    title?: string;
    description?: string | null;
    category?: string;
    status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
    questionCount?: number;
    totalItems?: number;
    duration?: number;
    timeLimit?: number;
    maxAttempts?: number | null;
    deadline?: string | null;
    scheduledDate?: string | null;
    tracks?: ExamTrack[];
    program_track?: string | null;
    sections?: ExamSection[];
    attempts_remaining?: number;
    userAttemptStatus?: 'IN_PROGRESS' | 'SUBMITTED' | string;
    latestSubmittedAttemptId?: string | null;
    hasSubmitted?: boolean;
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
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&rounded=true`;
};

const RevieweeExamViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);

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
                const [examRes, attemptsRes] = await Promise.all([
                    api.get(`/exams/${id}`),
                    api.get('/attempts', { params: { examId: id, page: 1, limit: 200 } }),
                ]);
                setExam((examRes.data?.data || null) as ExamDetails | null);
                setAttempts((attemptsRes.data?.data || []) as AttemptItem[]);
            } catch (err) {
                console.error('Failed to load exam details', err);
                setError('Unable to load exam details right now.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const questionCount = Math.max(Number(exam?.questionCount || exam?.totalItems || 0), 0);

    const visibleToLabel = useMemo(() => {
        const tracks = exam?.tracks || [];
        if (tracks.length > 0) {
            return tracks.map((t) => (t.code ? `${t.name} (${t.code})` : t.name)).join(', ');
        }
        if (exam?.program_track?.trim()) return exam.program_track;
        return 'All Programs';
    }, [exam]);

    const sectionsLabel = useMemo(() => {
        const titles = (exam?.sections || [])
            .slice()
            .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
            .map((s) => s.title?.trim())
            .filter((s): s is string => Boolean(s));
        return titles.length ? titles.join(', ') : 'Full Exam';
    }, [exam]);

    const creatorName = useMemo(() => {
        if (!exam?.creator) return 'Unknown author';
        return (
            exam.creator.name ||
            `${exam.creator.firstName || ''} ${exam.creator.lastName || ''}`.trim() ||
            'Unknown author'
        );
    }, [exam]);

    const recentSubmitters = useMemo(() => {
        const submitted = attempts
            .filter((a) => a.status === 'SUBMITTED')
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.submittedAt || b.startedAt || 0).getTime() -
                    new Date(a.submittedAt || a.startedAt || 0).getTime()
            );

        const seen = new Set<string>();
        const users: Array<Required<AttemptItem>['user'] & { submittedAt?: string | null }> = [];
        for (const attempt of submitted) {
            if (!attempt.user?.id || seen.has(attempt.user.id)) continue;
            seen.add(attempt.user.id);
            users.push({ ...attempt.user, submittedAt: attempt.submittedAt });
            if (users.length >= 10) break;
        }
        return users;
    }, [attempts]);

    const submittedCount = useMemo(
        () => attempts.filter((a) => a.status === 'SUBMITTED').length,
        [attempts]
    );

    const hasSubmitted =
        Boolean(exam?.hasSubmitted) ||
        exam?.userAttemptStatus === 'SUBMITTED' ||
        (exam?.attempts_remaining !== undefined && exam.attempts_remaining === 0);
    const hasInProgress = exam?.userAttemptStatus === 'IN_PROGRESS';
    const isLive = exam?.status === 'LIVE';
    const canTake = isLive && !hasSubmitted;

    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">
                        Loading exam details...
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            {/* Header */}
            <header data-guide="exam-preview-header" className="flex items-start gap-2.5 sm:items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    onClick={() => navigate('/exams')}
                >
                    <ArrowLeft size={15} />
                </Button>
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Exam Details</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Review exam information before taking it.
                    </p>
                </div>
            </header>

            {error ? (
                <Card className="rounded-lg border-red-100 bg-red-50/40">
                    <CardContent className="p-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-red-700">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/exams')}
                            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                        >
                            Back to Exams
                        </Button>
                    </CardContent>
                </Card>
            ) : !exam ? (
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">
                        Exam not found.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Exam Metadata */}
                    <Card data-guide="exam-preview-metadata" className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">
                                    {exam.category || 'No Category'}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`font-black text-[10px] uppercase tracking-widest ${
                                        exam.status === 'LIVE' || exam.status === 'PUBLISHED'
                                            ? 'border-green-200 text-green-700 bg-green-50'
                                            : exam.status === 'DRAFT'
                                            ? 'border-amber-200 text-amber-700 bg-amber-50'
                                            : exam.status === 'CLOSED'
                                            ? 'border-red-200 text-red-700 bg-red-50'
                                            : 'border-gray-200 text-gray-700 bg-gray-50'
                                    }`}
                                >
                                    {exam.status || 'UNKNOWN'}
                                </Badge>
                                {hasSubmitted && (
                                    <Badge className="bg-green-50 text-green-700 border-none font-black text-[10px] uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full mr-1 bg-green-600" />
                                        Submitted
                                    </Badge>
                                )}
                                {hasInProgress && !hasSubmitted && (
                                    <Badge className="bg-amber-50 text-amber-700 border-none font-black text-[10px] uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full mr-1 bg-amber-500" />
                                        In Progress
                                    </Badge>
                                )}
                            </div>

                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                                    {exam.title || 'Untitled Exam'}
                                </h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {exam.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Grid2X2 size={12} /> Questions
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{questionCount}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={12} /> Duration
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {Number(exam.timeLimit || exam.duration || 0)} min
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <CheckCircle2 size={12} /> Max Attempts
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {exam.maxAttempts ?? 1}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} /> Deadline
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {formatDate(exam.deadline || exam.scheduledDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={12} /> Sections
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">
                                        {sectionsLabel}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Users size={12} /> Visible To
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">
                                        {visibleToLabel}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UserRound size={12} /> Author
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{creatorName}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Submitters — no scores */}
                    <Card data-guide="exam-preview-social-proof" className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Students Recently Submitted
                                </h3>
                                <Badge
                                    variant="outline"
                                    className="font-black text-[10px] uppercase tracking-widest"
                                >
                                    {submittedCount} submission{submittedCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>

                            {recentSubmitters.length === 0 ? (
                                <p className="text-sm font-semibold text-gray-500">
                                    No submitted attempts yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {recentSubmitters.map((student) => (
                                        <div
                                            key={student.id}
                                            className="rounded-xl border border-gray-100 p-3 flex items-center gap-3"
                                        >
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarImage
                                                    src={getAvatarUrl(student.name, student.profilePicture)}
                                                    alt={student.name}
                                                />
                                                <AvatarFallback className="font-black text-xs">
                                                    {getAvatarFallback(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 truncate">
                                                    {student.name}
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium truncate">
                                                    {student.email}
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-semibold truncate">
                                                    {student.programTrack || 'N/A'} &bull;{' '}
                                                    {formatDate(student.submittedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Footer */}
                    <Card data-guide="exam-preview-actions" className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <p className="text-xs font-semibold text-gray-500">
                                {hasSubmitted
                                    ? 'You have already submitted this exam.'
                                    : hasInProgress
                                    ? 'You have an exam in progress — resume from where you left off.'
                                    : canTake
                                    ? "You've reviewed the details. Ready to take the exam?"
                                    : 'This exam is not currently available.'}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    className="h-8 rounded-md border-gray-200 font-semibold text-xs"
                                    onClick={() => navigate('/exams')}
                                >
                                    Back
                                </Button>
                                {hasSubmitted ? (
                                    <Button
                                        className="h-8 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold text-xs gap-1.5"
                                        onClick={() =>
                                            navigate(
                                                `/exams/${exam.id}/result${
                                                    exam.latestSubmittedAttemptId
                                                        ? `?attemptId=${exam.latestSubmittedAttemptId}`
                                                        : ''
                                                }`
                                            )
                                        }
                                    >
                                        <TrendingUp size={13} /> View Result
                                    </Button>
                                ) : (
                                    <Button
                                        data-guide="exam-preview-start-btn"
                                        className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
                                        disabled={!canTake}
                                        onClick={() => navigate(`/exams/${exam.id}/take`)}
                                    >
                                        {hasInProgress ? (
                                            <><RotateCcw size={13} /> Resume Exam</>
                                        ) : (
                                            <><Play size={13} fill="currentColor" /> Take Exam</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default RevieweeExamViewPage;
