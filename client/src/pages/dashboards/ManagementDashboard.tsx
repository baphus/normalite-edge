import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, FileText, Plus, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    LabelList,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MetricTile } from '@/components/manage/MetricTile';
import { StatusPill } from '@/components/manage/StatusPill';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

type ManagementRole = 'ADMIN' | 'REVIEWER';

interface Submission {
    id: string;
    score?: number;
    percentage?: number;
    submittedAt?: string | null;
    student?: string;
    task?: string;
    user?: { firstName?: string; lastName?: string };
    exam?: { title?: string };
}

interface ExamSummary {
    id: string;
    title: string;
    status?: string;
    _count?: { attempts?: number };
}

interface ManagementDashboardStats {
    examsCreated?: number;
    decksCreated?: number;
    totalExams?: number;
    totalMaterials?: number;
    totalAttempts?: number;
    totalUsers?: number;
    upcomingExams?: {
        id: string;
        title: string;
        subject?: string | null;
        scheduleStart: string;
        status?: string;
    }[];
    recentAttempts?: Submission[];
    recentSubmissions?: Submission[];
    recentExams?: ExamSummary[];
    analytics?: {
        averageScore: number | null;
        passRate: number | null;
        learnerCount: number;
        scoreDistribution: { label: string; count: number }[];
        weeklySubmissions: { label: string; count: number }[];
        topPrograms: { program: string; averageScore: number; submissions: number }[];
        submissionVolume: { id: string; title: string; author: string; authorAvatar: string | null; count: number }[];
        examStatuses: { live: number; draft: number; closed: number; archived: number };
    };
}

interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    time?: string;
    type?: 'exam_start' | 'exam_deadline' | 'conference' | 'submission';
}

const CALENDAR_EVENT_LABELS: Record<NonNullable<CalendarEvent['type']>, string> = {
    exam_start: 'Exam opens',
    exam_deadline: 'Exam closes',
    conference: 'Conference',
    submission: 'Submission',
};

interface ManagementDashboardProps {
    displayName: string;
    firstName: string;
    profilePicture?: string;
    role: ManagementRole;
    stats: Record<string, unknown> | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthTitle = (year: number, month: number) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(year, month, 1),
    );

const dateKey = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatSubmittedAt = (value?: string | null) => {
    if (!value) return 'Recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const formatSchedule = (value?: string) => {
    if (!value) return 'Schedule to be announced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Schedule to be announced';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

const formatTime = (value?: string) => {
    if (!value) return '';
    const [hour, minute] = value.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
        new Date(2000, 0, 1, hour, minute),
    );
};

const submittedScore = (submission: Submission) =>
    Number(submission.percentage ?? submission.score ?? 0);

const submissionName = (submission: Submission) =>
    submission.student ||
    [submission.user?.firstName, submission.user?.lastName].filter(Boolean).join(' ') ||
    'Student';

const submissionExam = (submission: Submission) => submission.task || submission.exam?.title || 'Exam';

const initialsFromName = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U';

const EmptyPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="py-8 text-center text-[13px] text-slate-500">{children}</p>
);

const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
    title,
    children,
    className,
}) => (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 sm:p-5', className)}>
        <h2 className="text-[14px] font-semibold text-slate-900">{title}</h2>
        <div className="mt-4">{children}</div>
    </section>
);

const SubmissionTrendChart: React.FC<{ data: { label: string; count: number }[] }> = ({ data }) => {
    const accessibleSummary = data.map((item) => `${item.label}: ${item.count} submissions`).join(', ');

    return (
        <div className="h-52" role="img" aria-label={`Weekly submission trend. ${accessibleSummary}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                        <Tooltip
                            cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }}
                            contentStyle={{ borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                            formatter={(value) => [`${value ?? 0} submissions`, 'Activity']}
                        />
                        <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
        </div>
    );
};

const ExamStatusChart: React.FC<{ statuses: { live: number; draft: number; closed: number; archived: number } }> = ({ statuses }) => {
    const data = [
        { label: 'Live', count: statuses.live, color: 'var(--primary)' },
        { label: 'Draft', count: statuses.draft, color: 'var(--secondary)' },
        { label: 'Closed', count: statuses.closed + statuses.archived, color: 'var(--muted-foreground)' },
    ];
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart aria-label={`${total} exams by publication status`}>
                        <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={2} stroke="none">
                            {data.map((item) => <Cell key={item.label} fill={item.color} />)}
                        </Pie>
                        <Tooltip formatter={(value, _name, item) => [`${value ?? 0} exams`, item.payload?.label ?? 'Status']} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[24px] font-semibold tabular-nums text-slate-900">{total}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Exams</span>
                </div>
            </div>
            <ul className="w-full space-y-2" aria-label="Exam status counts">
                {data.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                            {item.label}
                        </span>
                        <span className="text-[13px] font-medium tabular-nums text-slate-700">{item.count}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const TopProgramsChart: React.FC<{ data: { program: string; averageScore: number; submissions: number }[] }> = ({ data }) => (
    <div>
        <div className="h-60" role="img" aria-label="Top-performing programs by average score">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="program" width={112} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'none' }}
                        formatter={(value, _name, item) => [`${value ?? 0}% average · ${item.payload?.submissions ?? 0} submissions`, 'Performance']}
                    />
                    <Bar dataKey="averageScore" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={18}>
                        <LabelList dataKey="averageScore" position="right" formatter={(value) => (typeof value === 'number' || typeof value === 'string' ? `${value}%` : '')} className="fill-slate-600" fontSize={11} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const DashboardCalendar: React.FC = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.resolve()
            .then(() => {
                setLoading(true);
                return api.get<{ data?: CalendarEvent[] }>('/calendar', { params: { year, month: month + 1 } });
            })
            .then((response) => {
                if (!cancelled) setEvents(Array.isArray(response.data.data) ? response.data.data : []);
            })
            .catch(() => {
                if (!cancelled) setEvents([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [year, month]);

    const eventMap = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach((event) => map.set(event.date, [...(map.get(event.date) ?? []), event]));
        return map;
    }, [events]);

    const days = new Date(year, month + 1, 0).getDate();
    const leadingDays = new Date(year, month, 1).getDay();
    const cells = [...Array<null>(leadingDays).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
    const today = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const timeline = useMemo(() => {
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
        const groups = new Map<string, CalendarEvent[]>();
        events
            .filter((event) => event.date.startsWith(monthPrefix))
            .sort((first, second) => first.date.localeCompare(second.date) || (first.time ?? '').localeCompare(second.time ?? ''))
            .forEach((event) => groups.set(event.date, [...(groups.get(event.date) ?? []), event]));
        return [...groups.entries()].map(([date, items]) => ({ date, items }));
    }, [events, month, year]);

    const changeMonth = (offset: number) => {
        const next = new Date(year, month + offset, 1);
        setYear(next.getFullYear());
        setMonth(next.getMonth());
    };

    return (
        <Panel title="Calendar">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                    <ChevronLeft />
                </Button>
                <p className="text-[13px] font-semibold text-slate-800">{monthTitle(year, month)}</p>
                <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => changeMonth(1)}>
                    <ChevronRight />
                </Button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-y-1" role="grid" aria-label={monthTitle(year, month)}>
                {DAYS.map((day) => (
                    <div key={day} role="columnheader" className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        {day}
                    </div>
                ))}
                {cells.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} role="gridcell" />;
                    const key = dateKey(year, month, day);
                    const eventCount = eventMap.get(key)?.length ?? 0;
                    const isToday = key === today;
                    return (
                        <div
                            key={key}
                            role="gridcell"
                            aria-label={`${new Date(year, month, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${eventCount ? `, ${eventCount} event${eventCount === 1 ? '' : 's'}` : ''}`}
                            className="flex justify-center"
                        >
                            <span
                                className={cn(
                                    'relative flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-medium text-slate-700',
                                    isToday && 'bg-primary/10 text-primary',
                                )}
                            >
                                {day}
                                {eventCount > 0 && (
                                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
                {loading ? (
                    <p className="text-[13px] text-slate-500">Loading events…</p>
                ) : timeline.length === 0 ? (
                    <p className="text-[13px] text-slate-500">No events this month.</p>
                ) : (
                    <ol className="space-y-3" aria-label={`${monthTitle(year, month)} event timeline`}>
                        {timeline.map((group) => {
                            const date = new Date(`${group.date}T00:00:00`);
                            return (
                                <li key={group.date} className="flex gap-3">
                                    <div className="w-9 shrink-0 pt-0.5 text-center">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </p>
                                        <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-slate-800">{date.getDate()}</p>
                                    </div>
                                    <ul className="min-w-0 flex-1 space-y-2 border-l border-slate-200 pl-3">
                                        {group.items.map((event) => (
                                            <li key={event.id} className="flex items-start gap-2 text-[13px] text-slate-700">
                                                <span
                                                    className={cn(
                                                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                                        event.type === 'exam_start' && 'bg-blue-500',
                                                        event.type === 'exam_deadline' && 'bg-rose-500',
                                                        event.type === 'conference' && 'bg-violet-500',
                                                        event.type === 'submission' && 'bg-primary',
                                                        !event.type && 'bg-primary',
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate">{event.title}</span>
                                                    <span className="mt-0.5 block text-[12px] text-slate-500">
                                                        {event.type ? CALENDAR_EVENT_LABELS[event.type] : 'Event'}
                                                    </span>
                                                </span>
                                                {event.time && <span className="shrink-0 text-[12px] text-slate-500">{formatTime(event.time)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
            <Link to="/calendar" className="mt-4 inline-flex text-[13px] font-medium text-primary hover:underline">
                Open calendar
            </Link>
        </Panel>
    );
};

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ displayName, firstName, profilePicture, role, stats: rawStats }) => {
    const stats = rawStats as ManagementDashboardStats | null;
    const isAdmin = role === 'ADMIN';
    const submissions = useMemo(
        () => (isAdmin ? stats?.recentSubmissions ?? [] : stats?.recentAttempts ?? []),
        [isAdmin, stats],
    );
    const recentExams = useMemo(() => stats?.recentExams ?? [], [stats]);

    const submissionByExam = useMemo(() => {
        const volumes = stats?.analytics?.submissionVolume;
        if (volumes?.length) return volumes.map((exam) => ({ id: exam.id, label: exam.title, author: exam.author, authorAvatar: exam.authorAvatar, value: exam.count }));
        if (!isAdmin) {
            return recentExams.map((exam) => ({ id: exam.id, label: exam.title, author: 'You', authorAvatar: null, value: exam._count?.attempts ?? 0 }));
        }
        const totals = new Map<string, number>();
        submissions.forEach((submission) => {
            const title = submissionExam(submission);
            totals.set(title, (totals.get(title) ?? 0) + 1);
        });
        return [...totals.entries()].map(([label, value]) => ({ id: label, label, author: 'Unknown author', authorAvatar: null, value }));
    }, [isAdmin, recentExams, stats?.analytics?.submissionVolume, submissions]);

    const scoreBands = useMemo(() => {
        if (stats?.analytics?.scoreDistribution?.length) return stats.analytics.scoreDistribution;
        const bands = [
            { label: 'Below 50%', count: 0 },
            { label: '50–74%', count: 0 },
            { label: '75–89%', count: 0 },
            { label: '90–100%', count: 0 },
        ];
        submissions.forEach((submission) => {
            const score = submittedScore(submission);
            const index = score < 50 ? 0 : score < 75 ? 1 : score < 90 ? 2 : 3;
            bands[index].count += 1;
        });
        return bands;
    }, [stats?.analytics?.scoreDistribution, submissions]);

    const metricTiles = [
        {
            label: 'Total exams',
            value: String(isAdmin ? stats?.totalExams ?? 0 : stats?.examsCreated ?? 0),
            hint: isAdmin ? 'Across all content owners' : 'Created by you',
        },
        {
            label: 'Study decks',
            value: String(isAdmin ? stats?.totalMaterials ?? 0 : stats?.decksCreated ?? 0),
            hint: isAdmin ? 'Across all content owners' : 'Created by you',
        },
        { label: 'Submissions', value: String(stats?.totalAttempts ?? 0), hint: 'Completed attempts' },
        {
            label: 'Average score',
            value: stats?.analytics?.averageScore == null ? null : `${stats.analytics.averageScore}%`,
            hint: 'Across completed attempts',
        },
    ];
    const maxSubmissions = Math.max(...submissionByExam.map((item) => item.value), 1);
    const maxBandCount = Math.max(...scoreBands.map((band) => band.count), 1);
    const hasScoreData = scoreBands.some((band) => band.count > 0);
    const weeklySubmissions = stats?.analytics?.weeklySubmissions ?? [];
    const topPrograms = stats?.analytics?.topPrograms ?? [];
    const examStatuses = stats?.analytics?.examStatuses ?? { live: 0, draft: 0, closed: 0, archived: 0 };
    return (
        <div className="flex flex-col gap-5 pb-6 font-lexend">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="mt-1 text-[13px] text-slate-500">A concise view of {isAdmin ? 'your organization' : `your review content`}, {firstName}.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" asChild>
                        <Link to="/manage-exams/create"><Plus /> Create exam</Link>
                    </Button>
                </div>
            </header>

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Your dashboard summary">
                <div className="flex items-start gap-3">
                    <Avatar className="size-11 border border-primary/15 bg-primary/5">
                        <AvatarImage src={profilePicture} alt={`${displayName}'s profile photo`} />
                        <AvatarFallback className="bg-primary/5 text-[13px] font-semibold text-primary">{initialsFromName(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {firstName}</h2>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Overview metrics">
                {metricTiles.map((metric) => <MetricTile key={metric.label} {...metric} />)}
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
                <Panel title="Submission activity" className="xl:col-span-3">
                    {weeklySubmissions.length ? <SubmissionTrendChart data={weeklySubmissions} /> : <EmptyPanel>No submission activity in the last eight weeks.</EmptyPanel>}
                </Panel>
                <Panel title="Exam status" className="xl:col-span-2">
                    <ExamStatusChart statuses={examStatuses} />
                </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
                <Panel title="Top-performing programs" className="xl:col-span-3">
                    {topPrograms.length ? <TopProgramsChart data={topPrograms} /> : <EmptyPanel>Program data is not available for completed submissions yet.</EmptyPanel>}
                </Panel>
                <Panel title="Recent score distribution" className="xl:col-span-2">
                    {!hasScoreData ? (
                        <EmptyPanel>No scored submissions yet.</EmptyPanel>
                    ) : (
                        <ul className="space-y-3" aria-label="Recent submission score distribution">
                            {scoreBands.map((band) => (
                                <li key={band.label} className="grid grid-cols-[4.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-[12px]">
                                    <span className="text-slate-600">{band.label}</span>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                                        <div className="h-full rounded-full bg-slate-600" style={{ width: `${(band.count / maxBandCount) * 100}%` }} />
                                    </div>
                                    <span className="text-right tabular-nums text-slate-600">{band.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
                <Panel title="Submissions by exam" className="xl:col-span-3">
                    {submissionByExam.length === 0 ? (
                        <EmptyPanel>No exam submissions yet.</EmptyPanel>
                    ) : (
                        <ul className="space-y-3" aria-label="Completed submissions by exam">
                            {submissionByExam.map((item) => (
                                <li key={item.id}>
                                    <div className="min-w-0">
                                        <div className="mb-1 flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Avatar className="size-6 shrink-0">
                                                    <AvatarImage src={item.authorAvatar ?? undefined} alt="" />
                                                    <AvatarFallback className="text-[11px] font-semibold">{initialsFromName(item.author)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-medium text-slate-700">{item.label}</p>
                                                    <p className="mt-0.5 truncate text-[12px] text-slate-500">By {item.author}</p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 tabular-nums text-slate-500">{item.value} submissions</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / maxSubmissions) * 100}%` }} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel title="Quick actions" className="xl:col-span-2">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                            <Link to="/manage-exams"><FileText /> Manage exams</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                            <Link to="/materials/create"><Plus /> Create study deck</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                            <Link to="/materials"><BookOpen /> Manage study decks</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                            <Link to="/calendar"><CalendarDays /> Open calendar</Link>
                        </Button>
                        {isAdmin && (
                            <Button variant="outline" size="sm" className="justify-start" asChild>
                                <Link to="/admin/users"><UsersRound /> Manage users</Link>
                            </Button>
                        )}
                    </div>
                </Panel>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
                <Panel title="Upcoming exams" className="xl:col-span-3">
                    {stats?.upcomingExams?.length ? (
                        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Upcoming exams">
                            {stats.upcomingExams.slice(0, 4).map((exam) => (
                                <li key={exam.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                                    <p className="truncate text-[13px] font-medium text-slate-800">{exam.title}</p>
                                    <p className="mt-0.5 text-[12px] text-slate-500">{formatSchedule(exam.scheduleStart)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-slate-500">No exams are currently scheduled.</p>
                    )}
                </Panel>
                <div className="xl:col-span-2">
                    <DashboardCalendar />
                </div>
            </section>

            <section>
                <Panel title="Recent submissions">
                    {submissions.length === 0 ? (
                        <EmptyPanel>No submissions yet.</EmptyPanel>
                    ) : (
                        <ul className="divide-y divide-slate-100" aria-label="Recent submissions">
                            {submissions.slice(0, 5).map((submission) => (
                                <li key={submission.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-slate-800">{submissionExam(submission)}</p>
                                        <p className="mt-0.5 truncate text-[12px] text-slate-500">{submissionName(submission)} · {formatSubmittedAt(submission.submittedAt)}</p>
                                    </div>
                                    <StatusPill tone="success" label={`${Math.round(submittedScore(submission))}%`} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </section>
        </div>
    );
};

export default ManagementDashboard;
