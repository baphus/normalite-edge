import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Columns3,
    Eye,
    Filter,
    Radio,
    Search,
    UserPlus,
    Users,
} from 'lucide-react';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AttemptUser {
    id: string;
    name: string;
    email: string;
    profilePicture?: string | null;
    picture?: string | null;
    programTrack: string | null;
    campus?: string | null;
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
    picture?: string | null;
    status: string;
    programTrack: string;
    campus: string;
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
    picture?: string | null;
    profile_picture?: string | null;
    avatar?: string | null;
    role: string;
    status?: string;
    program?: string | null;
    program_track?: string | null;
    campus?: string | null;
    yearLevel?: string | null;
    section?: string | null;
}

interface TrackItem {
    id: string;
    name: string;
    code?: string | null;
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

const normalizeProfileImageUrl = (rawUrl?: string | null): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return trimmed;
};

const StudentManagementPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [students, setStudents] = useState<StudentUserItem[]>([]);
    const [tracks, setTracks] = useState<TrackItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [trackFilter, setTrackFilter] = useState('ALL');
    const [campusFilter, setCampusFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [yearLevelFilter, setYearLevelFilter] = useState('ALL');
    const [sectionFilter, setSectionFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    
    const [sortBy, setSortBy] = useState<SortKey>('lastActivity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
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

    const fetchTracks = async () => {
        const response = await api.get('/tracks');
        return (response.data?.data || []) as TrackItem[];
    };

    const fetchData = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const [attemptRows, studentRows, trackRows] = await Promise.all([
                fetchAttempts(),
                fetchStudents().catch((error) => {
                    if (error?.response?.status === 403) return [] as StudentUserItem[];
                    throw error;
                }),
                fetchTracks().catch(() => [] as TrackItem[]),
            ]);

            setAttempts(attemptRows);
            setStudents(studentRows);
            setTracks(trackRows);
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to load student activity');
            setAttempts([]);
            setStudents([]);
            setTracks([]);
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
                picture: student.picture || student.profile_picture || student.avatar || first?.user?.profilePicture || first?.user?.picture || null,
                status: student.status || 'UNKNOWN',
                programTrack: student.program || student.program_track || first?.user?.programTrack || 'Unassigned',
                campus: student.campus || first?.user?.campus || 'Unassigned',
                yearLevel: student.yearLevel || first?.user?.yearLevel || 'Unassigned',
                section: student.section || first?.user?.section || 'Unassigned',
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
                picture: first.user?.profilePicture || first.user?.picture || null,
                status: 'UNKNOWN',
                programTrack: first.user?.programTrack || 'Unassigned',
                campus: first.user?.campus || 'Unassigned',
                yearLevel: first.user?.yearLevel || 'Unassigned',
                section: first.user?.section || 'Unassigned',
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
        const configuredTracks = tracks.map((track) => track.name).filter(Boolean);
        const observedTracks = studentSummaries
            .map((student) => student.programTrack)
            .filter((track) => track && track !== 'Unassigned');

        return Array.from(new Set([...configuredTracks, ...observedTracks])).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries, tracks]);

    const statusOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.status || 'UNKNOWN'))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const campusOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.campus || 'Unassigned'))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const yearLevelOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.yearLevel || 'Unassigned'))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const sectionOptions = useMemo(() => {
        return Array.from(new Set(studentSummaries.map((student) => student.section || 'Unassigned'))).sort((a, b) => a.localeCompare(b));
    }, [studentSummaries]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return studentSummaries
            .filter((student) => {
                const matchesSearch = !normalizedSearch
                    || student.name.toLowerCase().includes(normalizedSearch)
                    || student.email.toLowerCase().includes(normalizedSearch)
                    || student.programTrack.toLowerCase().includes(normalizedSearch)
                    || (student.campus || '').toLowerCase().includes(normalizedSearch)
                    || (isAdmin && (student.status || '').toLowerCase().includes(normalizedSearch))
                    || (student.yearLevel || '').toLowerCase().includes(normalizedSearch)
                    || (student.section || '').toLowerCase().includes(normalizedSearch);

                const matchesTrack = trackFilter === 'ALL' || student.programTrack === trackFilter;
                const matchesCampus = campusFilter === 'ALL' || (student.campus || 'Unassigned') === campusFilter;
                const matchesStatus = !isAdmin || statusFilter === 'ALL' || student.status === statusFilter;
                const matchesYearLevel = yearLevelFilter === 'ALL' || (student.yearLevel || 'Unassigned') === yearLevelFilter;
                const matchesSection = sectionFilter === 'ALL' || (student.section || 'Unassigned') === sectionFilter;

                return matchesSearch && matchesTrack && matchesCampus && matchesStatus && matchesYearLevel && matchesSection;
            });
    }, [isAdmin, search, studentSummaries, trackFilter, campusFilter, statusFilter, yearLevelFilter, sectionFilter]);

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
    }, [search, trackFilter, campusFilter, statusFilter, yearLevelFilter, sectionFilter]);

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
        setCampusFilter('ALL');
        setStatusFilter('ALL');
        setYearLevelFilter('ALL');
        setSectionFilter('ALL');
        setPage(1);
    };

    const handleAddStudent = () => {
        if (!isAdmin) return;
        navigate('/admin/users?create=reviewee');
    };

    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 1;
    const fromCount = sortedStudents.length === 0 ? 0 : (page - 1) * limit + 1;
    const toCount = Math.min(page * limit, sortedStudents.length);
    const totalRegistered = studentSummaries.length;
    const activeStudents = studentSummaries.filter((student) => (
        (student.status || '').toUpperCase() === 'ACTIVE'
        || student.inProgressAttempts > 0
    )).length;
    const pendingStudents = studentSummaries.filter((student) => {
        const normalizedStatus = (student.status || '').toUpperCase();
        return normalizedStatus.includes('PENDING') || normalizedStatus.includes('APPROVAL');
    }).length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonth = studentSummaries.filter((student) => {
        if (!student.lastActivityAt) return false;
        const date = new Date(student.lastActivityAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    return (
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden font-lexend -mx-5 -mt-4">
            <header className="h-20 bg-white border-b border-[#800000]/10 px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight shrink-0">Student Management</h2>
                    <div className="relative w-full max-w-md ml-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={isAdmin ? 'Search students by name, email, program, campus, status...' : 'Search students by name, email, program, campus...'}
                            className="w-full pl-10 pr-4 h-10 bg-slate-100 border-slate-100 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-[#800000]/20"
                        />
                    </div>
                </div>
                {isAdmin && (
                    <Button
                        onClick={handleAddStudent}
                        className="h-10 px-4 bg-[#800000] hover:bg-[#6d0000] text-white rounded-lg text-sm font-semibold shadow-lg shadow-[#800000]/20 gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Student
                    </Button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Registered Students</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{totalRegistered.toLocaleString()}</h3>
                                <p className="text-xs text-green-600 font-medium mt-2">+{newThisMonth.toLocaleString()} with activity this month</p>
                            </div>
                            <div className="bg-[#800000]/10 text-[#800000] p-3 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Active Students</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{activeStudents.toLocaleString()}</h3>
                                <p className="text-xs text-[#800000]/70 font-medium mt-2">Based on in-progress activity and status</p>
                            </div>
                            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                                <Radio className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-[#800000]/5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Pending Registrations</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{pendingStudents.toLocaleString()}</h3>
                                <p className="text-xs text-[#D4AF37] font-medium mt-2">Requires admin review</p>
                            </div>
                            <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-3 rounded-lg">
                                <Clock3 className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <Select value={trackFilter} onValueChange={setTrackFilter}>
                        <SelectTrigger className="w-auto min-w-48 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                            <span className="text-slate-400 mr-1">Program:</span>
                            <SelectValue placeholder="All Programs" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Programs</SelectItem>
                            {trackOptions.map((track) => (
                                <SelectItem key={track} value={track}>{track}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
                        <SelectTrigger className="w-auto min-w-44 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                            <span className="text-slate-400 mr-1">Year:</span>
                            <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent className="font-lexend">
                            <SelectItem value="ALL">All Years</SelectItem>
                            {yearLevelOptions.map((yearLevel) => (
                                <SelectItem key={yearLevel} value={yearLevel}>{yearLevel}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isAdmin && (
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-auto min-w-44 h-10 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 transition-colors">
                                <span className="text-slate-400 mr-1">Status:</span>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="font-lexend">
                                <SelectItem value="ALL">All Status</SelectItem>
                                {statusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 gap-2">
                                <Filter className="w-4 h-4" />
                                More Filters
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80 p-3 font-lexend space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Campus</Label>
                                <Select value={campusFilter} onValueChange={setCampusFilter}>
                                    <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white text-xs font-semibold">
                                        <SelectValue placeholder="Filter campus" />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ALL">All Campuses</SelectItem>
                                        {campusOptions.map((campus) => (
                                            <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Section</Label>
                                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                    <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-white text-xs font-semibold">
                                        <SelectValue placeholder="Filter section" />
                                    </SelectTrigger>
                                    <SelectContent className="font-lexend">
                                        <SelectItem value="ALL">All Sections</SelectItem>
                                        {sectionOptions.map((section) => (
                                            <SelectItem key={section} value={section}>{section}</SelectItem>
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
                            <Button variant="outline" className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#800000]/30 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="font-lexend min-w-44">
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

                <div className="bg-white rounded-xl border border-[#800000]/10 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto lg:overflow-x-visible">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                <TableRow className="border-slate-100">
                                    {visibleColumns.student && (
                                        <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('name')}>
                                                Student Name {renderSortIcon('name')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.program && (
                                        <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('program')}>
                                                Major / Program {renderSortIcon('program')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.attempts && (
                                        <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('attempts')}>
                                                Attempts {renderSortIcon('attempts')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.performance && (
                                        <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('avg')}>
                                                Performance {renderSortIcon('avg')}
                                            </button>
                                        </TableHead>
                                    )}
                                    {visibleColumns.lastActivity && (
                                        <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <button type="button" className="inline-flex items-center gap-1.5" onClick={() => handleSort('lastActivity')}>
                                                Last Active {renderSortIcon('lastActivity')}
                                            </button>
                                        </TableHead>
                                    )}
                                    <TableHead className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-16">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-6 py-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                            Loading students...
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnCount} className="px-6 py-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                            No student data available
                                        </TableCell>
                                    </TableRow>
                                ) : currentPageStudents.map((student) => (
                                    <TableRow key={student.id} className="hover:bg-slate-50 transition-colors group align-top">
                                        {visibleColumns.student && (
                                            <TableCell className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-200 overflow-hidden relative flex items-center justify-center text-slate-500 font-bold text-xs">
                                                        {!brokenImages[student.id] && normalizeProfileImageUrl(student.picture) ? (
                                                            <img
                                                                src={normalizeProfileImageUrl(student.picture)}
                                                                alt={student.name}
                                                                className="h-full w-full object-cover"
                                                                onError={() => setBrokenImages((prev) => ({ ...prev, [student.id]: true }))}
                                                            />
                                                        ) : (
                                                            <span className="absolute inset-0 flex items-center justify-center">
                                                                {(student.name || 'U').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{student.name}</p>
                                                        <p className="text-xs text-slate-500 font-medium tracking-tight truncate max-w-44">{student.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.program && (
                                            <TableCell className="px-4 py-4">
                                                <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md inline-block max-w-52 truncate">{student.programTrack}</span>
                                                <p className="text-xs text-slate-500 mt-1 truncate max-w-52">{student.campus}</p>
                                            </TableCell>
                                        )}
                                        {visibleColumns.attempts && (
                                            <TableCell className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs font-medium border-slate-200 text-slate-700 bg-white">
                                                        {student.attempts} total
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs font-medium border-green-200 text-green-800 bg-green-100">
                                                        {student.completedAttempts} done
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.performance && (
                                            <TableCell className="px-4 py-4 whitespace-nowrap">
                                                <p className="text-sm font-semibold text-slate-700">Avg: {student.avgPercentage.toFixed(1)}%</p>
                                                <p className="text-xs text-slate-500">Best: {student.bestPercentage.toFixed(1)}%</p>
                                            </TableCell>
                                        )}
                                        {visibleColumns.lastActivity && (
                                            <TableCell className="px-4 py-4">
                                                {student.lastActivityAt ? (
                                                    <>
                                                        <p className="text-sm text-slate-600 whitespace-nowrap">{formatDate(student.lastActivityAt)}</p>
                                                        <p className="text-xs text-slate-500 truncate max-w-40">{student.latestExamTitle}</p>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-slate-500">No activity</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="px-4 py-4 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-[#800000] hover:bg-[#800000]/10"
                                                    onClick={() => navigate(`/student/${student.id}/profile`, { state: { student } })}
                                                    title="View Profile"
                                                    aria-label={`View profile of ${student.name}`}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-sm text-slate-500 font-medium">
                            Showing <span className="text-slate-900">{fromCount}</span> to <span className="text-slate-900">{toCount}</span> of <span className="text-slate-900">{sortedStudents.length}</span> entries
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-slate-200 rounded-md bg-white hover:bg-slate-50"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <button type="button" className="size-8 flex items-center justify-center rounded-md bg-[#800000] text-white text-sm font-bold shadow-sm">
                                {page}
                            </button>
                            <Badge variant="outline" className="h-8 px-3 rounded-md text-xs font-semibold border-slate-200 bg-white text-slate-600">
                                / {totalPages}
                            </Badge>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-slate-200 rounded-md bg-white hover:bg-slate-50"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentManagementPage;
