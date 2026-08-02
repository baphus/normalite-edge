import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Play, RotateCcw, TrendingUp } from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { formatDurationMinutes, formatShortDate } from '@/lib/formatters';
import { categoryToneClasses } from '@/lib/categoryTone';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    userAttemptStatus?: 'IN_PROGRESS' | 'SUBMITTED' | string;
    latestSubmittedAttemptId?: string | null;
    latestSubmittedScore?: number | null;
    deadline?: string;
    scheduledDate?: string;
    lastScore?: number;
    sections?: Array<{ id?: string; title?: string; orderNo?: number }>;
    createdAt?: string;
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
    const isLive = exam.status === 'LIVE';
    const canTake = isLive && !hasSubmitted;
    const segment: Exclude<StatusSegment, 'all'> = hasSubmitted ? 'submitted' : canTake ? 'open' : 'closed';
    return { attemptsRemaining, hasSubmitted, hasInProgress, isLive, canTake, segment };
}

function statusPresentation(exam: Exam): { tone: StatusTone; label: string } {
    const { hasSubmitted, hasInProgress, canTake, isLive } = examState(exam);
    if (hasSubmitted) return { tone: 'live', label: 'Submitted' };
    if (hasInProgress) return { tone: 'draft', label: 'In progress' };
    if (canTake) return { tone: 'live', label: 'Available' };
    return { tone: isLive ? 'archived' : 'closed', label: isLive ? 'No attempts left' : 'Closed' };
}

const DEADLINE_SOON_MS = 1000 * 60 * 60 * 48;

function isDeadlineSoon(deadline?: string) {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - Date.now();
    return diff > 0 && diff < DEADLINE_SOON_MS;
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

/** The section strip shown under the title, in both forms. */
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

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>('all');
    const [statusSegment, setStatusSegment] = useState<StatusSegment>('all');
    const [view, setView] = useState<ManageView>('grid');

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
            setLoadError('We could not load your exams.');
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
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'submitted', label: 'Submitted', count: counts.submitted },
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
        setSearch('');
        setCategoryFilter('all');
        setPublishedFilter('all');
        setStatusSegment('all');
    }, []);

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
    }, [search, categoryFilter, publishedFilter]);

    const filtersActive = chips.length > 0 || statusSegment !== 'all';

    const goToExam = useCallback(
        (exam: Exam) => {
            const { hasSubmitted, hasInProgress, canTake, isLive } = examState(exam);
            if (hasSubmitted) {
                const query = exam.latestSubmittedAttemptId ? `?attemptId=${exam.latestSubmittedAttemptId}` : '';
                navigate(`/exams/${exam.id}/result${query}`);
                return;
            }
            if (canTake || (hasInProgress && isLive)) {
                navigate(`/exams/${exam.id}/take`);
                return;
            }
            navigate(`/exams/${exam.id}/view`);
        },
        [navigate],
    );

    const renderAction = useCallback(
        (exam: Exam, options?: { fullWidth?: boolean }) => {
            const { hasSubmitted, hasInProgress, canTake } = examState(exam);
            const base = cn(
                'h-8 gap-1.5 rounded-lg px-3 text-[12px] font-semibold',
                options?.fullWidth ? 'w-full' : '',
            );

            if (hasSubmitted) {
                return (
                    <Button
                        className={cn(base, 'bg-emerald-700 text-white hover:bg-emerald-800')}
                        onClick={() => goToExam(exam)}
                    >
                        <TrendingUp size={13} aria-hidden="true" /> View result
                    </Button>
                );
            }
            if (hasInProgress && canTake) {
                return (
                    <Button
                        className={cn(base, 'bg-primary text-white hover:bg-primary/90')}
                        onClick={() => goToExam(exam)}
                    >
                        <RotateCcw size={13} aria-hidden="true" /> Resume exam
                    </Button>
                );
            }
            if (canTake) {
                return (
                    <Button
                        className={cn(base, 'bg-primary text-white hover:bg-primary/90')}
                        onClick={() => goToExam(exam)}
                    >
                        <Play size={13} aria-hidden="true" /> Take exam
                    </Button>
                );
            }
            return (
                <Button
                    variant="outline"
                    className={cn(base, 'border-slate-200 bg-white text-slate-700')}
                    onClick={() => goToExam(exam)}
                >
                    <Eye size={13} aria-hidden="true" /> View
                </Button>
            );
        },
        [goToExam],
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
                cell: (exam) => (
                    <div className="min-w-0">
                        <Link
                            to={`/exams/${exam.id}/view`}
                            className="line-clamp-2 font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {exam.title}
                        </Link>
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
            const { attemptsRemaining, hasSubmitted } = examState(exam);
            const score = exam.latestSubmittedScore ?? exam.lastScore;

            return (
                <div className="flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-primary/30">
                    <div className="flex items-start justify-between gap-2">
                        {renderCategoryBadge(exam)}
                        {renderStatus(exam)}
                    </div>

                    <div className="min-w-0">
                        <Link
                            to={`/exams/${exam.id}/view`}
                            className="line-clamp-2 text-[13px] font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {exam.title}
                        </Link>
                        <p className="mt-0.5 truncate text-[12px] text-slate-400">{sectionSummary(exam)}</p>
                    </div>

                    <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[12px]">
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Items</dt>
                            <dd className="font-semibold tabular-nums text-slate-700">{exam.questionCount}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Time</dt>
                            <dd className="font-semibold text-slate-700">{formatDurationMinutes(exam.duration)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Deadline</dt>
                            <dd className="font-semibold text-slate-700">{renderDeadline(exam)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Published</dt>
                            <dd className="font-semibold text-slate-700">
                                {formatShortDate(exam.scheduledDate || exam.createdAt, 'Not published')}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">{hasSubmitted && score != null ? 'Score' : 'Attempts'}</dt>
                            <dd
                                className={cn(
                                    'font-semibold tabular-nums',
                                    hasSubmitted && score != null ? scoreClasses(score) : 'text-slate-700',
                                )}
                            >
                                {hasSubmitted && score != null ? `${score}%` : attemptsRemaining}
                            </dd>
                        </div>
                    </dl>

                    <div className="pt-1">{renderAction(exam, { fullWidth: true })}</div>
                </div>
            );
        },
        [renderAction, renderCategoryBadge, renderDeadline, renderStatus],
    );

    const emptyDescription =
        statusSegment === 'submitted'
            ? 'Exams you have completed will appear here.'
            : 'No exams are assigned to your program yet.';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Mock exams"
                description="Browse and take practice exams for your LET preparation."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search exams…"
                searchLabel="Search exams"
                segments={segments}
                segmentValue={statusSegment}
                onSegmentChange={(value) => setStatusSegment(value as StatusSegment)}
                segmentLabel="Filter by exam status"
                inlineFilters={
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
                }
                popoverFilters={
                    <FilterField label="Date published">
                        <Select
                            value={publishedFilter}
                            onValueChange={(value) => setPublishedFilter(value as PublishedFilter)}
                        >
                            <SelectTrigger className="h-8 rounded-lg border-slate-200 text-[12px]" aria-label="Filter by publish date">
                                <SelectValue placeholder="All dates" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-[12px]">All dates</SelectItem>
                                <SelectItem value="last_7_days" className="text-[12px]">Last 7 days</SelectItem>
                                <SelectItem value="last_30_days" className="text-[12px]">Last 30 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
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
                    onRetry={() => void fetchExams()}
                    filtersActive={filtersActive}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No exams yet"
                    emptyDescription={emptyDescription}
                    rowActions={(exam) => renderAction(exam)}
                    resetKey={`${search}|${categoryFilter}|${publishedFilter}|${statusSegment}`}
                />
            ) : (
                <ResourceGrid
                    rows={visibleExams}
                    getRowId={(exam) => exam.id}
                    renderCard={renderCard}
                    caption="Mock exams available to you"
                    state={loadState}
                    error={loadError}
                    onRetry={() => void fetchExams()}
                    filtersActive={filtersActive}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No exams yet"
                    emptyDescription={emptyDescription}
                />
            )}
        </div>
    );
};

export default ExamsPage;
