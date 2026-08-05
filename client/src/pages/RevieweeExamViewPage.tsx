import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    RotateCcw,
    TrendingUp,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { CollectionEmpty } from '@/components/manage/CollectionState';
import { formatDateTime } from '@/lib/formatters';
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

/**
 * Local initials fallback for the attempt avatars. Previously the page shipped
 * `ui-avatars.com` URLs to a third party whenever a student had no uploaded
 * picture — a privacy leak the design system §10 forbids. Initials are derived
 * locally, styled with the same neutral-maroon recipe the sidebar uses.
 */
const getAvatarInitials = (name?: string) => {
    const cleaned = (name || '').trim();
    if (!cleaned) return 'U';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[1][0] : parts[0]?.[1];
    return `${first}${second || ''}`.toUpperCase();
};

const STATUS_TONE: Record<string, StatusTone> = {
    LIVE: 'live',
    PUBLISHED: 'live',
    DRAFT: 'draft',
    CLOSED: 'closed',
    ARCHIVED: 'archived',
};

const STATUS_LABEL: Record<string, string> = {
    LIVE: 'Live',
    PUBLISHED: 'Published',
    DRAFT: 'Draft',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
};

const BackToExams: React.FC = () => {
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={() => navigate('/exams')}
            className="inline-flex w-fit items-center gap-1 rounded text-[12px] text-slate-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
        >
            <ArrowLeft size={12} aria-hidden="true" /> Exams
        </button>
    );
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
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                <BackToExams />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-80 rounded-lg" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-[92px] rounded-xl" />
                    ))}
                </div>
                <span className="sr-only" role="status">Loading exam…</span>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                {/* The header is not rendered on this branch, so the only route
                    back would otherwise be the sidebar. */}
                <BackToExams />
                <CollectionEmpty
                    filtersActive={false}
                    emptyTitle={error || 'Exam not found'}
                    emptyDescription={
                        error
                            ? 'Check your connection and try again.'
                            : 'This exam may have been removed.'
                    }
                />
            </div>
        );
    }

    const status = exam.status || 'DRAFT';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            {/* Header */}
            <header data-guide="exam-preview-header" className="flex flex-col gap-2">
                <nav aria-label="Breadcrumb">
                    <ol className="flex items-center gap-1.5 text-[12px] text-slate-500">
                        <li>
                            <button
                                type="button"
                                onClick={() => navigate('/exams')}
                                className="inline-flex items-center gap-1 rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                            >
                                <ArrowLeft size={12} aria-hidden="true" /> Exams
                            </button>
                        </li>
                        <li aria-hidden="true" className="text-slate-300">/</li>
                        <li className="truncate text-slate-500">Exam details</li>
                    </ol>
                </nav>

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                            {exam.title || 'Untitled exam'}
                        </h1>
                        <StatusPill
                            tone={STATUS_TONE[status] || 'neutral'}
                            label={STATUS_LABEL[status] || 'Unknown'}
                        />
                        {hasSubmitted && (
                            <StatusPill tone="success" label="Submitted" />
                        )}
                        {hasInProgress && !hasSubmitted && (
                            <StatusPill tone="pending" label="In progress" />
                        )}
                    </div>
                </div>

                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Questions</dt>
                        <dd className="font-semibold tabular-nums text-slate-700">{questionCount}</dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Duration</dt>
                        <dd className="font-semibold text-slate-700">
                            {Number(exam.timeLimit || exam.duration || 0)} min
                        </dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Max attempts</dt>
                        <dd className="font-semibold text-slate-700">{exam.maxAttempts ?? 1}</dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Deadline</dt>
                        <dd className="font-semibold text-slate-700">
                            {formatDateTime(exam.deadline || exam.scheduledDate, '—')}
                        </dd>
                    </div>
                </dl>

                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Sections</dt>
                        <dd className="font-semibold text-slate-700">{sectionsLabel}</dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Visible to</dt>
                        <dd className="font-semibold text-slate-700">{visibleToLabel}</dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <dt className="text-slate-400">Author</dt>
                        <dd className="font-semibold text-slate-700">{creatorName}</dd>
                    </div>
                </dl>
            </header>

            {/* Description */}
            {exam.description && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Description
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{exam.description}</p>
                </div>
            )}

            {/* Recent Submitters — no scores */}
            <Card data-guide="exam-preview-social-proof" className="rounded-xl border-slate-200 bg-white">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                            Students recently submitted
                        </h2>
                        <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                            {submittedCount} submission{submittedCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {recentSubmitters.length === 0 ? (
                        <p className="text-[13px] font-medium text-slate-500">No submitted attempts yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {recentSubmitters.map((student) => (
                                <div
                                    key={student.id}
                                    className="rounded-xl border border-slate-200 p-3 flex items-center gap-3"
                                >
                                    <Avatar className="h-9 w-9 shrink-0">
                                        {student.profilePicture && (
                                            <AvatarImage
                                                src={student.profilePicture}
                                                alt={student.name || 'Student avatar'}
                                            />
                                        )}
                                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                                            {getAvatarInitials(student.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-900 truncate">
                                            {student.name}
                                        </p>
                                        <p className="text-[12px] text-slate-500 truncate">{student.email}</p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {student.programTrack || 'N/A'} &bull;{' '}
                                            {formatDateTime(student.submittedAt, '—')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Footer */}
            <div
                data-guide="exam-preview-actions"
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
                <p className="text-[12px] font-medium text-slate-500">
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
                        className="h-8 rounded-lg border-slate-200 bg-white text-[12px] font-semibold text-slate-700"
                        onClick={() => navigate('/exams')}
                    >
                        Back
                    </Button>
                    {hasSubmitted ? (
                        <Button
                            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
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
                            <TrendingUp size={13} aria-hidden="true" /> View Result
                        </Button>
                    ) : (
                        <Button
                            data-guide="exam-preview-start-btn"
                            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
                            disabled={!canTake}
                            onClick={() => navigate(`/exams/${exam.id}/take`)}
                        >
                            {hasInProgress ? (
                                <><RotateCcw size={13} aria-hidden="true" /> Resume Exam</>
                            ) : (
                                <><Play size={13} fill="currentColor" aria-hidden="true" /> Take Exam</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RevieweeExamViewPage;
