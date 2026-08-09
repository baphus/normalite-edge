import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { formatShortDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/manage/StatusPill';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Exam {
    id: string;
    title: string;
    description?: string;
    category: string;
    subject?: string;
    categoryCode?: string | null;
    questionCount: number;
    duration: number;
    status: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | string;
    hasSubmitted?: boolean;
    userAttemptStatus?: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | string;
    latestSubmittedAttemptId?: string | null;
    latestSubmittedScore?: number | null;
    lastScore?: number;
    deadline?: string;
    scheduledDate?: string;
    scheduleStart?: string;
    scheduleEnd?: string;
    feedbackMode?: 'IMMEDIATE' | 'AFTER_SUBMIT' | string;
    isScheduled?: boolean;
    isAvailable?: boolean;
    allowRetakes?: boolean;
    sections?: Array<{ id?: string; title?: string; orderNo?: number }>;
    createdAt?: string;
    answeredCount?: number | null;
    _count?: { attempts?: number; questions?: number };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const DAY_MS = 1000 * 60 * 60 * 24;

function scoreClasses(score: number): string {
    if (score >= 75) return 'text-emerald-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-red-600';
}

/** "Ends today" / "Ends tomorrow" / "Ends in 3 days" / "Ends in 2 hours" */
function endsLabel(deadline?: string): string {
    if (!deadline) return '';
    const diffMs = new Date(deadline).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / DAY_MS);
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays <= 0) return 'Ended';
    if (diffDays === 1) return 'Ends tomorrow';
    if (diffDays <= 7) return `Ends in ${diffDays} days`;
    // If more than 7 days away, fall back to hours for precision or the date
    if (diffHours <= 24) return `Ends in ${diffHours} hours`;
    return `Ends ${formatShortDate(deadline)}`;
}

/** Format the start date for upcoming exams — "Aug 15" or "Sep 2". */
function startDateLabel(exam: Exam): string {
    const date = exam.scheduleStart || exam.scheduledDate;
    return date ? formatShortDate(date) : 'TBA';
}

/**
 * Bucket an exam into one of three visual sections.
 *
 * - **Upcoming**: scheduled (future start), or `isScheduled` flag
 * - **Active**: live, start passed, deadline not passed, not scheduled
 * - **Past**: deadline passed, status CLOSED/ARCHIVED, or already submitted
 */
function classifyExam(exam: Exam) {
    const now = Date.now();
    const hasSubmitted = Boolean(
        exam.hasSubmitted || exam.userAttemptStatus === 'SUBMITTED',
    );
    const hasInProgress = exam.userAttemptStatus === 'IN_PROGRESS';
    const isGrading = exam.userAttemptStatus?.toUpperCase() === 'GRADING';

    const isLive = exam.status === 'LIVE';
    const isClosed = exam.status === 'CLOSED' || exam.status === 'ARCHIVED';

    // Upcoming: scheduled flag, or future start date
    const startDate = exam.scheduleStart || exam.scheduledDate;
    const isScheduled = Boolean(
        exam.isScheduled || (startDate && new Date(startDate).getTime() > now),
    );

    // Deadline awareness
    const deadlineMs = exam.deadline ? new Date(exam.deadline).getTime() : null;
    const deadlinePassed = deadlineMs !== null && deadlineMs <= now;

    // Start has passed
    const startPassed = !startDate || new Date(startDate).getTime() <= now;

    // Active: live, start passed, not past deadline, not scheduled
    const isActive = isLive && startPassed && !deadlinePassed && !isScheduled;

    // Past: closed/archived, deadline passed, or already submitted (retakes
    // are unlimited when allowRetakes is on, so "submitted" stays in Past)
    const isPast = isClosed || deadlinePassed || hasSubmitted;

    return {
        isUpcoming: !isPast && isScheduled,
        isActive: isActive && !isPast && !hasSubmitted,
        isPast: isPast || (hasSubmitted && !isActive),
        hasSubmitted,
        hasInProgress,
        isGrading,
        isScheduled,
    };
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function SectionHeader({ title }: { title: string }) {
    return (
        <>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                {title}
            </h2>
            <div className="border-t border-slate-100" />
        </>
    );
}

function ExamCard({
    exam,
    segment,
    onNavigate,
}: {
    exam: Exam;
    segment: 'upcoming' | 'active' | 'past';
    onNavigate: (exam: Exam, action: 'take' | 'result' | 'resume') => void;
}) {
    const { hasSubmitted, hasInProgress, isGrading } = classifyExam(exam);
    const score = exam.latestSubmittedScore ?? exam.lastScore;
    const canRetake = Boolean(exam.allowRetakes);

    // AFTER_SUBMIT exams hide the first attempt's score until the deadline.
    const resultsPending = Boolean(
        hasSubmitted &&
        exam.feedbackMode === 'AFTER_SUBMIT' &&
        exam.scheduleEnd &&
        new Date(exam.scheduleEnd).getTime() > Date.now()
    );

    // Right-side status text
    let statusText = '';
    if (segment === 'upcoming') {
        statusText = startDateLabel(exam);
    } else if (segment === 'active') {
        statusText = endsLabel(exam.deadline);
    } else {
        // Past
        if (isGrading) statusText = 'Grading...';
        else if (hasSubmitted) statusText = 'Submitted ✓';
        else statusText = 'Missed';
    }

    // Right-side action
    let action: React.ReactNode = null;

    if (segment === 'upcoming') {
        // Scheduled badge — subtle, no button
        action = <StatusPill tone="draft" label="Scheduled" />;
    } else if (segment === 'active') {
        if (hasInProgress) {
            action = (
                <Button
                    className="h-10 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90 sm:h-8"
                    onClick={() => onNavigate(exam, 'resume')}
                >
                    Resume →
                </Button>
            );
        } else {
            action = (
                <Button
                    className="h-10 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90 sm:h-8"
                    onClick={() => onNavigate(exam, 'take')}
                >
                    Take Exam →
                </Button>
            );
        }
    } else {
        // Past section
        if (isGrading) {
            // No action, just text
        } else if (hasSubmitted) {
            if (canRetake) {
                action = (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="min-h-[44px] px-2 text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-700 sm:min-h-0 sm:px-0"
                            onClick={() => onNavigate(exam, 'result')}
                        >
                            View Results
                        </button>
                        <Button
                            className="h-10 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90 sm:h-8"
                            onClick={() => onNavigate(exam, 'take')}
                        >
                            Retake for Practice
                        </Button>
                    </div>
                );
            } else {
                action = (
                    <Button
                        className="h-10 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90 sm:h-8"
                        onClick={() => onNavigate(exam, 'result')}
                    >
                        View Results
                    </Button>
                );
            }
        }
        // Missed: no action button
    }

    return (
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-primary/25 hover:shadow-sm sm:flex-row sm:items-center sm:px-5 sm:py-4">
            {/* Left side */}
            <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-slate-900">
                    {exam.title}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                    {exam.subject || exam.category} · {exam.questionCount}{' '}
                    questions
                </p>
            </div>

            {/* Right side — date/status + action */}
            <div className="mt-2.5 flex shrink-0 items-center gap-2 sm:mt-0 sm:items-center sm:gap-3">
                {/* Score for submitted past exams */}
                {segment === 'past' && hasSubmitted && score != null && (
                    <span
                        className={cn(
                            'text-[12px] font-semibold tabular-nums',
                            resultsPending ? 'text-slate-500' : scoreClasses(score),
                        )}
                    >
                        {resultsPending ? 'Submitted' : `Score: ${score}%`}
                    </span>
                )}

                <span className="text-[12px] text-slate-500">{statusText}</span>
                <div className="flex shrink-0 items-center gap-2">{action}</div>
            </div>
        </div>
    );
}

function EmptyState({ isSearching }: { isSearching: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen
                size={24}
                className="mb-3 text-slate-300"
                aria-hidden="true"
            />
            <p className="text-[15px] font-semibold text-slate-900">
                {isSearching ? 'No exams match your search' : 'No exams assigned yet'}
            </p>
            {!isSearching && (
                <p className="mt-1 text-[12px] text-slate-500">
                    Check back soon for new exams
                </p>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

const ExamsPage: React.FC = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchExams = useCallback(async () => {
        setLoadState('loading');
        setLoadError(null);
        try {
            const { items } = await fetchAllPages<Exam>((page, limit) =>
                api.get('/exams', { params: { page, limit } }),
            );
            setExams(items);
            setLoadState('ready');
        } catch (error) {
            console.error('Failed to fetch exams', error);
            setLoadError('Something went wrong');
            setLoadState('error');
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => fetchExams());
    }, [fetchExams]);

    // Client-side search filtering
    const term = search.trim().toLowerCase();
    const filteredExams = useMemo(() => {
        if (!term) return exams;
        return exams.filter(
            (exam) =>
                exam.title.toLowerCase().includes(term) ||
                (exam.description || '').toLowerCase().includes(term) ||
                (exam.category || '').toLowerCase().includes(term) ||
                (exam.subject || '').toLowerCase().includes(term),
        );
    }, [exams, term]);

    // Bucket exams into three sections
    const { upcoming, active, past } = useMemo(() => {
        const up: Exam[] = [];
        const ac: Exam[] = [];
        const pa: Exam[] = [];

        for (const exam of filteredExams) {
            const c = classifyExam(exam);
            if (c.isUpcoming) up.push(exam);
            else if (c.isActive || c.hasInProgress) ac.push(exam);
            else pa.push(exam);
        }

        return { upcoming: up, active: ac, past: pa };
    }, [filteredExams]);

    const allEmpty = upcoming.length === 0 && active.length === 0 && past.length === 0;
    const isSearching = term.length > 0;

    const handleNavigate = useCallback(
        (exam: Exam, action: 'take' | 'result' | 'resume') => {
            if (action === 'result') {
                const query = exam.latestSubmittedAttemptId
                    ? `?attemptId=${exam.latestSubmittedAttemptId}`
                    : '';
                navigate(`/exams/${exam.id}/result${query}`);
            } else {
                navigate(`/exams/${exam.id}/take`);
            }
        },
        [navigate],
    );

    return (
        <div className="flex flex-col gap-4 pb-6 font-lexend">
            {/* Page title */}
            <header>
                <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                    Your Exams
                </h1>
            </header>

            {/* Search */}
            <div className="relative">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exams…"
                    aria-label="Search exams"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
            </div>

            {/* Loading state */}
            {loadState === 'loading' && (
                <div className="flex flex-col gap-3 py-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-16 animate-pulse rounded-xl bg-slate-100"
                        />
                    ))}
                </div>
            )}

            {/* Error state */}
            {loadState === 'error' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-[15px] font-semibold text-slate-900">
                        {loadError || 'Something went wrong'}
                    </p>
                    <Button
                        variant="outline"
                        className="mt-3 h-8 rounded-lg border-slate-200 bg-white px-3 text-[12px] font-semibold"
                        onClick={() => void fetchExams()}
                    >
                        Try again
                    </Button>
                </div>
            )}

            {/* Content */}
            {loadState === 'ready' && (
                <>
                    {allEmpty ? (
                        <EmptyState isSearching={isSearching} />
                    ) : (
                        <div className="flex flex-col gap-5">
                            {/* Upcoming */}
                            {upcoming.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <SectionHeader title="Upcoming" />
                                    {upcoming.map((exam) => (
                                        <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            segment="upcoming"
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Active */}
                            {active.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <SectionHeader title="Active" />
                                    {active.map((exam) => (
                                        <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            segment="active"
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Past */}
                            {past.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <SectionHeader title="Past" />
                                    {past.map((exam) => (
                                        <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            segment="past"
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ExamsPage;
