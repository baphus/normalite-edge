import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Archive,
    Copy,
    Eye,
    Clock,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Grid,
    LayoutGrid,
    List,
    SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/axios';

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
    deadline?: string;
    closeOnDeadline: boolean;
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
    deadline?: string | null;
    closeOnDeadline?: boolean;
    subject?: string;
    categoryCode?: 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION';
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

const STATUS_CHANGE_OPTIONS: Array<{ value: Exam['status']; label: string }> = [
    { value: 'live', label: 'Live' },
    { value: 'draft', label: 'Draft' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
];

const STATUS_TO_API: Record<Exam['status'], 'LIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'> = {
    live: 'LIVE',
    draft: 'DRAFT',
    closed: 'CLOSED',
    archived: 'ARCHIVED',
};

const ManageExamsPage: React.FC = () => {
    const ALL_PROGRAMS_FILTER = '__all_programs__';
    const LEGACY_PROGRAM_PREFIX = '__legacy__:';

    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [trackOptions, setTrackOptions] = useState<TrackOption[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'archived' | 'closed'>('all');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [programFilter, setProgramFilter] = useState('all');
    const [authorFilter, setAuthorFilter] = useState('all');
    const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'with-deadline' | 'without-deadline'>('all');
    const [autoCloseFilter, setAutoCloseFilter] = useState<'all' | 'on' | 'off'>('all');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);
    const [actionExamId, setActionExamId] = useState<string | null>(null);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusDialogExamId, setStatusDialogExamId] = useState<string | null>(null);
    const [statusDialogValue, setStatusDialogValue] = useState<Exam['status']>('live');

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

        const mapped = parts.map((part) => {
            const match = tracks.find((track) =>
                track.name.toLowerCase() === part.toLowerCase()
                || (track.code || '').toLowerCase() === part.toLowerCase()
            );
            return match?.name || part;
        });

        return mapped.join(', ');
    };

    useEffect(() => {
        const fetchManagedExams = async () => {
            setLoading(true);
            try {
                const [examsResponse, tracksResponse] = await Promise.all([
                    api.get('/exams/managed?page=1&limit=100'),
                    api.get('/tracks'),
                ]);

                const items = (examsResponse.data?.data || []) as ManagedExamApi[];
                const tracks = (tracksResponse.data?.data || []) as TrackOption[];
                setTrackOptions(tracks);

                const mapped: Exam[] = items.map((exam) => {
                    const authorName = exam.creator?.name
                        || `${exam.creator?.firstName || ''} ${exam.creator?.lastName || ''}`.trim()
                        || 'Unknown';

                    return {
                    id: exam.id,
                    title: exam.title,
                    category: exam.category || exam.categoryCode || 'No Category',
                    program: exam.tracks && exam.tracks.length > 0
                        ? exam.tracks.map((track) => track.name).join(', ')
                        : resolveProgramLabel(exam.program_track, tracks),
                    questionCount: exam.totalItems || 0,
                    duration: exam.timeLimit || 0,
                    status: exam.status === 'LIVE' || exam.status === 'PUBLISHED'
                        ? 'live'
                        : exam.status === 'ARCHIVED'
                            ? 'archived'
                            : exam.status === 'CLOSED'
                                ? 'closed'
                                : 'draft',
                    maxAttempts: exam.maxAttempts ?? 1,
                    deadline: exam.deadline || exam.scheduledDate || undefined,
                    closeOnDeadline: Boolean(exam.closeOnDeadline),
                    tracks: exam.tracks || [],
                    authorName,
                    authorAvatar: getAuthorAvatar(authorName, exam.creator),
                    sectionTitles: (exam.sections || [])
                        .slice()
                        .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                        .map((section) => section.title?.trim())
                        .filter((title): title is string => Boolean(title)),
                };
                });

                setExams(mapped);
            } catch (error) {
                console.error('Failed to fetch managed exams', error);
                setExams([]);
            } finally {
                setLoading(false);
            }
        };

        fetchManagedExams();
    }, []);

    const categoryOptions = useMemo(() => {
        return Array.from(new Set(exams.map((exam) => exam.category))).sort((a, b) => a.localeCompare(b));
    }, [exams]);

    const programOptions = useMemo(() => {
        const tracked = Array.from(
            new Map(
                exams
                    .flatMap((exam) => exam.tracks || [])
                    .map((track) => [track.id, track])
            ).values()
        ).sort((a, b) => a.name.localeCompare(b.name));

        const legacy = Array.from(
            new Set(
                exams
                    .filter((exam) => (exam.tracks || []).length === 0)
                    .map((exam) => exam.program)
                    .filter((program) => program && program !== 'All Programs')
            )
        ).sort((a, b) => a.localeCompare(b));

        return {
            tracked,
            legacy,
        };
    }, [exams]);

    const authorOptions = useMemo(() => {
        return Array.from(
            new Set(
                exams
                    .map((exam) => exam.authorName)
                    .filter((authorName) => authorName && authorName.trim().length > 0)
            )
        ).sort((a, b) => a.localeCompare(b));
    }, [exams]);

    const filteredExams = exams.filter(exam => {
        const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
        const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter;
        const matchesProgram = programFilter === 'all'
            || (programFilter === ALL_PROGRAMS_FILTER && ((exam.tracks || []).length === 0 || exam.program === 'All Programs'))
            || (programFilter.startsWith(LEGACY_PROGRAM_PREFIX) && exam.program === programFilter.slice(LEGACY_PROGRAM_PREFIX.length))
            || (exam.tracks || []).some((track) => track.id === programFilter);
        const matchesAuthor = authorFilter === 'all' || exam.authorName === authorFilter;
        const matchesDeadline = deadlineFilter === 'all'
            || (deadlineFilter === 'with-deadline' && Boolean(exam.deadline))
            || (deadlineFilter === 'without-deadline' && !exam.deadline);
        const matchesAutoClose = autoCloseFilter === 'all'
            || (autoCloseFilter === 'on' && exam.closeOnDeadline)
            || (autoCloseFilter === 'off' && !exam.closeOnDeadline);

        return matchesStatus && matchesSearch && matchesCategory && matchesProgram && matchesAuthor && matchesDeadline && matchesAutoClose;
    });

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== 'all') count += 1;
        if (categoryFilter !== 'all') count += 1;
        if (programFilter !== 'all') count += 1;
        if (authorFilter !== 'all') count += 1;
        if (deadlineFilter !== 'all') count += 1;
        if (autoCloseFilter !== 'all') count += 1;
        if (search.trim().length > 0) count += 1;
        return count;
    }, [statusFilter, categoryFilter, programFilter, authorFilter, deadlineFilter, autoCloseFilter, search]);

    const handleDelete = async () => {
        if (examToDelete) {
            try {
                await api.delete(`/exams/${examToDelete}`);
                setExams(prev => prev.filter(e => e.id !== examToDelete));
                setIsDeleteDialogOpen(false);
                setExamToDelete(null);
            } catch (error) {
                console.error('Failed to delete exam', error);
                alert('Failed to delete exam. Please try again.');
            }
        }
    };

    const handleArchive = async (examId: string) => {
        setActionExamId(examId);
        try {
            await api.put(`/exams/${examId}`, { status: 'ARCHIVED' });
            setExams((prev) =>
                prev.map((exam) =>
                    exam.id === examId
                        ? { ...exam, status: 'archived' }
                        : exam
                )
            );
        } catch (error) {
            console.error('Failed to archive exam', error);
            alert('Failed to archive exam. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const handleMoveToDraft = async (examId: string) => {
        setActionExamId(examId);
        try {
            await api.put(`/exams/${examId}`, { status: 'DRAFT' });
            setExams((prev) =>
                prev.map((exam) =>
                    exam.id === examId
                        ? { ...exam, status: 'draft' }
                        : exam
                )
            );
        } catch (error) {
            console.error('Failed to move exam to drafts', error);
            alert('Failed to move exam to drafts. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const handleCloseExam = async (examId: string) => {
        setActionExamId(examId);
        try {
            await api.put(`/exams/${examId}`, { status: 'CLOSED' });
            setExams((prev) =>
                prev.map((exam) =>
                    exam.id === examId
                        ? { ...exam, status: 'closed' }
                        : exam
                )
            );
        } catch (error) {
            console.error('Failed to close exam', error);
            alert('Failed to close exam. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const handleToggleCloseOnDeadline = async (exam: Exam) => {
        setActionExamId(exam.id);
        try {
            await api.put(`/exams/${exam.id}`, { closeOnDeadline: !exam.closeOnDeadline });
            setExams((prev) =>
                prev.map((item) =>
                    item.id === exam.id
                        ? { ...item, closeOnDeadline: !item.closeOnDeadline }
                        : item
                )
            );
        } catch (error) {
            console.error('Failed to update close-on-deadline setting', error);
            alert('Failed to update close-on-deadline setting. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const closeStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusDialogExamId(null);
    };

    const handleUpdateExamStatus = async (examId: string, status: Exam['status']) => {
        setActionExamId(examId);
        try {
            await api.put(`/exams/${examId}`, { status: STATUS_TO_API[status] });
            setExams((prev) =>
                prev.map((exam) =>
                    exam.id === examId ? { ...exam, status } : exam
                )
            );
            return true;
        } catch (error) {
            console.error('Failed to update exam status', error);
            alert('Failed to update exam status. Please try again.');
            return false;
        } finally {
            setActionExamId(null);
        }
    };

    const handleSetActive = (examId: string) => {
        void handleUpdateExamStatus(examId, 'live');
    };

    const handleStatusDialogConfirm = async () => {
        if (!statusDialogExamId) return;
        const success = await handleUpdateExamStatus(statusDialogExamId, statusDialogValue);
        if (success) {
            closeStatusDialog();
        }
    };

    const openStatusDialog = (exam: Exam) => {
        setStatusDialogExamId(exam.id);
        setStatusDialogValue(exam.status);
        setStatusDialogOpen(true);
    };

    const handleDuplicate = async (examId: string) => {
        setActionExamId(examId);
        try {
            const detailResponse = await api.get(`/exams/${examId}?questions=true`);
            const exam = detailResponse.data?.data as ManagedExamApi;
            const questions = exam.questions || [];

            const sectionMap = new Map(
                (exam.sections || []).map((s) => [s.id, s.title?.trim() || 'General Section'])
            );

            const sectionTitles = (exam.sections || [])
                .slice()
                .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                .map((s) => s.title?.trim())
                .filter((t): t is string => Boolean(t));

            const payload = {
                title: `${exam.title} (Copy)`,
                subject: exam.subject || 'General Education',
                category: exam.categoryCode || 'GENERAL_EDUCATION',
                trackIds: exam.tracks?.map((track) => track.id) || [],
                timeLimit: exam.timeLimit || 60,
                isPublished: false,
                sections: sectionTitles.length > 0 ? sectionTitles : undefined,
                questions: questions.map((question) => {
                    const resolvedSection =
                        question.section?.title?.trim()
                        || sectionMap.get(question.sectionId || '')
                        || undefined;

                    return {
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
                        section: resolvedSection,
                    };
                }),
            };

            const createResponse = await api.post('/exams', payload);
            const created = createResponse.data?.data as ManagedExamApi;

            const authorName = created.creator?.name
                || `${created.creator?.firstName || ''} ${created.creator?.lastName || ''}`.trim()
                || 'Unknown';

            const nextExam: Exam = {
                id: created.id,
                title: created.title,
                category: created.category || created.categoryCode || 'No Category',
                program: created.tracks && created.tracks.length > 0
                    ? created.tracks.map((track) => track.name).join(', ')
                    : resolveProgramLabel(created.program_track, trackOptions),
                questionCount: created.totalItems || payload.questions.length,
                duration: created.timeLimit || payload.timeLimit,
                status: created.status === 'LIVE' || created.status === 'PUBLISHED'
                    ? 'live'
                    : created.status === 'ARCHIVED'
                        ? 'archived'
                        : created.status === 'CLOSED'
                            ? 'closed'
                            : 'draft',
                maxAttempts: created.maxAttempts ?? 1,
                deadline: created.deadline || created.scheduledDate || undefined,
                closeOnDeadline: Boolean(created.closeOnDeadline),
                tracks: created.tracks || [],
                authorName,
                authorAvatar: getAuthorAvatar(authorName, created.creator),
                sectionTitles: (created.sections || [])
                    .slice()
                    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                    .map((section) => section.title?.trim())
                    .filter((title): title is string => Boolean(title)),
            };

            setExams((prev) => [nextExam, ...prev]);
        } catch (error) {
            console.error('Failed to duplicate exam', error);
            alert('Failed to duplicate exam. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Library</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Manage and organize all LET preparation exams.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-60 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="Search exams..."
                            className="pl-10 h-10 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl border-gray-200 font-bold gap-2"
                            >
                                <SlidersHorizontal size={16} /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[360px] rounded-xl p-4 space-y-3">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="live">Live</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categoryOptions.map((category) => (
                                            <SelectItem key={category} value={category}>{category}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Visible To</Label>
                                <Select value={programFilter} onValueChange={setProgramFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Visible To" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Programs</SelectItem>
                                        <SelectItem value={ALL_PROGRAMS_FILTER}>All Programs (Public)</SelectItem>
                                        {programOptions.tracked.map((track) => (
                                            <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                                        ))}
                                        {programOptions.legacy.map((program) => (
                                            <SelectItem key={`${LEGACY_PROGRAM_PREFIX}${program}`} value={`${LEGACY_PROGRAM_PREFIX}${program}`}>
                                                {resolveProgramLabel(program, trackOptions)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Author</Label>
                                <Select value={authorFilter} onValueChange={setAuthorFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Author" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Authors</SelectItem>
                                        {authorOptions.map((author) => (
                                            <SelectItem key={author} value={author}>{author}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Deadline</Label>
                                <Select value={deadlineFilter} onValueChange={(value) => setDeadlineFilter(value as typeof deadlineFilter)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Deadline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Deadlines</SelectItem>
                                        <SelectItem value="with-deadline">With Deadline</SelectItem>
                                        <SelectItem value="without-deadline">Without Deadline</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Close on Deadline</Label>
                                <Select value={autoCloseFilter} onValueChange={(value) => setAutoCloseFilter(value as typeof autoCloseFilter)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Close on Deadline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Close Modes</SelectItem>
                                        <SelectItem value="on">Close on Deadline: On</SelectItem>
                                        <SelectItem value="off">Close on Deadline: Off</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setCategoryFilter('all');
                                        setProgramFilter('all');
                                        setAuthorFilter('all');
                                        setDeadlineFilter('all');
                                        setAutoCloseFilter('all');
                                        setSearch('');
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-1 bg-white">
                        <Button
                            type="button"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            className="h-8 px-3 rounded-lg"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={14} className="mr-1" /> Grid
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            className="h-8 px-3 rounded-lg"
                            onClick={() => setViewMode('list')}
                        >
                            <List size={14} className="mr-1" /> List
                        </Button>
                    </div>
                    <Link to="/manage-exams/create">
                        <Button className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2">
                            <Plus size={18} /> Create Exam
                        </Button>
                    </Link>
                </div>
            </header>

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2' : 'flex flex-col gap-3 mt-2'}>
                {loading && (
                    <Card className="border-gray-100 rounded-[2rem] bg-white">
                        <CardContent className="p-6 text-sm text-gray-500 font-medium">Loading exams...</CardContent>
                    </Card>
                )}
                {filteredExams.map((exam) => (
                    <Card key={exam.id} className={`group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden bg-white h-full ${viewMode === 'grid' ? 'rounded-2xl' : 'rounded-xl'}`}>
                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3 gap-2">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5 rounded-md px-1.5 max-w-[75%] truncate">
                                    Show to: {exam.program}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <Badge className={`font-black text-[10px] uppercase tracking-widest border-none ${exam.status === 'live' ? 'bg-green-50 text-green-600' :
                                        exam.status === 'draft' ? 'bg-amber-50 text-amber-600' :
                                            exam.status === 'closed' ? 'bg-red-50 text-red-600' :
                                                'bg-gray-50 text-gray-500'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${exam.status === 'live' ? 'bg-green-600' :
                                            exam.status === 'draft' ? 'bg-amber-600' :
                                                exam.status === 'closed' ? 'bg-red-600' :
                                                    'bg-gray-500'
                                            }`} />
                                        {exam.status}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                                <MoreHorizontal size={18} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl w-48">
                                        <DropdownMenuItem
                                            className="gap-2 font-bold text-xs py-2.5"
                                            onClick={() => handleDuplicate(exam.id)}
                                            disabled={actionExamId === exam.id}
                                        >
                                            <Copy size={14} /> Duplicate
                                        </DropdownMenuItem>
                                        {exam.status === 'draft' && (
                                            <DropdownMenuItem
                                                className="gap-2 font-bold text-xs py-2.5"
                                                onClick={() => handleSetActive(exam.id)}
                                                disabled={actionExamId === exam.id}
                                            >
                                                <CheckCircle2 size={14} /> Publish
                                            </DropdownMenuItem>
                                        )}
                                        {exam.status === 'live' && (
                                            <>
                                                <DropdownMenuItem
                                                    className="gap-2 font-bold text-xs py-2.5"
                                                    onClick={() => handleMoveToDraft(exam.id)}
                                                    disabled={actionExamId === exam.id}
                                                >
                                                    <Edit size={14} /> Move to Draft
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 font-bold text-xs py-2.5"
                                                    onClick={() => handleCloseExam(exam.id)}
                                                    disabled={actionExamId === exam.id}
                                                >
                                                    <Clock size={14} /> Close Exam
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {(exam.status === 'closed' || exam.status === 'archived') && (
                                            <DropdownMenuItem
                                                className="gap-2 font-bold text-xs py-2.5"
                                                onClick={() => handleSetActive(exam.id)}
                                                disabled={actionExamId === exam.id}
                                            >
                                                <CheckCircle2 size={14} /> Publish
                                            </DropdownMenuItem>
                                        )}
                                        {(exam.status === 'closed' || exam.status === 'archived') && (
                                            <DropdownMenuItem
                                                className="gap-2 font-bold text-xs py-2.5"
                                                onClick={() => handleMoveToDraft(exam.id)}
                                                disabled={actionExamId === exam.id}
                                            >
                                                <Edit size={14} /> Move to Draft
                                            </DropdownMenuItem>
                                        )}
                                        {exam.status !== 'archived' && (
                                            <DropdownMenuItem
                                                className="gap-2 font-bold text-xs py-2.5"
                                                onClick={() => handleArchive(exam.id)}
                                                disabled={actionExamId === exam.id}
                                            >
                                                <Archive size={14} /> Archive
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            className="gap-2 font-bold text-xs py-2.5"
                                            onClick={() => handleToggleCloseOnDeadline(exam)}
                                            disabled={actionExamId === exam.id}
                                        >
                                            <Calendar size={14} /> {exam.closeOnDeadline ? 'Disable Auto Close' : 'Enable Auto Close'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 font-bold text-xs py-2.5"
                                            onClick={() => openStatusDialog(exam)}
                                            disabled={actionExamId === exam.id}
                                        >
                                            <SlidersHorizontal size={14} /> Change Status
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="gap-2 font-bold text-xs py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={() => {
                                                setExamToDelete(exam.id);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="space-y-2 mb-3 min-h-[72px]">
                                <h3 className="text-base font-black text-gray-900 group-hover:text-primary transition-colors leading-tight h-10 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                                    {exam.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={exam.authorAvatar} alt={exam.authorName} />
                                        <AvatarFallback className="text-[10px] font-black">{exam.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest truncate">Author: {exam.authorName}</p>
                                </div>
                                <p className="text-[11px] text-gray-600 font-semibold truncate">
                                    Sections: {exam.sectionTitles.length > 0 ? exam.sectionTitles.join(', ') : 'General Section'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100 mb-3 min-h-[74px]">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Grid size={12} /> Questions
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{exam.questionCount} Items</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={12} /> Timer
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{exam.duration} Min</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-3 min-h-[66px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-accent" /> Attempts
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-gray-900">{exam.maxAttempts}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} className="text-red-500" /> Deadline
                                    </span>
                                    <span className="text-xs font-black text-gray-900">
                                        {exam.deadline
                                            ? new Date(exam.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'No deadline'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} className="text-blue-500" /> Close on Deadline
                                    </span>
                                    <span className={`text-xs font-black ${exam.closeOnDeadline ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {exam.closeOnDeadline ? 'On' : 'Off'}
                                    </span>
                                </div>
                            </div>

                            <div className={`mt-auto ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex items-center gap-3 justify-end'}`}>
                                <Link to={`/manage-exams/${exam.id}/view`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button variant="outline" className={`h-10 rounded-xl border-gray-200 font-black text-xs gap-2 ${viewMode === 'grid' ? 'w-full' : 'px-4'}`}>
                                        <Eye size={14} /> View Details
                                    </Button>
                                </Link>
                                <Link to={`/manage-exams/${exam.id}/edit`} className={viewMode === 'grid' ? 'w-full' : ''}>
                                    <Button className={`h-10 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border-none font-black text-xs gap-2 ${viewMode === 'grid' ? 'w-full' : 'px-4'}`}>
                                        <Edit size={14} /> Edit Exam
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Create New Card */}
                <Link to="/manage-exams/create" className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/50 transition-all group min-h-[210px]">
                    <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={24} className="text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-sm text-gray-900 uppercase tracking-tight">Create New Mock Exam</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest max-w-[200px]">Start from scratch or use a predefined template</p>
                    </div>
                </Link>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
                    <DialogHeader className="space-y-4 text-center items-center">
                        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-black">Delete Exam?</DialogTitle>
                            <DialogDescription className="font-medium">
                                Are you sure you want to delete this exam? This action cannot be undone and all student results will be lost.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-12 rounded-xl font-black border-gray-200">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} className="h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black border-none shadow-lg shadow-red-500/20">
                            Yes, Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={statusDialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeStatusDialog();
                }}
            >
                <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
                    <DialogHeader className="space-y-4 text-center items-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <SlidersHorizontal size={32} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-black tracking-tight">Change Exam Status</DialogTitle>
                            <DialogDescription className="font-medium">
                                Select the status you want the exam to reflect.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label>Status</Label>
                        <Select value={statusDialogValue} onValueChange={(value) => setStatusDialogValue(value as Exam['status'])}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_CHANGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
                        <Button variant="outline" onClick={closeStatusDialog} className="h-12 rounded-xl font-black border-gray-200">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusDialogConfirm}
                            className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black border-none shadow-lg"
                            disabled={!statusDialogExamId}
                        >
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageExamsPage;
