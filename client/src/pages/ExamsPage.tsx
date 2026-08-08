import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle,
    ChevronDown,
    Play,
    RotateCcw,
    Search,
    SlidersHorizontal,
    TrendingUp,
    Users,
} from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { formatDurationMinutes, formatShortDate } from '@/lib/formatters';
import { categoryToneClasses } from '@/lib/categoryTone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import FilterSheet from '@/components/exams/FilterSheet';
import {
    ManageToolbar,
    FilterField,
    type ActiveFilterChip,
    type ManageView,
    type ToolbarSegment,
} from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';
import { ResourceGrid } from '@/components/manage/ResourceGrid';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { cn } from '@/lib/utils';

interface Exam {
    id: string;
    title: string;
    description?: string;
    category: string;
    categoryCode?: string | null;
    questionCount: number;
    duration: number;
    status: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | string;
    attempts_remaining?: number;
    hasSubmitted?: boolean;
    userAttemptStatus?: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | string;
    latestSubmittedAttemptId?: string | null;
    latestSubmittedScore?: number | null;
    deadline?: string;
    scheduledDate?: string;
    isScheduled?: boolean;
    isAvailable?: boolean;
    lastScore?: number;
    sections?: Array<{ id?: string; title?: string; orderNo?: number }>;
    createdAt?: string;
    /** Answered count on the running attempt — not present on the list payload today. */
    answeredCount?: number | null;
    /** Aggregates carried on the raw exam row. */
    _count?: { attempts?: number; questions?: number };
}

type StatusSegment = 'all' | 'open' | 'submitted' | 'closed';
type PublishedFilter = 'all' | 'last_7_days' | 'last_30_days';

/**
 * The three states a reviewee cares about. `open` covers both a fresh exam and
 * one with a running attempt — resuming is not a different destination, it is
 * the same exam with work already in it, so it stays in the same bucket and is
 * ordered first instead.
 */
function examState(exam: Exam) {
    const attemptsRemaining = exam.attempts_remaining ?? 0;
    const hasSubmitted = Boolean(
        exam.hasSubmitted || exam.userAttemptStatus === 'SUBMITTED' || attemptsRemaining === 0,
    );
    const hasInProgress = exam.userAttemptStatus === 'IN_PROGRESS';
    const isGrading = exam.userAttemptStatus?.toUpperCase() === 'GRADING';
    const isLive = exam.status === 'LIVE';
    const isScheduled = Boolean(exam.isScheduled || (exam.scheduledDate && new Date(exam.scheduledDate) > new Date()));
    const canTake =
        isLive && !isScheduled && !isGrading && Boolean(exam.isAvailable ?? true) && !hasSubmitted;
    const segment: Exclude<StatusSegment, 'all'> = hasSubmitted ? 'submitted' : canTake ? 'open' : 'closed';
    return { attemptsRemaining, hasSubmitted, hasInProgress, isGrading, isLive, isScheduled, canTake, segment };
}

function statusPresentation(exam: Exam): { tone: StatusTone; label: string } {
    const { hasSubmitted, isGrading, hasInProgress, canTake, isLive, isScheduled } = examState(exam);
    if (hasSubmitted) return { tone: 'live', label: 'Submitted' };
    if (isGrading) return { tone: 'pending', label: 'Grading' };
    if (isScheduled) return { tone: 'draft', label: 'Scheduled' };
    if (hasInProgress) return { tone: 'draft', label: 'In progress' };
    if (canTake) return { tone: 'live', label: 'Available' };
    return { tone: isLive ? 'archived' : 'closed', label: isLive ? 'No attempts left' : 'Closed' };
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** "Due in 3 days" for near deadlines, "Due Dec 15" further out. */
function dueLabel(deadline?: string): string {
    if (!deadline) return 'Available now';
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS);
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return `Due ${formatShortDate(deadline)}`;
}

/** "30 min" / "2 h" — the card's metadata line reads more naturally than "30m". */
function durationLabel(minutes: number): string {
    if (!minutes) return 'No time limit';
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours} h` : `${minutes} min`;
}

function questionLabel(count: number): string {
    return `${count} ${count === 1 ? 'question' : 'questions'}`;
}

/**
 * The one decisive action a card can carry. `result` and `resume` are urgent
 * enough to surface on the collapsed card; `take` waits for the expanded detail
 * so the collapsed grid stays lean.
 */
function actionFor(exam: Exam):
    | { kind: 'result'; label: string; canRetake: boolean }
    | { kind: 'resume'; label: string; canRetake: false }
    | { kind: 'take'; label: string; canRetake: false }
    | null {
    const { hasSubmitted, hasInProgress, canTake, attemptsRemaining } = examState(exam);
    if (hasSubmitted) return { kind: 'result', label: 'View results', canRetake: attemptsRemaining > 0 };
    if (hasInProgress && canTake) return { kind: 'resume', label: 'Resume exam', canRetake: false };
    if (canTake) return { kind: 'take', label: 'Take exam', canRetake: false };
    return null;
}

/** Progress for a running attempt — null when the payload does not carry a count. */
function progressFor(exam: Exam): { answered: number; total: number } | null {
    const answered = exam.answeredCount;
    if (answered == null || exam.questionCount <= 0) return null;
    return { answered, total: exam.questionCount };
}

function isDeadlineSoon(deadline?: string) {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - Date.now();
    return diff > 0 && diff < 2 * DAY_MS;
}

function publishedAt(exam: Exam) {
    return new Date(exam.scheduledDate || exam.createdAt || 0).getTime();
}

/**
 * The grid's fixed order. Grid is the landing form and has no column headers to
 * sort on, so it renders one deliberate order: whatever is half-finished, then
 * whatever expires soonest, then whatever is newest. Sorting is a table
 * capability — see docs/design-system-v1.1.0.md §6.
 */
function compareForBrowse(a: Exam, b: Exam) {
    const aInProgress = examState(a).hasInProgress ? 0 : 1;
    const bInProgress = examState(b).hasInProgress ? 0 : 1;
    if (aInProgress !== bInProgress) return aInProgress - bInProgress;

    // A missing deadline is not urgent, so it sorts after every real one.
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return publishedAt(b) - publishedAt(a);
}

/** The section strip shown under the title in the table form. */
function sectionSummary(exam: Exam) {
    const titles = (exam.sections || [])
        .map((section) => section.title?.trim())
        .filter((title): title is string => Boolean(title));
    if (titles.length === 0) return 'Full exam';
    return titles.slice(0, 3).join(' · ') + (titles.length > 3 ? ` +${titles.length - 3}` : '');
}

function scoreClasses(score: number) {
    if (score >= 75) return 'text-emerald-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-red-600';
}

const ExamsPage: React.FC = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);

    // Filter state lives in the URL search params so a filtered view can be
    // shared as a link, survives a reload, and the back button steps back
    // through filter changes. Unknown values fall back to the "all" sentinel.
    const [searchParams, setSearchParams] = useSearchParams();

    const search = searchParams.get('search') ?? '';

    const categoryParam = searchParams.get('category');
    const categoryFilter = categoryParam ?? 'all';

    const publishedParam = searchParams.get('published');
    const publishedFilter: PublishedFilter =
        publishedParam === 'last_7_days' || publishedParam === 'last_30_days' ? publishedParam : 'all';

    const statusParam = searchParams.get('status');
    const statusSegment: StatusSegment =
        statusParam === 'open' || statusParam === 'submitted' || statusParam === 'closed' ? statusParam : 'all';

    const updateParam = useCallback(
        (key: string, value: string, replace = false) => {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    if (!value || value === 'all') {
                        next.delete(key);
                    } else {
                        next.set(key, value);
                    }
                    return next;
                },
                replace ? { replace: true } : undefined,
            );
        },
        [setSearchParams],
    );

    // Search updates replace the entry so fast typing does not spam history;
    // the rest push so the back button steps back through filter changes.
    const setSearch = useCallback((value: string) => updateParam('search', value, true), [updateParam]);
    const setCategoryFilter = useCallback((value: string) => updateParam('category', value), [updateParam]);
    const setPublishedFilter = useCallback(
        (value: PublishedFilter) => updateParam('published', value),
        [updateParam],
    );
    const setStatusSegment = useCallback((value: StatusSegment) => updateParam('status', value), [updateParam]);
    const [view, setView] = useState<ManageView>('grid');

    /** The single expanded card. Only one can be open at a time. */
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchExams = useCallback(async () => {
        setLoadState('loading');
        setLoadError(null);
        try {
            // The server scopes reviewees to their own track, so this walks a set
            // that is already narrow. A single un-paginated request silently
            // capped the list at the server's default of 20.
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
        void fetchExams();
    }, [fetchExams]);

    const categoryOptions = useMemo(
        () => Array.from(new Set(exams.map((exam) => exam.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [exams],
    );

    /** Every filter except the status segment — so the segmented control shows honest counts. */
    const examsBeforeSegment = useMemo(() => {
        const term = search.trim().toLowerCase();
        const sevenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
        const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;

        return exams.filter((exam) => {
            const matchesSearch =
                !term ||
                exam.title.toLowerCase().includes(term) ||
                (exam.description || '').toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter;
            const published = publishedAt(exam);
            const matchesPublished =
                publishedFilter === 'all' ||
                (publishedFilter === 'last_7_days' && published >= sevenDaysAgo) ||
                (publishedFilter === 'last_30_days' && published >= thirtyDaysAgo);
            return matchesSearch && matchesCategory && matchesPublished;
        });
    }, [exams, search, categoryFilter, publishedFilter]);

    const segments = useMemo<ToolbarSegment[]>(() => {
        const counts = examsBeforeSegment.reduce(
            (acc, exam) => {
                acc[examState(exam).segment] += 1;
                return acc;
            },
            { open: 0, submitted: 0, closed: 0 },
        );
        return [
            { value: 'all', label: 'All', count: examsBeforeSegment.length },
            { value: 'open', label: 'Live', count: counts.open },
            { value: 'submitted', label: 'Completed', count: counts.submitted },
            { value: 'closed', label: 'Closed', count: counts.closed },
        ];
    }, [examsBeforeSegment]);

    const visibleExams = useMemo(() => {
        const scoped =
            statusSegment === 'all'
                ? examsBeforeSegment
                : examsBeforeSegment.filter((exam) => examState(exam).segment === statusSegment);
        return [...scoped].sort(compareForBrowse);
    }, [examsBeforeSegment, statusSegment]);

    const clearAllFilters = useCallback(() => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete('search');
            next.delete('category');
            next.delete('published');
            next.delete('status');
            return next;
        });
    }, [setSearchParams]);

    const chips = useMemo(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim().length > 0) {
            next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        }
        if (categoryFilter !== 'all') {
            next.push({
                id: 'category',
                label: `Category: ${categoryFilter}`,
                onClear: () => setCategoryFilter('all'),
            });
        }
        if (publishedFilter !== 'all') {
            next.push({
                id: 'published',
                label: publishedFilter === 'last_7_days' ? 'Published: last 7 days' : 'Published: last 30 days',
                onClear: () => setPublishedFilter('all'),
            });
        }
        return next;
    }, [search, categoryFilter, publishedFilter, setSearch, setCategoryFilter, setPublishedFilter]);

    const filtersActive = chips.length > 0 || statusSegment !== 'all';

    // ── Empty-state selection ────────────────────────────────────────────────
    // Three warm variants. "All completed" only claims the state when the status
    // segment is the thing doing the narrowing — a search that matches nothing is
    // a filter miss, not a celebration.
    const allExamsSubmitted = useMemo(
        () => exams.length > 0 && exams.every((exam) => examState(exam).hasSubmitted),
        [exams],
    );
    const showNoExams = exams.length === 0;
    const showAllCompleted =
        allExamsSubmitted && chips.length === 0 && statusSegment !== 'all' && visibleExams.length === 0;
    const emptyFiltersActive = filtersActive && !showNoExams && !showAllCompleted;

    const emptyIcon = showAllCompleted ? (
        <CheckCircle size={20} className="mx-auto mb-3 text-emerald-500" aria-hidden="true" />
    ) : (
        <BookOpen size={20} className="mx-auto mb-3 text-slate-400" aria-hidden="true" />
    );
    const emptyTitle = showAllCompleted ? "You've completed all exams" : 'No exams available yet';
    const emptyDescription = showAllCompleted
        ? 'Great work! Check back for new ones'
        : 'Check back soon for new exams';
    const filtersIcon = <Search size={20} className="mx-auto mb-3 text-slate-400" aria-hidden="true" />;
    const errorIcon = <AlertTriangle size={20} className="mx-auto mb-3 text-red-500" aria-hidden="true" />;

    const goToExam = useCallback(
        (exam: Exam) => {
            const { hasSubmitted } = examState(exam);
            if (hasSubmitted) {
                const query = exam.latestSubmittedAttemptId ? `?attemptId=${exam.latestSubmittedAttemptId}` : '';
                navigate(`/exams/${exam.id}/result${query}`);
                return;
            }
            navigate(`/exams/${exam.id}/take`);
        },
        [navigate],
    );

    const renderAction = useCallback(
        (exam: Exam, options?: { fullWidth?: boolean }) => {
            const action = actionFor(exam);
            if (!action) return null;

            const base = cn(
                'h-9 gap-1.5 rounded-lg px-3 text-[12px] font-semibold',
                options?.fullWidth ? 'w-full' : '',
            );
            const stop = (handler: () => void) => (event: React.MouseEvent) => {
                event.stopPropagation();
                handler();
            };

            if (action.kind === 'result' && action.canRetake) {
                return (
                    <div className={cn('flex items-center gap-2', options?.fullWidth && 'w-full')}>
                        <Button
                            className={cn(base, 'bg-primary text-white hover:bg-primary/90', options?.fullWidth && 'flex-1')}
                            onClick={stop(() => goToExam(exam))}
                        >
                            <TrendingUp size={13} aria-hidden="true" /> View results
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(base, 'border-slate-200 bg-white text-slate-700')}
                            onClick={stop(() => navigate(`/exams/${exam.id}/take`))}
                        >
                            <RotateCcw size={13} aria-hidden="true" /> Retake
                        </Button>
                    </div>
                );
            }

            return (
                <Button
                    className={cn(base, 'bg-primary text-white hover:bg-primary/90')}
                    onClick={stop(() => goToExam(exam))}
                >
                    {action.kind === 'result' ? (
                        <TrendingUp size={13} aria-hidden="true" />
                    ) : (
                        <Play size={13} aria-hidden="true" />
                    )}
                    {action.label}
                </Button>
            );
        },
        [goToExam, navigate],
    );

    const renderCategoryBadge = useCallback(
        (exam: Exam) => (
            <span
                className={cn(
                    'inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                    categoryToneClasses(exam.category, exam.categoryCode),
                )}
            >
                {exam.category || 'No category'}
            </span>
        ),
        [],
    );

    const renderStatus = useCallback((exam: Exam) => {
        const { tone, label } = statusPresentation(exam);
        return <StatusPill tone={tone} label={label} />;
    }, []);

    // Urgency carries a word, not just a colour — the date string is otherwise
    // identical in both branches, which would make red the sole differentiator.
    const renderDeadline = useCallback(
        (exam: Exam) =>
            isDeadlineSoon(exam.deadline) ? (
                <span className="font-semibold text-red-600">
                    {formatShortDate(exam.deadline, 'No deadline')}
                    <span className="ml-1 font-semibold">· Due soon</span>
                </span>
            ) : (
                <span>{formatShortDate(exam.deadline, 'No deadline')}</span>
            ),
        [],
    );

    const columns = useMemo<ResourceColumn<Exam>[]>(
        () => [
            {
                id: 'title',
                header: 'Exam',
                primary: true,
                sortable: true,
                sortValue: (exam) => exam.title,
                // Sections ride along under the title rather than taking a column
                // of their own, so the table shows exactly what the card shows.
                // Detail lives in the expandable card, so the title is plain text.
                cell: (exam) => (
                    <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-slate-900">{exam.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">{sectionSummary(exam)}</p>
                    </div>
                ),
            },
            {
                id: 'category',
                header: 'Category',
                stacked: true,
                sortable: true,
                sortValue: (exam) => exam.category || '',
                cell: renderCategoryBadge,
                stackedCell: (exam) => exam.category || 'No category',
            },
            {
                id: 'items',
                header: 'Items',
                className: 'w-20 tabular-nums',
                stacked: true,
                sortable: true,
                sortValue: (exam) => exam.questionCount,
                cell: (exam) => exam.questionCount,
                stackedCell: (exam) => `${exam.questionCount} items`,
            },
            {
                id: 'duration',
                header: 'Time',
                className: 'w-20',
                sortable: true,
                sortValue: (exam) => exam.duration,
                cell: (exam) => formatDurationMinutes(exam.duration),
            },
            {
                id: 'deadline',
                header: 'Deadline',
                className: 'w-32',
                stacked: true,
                sortable: true,
                // Undated exams sort last under either direction of "soonest first".
                sortValue: (exam) => (exam.deadline ? new Date(exam.deadline).getTime() : Number.MAX_SAFE_INTEGER),
                cell: renderDeadline,
                stackedCell: (exam) => formatShortDate(exam.deadline, 'No deadline'),
            },
            {
                id: 'published',
                header: 'Published',
                className: 'w-32',
                sortable: true,
                sortValue: (exam) => publishedAt(exam),
                cell: (exam) => formatShortDate(exam.scheduledDate || exam.createdAt, 'Not published'),
            },
            {
                id: 'result',
                header: 'Result',
                className: 'w-24',
                sortable: true,
                sortValue: (exam) => exam.latestSubmittedScore ?? exam.lastScore ?? -1,
                cell: (exam) => {
                    const score = exam.latestSubmittedScore ?? exam.lastScore;
                    if (score == null) {
                        return (
                            <span className="text-slate-500">
                                {examState(exam).attemptsRemaining} left
                            </span>
                        );
                    }
                    return <span className={cn('font-semibold tabular-nums', scoreClasses(score))}>{score}%</span>;
                },
            },
            {
                id: 'status',
                header: 'Status',
                className: 'w-36',
                status: true,
                sortable: true,
                sortValue: (exam) => statusPresentation(exam).label,
                cell: renderStatus,
            },
        ],
        [renderCategoryBadge, renderDeadline, renderStatus],
    );

    const renderCard = useCallback(
        (exam: Exam) => {
            const isExpanded = expandedId === exam.id;
            const { hasSubmitted, hasInProgress, canTake, isScheduled, isGrading } = examState(exam);
            const status = statusPresentation(exam);
            const action = actionFor(exam);
            const progress = progressFor(exam);
            const attemptsCount = exam._count?.attempts;
            const toggle = () => setExpandedId((current) => (current === exam.id ? null : exam.id));

            let supporting: React.ReactNode;
            if (hasSubmitted) {
                const score = exam.latestSubmittedScore ?? exam.lastScore;
                supporting =
                    score != null ? (
                        <p className="text-[12px] text-slate-500">
                            Last score:{' '}
                            <span className="font-semibold tabular-nums text-slate-700">{score}%</span>
                        </p>
                    ) : (
                        <p className="text-[12px] text-slate-500">Submitted</p>
                    );
            } else if (hasInProgress && canTake) {
                supporting = progress ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="font-semibold tabular-nums text-slate-700">
                                {progress.answered} of {progress.total} answered
                            </span>
                            <span className="tabular-nums text-slate-400">
                                {Math.round((progress.answered / progress.total) * 100)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.round((progress.answered / progress.total) * 100)}
                            className="h-1.5"
                        />
                    </div>
                ) : (
                    <p className="text-[12px] text-slate-500">Pick up where you left off</p>
                );
            } else if (isScheduled) {
                supporting = (
                    <p className="text-[12px] text-slate-500">
                        Opens {formatShortDate(exam.scheduledDate, 'soon')}
                    </p>
                );
            } else if (canTake) {
                supporting = <p className="text-[12px] text-slate-500">{dueLabel(exam.deadline)}</p>;
            } else if (isGrading) {
                supporting = <p className="text-[12px] text-slate-500">Awaiting results</p>;
            } else {
                supporting = <p className="text-[12px] text-slate-400">No longer available</p>;
            }

            // Resume / View results are decisive enough to sit on the collapsed
            // card; Take waits for the expanded detail so the grid stays lean.
            const collapsedAction =
                action && (action.kind === 'resume' || action.kind === 'result')
                    ? renderAction(exam)
                    : null;

            return (
                <div
                    onClick={toggle}
                    className={cn(
                        'flex h-full w-full cursor-pointer flex-col gap-2.5 rounded-xl border bg-white p-4 shadow-card transition-all duration-200',
                        isExpanded
                            ? 'border-primary/25 shadow-md'
                            : 'border-slate-200 hover:border-primary/25 hover:shadow-md',
                    )}
                >
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-2">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggle();
                            }}
                            aria-expanded={isExpanded}
                            aria-controls={isExpanded ? `exam-detail-${exam.id}` : undefined}
                            className="min-w-0 flex-1 rounded text-left text-[15px] font-semibold leading-snug text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {exam.title}
                        </button>
                        <StatusPill tone={status.tone} label={status.label} className="shrink-0" />
                    </div>

                    <div>{renderCategoryBadge(exam)}</div>

                    <p className="text-[12px] font-medium tabular-nums text-slate-500">
                        {durationLabel(exam.duration)} · {questionLabel(exam.questionCount)}
                    </p>

                    {/* Description — two lines when collapsed, full when expanded. */}
                    {exam.description && (
                        <p
                            className={cn(
                                'text-[13px] leading-relaxed text-slate-600',
                                !isExpanded && 'line-clamp-2',
                            )}
                        >
                            {exam.description}
                        </p>
                    )}

                    {supporting}

                    {/* Expandable detail */}
                    {isExpanded && (
                        <div
                            id={`exam-detail-${exam.id}`}
                            className="space-y-3 border-t border-slate-100 pt-3"
                        >
                            {exam.sections && exam.sections.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                        Sections
                                    </p>
                                    <ul className="mt-1.5 space-y-1">
                                        {exam.sections.map((section, index) => (
                                            <li
                                                key={section.id ?? `${exam.id}-section-${index}`}
                                                className="flex items-center gap-2 text-[12px] text-slate-600"
                                            >
                                                <span
                                                    className="h-1 w-1 shrink-0 rounded-full bg-slate-300"
                                                    aria-hidden="true"
                                                />
                                                {section.title || `Section ${index + 1}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {attemptsCount != null && attemptsCount > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                    <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
                                        <Users size={13} className="text-slate-400" aria-hidden="true" />
                                        Students recently submitted
                                    </p>
                                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
                                        {attemptsCount} {attemptsCount === 1 ? 'submission' : 'submissions'}
                                    </span>
                                </div>
                            )}

                            {action && <div className="pt-1">{renderAction(exam, { fullWidth: true })}</div>}
                        </div>
                    )}

                    {/* Footer: expand hint + urgent collapsed action */}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <ChevronDown
                                size={12}
                                className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
                            />
                            {isExpanded ? 'Hide details' : 'Details'}
                        </span>
                        {!isExpanded && collapsedAction}
                    </div>
                </div>
            );
        },
        [expandedId, renderAction, renderCategoryBadge],
    );

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <header className="flex flex-col gap-1">
                <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">Your Exams</h1>
                <p className="text-[12px] text-slate-500">Track your progress and continue learning</p>
            </header>

            <ManageToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search exams…"
                searchLabel="Search exams"
                segments={segments}
                segmentValue={statusSegment}
                onSegmentChange={(value) => setStatusSegment(value as StatusSegment)}
                segmentLabel="Filter by exam status"
                inlineFilters={
                    <>
                        {/* Desktop filter layout — hidden on mobile, where the
                            FilterSheet below takes over so the toolbar stays lean. */}
                        <div className="hidden items-center gap-2 sm:flex">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger
                                    className="h-8 w-40 rounded-lg border-slate-200 bg-white text-[12px]"
                                    aria-label="Filter by category"
                                >
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-[12px]">
                                        All categories
                                    </SelectItem>
                                    {categoryOptions.map((category) => (
                                        <SelectItem key={category} value={category} className="text-[12px]">
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-[12px] font-semibold"
                                    >
                                        <SlidersHorizontal size={13} aria-hidden="true" /> Filters
                                        {chips.length > 0 && (
                                            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                                                {chips.length}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 rounded-xl p-3">
                                    <div className="space-y-3">
                                        <FilterField label="Date published">
                                            <Select
                                                value={publishedFilter}
                                                onValueChange={(value) =>
                                                    setPublishedFilter(value as PublishedFilter)
                                                }
                                            >
                                                <SelectTrigger
                                                    className="h-8 rounded-lg border-slate-200 text-[12px]"
                                                    aria-label="Filter by publish date"
                                                >
                                                    <SelectValue placeholder="All dates" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-[12px]">All dates</SelectItem>
                                                    <SelectItem value="last_7_days" className="text-[12px]">Last 7 days</SelectItem>
                                                    <SelectItem value="last_30_days" className="text-[12px]">Last 30 days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FilterField>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Mobile filter sheet — trigger hidden on desktop. */}
                        <FilterSheet
                            categories={categoryOptions}
                            category={categoryFilter}
                            onCategoryChange={setCategoryFilter}
                            published={publishedFilter}
                            onPublishedChange={setPublishedFilter}
                            resultCount={visibleExams.length}
                        />
                    </>
                }
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                view={view}
                onViewChange={setView}
            />

            {view === 'table' ? (
                <ResourceTable
                    rows={visibleExams}
                    columns={columns}
                    getRowId={(exam) => exam.id}
                    caption="Mock exams available to you"
                    state={loadState}
                    error={loadError}
                    errorIcon={errorIcon}
                    errorDescription="Please try again later"
                    onRetry={() => void fetchExams()}
                    filtersActive={emptyFiltersActive}
                    onClearFilters={clearAllFilters}
                    filtersIcon={filtersIcon}
                    filtersTitle="No exams match your filters"
                    filtersDescription="Try adjusting your search or filters"
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                    emptyIcon={emptyIcon}
                    rowActions={(exam) => renderAction(exam)}
                    resetKey={`${search}|${categoryFilter}|${publishedFilter}|${statusSegment}`}
                />
            ) : (
                <div className="mx-auto w-full max-w-5xl">
                    <ResourceGrid
                        rows={visibleExams}
                        getRowId={(exam) => exam.id}
                        renderCard={renderCard}
                        gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        caption="Mock exams available to you"
                        state={loadState}
                        error={loadError}
                        errorIcon={errorIcon}
                        errorDescription="Please try again later"
                        onRetry={() => void fetchExams()}
                        filtersActive={emptyFiltersActive}
                        onClearFilters={clearAllFilters}
                        filtersIcon={filtersIcon}
                        filtersTitle="No exams match your filters"
                        filtersDescription="Try adjusting your search or filters"
                        emptyTitle={emptyTitle}
                        emptyDescription={emptyDescription}
                        emptyIcon={emptyIcon}
                    />
                </div>
            )}
        </div>
    );
};

export default ExamsPage;
