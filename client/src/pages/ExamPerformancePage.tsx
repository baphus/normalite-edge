import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    RefreshCw,
    Search,
    CheckCircle2,
    Clock,
    FileBarChart2,
    XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExamDetails {
    id: string;
    title?: string;
    category?: string;
    totalItems?: number;
    questionCount?: number;
    duration?: number;
    timeLimit?: number;
    status?: string;
    deadline?: string;
    tracks?: Array<{ id?: string; name: string; code?: string | null }>;
    program_track?: string | null;
}

interface ReportItem {
    examId: string;
    examTitle: string;
    subject: string;
    attemptsCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
}

interface ReportSummary {
    submittedStudentCount: number;
    totalVisibleStudents: number;
}

interface AttemptListItem {
    id: string;
    status: string;
    score?: number | null;
    percentage?: number | null;
    timeSpentSeconds?: number | null;
    startedAt?: string;
    submittedAt?: string | null;
    user?: {
        id: string;
        name: string;
        email?: string;
        programTrack?: string | null;
        yearLevel?: string | null;
        section?: string | null;
    };
}

interface AttemptQuestion {
    id: string;
    orderNo?: number;
    questionText?: string;
    imageUrl?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    rationalization?: string | null;
    section?: string | { id?: string; title?: string } | null;
}

interface AttemptReview {
    id: string;
    score?: number | null;
    percentage?: number | null;
    timeSpentSeconds?: number | null;
    status: string;
    submittedAt?: string | null;
    exam?: {
        id: string;
        title?: string;
        questions?: AttemptQuestion[];
    };
    user?: {
        id: string;
        name: string;
        email?: string;
    };
    answers?: Record<string, string | undefined>;
}

const asNumber = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

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

const toChoiceLabel = (choice?: string | null) => {
    if (!choice) return '—';
    const normalized = choice.trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(normalized)) return normalized;
    return normalized.slice(0, 1);
};

const ExamPerformancePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [reportItem, setReportItem] = useState<ReportItem | null>(null);
    const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
    const [attempts, setAttempts] = useState<AttemptListItem[]>([]);

    const [search, setSearch] = useState('');

    const [selectedAttempt, setSelectedAttempt] = useState<AttemptListItem | null>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [attemptReview, setAttemptReview] = useState<AttemptReview | null>(null);

    const questionCount = Math.max(
        asNumber(exam?.questionCount || exam?.totalItems),
        1
    );

    const submittedAttempts = useMemo(
        () => attempts.filter((attempt) => attempt.status === 'SUBMITTED'),
        [attempts]
    );

    const totalAttempts = attempts.length;
    const totalSubmitted = submittedAttempts.length;
    const inProgressCount = attempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length;

    const completionRate = totalAttempts > 0 ? (totalSubmitted / totalAttempts) * 100 : 0;

    const filteredAttempts = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return attempts;

        return attempts.filter((attempt) => {
            const name = attempt.user?.name?.toLowerCase() || '';
            const email = attempt.user?.email?.toLowerCase() || '';
            return name.includes(keyword) || email.includes(keyword);
        });
    }, [attempts, search]);

    const loadData = async (asRefresh = false) => {
        if (!id) {
            setLoadError('Missing exam ID.');
            return;
        }

        if (asRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setLoadError('');

        try {
            const [examResponse, reportResponse, attemptsResponse] = await Promise.all([
                api.get(`/exams/${id}`),
                api.get('/reports/exam-performance', { params: { examId: id } }),
                api.get('/attempts', { params: { examId: id, page: 1, limit: 200 } }),
            ]);

            const fetchedExam = (examResponse.data?.data || null) as ExamDetails | null;
            const reportItems = (reportResponse.data?.data?.items || []) as ReportItem[];
            const summary = (reportResponse.data?.data?.summary || null) as ReportSummary | null;
            const fetchedAttempts = (attemptsResponse.data?.data || []) as AttemptListItem[];

            setExam(fetchedExam);
            setReportItem(reportItems[0] || null);
            setReportSummary(summary);
            setAttempts(fetchedAttempts);
        } catch (error) {
            console.error('Failed to load exam analytics', error);
            setLoadError('Unable to load analytics data at the moment.');
            setExam(null);
            setReportItem(null);
            setReportSummary(null);
            setAttempts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const downloadBlob = (blob: Blob, filename: string) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = fileUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(fileUrl);
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        if (!id) return;

        try {
            const response = await api.get('/reports/exam-performance/export', {
                params: { format, examId: id },
                responseType: 'blob',
            });

            const dateStamp = new Date().toISOString().slice(0, 10);
            const extension = format === 'pdf' ? 'pdf' : 'csv';
            downloadBlob(response.data, `exam-performance-${id}-${dateStamp}.${extension}`);
        } catch (error) {
            console.error(`Failed to export ${format} report`, error);
        }
    };

    const openAnalysis = async (attempt: AttemptListItem) => {
        setSelectedAttempt(attempt);
        setAttemptReview(null);
        setReviewError('');
        setReviewLoading(true);

        try {
            const response = await api.get(`/attempts/${attempt.id}`);
            setAttemptReview((response.data?.data || null) as AttemptReview | null);
        } catch (error) {
            console.error('Failed to load attempt review', error);
            setReviewError('Unable to load this student\'s detailed review.');
        } finally {
            setReviewLoading(false);
        }
    };

    const closeAnalysis = () => {
        setSelectedAttempt(null);
        setAttemptReview(null);
        setReviewError('');
        setReviewLoading(false);
    };

    const detailRows = useMemo(() => {
        if (!attemptReview?.exam?.questions || !attemptReview.answers) return [];

        return attemptReview.exam.questions
            .slice()
            .sort((first, second) => asNumber(first.orderNo) - asNumber(second.orderNo))
            .map((question, index) => {
                const selectedChoice = attemptReview.answers?.[question.id];
                const correctChoice = question.correctChoice || '';
                const isCorrect = !!selectedChoice && toChoiceLabel(selectedChoice) === toChoiceLabel(correctChoice);

                return {
                    id: question.id,
                    orderNo: index + 1,
                    section: (typeof question.section === 'string'
                        ? question.section
                        : (question.section as any)?.title || ''
                    ).trim() || 'General Section',
                    questionText: question.questionText?.trim() || 'No question text available.',
                    imageUrl: question.imageUrl || null,
                    selectedChoice: toChoiceLabel(selectedChoice),
                    correctChoice: toChoiceLabel(correctChoice),
                    isCorrect,
                    rationalization: question.rationalization?.trim() || 'No explanation provided.',
                };
            });
    }, [attemptReview]);

    const incorrectCount = detailRows.filter((entry) => !entry.isCorrect).length;

    const avgScoreValue = reportItem ? asNumber(reportItem.averageScore) : 0;
    const highestScoreValue = reportItem ? asNumber(reportItem.highestScore) : 0;
    const lowestScoreValue = reportItem ? asNumber(reportItem.lowestScore) : 0;
    const totalVisibleStudents = reportSummary?.totalVisibleStudents ?? totalSubmitted;
    const submittedStudentCount = reportSummary?.submittedStudentCount ?? totalSubmitted;
    const examStatus = exam?.status || 'UNKNOWN';
    const visibleToLabel = useMemo(() => {
        const tracks = exam?.tracks || [];
        if (tracks.length > 0) {
            return tracks
                .map((track) => track.code ? `${track.name} (${track.code})` : track.name)
                .join(', ');
        }

        if (exam?.program_track?.trim()) {
            return exam.program_track;
        }

        return 'All Programs';
    }, [exam]);
    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-64 rounded-md" />
                    <Skeleton className="h-8 w-44 rounded-md" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-lg" />
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
                        onClick={() => navigate('/manage-exams')}
                        className="h-8 w-8 rounded-md"
                    >
                        <ArrowLeft size={15} />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight">Exam Performance</h1>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {exam?.title?.trim() || reportItem?.examTitle || 'Unknown Exam'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-8 rounded-md text-xs font-semibold border-gray-200 gap-1.5"
                                disabled={!id}
                            >
                                <Download size={13} /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-lg">
                            <DropdownMenuItem onClick={() => handleExport('csv')} className="font-semibold text-xs">
                                Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('pdf')} className="font-semibold text-xs">
                                <FileBarChart2 size={13} className="mr-1.5" /> Export PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        className="h-8 rounded-md text-xs font-semibold bg-primary hover:bg-primary/95 text-white gap-1.5"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
                    </Button>
                </div>
            </header>

            {loadError ? (
                <Card className="rounded-lg border-red-100 bg-red-50/40">
                    <CardContent className="p-4 text-xs font-semibold text-red-700 flex items-center justify-between gap-4">
                        <span>{loadError}</span>
                        <Button variant="outline" size="sm" onClick={() => loadData(true)} className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50">
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-xl border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Students (Visible)</p>
                        <p className="text-3xl font-black text-gray-900">{totalVisibleStudents}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-1">Submitted: {submittedStudentCount}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Average Score</p>
                        <p className="text-3xl font-black text-gray-900">{formatPercent(avgScoreValue)}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Exam Status</p>
                        <p className={`text-3xl font-black ${examStatus === 'LIVE' ? 'text-emerald-600' : examStatus === 'CLOSED' ? 'text-red-600' : 'text-gray-900'}`}>
                            {examStatus}
                        </p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Completion Rate</p>
                        <p className="text-3xl font-black text-gray-900">{formatPercent(completionRate)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="lg:col-span-2 rounded-lg border-gray-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-3 pb-2.5 flex flex-row items-center justify-between space-y-0 gap-4">
                        <CardTitle className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Student Results <span className="text-gray-400 font-semibold normal-case tracking-normal ml-1">({filteredAttempts.length} shown)</span>
                        </CardTitle>
                        <div className="relative group w-52 max-w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={13} />
                            <Input
                                placeholder="Search student..."
                                className="pl-8 h-8 rounded-md border-gray-200 text-xs"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-gray-100">
                                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Student</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Track</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Year</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Section</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Started</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Submitted</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">School Email</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center h-12">Score</TableHead>
                                    <TableHead className="pr-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right h-12">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAttempts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-10 text-center text-sm text-gray-500 font-medium">
                                            No attempt records found for this exam.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAttempts.map((attempt) => {
                                        const scorePercent = asNumber(attempt.percentage);
                                        const studentName = attempt.user?.name?.trim() || 'Unknown User';
                                        const studentEmail = attempt.user?.email?.trim() || 'No email';
                                        const studentTrack = attempt.user?.programTrack?.trim() || 'N/A';
                                        const studentYear = attempt.user?.yearLevel?.trim() || 'N/A';
                                        const studentSection = attempt.user?.section?.trim() || 'N/A';

                                        return (
                                            <TableRow key={attempt.id} className="hover:bg-gray-50/50 transition-colors border-gray-100">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 text-sm">{studentName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{studentTrack}</TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{studentYear}</TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{studentSection}</TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{formatDate(attempt.startedAt)}</TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{formatDate(attempt.submittedAt)}</TableCell>
                                                <TableCell className="text-xs font-semibold text-gray-700">{studentEmail}</TableCell>
                                                <TableCell className="text-center font-black text-sm text-gray-700">
                                                    {formatPercent(scorePercent)}
                                                </TableCell>
                                                <TableCell className="pr-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => openAnalysis(attempt)}
                                                        className="text-primary hover:text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px]"
                                                    >
                                                        Analyze
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-3 pb-2.5">
                            <CardTitle className="text-xs font-bold text-gray-900 uppercase tracking-wider">Report Snapshot</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attempts</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{totalAttempts}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{submittedStudentCount}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Progress</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{inProgressCount}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{formatPercent(completionRate)}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Highest</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{formatPercent(highestScoreValue)}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lowest</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{formatPercent(lowestScoreValue)}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Questions</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{questionCount}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                                    <p className="text-base font-black text-gray-900 mt-1">{asNumber(exam?.duration || exam?.timeLimit)}m</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exam Status</p>
                                    <p className={`text-base font-black mt-1 ${examStatus === 'LIVE' ? 'text-emerald-600' : examStatus === 'CLOSED' ? 'text-red-600' : 'text-gray-900'}`}>
                                        {examStatus}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40 col-span-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visible To (Tracks/Programs)</p>
                                    <p className="text-xs font-bold text-gray-900 mt-1 whitespace-pre-wrap wrap-break-word">{visibleToLabel}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/40 col-span-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closed On</p>
                                    <p className="text-xs font-bold text-gray-900 mt-1">{formatDate(exam?.deadline || null)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={Boolean(selectedAttempt)} onOpenChange={(open) => !open && closeAnalysis()}>
                <DialogContent className="max-w-4xl p-0 rounded-xl overflow-hidden border-none shadow-xl bg-white">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
                        <DialogTitle className="text-sm font-bold text-gray-900">Student Analysis</DialogTitle>
                    </DialogHeader>

                    {reviewLoading ? (
                        <div className="p-5 space-y-3">
                            <Skeleton className="h-14 rounded-lg" />
                            <Skeleton className="h-14 rounded-lg" />
                            <Skeleton className="h-44 rounded-lg" />
                        </div>
                    ) : reviewError ? (
                        <div className="p-5 text-xs text-red-600 font-semibold">{reviewError}</div>
                    ) : !attemptReview ? (
                        <div className="p-5 text-xs text-gray-500 font-semibold">No attempt review data found.</div>
                    ) : (
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{attemptReview.user?.name || 'Unknown User'}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{formatPercent(asNumber(attemptReview.percentage))}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Incorrect</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{incorrectCount}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Started</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{formatDate(selectedAttempt?.startedAt)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">{formatDate(attemptReview.submittedAt || selectedAttempt?.submittedAt || null)}</p>
                                </div>
                            </div>

                            {detailRows.length === 0 ? (
                                <div className="rounded-xl border border-gray-100 p-6 text-sm text-gray-500 font-medium">
                                    No question-level review data available for this attempt.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {detailRows.map((entry) => (
                                        <div key={entry.id} className="rounded-xl border border-gray-100 p-4 bg-white">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Question #{entry.orderNo || '—'} • {entry.section}</p>
                                                    <p className="text-sm font-bold text-gray-900 mt-1">{entry.questionText}</p>
                                                    {entry.imageUrl && (
                                                        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/30 p-3">
                                                            <img
                                                                src={entry.imageUrl}
                                                                alt="Question attachment"
                                                                className="max-h-72 w-auto max-w-full rounded-lg border border-gray-100 object-contain bg-white"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <Badge className={`rounded-xl text-[9px] font-black px-3 py-1 uppercase tracking-widest border-none ${entry.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    {entry.isCorrect ? <CheckCircle2 size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
                                                    {entry.isCorrect ? 'Correct' : 'Incorrect'}
                                                </Badge>
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Answer</p>
                                                    <p className="font-bold text-gray-900 mt-1">{entry.selectedChoice}</p>
                                                </div>
                                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correct Answer</p>
                                                    <p className="font-bold text-gray-900 mt-1">{entry.correctChoice}</p>
                                                </div>
                                                <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/50 md:col-span-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock size={12} /> Explanation
                                                    </p>
                                                    <p className="font-medium text-gray-700 mt-1">{entry.rationalization}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="p-4 bg-white border-t border-gray-100">
                        <Button onClick={closeAnalysis} className="h-8 rounded-md text-xs font-semibold bg-primary hover:bg-primary/95 text-white">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExamPerformancePage;
