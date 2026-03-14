import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FileText,
    Clock,
    Play,
    Lock,
    Calendar,
    AlertCircle,
    TrendingUp,
    Eye,
    LayoutGrid,
    List,
    SlidersHorizontal,
    CheckCircle2,
    RotateCcw,
    BookOpen,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Exam {
    id: string;
    title: string;
    description?: string;
    category: string;
    program_track?: string | null;
    tracks?: Array<{ id?: string; name: string; code?: string | null }>;
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

type ExamSectionKey = 'open' | 'submitted' | 'closed';

const ExamsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [publishedFilter, setPublishedFilter] = useState<'all' | 'last_7_days' | 'last_30_days'>('all');
    const [sortBy, setSortBy] = useState<'default' | 'published_newest' | 'published_oldest'>('default');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [viewingExam, setViewingExam] = useState<Exam | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<ExamSectionKey, boolean>>({
        open: false,
        submitted: false,
        closed: false,
    });
    const sectionRefs = useRef<Record<ExamSectionKey, HTMLElement | null>>({
        open: null,
        submitted: null,
        closed: null,
    });

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/exams');
                setExams(response.data.data);
            } catch (error) {
                console.error('Failed to fetch exams', error);
                setExams([]);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const revieweeTrack = (user?.program_track || user?.programTrack || user?.program || '').trim().toLowerCase();

    const visibleExams = exams.filter((exam) => {
        const examTracks = exam.tracks || [];
        const hasTrackLinks = examTracks.length > 0;
        const legacyProgramTrack = (exam.program_track || '').trim();
        const isPublic = !hasTrackLinks && !legacyProgramTrack;
        if (isPublic) return true;
        if (!revieweeTrack) return false;
        const matchesTrackLink = examTracks.some((track) =>
            [track.name, track.code]
                .filter((value): value is string => Boolean(value && value.trim()))
                .some((value) => value.trim().toLowerCase() === revieweeTrack)
        );
        const matchesLegacyProgram = !hasTrackLinks && legacyProgramTrack.toLowerCase() === revieweeTrack;
        return matchesTrackLink || matchesLegacyProgram;
    });

    const categoryOptions = useMemo(() => {
        return Array.from(new Set(visibleExams.map((e) => e.category))).sort((a, b) => a.localeCompare(b));
    }, [visibleExams]);

    const getExamState = (exam: Exam) => {
        const attemptsRemaining = exam.attempts_remaining ?? 0;
        const hasSubmitted = Boolean(exam.hasSubmitted || exam.userAttemptStatus === 'SUBMITTED' || attemptsRemaining === 0);
        const hasInProgress = exam.userAttemptStatus === 'IN_PROGRESS';
        const isLive = exam.status === 'LIVE';
        const canTake = isLive && !hasSubmitted;
        return { attemptsRemaining, hasSubmitted, hasInProgress, isLive, canTake };
    };

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== 'all') count++;
        if (categoryFilter !== 'all') count++;
        if (search.trim().length > 0) count++;
        if (publishedFilter !== 'all') count++;
        if (sortBy !== 'default') count++;
        return count;
    }, [statusFilter, categoryFilter, search, publishedFilter, sortBy]);

    const filteredExams = visibleExams.filter((exam) => {
        const matchesSearch =
            exam.title.toLowerCase().includes(search.toLowerCase()) ||
            (exam.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter;
        const { hasSubmitted, canTake } = getExamState(exam);
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'available' && canTake) ||
            (statusFilter === 'submitted' && hasSubmitted) ||
            (statusFilter === 'in_progress' && exam.userAttemptStatus === 'IN_PROGRESS') ||
            (statusFilter === 'locked' && !hasSubmitted && exam.status !== 'LIVE');
        const publishedTimestamp = new Date(exam.scheduledDate || exam.createdAt || 0).getTime();
        const sevenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
        const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
        const matchesPublishedFilter =
            publishedFilter === 'all'
            || (publishedFilter === 'last_7_days' && publishedTimestamp >= sevenDaysAgo)
            || (publishedFilter === 'last_30_days' && publishedTimestamp >= thirtyDaysAgo);

        return matchesSearch && matchesCategory && matchesStatus && matchesPublishedFilter;
    });

    const filteredAndSortedExams = [...filteredExams].sort((a, b) => {
        if (sortBy === 'published_newest') {
            return new Date(b.scheduledDate || b.createdAt || 0).getTime() - new Date(a.scheduledDate || a.createdAt || 0).getTime();
        }
        if (sortBy === 'published_oldest') {
            return new Date(a.scheduledDate || a.createdAt || 0).getTime() - new Date(b.scheduledDate || b.createdAt || 0).getTime();
        }
        return 0;
    });

    const sectionedExams = useMemo(() => {
        return filteredAndSortedExams.reduce(
            (acc, exam) => {
                const { hasSubmitted, canTake } = getExamState(exam);
                if (hasSubmitted) {
                    acc.submitted.push(exam);
                } else if (canTake) {
                    acc.open.push(exam);
                } else {
                    acc.closed.push(exam);
                }
                return acc;
            },
            { open: [] as Exam[], submitted: [] as Exam[], closed: [] as Exam[] }
        );
    }, [filteredAndSortedExams]);

    const isDeadlineSoon = (deadline?: string) => {
        if (!deadline) return false;
        const diff = new Date(deadline).getTime() - Date.now();
        return diff > 0 && diff < 1000 * 60 * 60 * 48;
    };

    const formatDeadline = (deadline: string) =>
        new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const formatPublishedDate = (publishedDate?: string) =>
        publishedDate
            ? new Date(publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Not published';

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-green-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-500';
    };

    const handleAction = (exam: Exam) => {
        const { hasSubmitted, hasInProgress, canTake, isLive } = getExamState(exam);
        if (hasSubmitted) {
            const resultLink = `/exams/${exam.id}/result${exam.latestSubmittedAttemptId ? `?attemptId=${exam.latestSubmittedAttemptId}` : ''}`;
            navigate(resultLink);
        } else if (hasInProgress && isLive) {
            navigate(`/exams/${exam.id}/take`);
        } else if (canTake) {
            navigate(`/exams/${exam.id}/take`);
        }
    };

    const renderExamCard = (exam: Exam) => {
        const { attemptsRemaining, hasSubmitted, hasInProgress, canTake } = getExamState(exam);
        const score = exam.latestSubmittedScore ?? exam.lastScore;
        const sectionTitles = (exam.sections || [])
            .map((s) => s.title?.trim())
            .filter((t): t is string => Boolean(t));
        const deadlineSoon = isDeadlineSoon(exam.deadline);
        const publishedDate = exam.scheduledDate || exam.createdAt;

        if (viewMode === 'list') {
            return (
                <Card
                    key={exam.id}
                    className="group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white rounded-md"
                >
                    <CardContent className="p-3 flex items-center gap-4">
                        <div className="shrink-0">
                            {hasSubmitted ? (
                                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                    <CheckCircle2 size={16} className="text-green-600" />
                                </div>
                            ) : hasInProgress ? (
                                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                                    <RotateCcw size={16} className="text-amber-500" />
                                </div>
                            ) : canTake ? (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Play size={15} className="text-primary fill-primary" />
                                </div>
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Lock size={15} className="text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate leading-tight">
                                {exam.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 font-medium">{exam.category}</span>
                                {sectionTitles.length > 0 && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        &middot; {sectionTitles.slice(0, 2).join(', ')}{sectionTitles.length > 2 ? ` +${sectionTitles.length - 2}` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                            <div className="text-center">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Items</p>
                                <p className="text-xs font-bold text-gray-700">{exam.questionCount}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Time</p>
                                <p className="text-xs font-bold text-gray-700">{exam.duration}m</p>
                            </div>
                            {hasSubmitted && score != null ? (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Score</p>
                                    <p className={`text-xs font-bold ${getScoreColor(score)}`}>{score}%</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Left</p>
                                    <p className={`text-xs font-bold ${attemptsRemaining > 0 ? 'text-primary' : 'text-red-500'}`}>{attemptsRemaining}</p>
                                </div>
                            )}
                            {exam.deadline && (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Deadline</p>
                                    <p className={`text-xs font-bold ${deadlineSoon ? 'text-red-500' : 'text-gray-700'}`}>{formatDeadline(exam.deadline)}</p>
                                </div>
                            )}
                            {publishedDate && (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date Published</p>
                                    <p className="text-xs font-bold text-gray-700">{formatPublishedDate(publishedDate)}</p>
                                </div>
                            )}
                        </div>

                        <div data-guide="exam-card-actions" className="flex items-center gap-1.5 shrink-0">
                            {hasSubmitted ? (
                                <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs rounded-md font-semibold gap-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction(exam)}
                                >
                                    <TrendingUp size={11} /> Result
                                </Button>
                            ) : hasInProgress && canTake ? (
                                <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs rounded-md font-semibold gap-1 bg-primary hover:bg-primary/90 text-white"
                                    onClick={() => handleAction(exam)}
                                >
                                    <RotateCcw size={11} /> Resume Exam
                                </Button>
                            ) : canTake ? (
                                <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs rounded-md font-semibold gap-1 bg-primary hover:bg-primary/90 text-white"
                                    onClick={() => handleAction(exam)}
                                >
                                    <Play size={11} fill="currentColor" /> Take Exam
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs rounded-md font-semibold gap-1 bg-primary hover:bg-primary/90 text-white"
                                    onClick={() => navigate(`/exams/${exam.id}/view`)}
                                >
                                    <Eye size={11} /> View
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card
                key={exam.id}
                className={`group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white rounded-lg overflow-hidden flex flex-col ${hasSubmitted ? 'opacity-90' : ''}`}
            >
                <CardContent className="p-3 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                            variant="outline"
                            className="text-[9px] font-semibold uppercase tracking-wider text-primary border-primary/20 bg-primary/5 rounded px-1.5 max-w-[65%] truncate"
                        >
                            {exam.category}
                        </Badge>
                        <div className="flex items-center gap-1 shrink-0">
                            {hasSubmitted ? (
                                <Badge className="font-semibold text-[9px] uppercase tracking-wider bg-green-50 text-green-600 border-none">
                                    <span className="w-1.5 h-1.5 rounded-full mr-1 bg-green-600" />
                                    Submitted
                                </Badge>
                            ) : hasInProgress ? (
                                <Badge className="font-semibold text-[9px] uppercase tracking-wider bg-amber-50 text-amber-600 border-none">
                                    <span className="w-1.5 h-1.5 rounded-full mr-1 bg-amber-500" />
                                    In Progress
                                </Badge>
                            ) : canTake ? (
                                <Badge className="font-semibold text-[9px] uppercase tracking-wider bg-blue-50 text-blue-600 border-none">
                                    <span className="w-1.5 h-1.5 rounded-full mr-1 bg-blue-500" />
                                    Available
                                </Badge>
                            ) : (
                                <Badge className="font-semibold text-[9px] uppercase tracking-wider bg-gray-50 text-gray-500 border-none">
                                    <span className="w-1.5 h-1.5 rounded-full mr-1 bg-gray-400" />
                                    {exam.status === 'LIVE' ? 'No Attempts' : 'Closed'}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight mb-1 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                        {exam.title}
                    </h3>

                    <p className="text-[10px] text-gray-500 font-medium mb-2 truncate">
                        {sectionTitles.length > 0
                            ? sectionTitles.slice(0, 3).join(' · ') + (sectionTitles.length > 3 ? ` +${sectionTitles.length - 3}` : '')
                            : 'Full Exam'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-100 mb-2">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <FileText size={10} /> Questions
                            </p>
                            <p className="text-xs font-semibold text-gray-700">{exam.questionCount} Items</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={10} /> Duration
                            </p>
                            <p className="text-xs font-semibold text-gray-700">{exam.duration} Min</p>
                        </div>
                    </div>

                    <div className="space-y-1.5 mb-2">
                        {hasSubmitted && score != null ? (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp size={10} className="text-green-500" /> Score
                                </span>
                                <span className={`text-[11px] font-bold ${getScoreColor(score)}`}>{score}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <RotateCcw size={10} className="text-primary" /> Attempts Left
                                </span>
                                <span className={`text-[11px] font-semibold ${attemptsRemaining > 0 ? 'text-primary' : 'text-red-500'}`}>
                                    {attemptsRemaining}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={10} className="text-blue-500" /> Date Published
                            </span>
                            <span className="text-[11px] font-semibold text-gray-700">
                                {formatPublishedDate(publishedDate)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={10} className={deadlineSoon ? 'text-red-500' : 'text-gray-400'} /> Deadline
                            </span>
                            <span className={`text-[11px] font-semibold ${deadlineSoon ? 'text-red-500' : 'text-gray-700'}`}>
                                {exam.deadline ? formatDeadline(exam.deadline) : 'None'}
                            </span>
                        </div>
                    </div>

                    {hasInProgress && canTake && (
                        <div className="flex items-center gap-1.5 bg-amber-50 rounded px-2 py-1 mb-2">
                            <RotateCcw size={10} className="text-amber-500 shrink-0" />
                            <span className="text-[10px] font-semibold text-amber-600">In Progress &mdash; resume from last saved point</span>
                        </div>
                    )}

                    {deadlineSoon && !hasSubmitted && (
                        <div className="flex items-center gap-1.5 bg-red-50 rounded px-2 py-1 mb-2">
                            <AlertCircle size={10} className="text-red-500 shrink-0" />
                            <span className="text-[10px] font-semibold text-red-600">Deadline approaching</span>
                        </div>
                    )}

                    <div data-guide="exam-card-actions" className="mt-auto">
                        {hasSubmitted ? (
                            <Button
                                className="h-8 w-full rounded-md font-semibold text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAction(exam)}
                            >
                                <TrendingUp size={12} /> View Result
                            </Button>
                        ) : hasInProgress && canTake ? (
                            <Button
                                className="h-8 w-full rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                                onClick={() => handleAction(exam)}
                            >
                                <RotateCcw size={12} /> Resume Exam
                            </Button>
                        ) : canTake ? (
                            <Button
                                className="h-8 w-full rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                                onClick={() => handleAction(exam)}
                            >
                                <Play size={12} fill="currentColor" /> Take Exam
                            </Button>
                        ) : (
                            <Button
                                className="h-8 w-full rounded-md font-semibold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                                onClick={() => navigate(`/exams/${exam.id}/view`)}
                            >
                                <Eye size={12} /> View Exam
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const getSectionForStatusFilter = (value: string): ExamSectionKey | null => {
        if (value === 'submitted') return 'submitted';
        if (value === 'locked') return 'closed';
        if (value === 'available' || value === 'in_progress') return 'open';
        return null;
    };

    useEffect(() => {
        if (loading) return;
        const targetSection = getSectionForStatusFilter(statusFilter);
        if (!targetSection) return;
        const target = sectionRefs.current[targetSection];
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [statusFilter, loading]);

    const renderExamSection = (sectionKey: ExamSectionKey, title: string, items: Exam[], emptyMessage: string) => (
        <section
            className="space-y-2"
            data-guide={`exams-section-${sectionKey}`}
            ref={(node) => {
                sectionRefs.current[sectionKey] = node;
            }}
        >
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() =>
                        setCollapsedSections((prev) => ({
                            ...prev,
                            [sectionKey]: !prev[sectionKey],
                        }))
                    }
                    aria-expanded={!collapsedSections[sectionKey]}
                    aria-controls={`exam-section-${sectionKey}`}
                >
                    {collapsedSections[sectionKey] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    {title}
                </button>
                <Badge variant="outline" className="text-[10px] font-semibold text-gray-500 border-gray-200 bg-white">
                    {items.length}
                </Badge>
            </div>
            {!collapsedSections[sectionKey] && (
                <div id={`exam-section-${sectionKey}`}>
                    {items.length > 0 ? (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
                            {items.map((exam) => renderExamCard(exam))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-5 text-center">
                            <p className="text-xs font-medium text-gray-500">{emptyMessage}</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header data-guide="exams-header" className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Mock Exams</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Browse and take practice exams for your LET preparation.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div data-guide="exams-search" className="relative w-full sm:w-52 group">
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
                                data-guide="exams-filters"
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
                        <DropdownMenuContent align="end" className="w-70 rounded-xl p-4 space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="submitted">Submitted</SelectItem>
                                        <SelectItem value="locked">Locked / Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categoryOptions.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Date Published</Label>
                                <Select value={publishedFilter} onValueChange={(v) => setPublishedFilter(v as 'all' | 'last_7_days' | 'last_30_days')}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Date Published" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Dates</SelectItem>
                                        <SelectItem value="last_7_days">Last 7 days</SelectItem>
                                        <SelectItem value="last_30_days">Last 30 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Sort By</Label>
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'default' | 'published_newest' | 'published_oldest')}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="published_newest">Date Published: Newest</SelectItem>
                                        <SelectItem value="published_oldest">Date Published: Oldest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-semibold"
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setCategoryFilter('all');
                                        setPublishedFilter('all');
                                        setSearch('');
                                        setSortBy('default');
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-white">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`h-7 px-2.5 rounded flex items-center transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`h-7 px-2.5 rounded flex items-center transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List size={12} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Category pills ── */}
            {!loading && categoryOptions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    <button
                        onClick={() => setCategoryFilter('all')}
                        className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-semibold border transition-all ${
                            categoryFilter === 'all'
                                ? 'bg-gray-900 text-white border-transparent'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                        All
                    </button>
                    {categoryOptions.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                            className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-semibold border transition-all ${
                                categoryFilter === cat
                                    ? 'bg-gray-900 text-white border-transparent'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Results count ── */}
            {!loading && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 -mt-1">
                    {filteredAndSortedExams.length} {filteredAndSortedExams.length === 1 ? 'exam' : 'exams'}{activeFilterCount > 0 ? ' found' : ' available'}
                </p>
            )}

            {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1' : 'flex flex-col gap-2 mt-1'}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="border-gray-100 bg-white rounded-lg">
                            <CardContent className="p-3 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24 rounded" />
                                    <Skeleton className="h-4 w-16 rounded" />
                                </div>
                                <Skeleton className="h-8 w-full rounded" />
                                <Skeleton className="h-3 w-3/4 rounded" />
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                                    <Skeleton className="h-8 rounded" />
                                    <Skeleton className="h-8 rounded" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Skeleton className="h-7 rounded" />
                                    <Skeleton className="h-7 rounded" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredAndSortedExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 mt-1">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <BookOpen size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-900">No exams found</h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {activeFilterCount > 0
                                ? 'Try adjusting your filters or search query.'
                                : 'No exams are assigned to your program yet.'}
                        </p>
                    </div>
                    {activeFilterCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold border-gray-200"
                            onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); setPublishedFilter('all'); setSortBy('default'); }}
                        >
                            Clear All Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div data-guide="exams-results" className="space-y-5 mt-1">
                    {renderExamSection('open', 'Open Exams', sectionedExams.open, 'No open exams right now.')}
                    {renderExamSection('submitted', 'Submitted Exams', sectionedExams.submitted, 'No submitted exams yet.')}
                    {renderExamSection('closed', 'Closed Exams', sectionedExams.closed, 'No closed exams yet.')}
                </div>
            )}

            <Dialog open={Boolean(viewingExam)} onOpenChange={(open) => !open && setViewingExam(null)}>
                <DialogContent className="rounded-xl max-w-md border-none shadow-xl">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-base font-bold tracking-tight leading-snug">
                            {viewingExam?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 whitespace-pre-wrap wrap-break-word leading-relaxed">
                            {viewingExam?.description?.trim() || 'No description provided.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</p>
                            <p className="text-xs font-semibold text-gray-800">{viewingExam?.category || 'No Category'}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Deadline</p>
                            <p className={`text-xs font-semibold ${viewingExam?.deadline && isDeadlineSoon(viewingExam.deadline) ? 'text-red-500' : 'text-gray-800'}`}>
                                {viewingExam?.deadline ? formatDeadline(viewingExam.deadline) : 'No deadline'}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Questions</p>
                            <p className="text-xs font-semibold text-gray-800">{viewingExam?.questionCount || 0} Items</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Duration</p>
                            <p className="text-xs font-semibold text-gray-800">{viewingExam?.duration || 0} Minutes</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attempts Left</p>
                            <p className={`text-xs font-semibold ${(viewingExam?.attempts_remaining ?? 0) > 0 ? 'text-primary' : 'text-red-500'}`}>
                                {viewingExam?.attempts_remaining ?? 0}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date Published</p>
                            <p className="text-xs font-semibold text-gray-800">
                                {formatPublishedDate(viewingExam?.scheduledDate || viewingExam?.createdAt)}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sections</p>
                            <p className="text-xs font-semibold text-gray-800 leading-snug">
                                {(viewingExam?.sections || [])
                                    .map((s) => s.title?.trim())
                                    .filter((t): t is string => Boolean(t))
                                    .join(', ') || 'Full Exam'}
                            </p>
                        </div>
                        {(() => {
                            if (!viewingExam) return null;
                            const score = viewingExam.latestSubmittedScore ?? viewingExam.lastScore;
                            if (score == null) return null;
                            return (
                                <div className="col-span-2 space-y-0.5 pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Score</p>
                                    <p className={`text-base font-black ${getScoreColor(score)}`}>{score}%</p>
                                </div>
                            );
                        })()}
                    </div>

                    <DialogFooter className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                            variant="outline"
                            className="h-9 rounded-md font-semibold text-xs border-gray-200"
                            onClick={() => setViewingExam(null)}
                        >
                            Close
                        </Button>
                        <Button
                            className={`h-9 rounded-md font-semibold text-xs gap-1.5 ${
                                viewingExam && getExamState(viewingExam).hasSubmitted
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-primary hover:bg-primary/90 text-white'
                            }`}
                            disabled={Boolean(
                                viewingExam &&
                                    !getExamState(viewingExam).hasSubmitted &&
                                    !getExamState(viewingExam).canTake
                            )}
                            onClick={() => {
                                if (!viewingExam) return;
                                setViewingExam(null);
                                handleAction(viewingExam);
                            }}
                        >
                            {viewingExam && getExamState(viewingExam).hasSubmitted ? (
                                <><TrendingUp size={13} /> View Result</>
                            ) : viewingExam && getExamState(viewingExam).hasInProgress ? (
                                <><RotateCcw size={13} /> Resume Exam</>
                            ) : (
                                <><Play size={13} fill="currentColor" /> Take Exam</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExamsPage;
