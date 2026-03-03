import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Columns3,
    Edit,
    Eye,
    Filter,
    MoreVertical,
    Search,
    Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AttemptUser {
    id: string;
    name: string;
    email: string;
    programTrack: string | null;
    yearLevel?: string | null;
    section?: string | null;
}

interface AttemptItem {
    id: string;
    examId: string;
    attemptNo: number;
    startedAt: string;
    submittedAt: string | null;
    percentage: number | string | null;
    score: number | null;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';
    exam?: {
        id: string;
        title: string;
        subject?: string | null;
        totalItems?: number;
    };
    user?: AttemptUser;
}

interface StudentSummary {
    id: string;
    name: string;
    email: string;
    programTrack: string;
    yearLevel?: string;
    section?: string;
    attempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    avgPercentage: number;
    bestPercentage: number;
    lastActivityAt: string | null;
    latestExamTitle: string;
    recentAttempts: AttemptItem[];
}

interface StudentUserItem {
    id: string;
    name: string;
    email: string;
    role: string;
    program?: string | null;
    program_track?: string | null;
    yearLevel?: string | null;
    section?: string | null;
}

type StudentColumn = 'student' | 'program' | 'attempts' | 'performance' | 'lastActivity';
type SortDirection = 'asc' | 'desc';
type SortKey = 'name' | 'program' | 'attempts' | 'avg' | 'lastActivity';

const columnLabels: Record<StudentColumn, string> = {
    student: 'Student',
    program: 'Program',
    attempts: 'Attempts',
    performance: 'Performance',
    lastActivity: 'Last Activity',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const StudentManagementPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [students, setStudents] = useState<StudentUserItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [trackFilter, setTrackFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('lastActivity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [deleteStudentTarget, setDeleteStudentTarget] = useState<StudentSummary | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<Record<StudentColumn, boolean>>({
        student: true,
        program: true,
        attempts: true,
        performance: true,
        lastActivity: true,
    });

    const isAdmin = user?.role === 'ADMIN';

    const fetchAttempts = async () => {
        const response = await api.get('/attempts', {
            params: { page: 1, limit: 500 },
        });

        return (response.data?.data || []) as AttemptItem[];
    };

    const fetchStudents = async () => {
        const response = await api.get('/users', {
            params: {
                page: 1,
                limit: 1000,
                role: 'REVIEWEE',
            },
        });

        return (response.data?.data || []) as StudentUserItem[];
    };

    const fetchData = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const [attemptRows, studentRows] = await Promise.all([
                fetchAttempts(),
                fetchStudents().catch((error) => {
                    if (error?.response?.status === 403) return [] as StudentUserItem[];
                    throw error;
                }),
            ]);

            setAttempts(attemptRows);
            setStudents(studentRows);
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to load student activity');
            setAttempts([]);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const studentSummaries = useMemo<StudentSummary[]>(() => {
        const byStudent = new Map<string, AttemptItem[]>();

        attempts.forEach((attempt) => {
            if (!attempt.user?.id) return;
            const userAttempts = byStudent.get(attempt.user.id) || [];
            userAttempts.push(attempt);
            byStudent.set(attempt.user.id, userAttempts);
        });

        const summariesById = new Map<string, StudentSummary>();

        students.forEach((student) => {
            const studentAttempts = byStudent.get(student.id) || [];
            const first = studentAttempts[0];
            const submitted = studentAttempts.filter((item) => item.status === 'SUBMITTED');
            const inProgress = studentAttempts.filter((item) => item.status === 'IN_PROGRESS');

            const percentages = submitted
                .map((item) => Number(item.percentage || 0))
                .filter((value) => Number.isFinite(value));

            const avgPercentage = percentages.length > 0
                ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100
                : 0;

            const bestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;

            const sortedByRecent = [...studentAttempts].sort((a, b) => {
                const aTime = new Date(a.submittedAt || a.startedAt).getTime();
                const bTime = new Date(b.submittedAt || b.startedAt).getTime();
                return bTime - aTime;
            });

            summariesById.set(student.id, {
                id: student.id,
                name: student.name || first?.user?.name || 'Unknown Student',
                email: student.email || first?.user?.email || 'N/A',
                programTrack: student.program || student.program_track || first?.user?.programTrack || 'Unassigned',
                yearLevel: student.yearLevel || first?.user?.yearLevel || '',
                section: student.section || first?.user?.section || '',
                attempts: studentAttempts.length,
                completedAttempts: submitted.length,
                inProgressAttempts: inProgress.length,
                avgPercentage,
                bestPercentage,
                lastActivityAt: sortedByRecent[0]?.submittedAt || sortedByRecent[0]?.startedAt || null,
                latestExamTitle: sortedByRecent[0]?.exam?.title || 'N/A',
                recentAttempts: sortedByRecent.slice(0, 6),
            });
        });

        byStudent.forEach((studentAttempts, studentId) => {
            if (summariesById.has(studentId)) return;

            const first = studentAttempts[0];
            const submitted = studentAttempts.filter((item) => item.status === 'SUBMITTED');
            const inProgress = studentAttempts.filter((item) => item.status === 'IN_PROGRESS');

            const percentages = submitted
                .map((item) => Number(item.percentage || 0))
                .filter((value) => Number.isFinite(value));

            const avgPercentage = percentages.length > 0
                ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100
                : 0;

            const bestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;

            const sortedByRecent = [...studentAttempts].sort((a, b) => {
                const aTime = new Date(a.submittedAt || a.startedAt).getTime();
                const bTime = new Date(b.submittedAt || b.startedAt).getTime();
                return bTime - aTime;
            });

            summariesById.set(studentId, {
                id: studentId,
                name: first.user?.name || 'Unknown Student',
                email: first.user?.email || 'N/A',
                programTrack: first.user?.programTrack || 'Unassigned',
                yearLevel: first.user?.yearLevel || '',
                section: first.user?.section || '',
                attempts: studentAttempts.length,
                completedAttempts: submitted.length,
                inProgressAttempts: inProgress.length,
                avgPercentage,
                bestPercentage,
                lastActivityAt: sortedByRecent[0]?.submittedAt || sortedByRecent[0]?.startedAt || null,
                latestExamTitle: sortedByRecent[0]?.exam?.title || 'N/A',
                recentAttempts: sortedByRecent.slice(0, 6),
            });
        });

        return Array.from(summariesById.values());
    }, [attempts, students]);

    const trackOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.programTrack))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return studentSummaries
            .filter((student) => {
                const matchesSearch = !normalizedSearch
                    || student.name.toLowerCase().includes(normalizedSearch)
                    || student.email.toLowerCase().includes(normalizedSearch)
                    || student.programTrack.toLowerCase().includes(normalizedSearch);

                const matchesTrack = trackFilter === 'ALL' || student.programTrack === trackFilter;

                return matchesSearch && matchesTrack;
            });
    }, [search, studentSummaries, trackFilter]);

    const sortedStudents = useMemo(() => {
        const copy = [...filteredStudents];
        copy.sort((first, second) => {
            let value = 0;

            if (sortBy === 'name') {
                value = first.name.localeCompare(second.name);
            } else if (sortBy === 'program') {
                value = first.programTrack.localeCompare(second.programTrack);
            } else if (sortBy === 'attempts') {
                value = first.attempts - second.attempts;
            } else if (sortBy === 'avg') {
                value = first.avgPercentage - second.avgPercentage;
            } else {
                const firstValue = first.lastActivityAt ? new Date(first.lastActivityAt).getTime() : 0;
                const secondValue = second.lastActivityAt ? new Date(second.lastActivityAt).getTime() : 0;
                value = firstValue - secondValue;
            }

            return sortDirection === 'asc' ? value : -value;
        });

        return copy;
    }, [filteredStudents, sortBy, sortDirection]);

    const totalPages = Math.max(1, Math.ceil(sortedStudents.length / limit));
    const currentPageStudents = useMemo(() => {
        const start = (page - 1) * limit;
        return sortedStudents.slice(start, start + limit);
    }, [sortedStudents, page, limit]);

    useEffect(() => {
        setPage(1);
    }, [search, trackFilter]);

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortBy(key);
        setSortDirection('asc');
    };

    const renderSortIcon = (key: SortKey) => {
        if (sortBy !== key) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
        if (sortDirection === 'asc') return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
        return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
    };

    const resetFilters = () => {
        setTrackFilter('ALL');
        setPage(1);
    };

    const handleEditStudent = (_student: StudentSummary) => {
        if (!isAdmin) return;
        navigate('/admin/users');
    };

    const handleDeleteStudent = (student: StudentSummary) => {
        if (!isAdmin) return;
        setDeleteStudentTarget(student);
    };

    const confirmDeleteStudent = async () => {
        if (!deleteStudentTarget) return;
        const target = deleteStudentTarget;
        setDeleteStudentTarget(null);
        try {
            setMutatingId(target.id);
            await api.delete(`/users/${target.id}`);
            await fetchData();
            toast.success(`${target.name} has been removed.`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete student.');
        } finally {
            setMutatingId(null);
        }
    };

    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 1;
    const fromCount = sortedStudents.length === 0 ? 0 : (page - 1) * limit + 1;
    const toCount = Math.min(page * limit, sortedStudents.length);

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Student Management</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Student profiles, exam activity, and performance trends.</p>
                </div>
            </header>

            <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm space-y-2.5">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or program"
                            className="h-8 pl-9 rounded-md border-gray-200 text-xs"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-8 rounded-md border-gray-200 text-xs font-semibold gap-1.5 bg-white">
                                <Filter className="w-3 h-3" /> Filters
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 p-3 font-lexend space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Program</Label>
                                <Select value={trackFilter} onValueChange={setTrackFilter}>
                                    <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-white text-xs font-semibold">
                                        <SelectValue placeholder="Filter program" />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ALL">All Programs</SelectItem>
                                        {trackOptions.map((track) => (
                                            <SelectItem key={track} value={track}>{track}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" className="h-8 w-full rounded-lg border-gray-200 text-xs font-semibold" onClick={resetFilters}>
                                Reset filters
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-8 rounded-md border-gray-200 text-xs font-semibold gap-1.5 bg-white">
                                <Columns3 className="w-3 h-3" /> Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-lexend min-w-44">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-500">Visible columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(Object.keys(visibleColumns) as StudentColumn[]).map((key) => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={visibleColumns[key]}
                                    onCheckedChange={(checked) => {
                                        setVisibleColumns((prev) => ({ ...prev, [key]: checked === true }));
                                    }}
                                    className="text-xs font-semibold"
                                >
                                    {columnLabels[key]}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-gray-100">
                                    {visibleColumns.student && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 min-w-64">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('name')}>
                                                Student {renderSortIcon('name')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.program && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 min-w-44">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('program')}>
                                                Program {renderSortIcon('program')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.attempts && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('attempts')}>
                                                Attempts {renderSortIcon('attempts')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.performance && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('avg')}>
                                                Performance {renderSortIcon('avg')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.lastActivity && (
                                        <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 min-w-52">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('lastActivity')}>
                                                Last Activity {renderSortIcon('lastActivity')}
                                            </button>
                                        </TableHead>
                                    )}
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            Loading students...
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            No student data available
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.map((student) => (
                                    <TableRow key={student.id} className="border-gray-100 hover:bg-gray-50/70 align-top">
                                        {visibleColumns.student && (
                                            <TableCell className="px-3 py-2.5 min-w-64">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{student.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-xs text-gray-500 font-medium truncate max-w-40">{student.email}</p>
                                                        {(student.yearLevel || student.section) && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-bold border-gray-200 text-gray-400">
                                                                {student.yearLevel} {student.section}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.program && (
                                            <TableCell className="px-3 py-2.5 text-xs font-semibold text-gray-700 min-w-44">
                                                {student.programTrack}
                                            </TableCell>
                                        )}
                                        {visibleColumns.attempts && (
                                            <TableCell className="px-3 py-2.5">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                                    <Badge variant="outline" className="text-[10px] font-bold border-gray-200">{student.attempts} total</Badge>
                                                    <Badge variant="outline" className="text-[10px] font-bold border-green-200 text-green-700 bg-green-50">{student.completedAttempts} done</Badge>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.performance && (
                                            <TableCell className="px-3 py-2.5 min-w-40">
                                                <p className="text-xs font-semibold text-gray-700">Avg: {student.avgPercentage.toFixed(1)}%</p>
                                                <p className="text-[11px] font-semibold text-gray-500">Best: {student.bestPercentage.toFixed(1)}%</p>
                                            </TableCell>
                                        )}
                                        {visibleColumns.lastActivity && (
                                            <TableCell className="px-3 py-2.5 min-w-52">
                                                {student.lastActivityAt ? (
                                                    <>
                                                        <p className="text-xs font-semibold text-gray-700">{formatDate(student.lastActivityAt)}</p>
                                                        <p className="text-[11px] text-gray-500 truncate">{student.latestExamTitle}</p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-500">No activity</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="px-3 py-2.5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={mutatingId === student.id}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="font-lexend min-w-36">
                                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-500">Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setSelectedStudent(student)} className="font-semibold gap-2 text-xs">
                                                        <Eye className="w-4 h-4" /> View
                                                    </DropdownMenuItem>
                                                    {isAdmin && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleEditStudent(student)} className="font-semibold gap-2 text-xs">
                                                                <Edit className="w-4 h-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteStudent(student)}
                                                                className="font-semibold gap-2 text-xs text-rose-700 focus:text-rose-700 focus:bg-rose-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-gray-500">
                            Showing <span className="text-gray-900">{fromCount}-{toCount}</span> of <span className="text-gray-900">{sortedStudents.length}</span> students
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-gray-200"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Badge variant="outline" className="h-8 px-3 rounded-lg text-xs font-bold border-gray-200">
                                {page} / {totalPages}
                            </Badge>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-gray-200"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="sm:max-w-2xl rounded-lg font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">Student Details</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            {selectedStudent?.name} â€¢ {selectedStudent?.programTrack}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStudent && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Card className="rounded-md border-gray-100">
                                    <CardContent className="p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Attempts</p>
                                        <p className="text-base font-bold text-gray-900">{selectedStudent.attempts}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-md border-gray-100">
                                    <CardContent className="p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Completed</p>
                                        <p className="text-base font-bold text-green-700">{selectedStudent.completedAttempts}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-md border-gray-100">
                                    <CardContent className="p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Average</p>
                                        <p className="text-base font-bold text-indigo-700">{selectedStudent.avgPercentage.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-md border-gray-100">
                                    <CardContent className="p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Best</p>
                                        <p className="text-base font-bold text-primary">{selectedStudent.bestPercentage.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-md border border-gray-100 overflow-hidden">
                                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/70 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                    Recent attempts
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {selectedStudent.recentAttempts.map((attempt) => (
                                        <div key={attempt.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{attempt.exam?.title || 'Untitled Exam'}</p>
                                                <p className="text-[11px] text-gray-500 truncate">Attempt #{attempt.attemptNo} â€¢ {attempt.status.replace('_', ' ')}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-semibold text-gray-700">{Number(attempt.percentage || 0).toFixed(1)}%</p>
                                                <p className="text-[11px] text-gray-500 flex items-center gap-1 justify-end">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(attempt.submittedAt || attempt.startedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteStudentTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteStudentTarget(null); }}
                title="Delete Student"
                description={`Delete ${deleteStudentTarget?.name ?? ''}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
                isLoading={!!mutatingId}
                onConfirm={confirmDeleteStudent}
            />
        </div>
    );
};

export default StudentManagementPage;
