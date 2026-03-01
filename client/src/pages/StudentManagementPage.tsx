import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Eye,
    GraduationCap,
    Search,
    Trophy,
    UserCircle2,
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
import api from '@/lib/axios';

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

const StudentManagementPage: React.FC = () => {
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [trackFilter, setTrackFilter] = useState('ALL');
    const [activityFilter, setActivityFilter] = useState<'ALL' | 'ACTIVE' | 'AT_RISK'>('ALL');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);

    useEffect(() => {
        const fetchAttempts = async () => {
            setLoading(true);
            setErrorMessage(null);
            try {
                const response = await api.get('/attempts', {
                    params: { page: 1, limit: 500 },
                });

                const rows = (response.data?.data || []) as AttemptItem[];
                setAttempts(rows);
            } catch (error: any) {
                setErrorMessage(error?.response?.data?.message || 'Failed to load student activity');
                setAttempts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAttempts();
    }, []);

    const studentSummaries = useMemo<StudentSummary[]>(() => {
        const byStudent = new Map<string, AttemptItem[]>();

        attempts.forEach((attempt) => {
            if (!attempt.user?.id) return;
            const userAttempts = byStudent.get(attempt.user.id) || [];
            userAttempts.push(attempt);
            byStudent.set(attempt.user.id, userAttempts);
        });

        return Array.from(byStudent.entries()).map(([studentId, studentAttempts]) => {
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

            return {
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
            };
        });
    }, [attempts]);

    const trackOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.programTrack))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const now = Date.now();
        const activeWindow = 14 * 24 * 60 * 60 * 1000;

        return studentSummaries
            .filter((student) => {
                const matchesSearch = !normalizedSearch
                    || student.name.toLowerCase().includes(normalizedSearch)
                    || student.email.toLowerCase().includes(normalizedSearch)
                    || student.programTrack.toLowerCase().includes(normalizedSearch);

                const matchesTrack = trackFilter === 'ALL' || student.programTrack === trackFilter;

                if (activityFilter === 'ALL') return matchesSearch && matchesTrack;

                const last = student.lastActivityAt ? new Date(student.lastActivityAt).getTime() : 0;
                const isActive = last > 0 && now - last <= activeWindow;

                return matchesSearch && matchesTrack && (activityFilter === 'ACTIVE' ? isActive : !isActive);
            })
            .sort((a, b) => {
                const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                return bTime - aTime;
            });
    }, [activityFilter, search, studentSummaries, trackFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / limit));
    const currentPageStudents = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredStudents.slice(start, start + limit);
    }, [filteredStudents, page, limit]);

    useEffect(() => {
        setPage(1);
    }, [search, trackFilter, activityFilter]);

    const fromCount = filteredStudents.length === 0 ? 0 : (page - 1) * limit + 1;
    const toCount = Math.min(page * limit, filteredStudents.length);

    return (
        <div className="flex flex-col gap-5 font-lexend pb-10">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Management</h1>
                <p className="text-sm text-gray-500 font-medium">Reviewer view of student profiles, exam activity, and performance trends.</p>
            </header>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Students</p>
                            <p className="text-2xl font-black text-gray-900">{studentSummaries.length}</p>
                        </div>
                        <UserCircle2 className="w-5 h-5 text-primary" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Score</p>
                            <p className="text-2xl font-black text-indigo-700">
                                {studentSummaries.length === 0
                                    ? '0%'
                                    : `${Math.round(studentSummaries.reduce((sum, item) => sum + item.avgPercentage, 0) / studentSummaries.length)}%`}
                            </p>
                        </div>
                        <Trophy className="w-5 h-5 text-indigo-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">In Progress</p>
                            <p className="text-2xl font-black text-amber-700">
                                {studentSummaries.reduce((sum, item) => sum + item.inProgressAttempts, 0)}
                            </p>
                        </div>
                        <Activity className="w-5 h-5 text-amber-700" />
                    </CardContent>
                </Card>
                <Card className="border-gray-100 rounded-2xl shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed</p>
                            <p className="text-2xl font-black text-green-700">
                                {studentSummaries.reduce((sum, item) => sum + item.completedAttempts, 0)}
                            </p>
                        </div>
                        <GraduationCap className="w-5 h-5 text-green-700" />
                    </CardContent>
                </Card>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-3 md:p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search name, email, or program"
                            className="h-10 pl-9 rounded-xl border-gray-200"
                        />
                    </div>

                    <Select value={trackFilter} onValueChange={setTrackFilter}>
                        <SelectTrigger className="h-10 w-full md:w-47.5 rounded-xl border-gray-200 bg-white font-semibold">
                            <SelectValue placeholder="Filter track" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Programs</SelectItem>
                            {trackOptions.map((track) => (
                                <SelectItem key={track} value={track}>{track}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value as 'ALL' | 'ACTIVE' | 'AT_RISK')}>
                        <SelectTrigger className="h-10 w-full md:w-42.5 rounded-xl border-gray-200 bg-white font-semibold">
                            <SelectValue placeholder="Filter activity" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Activity</SelectItem>
                            <SelectItem value="ACTIVE">Active (14 days)</SelectItem>
                            <SelectItem value="AT_RISK">At Risk</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-gray-100">
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Student</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Program</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Attempts</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Performance</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Activity</TableHead>
                                    <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-9 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            Loading students...
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="px-4 py-9 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            No student data available
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.map((student) => (
                                    <TableRow key={student.id} className="border-gray-100 hover:bg-gray-50/70 align-top">
                                        <TableCell className="px-4 py-3 min-w-60">
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
                                        <TableCell className="px-4 py-3 text-xs font-semibold text-gray-700 min-w-42.5">
                                            {student.programTrack}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                                <Badge variant="outline" className="text-[10px] font-bold border-gray-200">{student.attempts} total</Badge>
                                                <Badge variant="outline" className="text-[10px] font-bold border-green-200 text-green-700 bg-green-50">{student.completedAttempts} done</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 min-w-42.5">
                                            <p className="text-xs font-semibold text-gray-700">Avg: {student.avgPercentage.toFixed(1)}%</p>
                                            <p className="text-[11px] font-semibold text-gray-500">Best: {student.bestPercentage.toFixed(1)}%</p>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 min-w-50">
                                            {student.lastActivityAt ? (
                                                <>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        {new Date(student.lastActivityAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 truncate">{student.latestExamTitle}</p>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-500">No activity</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
                                            <Button
                                                variant="outline"
                                                className="h-8 rounded-lg border-gray-200 text-xs font-semibold"
                                                onClick={() => setSelectedStudent(student)}
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-gray-500">
                            Showing <span className="text-gray-900">{fromCount}-{toCount}</span> of <span className="text-gray-900">{filteredStudents.length}</span> students
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
                <DialogContent className="sm:max-w-2xl rounded-2xl font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-gray-900">Student Details</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            {selectedStudent?.name} • {selectedStudent?.programTrack}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStudent && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Card className="rounded-xl border-gray-100">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Attempts</p>
                                        <p className="text-lg font-black text-gray-900">{selectedStudent.attempts}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl border-gray-100">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Completed</p>
                                        <p className="text-lg font-black text-green-700">{selectedStudent.completedAttempts}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl border-gray-100">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Average</p>
                                        <p className="text-lg font-black text-indigo-700">{selectedStudent.avgPercentage.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl border-gray-100">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Best</p>
                                        <p className="text-lg font-black text-primary">{selectedStudent.bestPercentage.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/70 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    Recent attempts
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {selectedStudent.recentAttempts.map((attempt) => (
                                        <div key={attempt.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{attempt.exam?.title || 'Untitled Exam'}</p>
                                                <p className="text-[11px] text-gray-500 truncate">Attempt #{attempt.attemptNo} • {attempt.status.replace('_', ' ')}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-semibold text-gray-700">{Number(attempt.percentage || 0).toFixed(1)}%</p>
                                                <p className="text-[11px] text-gray-500 flex items-center gap-1 justify-end">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
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
        </div>
    );
};

export default StudentManagementPage;
