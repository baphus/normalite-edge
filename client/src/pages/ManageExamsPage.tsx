import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    BookOpen,
    Eye,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ManageToolbar,
    FilterField,
    type ActiveFilterChip,
    type ManageView,
    type ToolbarSegment,
} from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { CollectionEmpty, CollectionError } from '@/components/manage/CollectionState';
import api from '@/lib/axios';
import { fetchAllPages, extractListPayload } from '@/lib/fetchAllPages';
import { formatShortDate, formatDurationMinutes } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Exam {
    id: string;
    title: string;
    category: string;
    program: string;
    tracks: Array<{ id: string; name: string; code?: string | null }>;
    questionCount: number;
    duration: number;
    status: 'live' | 'draft' | 'archived' | 'closed';
    maxAttempts: number;
    publishedAt?: string;
    deadline?: string;
    closeOnDeadline: boolean;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    sectionTitles: string[];
}

interface TrackOption {
    id: string;
    name: string;
    code?: string | null;
}

interface ManagedExamApi {
    id: string;
    title: string;
    category?: string;
    program_track?: string | null;
    totalItems?: number;
    timeLimit?: number;
    status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
    maxAttempts?: number | null;
    scheduledDate?: string | null;
    createdAt?: string;
    deadline?: string | null;
    closeOnDeadline?: boolean;
    subject?: string;
    categoryCode?: string | null;
    questions?: Array<{
        questionText?: string;
        imageUrl?: string;
        choiceA?: string;
        choiceB?: string;
        choiceC?: string;
        choiceD?: string;
        correctChoice?: string;
        rationalization?: string;
        sectionId?: string;
        section?: { id?: string; title?: string } | null;
    }>;
    tracks?: Array<{ id: string; name: string; code?: string | null }>;
    sections?: Array<{ id?: string; title?: string; orderNo?: number }>;
    creator?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        avatarUrl?: string;
        profilePicture?: string;
    };
}

const STATUS_TO_API: Record<Exam['status'], 'LIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'> = {
    live: 'LIVE',
    draft: 'DRAFT',
    closed: 'CLOSED',
    archived: 'ARCHIVED',
};

const STATUS_LABEL: Record<Exam['status'], string> = {
    live: 'Live',
    draft: 'Draft',
    closed: 'Closed',
    archived: 'Archived',
};

const STATUS_TONE: Record<Exam['status'], StatusTone> = {
    live: 'live',
    draft: 'draft',
    closed: 'closed',
    archived: 'archived',
};

/** Explains the consequence of each transition so the confirm is worth reading. */
const STATUS_CONSEQUENCE: Record<Exam['status'], string> = {
    live: 'Reviewees will be able to take this exam, and it can no longer be edited.',
    draft: 'This exam will be hidden from reviewees and become editable again.',
    closed: 'Reviewees will no longer be able to start or continue this exam.',
    archived: 'This exam will be hidden from reviewees and moved out of active use.',
};

const ALL_PROGRAMS_FILTER = '__all_programs__';
const LEGACY_PROGRAM_PREFIX = '__legacy__:';


const getAuthorAvatar = (name: string, creator?: ManagedExamApi['creator']) => {
    if (creator?.avatarUrl) return creator.avatarUrl;
    if (creator?.profilePicture) return creator.profilePicture;
    const encoded = encodeURIComponent(name || 'User');
    return `https://ui-avatars.com/api/?name=${encoded}&background=random&rounded=true`;
};

const resolveProgramLabel = (programText?: string | null, tracks: TrackOption[] = []) => {
    if (!programText) return 'All Programs';
    const parts = programText.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return 'All Programs';

    return parts
        .map((part) => {
            const match = tracks.find(
                (track) =>
                    track.name.toLowerCase() === part.toLowerCase()
                    || (track.code || '').toLowerCase() === part.toLowerCase(),
            );
            return match?.name || part;
        })
        .join(', ');
};

const mapExam = (exam: ManagedExamApi, tracks: TrackOption[]): Exam => {
    const authorName =
        exam.creator?.name
        || `${exam.creator?.firstName || ''} ${exam.creator?.lastName || ''}`.trim()
        || 'Unknown';

    return {
        id: exam.id,
        title: exam.title,
        category: exam.category || exam.categoryCode || 'No Category',
        program:
            exam.tracks && exam.tracks.length > 0
                ? exam.tracks.map((track) => track.name).join(', ')
                : resolveProgramLabel(exam.program_track, tracks),
        questionCount: exam.totalItems || 0,
        duration: exam.timeLimit || 0,
        status:
            exam.status === 'LIVE' || exam.status === 'PUBLISHED'
                ? 'live'
                : exam.status === 'ARCHIVED'
                    ? 'archived'
                    : exam.status === 'CLOSED'
                        ? 'closed'
                        : 'draft',
        maxAttempts: exam.maxAttempts ?? 1,
        publishedAt: exam.scheduledDate || exam.createdAt || undefined,
        deadline: exam.deadline || exam.scheduledDate || undefined,
        closeOnDeadline: Boolean(exam.closeOnDeadline),
        tracks: exam.tracks || [],
        authorId: exam.creator?.id || '',
        authorName,
        authorAvatar: getAuthorAvatar(authorName, exam.creator),
        sectionTitles: (exam.sections || [])
            .slice()
            .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
            .map((section) => section.title?.trim())
            .filter((title): title is string => Boolean(title)),
    };
};

const ManageExamsPage: React.FC = () => {
    const { user } = useAuth();
    const isReviewer = user?.role === 'REVIEWER';

    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [trackOptions, setTrackOptions] = useState<TrackOption[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [view, setView] = useState<ManageView>('table');

    const [statusFilter, setStatusFilter] = useState<'all' | Exam['status']>('all');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [programFilter, setProgramFilter] = useState('all');
    const [authorFilter, setAuthorFilter] = useState('all');
    // Lazy initialiser covers a remount where the session is already known; the
    // render-time guard below covers the first load, where `user` is still null.
    const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'others'>(
        () => (isReviewer ? 'mine' : 'all'),
    );
    const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'with-deadline' | 'without-deadline'>('all');
    const [publishedFilter, setPublishedFilter] = useState<'all' | 'last_7_days' | 'last_30_days'>('all');
    const [autoCloseFilter, setAutoCloseFilter] = useState<'all' | 'on' | 'off'>('all');

    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
    const [actionExamId, setActionExamId] = useState<string | null>(null);
    const [statusChange, setStatusChange] = useState<{ exam: Exam; next: Exam['status'] } | null>(null);

    // Reviewers land on their own exams; admins oversee everything. The role arrives
    // asynchronously with the session, so this reacts to it during render rather than
    // in an effect, avoiding a paint of the wrong default.
    const [lastKnownIsReviewer, setLastKnownIsReviewer] = useState(isReviewer);
    if (lastKnownIsReviewer !== isReviewer) {
        setLastKnownIsReviewer(isReviewer);
        setOwnershipFilter(isReviewer ? 'mine' : 'all');
    }

    const fetchManagedExams = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [examsResult, tracksResponse] = await Promise.all([
                fetchAllPages<ManagedExamApi>((page, limit) =>
                    api.get('/exams/managed', { params: { page, limit } }),
                ),
                api.get('/tracks'),
            ]);

            const tracks = extractListPayload<TrackOption>(tracksResponse);
            setTrackOptions(tracks);
            setExams(examsResult.items.map((exam) => mapExam(exam, tracks)));

            if (examsResult.truncated) {
                toast.warning('This exam library is unusually large — some exams may not be shown.');
            }
        } catch (error) {
            console.error('Failed to fetch managed exams', error);
            setLoadError('Could not load exams');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchManagedExams();
    }, [fetchManagedExams]);

    const fetchCategories = useCallback(() => {
        api.get('/categories')
            .then((response) => setCategories(extractListPayload<{ id: string; name: string }>(response)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const categoryOptions = useMemo(
        () =>
            Array.from(
                new Set([...exams.map((exam) => exam.category), ...categories.map((category) => category.name)]),
            ).sort((a, b) => a.localeCompare(b)),
        [exams, categories],
    );

    const programOptions = useMemo(() => {
        const tracked = Array.from(
            new Map(exams.flatMap((exam) => exam.tracks || []).map((track) => [track.id, track])).values(),
        ).sort((a, b) => a.name.localeCompare(b.name));

        const legacy = Array.from(
            new Set(
                exams
                    .filter((exam) => (exam.tracks || []).length === 0)
                    .map((exam) => exam.program)
                    .filter((program) => program && program !== 'All Programs'),
            ),
        ).sort((a, b) => a.localeCompare(b));

        return { tracked, legacy };
    }, [exams]);

    const authorOptions = useMemo(
        () =>
            Array.from(
                new Set(exams.map((exam) => exam.authorName).filter((name) => name && name.trim().length > 0)),
            ).sort((a, b) => a.localeCompare(b)),
        [exams],
    );

    /** Every filter except ownership — so the segmented control can show honest counts. */
    const examsBeforeOwnership = useMemo(
        () =>
            exams.filter((exam) => {
                const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
                const matchesSearch = exam.title.toLowerCase().includes(search.trim().toLowerCase());
                const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter;
                const matchesProgram =
                    programFilter === 'all'
                    || (programFilter === ALL_PROGRAMS_FILTER
                        && ((exam.tracks || []).length === 0 || exam.program === 'All Programs'))
                    || (programFilter.startsWith(LEGACY_PROGRAM_PREFIX)
                        && exam.program === programFilter.slice(LEGACY_PROGRAM_PREFIX.length))
                    || (exam.tracks || []).some((track) => track.id === programFilter);
                const matchesAuthor = authorFilter === 'all' || exam.authorName === authorFilter;
                const matchesDeadline =
                    deadlineFilter === 'all'
                    || (deadlineFilter === 'with-deadline' && Boolean(exam.deadline))
                    || (deadlineFilter === 'without-deadline' && !exam.deadline);

                const publishedTimestamp = new Date(exam.publishedAt || 0).getTime();
                const sevenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
                const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
                const matchesPublished =
                    publishedFilter === 'all'
                    || (publishedFilter === 'last_7_days' && publishedTimestamp >= sevenDaysAgo)
                    || (publishedFilter === 'last_30_days' && publishedTimestamp >= thirtyDaysAgo);

                const matchesAutoClose =
                    autoCloseFilter === 'all'
                    || (autoCloseFilter === 'on' && exam.closeOnDeadline)
                    || (autoCloseFilter === 'off' && !exam.closeOnDeadline);

                return (
                    matchesStatus
                    && matchesSearch
                    && matchesCategory
                    && matchesProgram
                    && matchesAuthor
                    && matchesDeadline
                    && matchesPublished
                    && matchesAutoClose
                );
            }),
        [
            exams,
            statusFilter,
            search,
            categoryFilter,
            programFilter,
            authorFilter,
            deadlineFilter,
            publishedFilter,
            autoCloseFilter,
        ],
    );

    const segments = useMemo<ToolbarSegment[] | undefined>(() => {
        if (!isReviewer) return undefined;
        return [
            {
                value: 'mine',
                label: 'Mine',
                count: examsBeforeOwnership.filter((exam) => exam.authorId === user?.id).length,
            },
            { value: 'all', label: 'All', count: examsBeforeOwnership.length },
            {
                value: 'others',
                label: 'Others',
                count: examsBeforeOwnership.filter((exam) => exam.authorId !== user?.id).length,
            },
        ];
    }, [isReviewer, examsBeforeOwnership, user?.id]);

    /** Newest first by default; column headers take over once the user sorts. */
    const visibleExams = useMemo(() => {
        const scoped = examsBeforeOwnership.filter((exam) => {
            if (!isReviewer || ownershipFilter === 'all') return true;
            if (ownershipFilter === 'mine') return exam.authorId === user?.id;
            return exam.authorId !== user?.id;
        });

        return [...scoped].sort(
            (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
        );
    }, [examsBeforeOwnership, isReviewer, ownershipFilter, user?.id]);

    const clearAllFilters = useCallback(() => {
        setStatusFilter('all');
        setCategoryFilter('all');
        setProgramFilter('all');
        setAuthorFilter('all');
        setDeadlineFilter('all');
        setPublishedFilter('all');
        setAutoCloseFilter('all');
        setSearch('');
    }, []);

    const programLabelFor = useCallback(
        (value: string) => {
            if (value === ALL_PROGRAMS_FILTER) return 'All programs (public)';
            if (value.startsWith(LEGACY_PROGRAM_PREFIX)) {
                return resolveProgramLabel(value.slice(LEGACY_PROGRAM_PREFIX.length), trackOptions);
            }
            return programOptions.tracked.find((track) => track.id === value)?.name || value;
        },
        [programOptions.tracked, trackOptions],
    );

    const chips = useMemo(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim().length > 0) {
            next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        }
        if (statusFilter !== 'all') {
            next.push({
                id: 'status',
                label: `Status: ${STATUS_LABEL[statusFilter]}`,
                onClear: () => setStatusFilter('all'),
            });
        }
        if (categoryFilter !== 'all') {
            next.push({
                id: 'category',
                label: `Category: ${categoryFilter}`,
                onClear: () => setCategoryFilter('all'),
            });
        }
        if (programFilter !== 'all') {
            next.push({
                id: 'program',
                label: `Visible to: ${programLabelFor(programFilter)}`,
                onClear: () => setProgramFilter('all'),
            });
        }
        if (authorFilter !== 'all') {
            next.push({ id: 'author', label: `Author: ${authorFilter}`, onClear: () => setAuthorFilter('all') });
        }
        if (deadlineFilter !== 'all') {
            next.push({
                id: 'deadline',
                label: deadlineFilter === 'with-deadline' ? 'With deadline' : 'Without deadline',
                onClear: () => setDeadlineFilter('all'),
            });
        }
        if (publishedFilter !== 'all') {
            next.push({
                id: 'published',
                label: publishedFilter === 'last_7_days' ? 'Published: last 7 days' : 'Published: last 30 days',
                onClear: () => setPublishedFilter('all'),
            });
        }
        if (autoCloseFilter !== 'all') {
            next.push({
                id: 'autoclose',
                label: `Close on deadline: ${autoCloseFilter === 'on' ? 'On' : 'Off'}`,
                onClear: () => setAutoCloseFilter('all'),
            });
        }
        return next;
    }, [
        search,
        statusFilter,
        categoryFilter,
        programFilter,
        authorFilter,
        deadlineFilter,
        publishedFilter,
        autoCloseFilter,
        programLabelFor,
    ]);

    const canManageExam = useCallback(
        (exam: Exam) => user?.role === 'ADMIN' || exam.authorId === user?.id,
        [user?.id, user?.role],
    );

    const canEditExam = useCallback(
        (exam: Exam) => exam.status !== 'live' && canManageExam(exam),
        [canManageExam],
    );

    const getDisplayAuthorName = useCallback(
        (exam: Exam) => (isReviewer && exam.authorId === user?.id ? 'You' : exam.authorName),
        [isReviewer, user?.id],
    );

    const handleDelete = async () => {
        if (!examToDelete) return;
        const target = examToDelete;
        setExamToDelete(null);
        try {
            await api.delete(`/exams/${target.id}`);
            setExams((prev) => prev.filter((exam) => exam.id !== target.id));
            toast.success('Exam deleted successfully.');
        } catch (error) {
            console.error('Failed to delete exam', error);
            toast.error('Failed to delete exam. Please try again.');
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusChange) return;
        const { exam, next } = statusChange;
        setStatusChange(null);
        setActionExamId(exam.id);
        try {
            await api.put(`/exams/${exam.id}`, { status: STATUS_TO_API[next] });
            setExams((prev) =>
                prev.map((candidate) => (candidate.id === exam.id ? { ...candidate, status: next } : candidate)),
            );
            toast.success(`Exam moved to ${STATUS_LABEL[next].toLowerCase()}.`);
        } catch (error) {
            console.error('Failed to update exam status', error);
            toast.error('Failed to update exam status. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const handleDuplicate = useCallback(async (examId: string) => {
        setActionExamId(examId);
        try {
            const detailResponse = await api.get(`/exams/${examId}?questions=true`);
            const exam = detailResponse.data?.data as ManagedExamApi;
            const questions = exam.questions || [];

            const sectionMap = new Map(
                (exam.sections || [])
                    .map((section) => [section.id, section.title?.trim()])
                    .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
            );

            const sectionTitles = (exam.sections || [])
                .slice()
                .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                .map((section) => section.title?.trim())
                .filter((title): title is string => Boolean(title));

            const payload = {
                title: `${exam.title} (Copy)`,
                subject: exam.subject || 'General Education',
                categoryId: exam.categoryCode || null,
                trackIds: exam.tracks?.map((track) => track.id) || [],
                timeLimit: exam.timeLimit || 60,
                isPublished: false,
                sections: sectionTitles.length > 0 ? sectionTitles : undefined,
                questions: questions.map((question) => ({
                    text: question.questionText || 'Untitled question',
                    imageUrl: question.imageUrl || undefined,
                    choices: [
                        question.choiceA || '',
                        question.choiceB || '',
                        question.choiceC || '',
                        question.choiceD || '',
                    ],
                    correctAnswer: (question.correctChoice || 'A').toUpperCase(),
                    explanation: question.rationalization || undefined,
                    section:
                        question.section?.title?.trim() || sectionMap.get(question.sectionId || '') || undefined,
                })),
            };

            const createResponse = await api.post('/exams', payload);
            const created = createResponse.data?.data as ManagedExamApi;
            const nextExam = mapExam(created, trackOptions);

            setExams((prev) => [
                {
                    ...nextExam,
                    status: 'draft',
                    questionCount: created.totalItems || payload.questions.length,
                    duration: created.timeLimit || payload.timeLimit,
                    authorId: created.creator?.id || user?.id || '',
                },
                ...prev,
            ]);
            toast.success('Exam duplicated as draft.');
        } catch (error) {
            console.error('Failed to duplicate exam', error);
            toast.error('Failed to duplicate exam. Please try again.');
        } finally {
            setActionExamId(null);
        }
    }, [trackOptions, user?.id]);

    const handleExportToStudyMaterial = useCallback(async (examId: string) => {
        setActionExamId(examId);
        try {
            const response = await api.post(`/exams/${examId}/export-to-deck`);
            const deck = response.data?.data as { title?: string } | undefined;
            toast.success(
                deck?.title
                    ? `Exported to study materials as "${deck.title}".`
                    : 'Mock exam exported to study materials.',
            );
        } catch (error: any) {
            console.error('Failed to export exam to study materials', error);
            toast.error(
                error?.response?.data?.message
                    || 'Failed to export exam to study materials. Please try again.',
            );
        } finally {
            setActionExamId(null);
        }
    }, []);

    const renderStatusCell = useCallback(
        (exam: Exam) => {
            const pill = <StatusPill tone={STATUS_TONE[exam.status]} label={STATUS_LABEL[exam.status]} />;
            if (!canManageExam(exam)) return pill;

            const transitions = (Object.keys(STATUS_LABEL) as Exam['status'][]).filter(
                (status) => status !== exam.status,
            );

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            disabled={actionExamId === exam.id}
                            aria-label={`Change status of ${exam.title}. Currently ${STATUS_LABEL[exam.status]}`}
                            className="inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-50"
                        >
                            {pill}
                            <ChevronDown size={11} className="text-slate-400" aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 rounded-lg">
                        {transitions.map((status) => (
                            <DropdownMenuItem
                                key={status}
                                onClick={() => setStatusChange({ exam, next: status })}
                                className="gap-2 py-2 text-[12px] font-semibold"
                            >
                                Move to {STATUS_LABEL[status].toLowerCase()}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        [actionExamId, canManageExam],
    );

    const renderRowActions = useCallback(
        (exam: Exam) => {
            const manageable = canManageExam(exam);
            const editable = canEditExam(exam);

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                            aria-label={`Actions for ${exam.title}`}
                            disabled={actionExamId === exam.id}
                        >
                            <MoreHorizontal size={15} aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-lg">
                        <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2 text-[12px] font-semibold">
                            <Link to={`/manage-exams/${exam.id}/view`}>
                                <Eye size={13} aria-hidden="true" /> View details
                            </Link>
                        </DropdownMenuItem>
                        {editable && (
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 py-2 text-[12px] font-semibold">
                                <Link to={`/manage-exams/${exam.id}/edit`}>
                                    <Edit size={13} aria-hidden="true" /> Edit exam
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {manageable && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="gap-2 py-2 text-[12px] font-semibold"
                                    onClick={() => handleDuplicate(exam.id)}
                                >
                                    <Copy size={13} aria-hidden="true" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 py-2 text-[12px] font-semibold"
                                    onClick={() => handleExportToStudyMaterial(exam.id)}
                                >
                                    <BookOpen size={13} aria-hidden="true" /> Export as study material
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="gap-2 py-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                                    onClick={() => setExamToDelete(exam)}
                                >
                                    <Trash2 size={13} aria-hidden="true" /> Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        [actionExamId, canEditExam, canManageExam, handleDuplicate, handleExportToStudyMaterial],
    );

    const columns = useMemo<ResourceColumn<Exam>[]>(
        () => [
            {
                id: 'title',
                header: 'Title',
                primary: true,
                sortable: true,
                sortValue: (exam) => exam.title,
                className: 'min-w-[260px]',
                cell: (exam) => (
                    <div className="flex min-w-0 items-start gap-2">
                        <Avatar className="mt-0.5 hidden h-5 w-5 shrink-0 lg:flex">
                            <AvatarImage src={exam.authorAvatar} alt="" />
                            <AvatarFallback className="text-[11px] font-semibold">
                                {getDisplayAuthorName(exam).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <Link
                                to={`/manage-exams/${exam.id}/view`}
                                className="block truncate font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                            >
                                {exam.title}
                            </Link>
                            <p className="mt-0.5 truncate text-[12px] text-slate-400">
                                {getDisplayAuthorName(exam)} ·{' '}
                                {exam.tracks.length > 0
                                    ? exam.tracks.map((track) => track.name).join(', ')
                                    : exam.program || 'All programs'}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                status: true,
                sortable: true,
                sortValue: (exam) => exam.status,
                className: 'w-[130px]',
                cell: renderStatusCell,
            },
            {
                id: 'category',
                header: 'Category',
                sortable: true,
                stacked: true,
                sortValue: (exam) => exam.category,
                className: 'w-[150px]',
                cell: (exam) => <span className="block truncate">{exam.category}</span>,
            },
            {
                id: 'items',
                header: 'Items',
                sortable: true,
                stacked: true,
                sortValue: (exam) => exam.questionCount,
                className: 'w-[80px] tabular-nums',
                cell: (exam) => exam.questionCount,
                stackedCell: (exam) => `${exam.questionCount} items`,
            },
            {
                id: 'duration',
                header: 'Time',
                sortable: true,
                stacked: true,
                sortValue: (exam) => exam.duration,
                className: 'w-[80px] whitespace-nowrap',
                cell: (exam) => formatDurationMinutes(exam.duration),
            },
            {
                id: 'deadline',
                header: 'Deadline',
                sortable: true,
                stacked: true,
                sortValue: (exam) => new Date(exam.deadline || 0).getTime(),
                className: 'w-[130px] whitespace-nowrap',
                cell: (exam) => (
                    <span className="inline-flex items-center gap-1">
                        {formatShortDate(exam.deadline)}
                        {exam.deadline && exam.closeOnDeadline && (
                            <span
                                title="Closes automatically on the deadline"
                                className="rounded bg-blue-50 px-1 text-[11px] font-semibold text-blue-600"
                            >
                                auto
                            </span>
                        )}
                    </span>
                ),
                stackedCell: (exam) => (exam.deadline ? `due ${formatShortDate(exam.deadline)}` : 'no deadline'),
            },
        ],
        [getDisplayAuthorName, renderStatusCell],
    );

    const createAction = (
        <Button asChild className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90">
            <Link to="/manage-exams/create">
                <Plus size={13} aria-hidden="true" /> Create exam
            </Link>
        </Button>
    );

    const tableState = loading ? 'loading' : loadError ? 'error' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Exam library"
                description="Manage and organise all LET preparation exams."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search exams…"
                searchLabel="Search exams"
                segments={segments}
                segmentValue={ownershipFilter}
                onSegmentChange={(value) => setOwnershipFilter(value as typeof ownershipFilter)}
                segmentLabel="Filter by owner"
                inlineFilters={
                    <>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                            <SelectTrigger className="h-8 w-[130px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by status">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-8 w-[160px] rounded-lg border-slate-200 bg-white text-[12px]" aria-label="Filter by category">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categoryOptions.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                }
                popoverFilters={
                    <>
                        <FilterField label="Visible to">
                            <Select value={programFilter} onValueChange={setProgramFilter}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by program visibility">
                                    <SelectValue placeholder="Visible to" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All programs</SelectItem>
                                    <SelectItem value={ALL_PROGRAMS_FILTER}>All programs (public)</SelectItem>
                                    {programOptions.tracked.map((track) => (
                                        <SelectItem key={track.id} value={track.id}>
                                            {track.name}
                                        </SelectItem>
                                    ))}
                                    {programOptions.legacy.map((program) => (
                                        <SelectItem
                                            key={`${LEGACY_PROGRAM_PREFIX}${program}`}
                                            value={`${LEGACY_PROGRAM_PREFIX}${program}`}
                                        >
                                            {resolveProgramLabel(program, trackOptions)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FilterField>
                        <FilterField label="Author">
                            <Select value={authorFilter} onValueChange={setAuthorFilter}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by author">
                                    <SelectValue placeholder="Author" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All authors</SelectItem>
                                    {authorOptions.map((author) => (
                                        <SelectItem key={author} value={author}>
                                            {author}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FilterField>
                        <FilterField label="Deadline">
                            <Select value={deadlineFilter} onValueChange={(value) => setDeadlineFilter(value as typeof deadlineFilter)}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by deadline">
                                    <SelectValue placeholder="Deadline" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All deadlines</SelectItem>
                                    <SelectItem value="with-deadline">With deadline</SelectItem>
                                    <SelectItem value="without-deadline">Without deadline</SelectItem>
                                </SelectContent>
                            </Select>
                        </FilterField>
                        <FilterField label="Date published">
                            <Select value={publishedFilter} onValueChange={(value) => setPublishedFilter(value as typeof publishedFilter)}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by publish date">
                                    <SelectValue placeholder="Date published" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All dates</SelectItem>
                                    <SelectItem value="last_7_days">Last 7 days</SelectItem>
                                    <SelectItem value="last_30_days">Last 30 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </FilterField>
                        <FilterField label="Close on deadline">
                            <Select value={autoCloseFilter} onValueChange={(value) => setAutoCloseFilter(value as typeof autoCloseFilter)}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by close on deadline">
                                    <SelectValue placeholder="Close on deadline" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All close modes</SelectItem>
                                    <SelectItem value="on">On</SelectItem>
                                    <SelectItem value="off">Off</SelectItem>
                                </SelectContent>
                            </Select>
                        </FilterField>
                    </>
                }
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                view={view}
                onViewChange={setView}
                createAction={createAction}
            />

            {view === 'table' ? (
                <ResourceTable
                    rows={visibleExams}
                    columns={columns}
                    getRowId={(exam) => exam.id}
                    caption="Mock exams you manage"
                    state={tableState}
                    error={loadError}
                    onRetry={() => void fetchManagedExams()}
                    filtersActive={chips.length > 0 || ownershipFilter !== 'all'}
                    onClearFilters={clearAllFilters}
                    emptyTitle="No exams yet"
                    emptyDescription="Create your first mock exam to get started."
                    emptyAction={createAction}
                    rowActions={renderRowActions}
                    resetKey={`${search}|${statusFilter}|${categoryFilter}|${programFilter}|${authorFilter}|${deadlineFilter}|${publishedFilter}|${autoCloseFilter}|${ownershipFilter}`}
                />
            ) : (
                <ExamGrid
                    exams={visibleExams}
                    loading={loading}
                    error={loadError}
                    onRetry={() => void fetchManagedExams()}
                    filtersActive={chips.length > 0 || ownershipFilter !== 'all'}
                    onClearFilters={clearAllFilters}
                    emptyAction={createAction}
                    renderRowActions={renderRowActions}
                    renderStatusCell={renderStatusCell}
                    getDisplayAuthorName={getDisplayAuthorName}
                />
            )}

            <ConfirmDialog
                open={examToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setExamToDelete(null);
                }}
                title="Delete exam?"
                description={`Delete "${examToDelete?.title ?? ''}"? This cannot be undone and all student results will be lost.`}
                confirmLabel="Yes, delete"
                variant="destructive"
                onConfirm={handleDelete}
            />

            <ConfirmDialog
                open={statusChange !== null}
                onOpenChange={(open) => {
                    if (!open) setStatusChange(null);
                }}
                title={statusChange ? `Move to ${STATUS_LABEL[statusChange.next].toLowerCase()}?` : ''}
                description={statusChange ? STATUS_CONSEQUENCE[statusChange.next] : ''}
                confirmLabel={statusChange ? `Move to ${STATUS_LABEL[statusChange.next].toLowerCase()}` : 'Confirm'}
                variant={
                    statusChange && (statusChange.next === 'closed' || statusChange.next === 'archived')
                        ? 'destructive'
                        : 'default'
                }
                onConfirm={handleConfirmStatusChange}
            />
        </div>
    );
};

interface ExamGridProps {
    exams: Exam[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    filtersActive: boolean;
    onClearFilters: () => void;
    emptyAction: React.ReactNode;
    renderRowActions: (exam: Exam) => React.ReactNode;
    renderStatusCell: (exam: Exam) => React.ReactNode;
    getDisplayAuthorName: (exam: Exam) => string;
}

const ExamGrid: React.FC<ExamGridProps> = ({
    exams,
    loading,
    error,
    onRetry,
    filtersActive,
    onClearFilters,
    emptyAction,
    renderRowActions,
    renderStatusCell,
    getDisplayAuthorName,
}) => {
    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-[13px] text-slate-500" role="status">
                Loading…
            </div>
        );
    }

    if (error) {
        return <CollectionError message={error} onRetry={onRetry} />;
    }

    if (exams.length === 0) {
        return (
            <CollectionEmpty
                filtersActive={filtersActive}
                onClearFilters={onClearFilters}
                emptyTitle={"No exams yet"}
                emptyDescription={"Create your first mock exam to get started."}
                emptyAction={emptyAction}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
                <Card key={exam.id} className="rounded-xl border-slate-200 bg-white shadow-none transition-colors hover:border-primary/30">
                    <CardContent className="flex h-full flex-col gap-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                            {renderStatusCell(exam)}
                            {renderRowActions(exam)}
                        </div>
                        <div className="min-w-0">
                            <Link
                                to={`/manage-exams/${exam.id}/view`}
                                className="line-clamp-2 text-[13px] font-semibold text-slate-900 transition-colors hover:text-primary"
                            >
                                {exam.title}
                            </Link>
                            <p className="mt-0.5 truncate text-[12px] text-slate-400">
                                {getDisplayAuthorName(exam)} ·{' '}
                                {exam.tracks.length > 0
                                    ? exam.tracks.map((track) => track.name).join(', ')
                                    : exam.program || 'All programs'}
                            </p>
                        </div>
                        <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[12px]">
                            <div className="flex justify-between gap-2">
                                <dt className="text-slate-400">Items</dt>
                                <dd className="font-semibold text-slate-700 tabular-nums">{exam.questionCount}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-slate-400">Time</dt>
                                <dd className="font-semibold text-slate-700">{formatDurationMinutes(exam.duration)}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-slate-400">Category</dt>
                                <dd className="truncate font-semibold text-slate-700">{exam.category}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-slate-400">Deadline</dt>
                                <dd className="font-semibold text-slate-700">{formatShortDate(exam.deadline)}</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ManageExamsPage;
