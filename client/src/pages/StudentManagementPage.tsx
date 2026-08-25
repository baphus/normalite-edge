import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, UserPlus, Users } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ManageToolbar, type ActiveFilterChip, CheckboxFilterGroup } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';

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
    startedAt: string;
    submittedAt: string | null;
    percentage: number | string | null;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';
    exam?: { title: string };
    user?: AttemptUser;
}

interface StudentUserItem {
    id: string;
    name: string;
    email: string;
    picture?: string | null;
    profile_picture?: string | null;
    avatar?: string | null;
    program?: string | null;
    program_track?: string | null;
    campus?: string | null;
    yearLevel?: string | null;
    section?: string | null;
}

interface TrackItem {
    id: string;
    name: string;
}

interface StudentSummary {
    id: string;
    name: string;
    email: string;
    picture: string | null;
    programTrack: string;
    campus: string;
    yearLevel: string;
    section: string;
    totalAnsweredExams: number;
    avgPercentage: number | null;
    bestPercentage: number | null;
}

const initials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

const StudentManagementPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [students, setStudents] = useState<StudentUserItem[]>([]);
    const [tracks, setTracks] = useState<TrackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [trackFilters, setTrackFilters] = useState<string[]>([]);
    const [campusFilters, setCampusFilters] = useState<string[]>([]);
    const [yearLevelFilters, setYearLevelFilters] = useState<string[]>([]);
    const [sectionFilters, setSectionFilters] = useState<string[]>([]);

    const isAdmin = user?.role === 'ADMIN';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const [attemptResult, studentResult, trackResponse] = await Promise.all([
                fetchAllPages<AttemptItem>((page, limit) => api.get('/attempts', { params: { page, limit } })),
                fetchAllPages<StudentUserItem>((page, limit) => api.get('/users', {
                    params: { page, limit, role: 'REVIEWEE', status: 'ACTIVE' },
                })).catch((error: unknown) => {
                    if (isAxiosError(error) && error.response?.status === 403) {
                        return { items: [], truncated: false };
                    }
                    throw error;
                }),
                api.get('/tracks').catch(() => ({ data: { data: [] as TrackItem[] } })),
            ]);

            if (attemptResult.truncated || studentResult.truncated) {
                throw new Error('The student list is too large to load completely. Please try again.');
            }

            setAttempts(attemptResult.items);
            setStudents(studentResult.items);
            setTracks((trackResponse.data?.data || []) as TrackItem[]);
        } catch (error) {
            setErrorMessage(
                (isAxiosError<{ message?: string }>(error) && error.response?.data?.message)
                || (error instanceof Error && error.message)
                || 'Failed to load students. Please try again.',
            );
            setAttempts([]);
            setStudents([]);
            setTracks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(fetchData);
    }, [fetchData]);

    const studentSummaries = useMemo<StudentSummary[]>(() => {
        const attemptsByStudent = new Map<string, AttemptItem[]>();
        attempts.forEach((attempt) => {
            if (!attempt.user?.id) return;
            const rows = attemptsByStudent.get(attempt.user.id) ?? [];
            rows.push(attempt);
            attemptsByStudent.set(attempt.user.id, rows);
        });

        const makeSummary = (student: StudentUserItem | undefined, studentAttempts: AttemptItem[], fallbackId: string): StudentSummary => {
            const firstAttempt = studentAttempts[0];
            const submitted = studentAttempts.filter((attempt) => attempt.status === 'SUBMITTED');
            const scores = submitted
                .map((attempt) => Number(attempt.percentage))
                .filter((score) => Number.isFinite(score));
            const average = scores.length > 0
                ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
                : null;

            return {
                id: student?.id ?? fallbackId,
                name: student?.name || firstAttempt?.user?.name || 'Unknown student',
                email: student?.email || firstAttempt?.user?.email || 'No email address',
                picture: student?.picture || student?.profile_picture || student?.avatar || firstAttempt?.user?.profilePicture || firstAttempt?.user?.picture || null,
                programTrack: student?.program || student?.program_track || firstAttempt?.user?.programTrack || 'Unassigned',
                campus: student?.campus || firstAttempt?.user?.campus || 'Unassigned',
                yearLevel: student?.yearLevel || firstAttempt?.user?.yearLevel || 'Unassigned',
                section: student?.section || firstAttempt?.user?.section || 'Unassigned',
                totalAnsweredExams: submitted.length,
                avgPercentage: average,
                bestPercentage: scores.length > 0 ? Math.max(...scores) : null,
            };
        };

        const summaries = students.map((student) => (
            makeSummary(student, attemptsByStudent.get(student.id) ?? [], student.id)
        ));
        return summaries;
    }, [attempts, students]);

    const trackOptions = useMemo(() => Array.from(new Set([
        ...tracks.map((track) => track.name),
        ...studentSummaries.map((student) => student.programTrack),
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b)), [studentSummaries, tracks]);

    const optionValues = useCallback((value: keyof Pick<StudentSummary, 'campus' | 'yearLevel' | 'section'>) => (
        Array.from(new Set(studentSummaries.map((student) => student[value]))).sort((a, b) => a.localeCompare(b))
    ), [studentSummaries]);

    const campusOptions = useMemo(() => optionValues('campus'), [optionValues]);
    const yearLevelOptions = useMemo(() => optionValues('yearLevel'), [optionValues]);
    const sectionOptions = useMemo(() => optionValues('section'), [optionValues]);

    const visibleStudents = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return studentSummaries.filter((student) => {
            const searchValues = [student.name, student.email, student.programTrack, student.campus, student.yearLevel, student.section];
            const matchesSearch = !query || searchValues.some((value) => value.toLocaleLowerCase().includes(query));
            return matchesSearch
                && (trackFilters.length === 0 || trackFilters.includes(student.programTrack))
                && (campusFilters.length === 0 || campusFilters.includes(student.campus))
                && (yearLevelFilters.length === 0 || yearLevelFilters.includes(student.yearLevel))
                && (sectionFilters.length === 0 || sectionFilters.includes(student.section));
        });
    }, [campusFilters, search, sectionFilters, studentSummaries, trackFilters, yearLevelFilters]);

    const clearAllFilters = useCallback(() => {
        setSearch('');
        setTrackFilters([]);
        setCampusFilters([]);
        setYearLevelFilters([]);
        setSectionFilters([]);
    }, []);

    const chips = useMemo<ActiveFilterChip[]>(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim()) next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        trackFilters.forEach((track) => next.push({ id: `track-${track}`, label: `Program: ${track}`, onClear: () => setTrackFilters((current) => current.filter((value) => value !== track)) }));
        campusFilters.forEach((campus) => next.push({ id: `campus-${campus}`, label: `Campus: ${campus}`, onClear: () => setCampusFilters((current) => current.filter((value) => value !== campus)) }));
        yearLevelFilters.forEach((year) => next.push({ id: `year-${year}`, label: `Year: ${year}`, onClear: () => setYearLevelFilters((current) => current.filter((value) => value !== year)) }));
        sectionFilters.forEach((section) => next.push({ id: `section-${section}`, label: `Section: ${section}`, onClear: () => setSectionFilters((current) => current.filter((value) => value !== section)) }));
        return next;
    }, [campusFilters, search, sectionFilters, trackFilters, yearLevelFilters]);

    const columns = useMemo<ResourceColumn<StudentSummary>[]>(() => {
        const base: ResourceColumn<StudentSummary>[] = [
            {
                id: 'student', header: 'Student', primary: true, sortable: true,
                sortValue: (student) => student.name, className: 'min-w-[250px]',
                cell: (student) => <div className="flex min-w-0 items-center gap-2"><Avatar className="h-7 w-7 shrink-0">{student.picture && <AvatarImage src={student.picture} alt="" />}<AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-600">{initials(student.name)}</AvatarFallback></Avatar><div className="min-w-0"><button type="button" className="block max-w-full truncate text-left font-semibold text-slate-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1" onClick={() => navigate(`/student/${student.id}/profile`, { state: { student } })}>{student.name}</button><p className="mt-0.5 truncate text-[12px] text-slate-500">{student.email}</p></div></div>,
            },
            {
                id: 'program', header: 'Program', sortable: true, stacked: true,
                sortValue: (student) => student.programTrack, className: 'w-[190px]',
                cell: (student) => <span className="block break-words">{student.programTrack}</span>,
            },
            {
                id: 'campus', header: 'Campus', sortable: true, stacked: true,
                sortValue: (student) => student.campus, className: 'w-[150px]',
                cell: (student) => <span className="block break-words">{student.campus}</span>,
            },
            {
                id: 'yearLevel', header: 'Year level', sortable: true, stacked: true,
                sortValue: (student) => student.yearLevel, className: 'w-[110px]',
                cell: (student) => <span>{student.yearLevel}</span>,
            },
            {
                id: 'section', header: 'Section', sortable: true, stacked: true,
                sortValue: (student) => student.section, className: 'w-[100px]',
                cell: (student) => <span>{student.section}</span>,
            },
            {
                id: 'answeredExams', header: 'Answered exams', sortable: true, stacked: true,
                sortValue: (student) => student.totalAnsweredExams, className: 'w-[145px] text-center tabular-nums',
                cell: (student) => <span className="font-semibold text-slate-900">{student.totalAnsweredExams}</span>,
                stackedCell: (student) => `${student.totalAnsweredExams} answered exams`,
            },
            {
                id: 'performance', header: 'Performance', sortable: true, stacked: true,
                sortValue: (student) => student.avgPercentage ?? -1, className: 'w-[135px] tabular-nums',
                cell: (student) => student.avgPercentage === null ? <span className="text-slate-400">No results</span> : <div><span className="font-semibold text-slate-900">{student.avgPercentage.toFixed(1)}%</span><p className="mt-0.5 text-[12px] text-slate-500">Best {student.bestPercentage?.toFixed(1)}%</p></div>,
                stackedCell: (student) => student.avgPercentage === null ? 'No results yet' : `Average ${student.avgPercentage.toFixed(1)}% · Best ${student.bestPercentage?.toFixed(1)}%`,
            },
        ];
        return base;
    }, [navigate]);

    const createAction = isAdmin ? <Button onClick={() => navigate('/admin/users?create=reviewee')} className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"><UserPlus size={13} aria-hidden="true" /> Add student</Button> : undefined;
    const tableState = loading ? 'loading' : errorMessage ? 'error' : 'ready';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ManageToolbar
                title="Students"
                description="Review enrolment and exam activity across your assigned students."
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search students…"
                searchLabel="Search students by name, email, program, campus, year, or section"
                filterPopoverTitle="Filter students"
                popoverFilters={
                    <>
                        <CheckboxFilterGroup label="Program" options={trackOptions} value={trackFilters} onValueChange={setTrackFilters} />
                        <CheckboxFilterGroup label="Campus" options={campusOptions} value={campusFilters} onValueChange={setCampusFilters} />
                        <section aria-label="Academic placement" className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Academic placement</p>
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                <CheckboxFilterGroup compact label="Year level" options={yearLevelOptions} value={yearLevelFilters} onValueChange={setYearLevelFilters} />
                                <CheckboxFilterGroup compact label="Section" options={sectionOptions} value={sectionFilters} onValueChange={setSectionFilters} />
                            </div>
                        </section>
                    </>
                }
                activeFilterCount={chips.length}
                chips={chips}
                onClearAll={clearAllFilters}
                createAction={createAction}
            />
            <ResourceTable
                rows={visibleStudents}
                columns={columns}
                getRowId={(student) => student.id}
                caption="Students and their exam activity"
                state={tableState}
                error={errorMessage}
                onRetry={() => void fetchData()}
                filtersActive={chips.length > 0}
                onClearFilters={clearAllFilters}
                filtersIcon={<Users size={18} aria-hidden="true" />}
                filtersTitle="No students match these filters"
                filtersDescription="Try clearing a filter or searching for a different student."
                emptyTitle="No students yet"
                emptyDescription="Students will appear here after they complete their registration."
                emptyAction={createAction}
                emptyIcon={<Users size={18} aria-hidden="true" />}
                rowActions={(student) => <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-primary/5 hover:text-primary" onClick={() => navigate(`/student/${student.id}/profile`, { state: { student } })} aria-label={`View profile of ${student.name}`}><Eye size={15} aria-hidden="true" /></Button>}
                resetKey={`${search}|${trackFilters.join('|')}|${campusFilters.join('|')}|${yearLevelFilters.join('|')}|${sectionFilters.join('|')}`}
                initialSort={{ columnId: 'student', direction: 'asc' }}
            />
        </div>
    );
};

export default StudentManagementPage;
