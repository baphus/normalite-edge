import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    BookOpen,
    Eye,
    Clock,
    Calendar,
    CheckCircle2,
    Lock,
    Grid,
    LayoutGrid,
    List,
    SlidersHorizontal,
    ChevronDown,
    User,
    Users,
    BarChart3,
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
    const { user } = useAuth();
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
    const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'others'>('all');
    const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'with-deadline' | 'without-deadline'>('all');
    const [autoCloseFilter, setAutoCloseFilter] = useState<'all' | 'on' | 'off'>('all');
    const [myExamsOpen, setMyExamsOpen] = useState(true);
    const [othersOpen, setOthersOpen] = useState(true);
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
                    authorId: exam.creator?.id || '',
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
        const isReviewer = user?.role === 'REVIEWER';
        const matchesOwnership = !isReviewer
            || ownershipFilter === 'all'
            || (ownershipFilter === 'mine' && exam.authorId === user?.id)
            || (ownershipFilter === 'others' && exam.authorId !== user?.id);
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

        return matchesOwnership && matchesStatus && matchesSearch && matchesCategory && matchesProgram && matchesAuthor && matchesDeadline && matchesAutoClose;
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
    }, [statusFilter, categoryFilter, programFilter, authorFilter, ownershipFilter, deadlineFilter, autoCloseFilter, search, user?.role]);

    const handleDelete = async () => {
        if (examToDelete) {
            try {
                await api.delete(`/exams/${examToDelete}`);
                setExams(prev => prev.filter(e => e.id !== examToDelete));
                setIsDeleteDialogOpen(false);
                setExamToDelete(null);
                toast.success('Exam deleted successfully.');
            } catch (error) {
                console.error('Failed to delete exam', error);
                toast.error('Failed to delete exam. Please try again.');
            }
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
            toast.success('Exam status updated.');
            return true;
        } catch (error) {
            console.error('Failed to update exam status', error);
            toast.error('Failed to update exam status. Please try again.');
            return false;
        } finally {
            setActionExamId(null);
        }
    };

    const handleStatusDialogConfirm = async () => {
        if (!statusDialogExamId) return;
        const success = await handleUpdateExamStatus(statusDialogExamId, statusDialogValue);
        if (success) {
            closeStatusDialog();
        }
    };

    const handleDuplicate = async (examId: string) => {
        setActionExamId(examId);
        try {
            const detailResponse = await api.get(`/exams/${examId}?questions=true`);
            const exam = detailResponse.data?.data as ManagedExamApi;
            const questions = exam.questions || [];

            const sectionMap = new Map(
                (exam.sections || [])
                    .map((s) => [s.id, s.title?.trim()])
                    .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
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
                status: 'draft',
                maxAttempts: created.maxAttempts ?? 1,
                deadline: created.deadline || created.scheduledDate || undefined,
                closeOnDeadline: Boolean(created.closeOnDeadline),
                tracks: created.tracks || [],
                authorId: created.creator?.id || user?.id || '',
                authorName,
                authorAvatar: getAuthorAvatar(authorName, created.creator),
                sectionTitles: (created.sections || [])
                    .slice()
                    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                    .map((section) => section.title?.trim())
                    .filter((title): title is string => Boolean(title)),
            };

            setExams((prev) => [nextExam, ...prev]);
            toast.success('Exam duplicated as draft.');
        } catch (error) {
            console.error('Failed to duplicate exam', error);
            toast.error('Failed to duplicate exam. Please try again.');
        } finally {
            setActionExamId(null);
        }
    };

    const handleExportToStudyMaterial = async (examId: string) => {
        setActionExamId(examId);
        try {
            const response = await api.post(`/exams/${examId}/export-to-deck`);
            const deck = response.data?.data as { title?: string } | undefined;
            toast.success(deck?.title
                ? `Exported to study materials as "${deck.title}".`
                : 'Mock exam exported to study materials.');
        } catch (error: any) {
            console.error('Failed to export exam to study materials', error);
            const message = error?.response?.data?.message || 'Failed to export exam to study materials. Please try again.';
            toast.error(message);
        } finally {
            setActionExamId(null);
        }
    };

    const canManageExam = (exam: Exam) => {
        if (user?.role === 'ADMIN') return true;
        return exam.authorId === user?.id;
    };

    const canEditExam = (exam: Exam) => {
        if (exam.status === 'live') return false;
        return canManageExam(exam);
    };

    const getDisplayAuthorName = (exam: Exam) => {
        if (user?.role === 'REVIEWER' && exam.authorId === user.id) return 'You';
        return exam.authorName;
    };

    const renderExamCard = (exam: Exam) => (
        <Card key={exam.id} className={`group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 overflow-hidden bg-white h-full ${viewMode === 'grid' ? 'rounded-lg' : 'rounded-md'}`}>
            <CardContent className="p-3 flex flex-col h-full">
                {(() => {
                    const isManageable = canManageExam(exam);
                    const isEditable = canEditExam(exam);

                    return (
                        <>
                <div className="flex justify-between items-start mb-2 gap-2">
                    <div />
                    <div className="flex items-center gap-1">
                        <Badge className={`font-semibold text-[9px] uppercase tracking-wider border-none ${exam.status === 'live' ? 'bg-green-50 text-green-600' :
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

                        {isManageable ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                        <MoreHorizontal size={18} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl w-48">
                                <Link to={`/manage-exams/${exam.id}/view`}>
                                    <DropdownMenuItem
                                        className="gap-2 font-bold text-xs py-2.5"
                                        disabled={actionExamId === exam.id}
                                    >
                                        <Eye size={14} /> View
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem
                                    className="gap-2 font-bold text-xs py-2.5"
                                    onClick={() => handleDuplicate(exam.id)}
                                    disabled={actionExamId === exam.id}
                                >
                                    <Copy size={14} /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 font-bold text-xs py-2.5"
                                    onClick={() => handleExportToStudyMaterial(exam.id)}
                                    disabled={actionExamId === exam.id}
                                >
                                    <BookOpen size={14} /> Export as Study Material
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 font-bold text-xs py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                                    disabled={actionExamId === exam.id}
                                    onClick={() => {
                                        setExamToDelete(exam.id);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 size={14} /> Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link to={`/manage-exams/${exam.id}/view`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                    <BarChart3 size={16} />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5 mb-2">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                        {exam.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={exam.authorAvatar} alt={exam.authorName} />
                            <AvatarFallback className="text-[9px] font-semibold">{getDisplayAuthorName(exam).slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-[10px] text-gray-500 font-medium truncate">Author: {getDisplayAuthorName(exam)}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium truncate">
                        Sections: {exam.sectionTitles.length > 0 ? exam.sectionTitles.join(', ') : 'Full Exam'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-100 mb-2">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Grid size={11} /> Questions
                        </p>
                        <p className="text-xs font-semibold text-gray-700">{exam.questionCount} Items</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={11} /> Timer
                        </p>
                        <p className="text-xs font-semibold text-gray-700">{exam.duration} Min</p>
                    </div>
                </div>

                <div className="space-y-1.5 mb-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-accent" /> Attempts
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-900">{exam.maxAttempts}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className="text-red-500" /> Deadline
                        </span>
                        <span className="text-[11px] font-semibold text-gray-900">
                            {exam.deadline
                                ? new Date(exam.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'No deadline'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className="text-blue-500" /> Close on Deadline
                        </span>
                        <span className={`text-[11px] font-semibold ${exam.closeOnDeadline ? 'text-blue-600' : 'text-gray-500'}`}>
                            {exam.closeOnDeadline ? 'On' : 'Off'}
                        </span>
                    </div>
                </div>

                {(() => {
                    const trackLabels = exam.tracks.length > 0
                        ? exam.tracks.map((t) => t.name)
                        : exam.program
                            ? exam.program.split(',').map((s) => s.trim()).filter(Boolean)
                            : ['All Tracks'];
                    return (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {trackLabels.map((label) => (
                                <span key={label} className="inline-flex items-center rounded px-1.5 py-px text-[9px] font-semibold bg-primary/5 text-primary border border-primary/15 leading-4">
                                    {label}
                                </span>
                            ))}
                        </div>
                    );
                })()}

                <div className={`mt-auto ${viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-2 justify-end'}`}>
                    <Link to={`/manage-exams/${exam.id}/view`} className={viewMode === 'grid' ? 'w-full' : ''}>
                        <Button variant="outline" className={`h-8 rounded-md border-gray-200 font-semibold text-xs gap-1.5 ${viewMode === 'grid' ? 'w-full' : 'px-3'}`}>
                            <Eye size={13} /> View Details
                        </Button>
                    </Link>
                    {isEditable ? (
                        <Link to={`/manage-exams/${exam.id}/edit`} className={viewMode === 'grid' ? 'w-full' : ''}>
                            <Button className={`h-8 rounded-md bg-primary/5 hover:bg-primary/10 text-primary border-none font-semibold text-xs gap-1.5 ${viewMode === 'grid' ? 'w-full' : 'px-3'}`}>
                                <Edit size={13} /> Edit Exam
                            </Button>
                        </Link>
                    ) : (
                        <Button disabled className={`h-8 rounded-md border-gray-200 bg-gray-100 text-gray-500 font-semibold text-xs gap-1.5 ${viewMode === 'grid' ? 'w-full' : 'px-3'}`}>
                            <Lock size={13} /> {exam.status === 'live' ? 'Published' : 'Read Only'}
                        </Button>
                    )}
                </div>
                        </>
                    );
                })()}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Exam Library</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Manage and organize all LET preparation exams.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-52 group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={13} />
                        <Input
                            placeholder="Search exams..."
                            className="pl-8 h-8 rounded-md border-gray-200 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-8 rounded-md border-gray-200 font-semibold gap-1.5 text-xs bg-white"
                            >
                                <SlidersHorizontal size={13} /> Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-90 rounded-xl p-4 space-y-3">
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
                                        setOwnershipFilter('all');
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
                    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-white">
                        <Button
                            type="button"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 rounded text-xs"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={12} className="mr-1" /> Grid
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 rounded text-xs"
                            onClick={() => setViewMode('list')}
                        >
                            <List size={12} className="mr-1" /> List
                        </Button>
                    </div>
                    <Link to="/manage-exams/create">
                        <Button className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold gap-1.5 text-xs px-3">
                            <Plus size={13} /> Create Exam
                        </Button>
                    </Link>
                </div>
            </header>

{(() => {
                const gridClass = viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col gap-2';
                const CreateCard = () => (
                    <Link to="/manage-exams/create" className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 hover:bg-primary/2 hover:border-primary/50 transition-all group min-h-40">
                        <div className="bg-white p-2.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <Plus size={20} className="text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-xs text-gray-900">Create New Mock Exam</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 max-w-45">Start from scratch or use a predefined template</p>
                        </div>
                    </Link>
                );

                const SectionToggle = ({
                    icon,
                    label,
                    count,
                    open,
                    onToggle,
                    accent,
                }: {
                    icon: React.ReactNode;
                    label: string;
                    count: number;
                    open: boolean;
                    onToggle: () => void;
                    accent: string;
                }) => (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="w-full flex items-center gap-2.5 group/toggle select-none"
                    >
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${accent}`}>
                            {icon}
                            <span className="text-[11px] font-bold tracking-wide">{label}</span>
                            <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-white/60 text-[10px] font-bold">
                                {count}
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-gray-100" />
                        <div className={`flex items-center justify-center h-6 w-6 rounded-full border border-gray-200 bg-white text-gray-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>
                            <ChevronDown size={12} />
                        </div>
                    </button>
                );

                if (user?.role === 'REVIEWER') {
                    const myExams = filteredExams.filter((e) => e.authorId === user.id);
                    const otherExams = filteredExams.filter((e) => e.authorId !== user.id);
                    return (
                        <div className="flex flex-col gap-5 mt-1">
                            {/* My Exams */}
                            <div className="flex flex-col gap-3">
                                <SectionToggle
                                    icon={<User size={12} />}
                                    label="My Exams"
                                    count={myExams.length}
                                    open={myExamsOpen}
                                    onToggle={() => setMyExamsOpen((v) => !v)}
                                    accent="bg-primary/5 border-primary/20 text-primary"
                                />
                                {myExamsOpen && (
                                    <div className={gridClass}>
                                        {loading && (
                                            <Card className="border-gray-100 rounded-lg bg-white">
                                                <CardContent className="p-4 text-xs text-gray-400 font-medium">Loading exams...</CardContent>
                                            </Card>
                                        )}
                                        {myExams.map(renderExamCard)}
                                        <CreateCard />
                                    </div>
                                )}
                            </div>

                            {/* Other Reviewers' Exams */}
                            <div className="flex flex-col gap-3">
                                <SectionToggle
                                    icon={<Users size={12} />}
                                    label="Other Reviewers' Exams"
                                    count={otherExams.length}
                                    open={othersOpen}
                                    onToggle={() => setOthersOpen((v) => !v)}
                                    accent="bg-violet-50 border-violet-200 text-violet-600"
                                />
                                {othersOpen && (
                                    otherExams.length === 0 ? (
                                        <div className="flex items-center gap-2 py-6 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                                            <Grid size={14} className="text-gray-300 shrink-0" />
                                            <p className="text-xs text-gray-400 font-medium">No exams from other reviewers match your filters.</p>
                                        </div>
                                    ) : (
                                        <div className={gridClass}>
                                            {otherExams.map(renderExamCard)}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    );
                }

                // ADMIN flat list
                return (
                    <div className={`${gridClass} mt-1`}>
                        {loading && (
                            <Card className="border-gray-100 rounded-lg bg-white">
                                <CardContent className="p-4 text-xs text-gray-400 font-medium">Loading exams...</CardContent>
                            </Card>
                        )}
                        {filteredExams.map(renderExamCard)}
                        <CreateCard />
                    </div>
                );
            })()}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setExamToDelete(null);
                }}
                title="Delete Exam?"
                description="Are you sure you want to delete this exam? This action cannot be undone and all student results will be lost."
                confirmLabel="Yes, Delete"
                variant="destructive"
                onConfirm={handleDelete}
            />
            <Dialog
                open={statusDialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeStatusDialog();
                }}
            >
                <DialogContent className="rounded-xl max-w-md border-none shadow-xl">
                    <DialogHeader className="space-y-3 text-center items-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <SlidersHorizontal size={24} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-base font-bold">Change Exam Status</DialogTitle>
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
                    <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
                        <Button variant="outline" onClick={closeStatusDialog} className="h-9 rounded-md font-semibold border-gray-200">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusDialogConfirm}
                            className="h-9 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold border-none"
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
