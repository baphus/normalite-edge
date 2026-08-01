import React, { useMemo } from 'react';
import {
    FileText,
    Users,
    BarChart3,
    PlusCircle,
    Clock3,
    Layers,
    BookOpen,
    ClipboardList,
    TrendingUp,
    TrendingDown,
    GraduationCap,
    Activity,
    AlertTriangle,
    ClipboardCheck,
    Circle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import ConferencesWidget from './ConferencesWidget';
import CalendarEventsWidget from './CalendarEventsWidget';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ReviewerDashboardProps {
    stats: {
        examsCreated?: number;
        decksCreated?: number;
        totalAttempts?: number;
        upcomingSessions?: { id: string; title: string; startAt: string }[];
        recentAttempts?: {
            id: string;
            score: number;
            percentage: number;
            status: string;
            submittedAt: string | null;
            user?: { id: string; firstName: string; lastName: string; email: string };
            exam?: { id: string; title: string; subject: string | null };
        }[];
        recentExams?: {
            id: string;
            title: string;
            subject: string | null;
            status: string;
            createdAt: string;
            updatedAt: string;
            _count?: { attempts: number };
        }[];
        activityFeed?: {
            id: string;
            title: string;
            subject: string | null;
            status: string;
            createdAt: string;
            creator?: { firstName: string; lastName: string };
        }[];
    } | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const toLabelCase = (value: string) =>
    value
        .toLowerCase()
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

const normalizeStatus = (status: string) => {
    if (status === 'LIVE') return 'Published';
    return toLabelCase(status);
};

const normalizeExamSubject = (value?: string | null) => {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.toLowerCase() === 'general section') return 'Full Exam';
    return normalized;
};

const statusBadgeClass = (status: string) => {
    if (['Published', 'Active', 'Live'].includes(status))
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (['Pending', 'Draft'].includes(status))
        return 'bg-amber-50 text-amber-700 border-amber-100';
    if (['Disabled', 'Archived', 'Closed'].includes(status))
        return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-gray-100 text-gray-600 border-gray-200';
};

const initialsFromName = (first?: string, last?: string) => {
    const f = first?.charAt(0)?.toUpperCase() || '';
    const l = last?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}` || 'U';
};

const formatRelativeTime = (dateValue?: string | null) => {
    if (!dateValue) return 'Recently';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Recently';
    const diffMs = Date.now() - date.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return 'Just now';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    return `${Math.floor(diffMs / day)}d ago`;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const formatDate = () =>
    new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

const activityIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('exam') || t.includes('mock') || t.includes('created'))
        return { icon: FileText, color: 'text-primary' };
    if (t.includes('attempt') || t.includes('submitted'))
        return { icon: ClipboardCheck, color: 'text-violet-500' };
    if (t.includes('publish') || t.includes('live'))
        return { icon: Activity, color: 'text-emerald-500' };
    if (t.includes('conference') || t.includes('session'))
        return { icon: Users, color: 'text-blue-500' };
    if (t.includes('deck') || t.includes('study'))
        return { icon: BookOpen, color: 'text-amber-600' };
    return { icon: Activity, color: 'text-gray-400' };
};

/* ─── Tiny sub-components ──────────────────────────────────────────────── */

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-xs text-gray-400 py-3 text-center">{message}</p>
);

const ScorePill: React.FC<{ score: number }> = ({ score }) => {
    const rounded = Math.round(score);
    let cls = 'bg-emerald-50 text-emerald-700';
    if (rounded < 50) cls = 'bg-red-50 text-red-600';
    else if (rounded < 75) cls = 'bg-amber-50 text-amber-700';
    return (
        <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>
            {rounded}%
        </span>
    );
};

const MiniScoreBar: React.FC<{ pct: number }> = ({ pct }) => {
    const color =
        pct >= 75
            ? 'bg-emerald-500'
            : pct >= 50
              ? 'bg-amber-500'
              : 'bg-red-400';
    return (
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
        </div>
    );
};

/* ─── Main Component ───────────────────────────────────────────────────── */

const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Reviewer';

    /* ── Derived data ─────────────────────────────────────────────────── */

    const recentExams = useMemo(() => stats?.recentExams ?? [], [stats]);
    const recentAttempts = useMemo(() => stats?.recentAttempts ?? [], [stats]);
    const activityFeed = useMemo(() => stats?.activityFeed ?? [], [stats]);

    // Performance metrics derived from recent attempts
    const avgScore = useMemo(() => {
        if (recentAttempts.length === 0) return 0;
        return Math.round(
            recentAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / recentAttempts.length
        );
    }, [recentAttempts]);

    const passRate = useMemo(() => {
        if (recentAttempts.length === 0) return 0;
        return Math.round(
            (recentAttempts.filter((a) => (a.percentage ?? 0) >= 75).length / recentAttempts.length) *
                100
        );
    }, [recentAttempts]);

    const uniqueStudents = useMemo(() => {
        const ids = new Set<string>();
        recentAttempts.forEach((a) => {
            if (a.user?.id) ids.add(a.user.id);
        });
        return ids.size;
    }, [recentAttempts]);

    const publishedExams = useMemo(
        () => recentExams.filter((e) => normalizeStatus(e.status) === 'Published').length,
        [recentExams]
    );

    // Most challenging exam: lowest average across attempts (approximate using attempt count and subject)
    const mostChallenging = useMemo(() => {
        if (recentAttempts.length === 0) return null;
        // Group by exam
        const grouped: Record<string, { title: string; subject: string | null; total: number; count: number }> = {};
        recentAttempts.forEach((a) => {
            if (!a.exam?.id) return;
            if (!grouped[a.exam.id]) {
                grouped[a.exam.id] = { title: a.exam.title, subject: a.exam.subject, total: 0, count: 0 };
            }
            grouped[a.exam.id].total += a.percentage ?? 0;
            grouped[a.exam.id].count += 1;
        });
        const entries = Object.values(grouped).filter((e) => e.count > 0);
        if (entries.length === 0) return null;
        entries.sort((a, b) => a.total / a.count - b.total / b.count);
        const worst = entries[0];
        return { title: worst.title, subject: worst.subject, avg: Math.round(worst.total / worst.count) };
    }, [recentAttempts]);

    // Subject breakdown for performance section
    const subjectBreakdown = useMemo(() => {
        if (recentAttempts.length === 0) return [];
        const grouped: Record<string, { total: number; count: number }> = {};
        recentAttempts.forEach((a) => {
            const raw = a.exam?.subject;
            const subject = (!raw || raw.toLowerCase() === 'general section') ? 'Full Exam' : raw;
            if (!grouped[subject]) grouped[subject] = { total: 0, count: 0 };
            grouped[subject].total += a.percentage ?? 0;
            grouped[subject].count += 1;
        });
        return Object.entries(grouped)
            .map(([subject, data]) => ({
                subject,
                avg: Math.round(data.total / data.count),
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count || b.avg - a.avg)
            .slice(0, 5);
    }, [recentAttempts]);

    /* ── Stat cards ─────────────────────────────────────────────────── */

    const reviewerStats = [
        {
            label: 'My Exams',
            value: stats?.examsCreated ?? 0,
            icon: FileText,
            color: 'text-primary',
            bg: 'bg-primary/10',
            trend: publishedExams > 0 ? `${publishedExams} published` : 'No published exams',
            trendUp: publishedExams > 0,
        },
        {
            label: 'My Study Decks',
            value: stats?.decksCreated ?? 0,
            icon: BookOpen,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            trend: stats?.decksCreated ? 'Available for students' : 'Create your first deck',
            trendUp: (stats?.decksCreated ?? 0) > 0,
        },
        {
            label: 'Total Attempts',
            value: stats?.totalAttempts ?? 0,
            icon: BarChart3,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: avgScore > 0 ? `${avgScore}% avg score` : 'No data yet',
            trendUp: avgScore >= 75,
        },
        {
            label: 'Unique Students',
            value: uniqueStudents,
            icon: GraduationCap,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            trend: uniqueStudents > 0 ? 'Active this period' : 'No activity yet',
            trendUp: uniqueStudents > 0,
        },
        {
            label: 'Upcoming Sessions',
            value: stats?.upcomingSessions?.length ?? 0,
            icon: Users,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: (stats?.upcomingSessions?.length ?? 0) > 0 ? 'Scheduled' : 'All clear',
            trendUp: (stats?.upcomingSessions?.length ?? 0) > 0,
        },
    ];

    /* ── Parsed activity ───────────────────────────────────────────── */

    const parsedActivity = activityFeed.map((item) => ({
        ...item,
        sub: item.creator
            ? `${item.creator.firstName} ${item.creator.lastName}`
            : 'System',
        subjectLabel: normalizeExamSubject(item.subject),
        time: formatRelativeTime(item.createdAt),
        ...activityIcon(item.title),
    }));

    /* ── Subject color mapping ──────────────────────────────────────── */

    const subjectAccent = (subject: string) => {
        const lower = subject.toLowerCase();
        if (lower.includes('math')) return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
        if (lower.includes('science')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' };
        if (lower.includes('english')) return { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' };
        if (lower.includes('filipino')) return { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' };
        if (lower.includes('social')) return { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' };
        return { bg: 'bg-primary/8', text: 'text-primary', bar: 'bg-primary' };
    };

    /* ── Render ─────────────────────────────────────────────────────── */

    return (
        <div className="flex flex-col gap-4 pb-6">
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div data-guide="dashboard-header" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="font-serif text-xl font-bold text-gray-900 tracking-tight">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{formatDate()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Reviewer console — track student performance and manage your exam library.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link to="/manage-exams/create">
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white font-semibold h-8 text-xs px-3 gap-1.5"
                        >
                            <PlusCircle size={12} />
                            New Exam
                        </Button>
                    </Link>
                    <Link to="/study">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold px-3 gap-1.5 bg-white"
                        >
                            <BookOpen size={12} />
                            My Decks
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── SUMMARY BAR ─────────────────────────────────────────────── */}
            <div
                data-guide="dashboard-summary-bar"
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/60 border border-border px-4 py-2"
            >
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <GraduationCap size={13} className="text-blue-500" />
                    <span className="font-semibold text-gray-700">{uniqueStudents}</span> students attempted
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <BarChart3 size={13} className="text-violet-500" />
                    <span className="font-semibold text-gray-700">{avgScore}%</span> avg score
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClipboardCheck size={13} className="text-emerald-500" />
                    <span className="font-semibold text-gray-700">{passRate}%</span> pass rate (≥75%)
                </span>
                {mostChallenging && (
                    <>
                        <span className="text-gray-200">·</span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <AlertTriangle size={13} className="text-amber-500" />
                            <span className="font-semibold text-gray-700 truncate max-w-[140px]">{mostChallenging.title}</span>
                            <span className="text-gray-400">lowest avg</span>
                        </span>
                    </>
                )}
            </div>

            {/* ── STAT STRIP ──────────────────────────────────────────────── */}
            <div data-guide="dashboard-stat-strip" className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
                {reviewerStats.map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color} shrink-0`}>
                            <stat.icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                                {stat.label}
                            </p>
                            {stat.trend && (
                                <p className="flex items-center gap-0.5 mt-1">
                                    {stat.trendUp ? (
                                        <TrendingUp size={10} className="text-emerald-500" />
                                    ) : (
                                        <TrendingDown size={10} className="text-amber-500" />
                                    )}
                                    <span className="text-[9px] text-gray-400 font-medium truncate">{stat.trend}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── PERFORMANCE OVERVIEW ────────────────────────────────────── */}
            {recentAttempts.length > 0 && (
                <Card data-guide="dashboard-performance" className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                    <CardHeader className="px-5 pt-4 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <BarChart3 size={13} className="text-primary" /> Student Performance Summary
                            </CardTitle>
                            <span className="text-[10px] text-gray-300 font-mono">
                                {recentAttempts.length} total attempt{recentAttempts.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            {/* Average Score */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        Average Score
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">{avgScore}%</span>
                                </div>
                                <Progress
                                    value={avgScore}
                                    className="h-2 bg-primary/10 [&>div]:bg-primary"
                                />
                            </div>
                            {/* Pass Rate */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        Pass Rate (≥75%)
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">{passRate}%</span>
                                </div>
                                <Progress
                                    value={passRate}
                                    className="h-2 bg-emerald-100 [&>div]:bg-emerald-500"
                                />
                            </div>
                            {/* Unique Students */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        Unique Students
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">{uniqueStudents}</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {recentAttempts.slice(0, 12).map((a, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-sm ${
                                                (a.percentage ?? 0) >= 75
                                                    ? 'bg-emerald-400'
                                                    : (a.percentage ?? 0) >= 50
                                                      ? 'bg-amber-400'
                                                      : 'bg-red-400'
                                            }`}
                                            title={`${a.user?.firstName ?? '?'}: ${Math.round(a.percentage ?? 0)}%`}
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-300">
                                    Last {Math.min(recentAttempts.length, 12)} attempt{recentAttempts.length === 1 ? '' : 's'} ·{' '}
                                    <span className="text-emerald-500">●</span> ≥75%{' '}
                                    <span className="text-amber-500">●</span> 50-74%{' '}
                                    <span className="text-red-400">●</span> &lt;50%
                                </p>
                            </div>
                            {/* Most Challenging */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        Most Challenging
                                    </span>
                                </div>
                                {mostChallenging ? (
                                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                                        <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate">
                                            {mostChallenging.title}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                            {normalizeExamSubject(mostChallenging.subject)}
                                        </p>
                                        <p className="text-[11px] font-bold text-amber-600 mt-1">
                                            {mostChallenging.avg}% avg
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                                        <p className="text-[10px] text-gray-400">Not enough data</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subject breakdown row */}
                        {subjectBreakdown.length > 1 && (
                            <div className="mt-4 pt-3 border-t border-gray-50">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                    Breakdown by Subject
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                    {subjectBreakdown.map((s) => {
                                        const accent = subjectAccent(s.subject);
                                        return (
                                            <div key={s.subject} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                                                <p className={`text-[11px] font-semibold ${accent.text} truncate`}>
                                                    {s.subject}
                                                </p>
                                                <p className="text-[9px] text-gray-400 mt-0.5">
                                                    {s.count} attempt{s.count === 1 ? '' : 's'}
                                                </p>
                                                <div className="mt-1.5">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-mono text-[11px] font-bold text-gray-800">{s.avg}%</span>
                                                    </div>
                                                    <Progress
                                                        value={s.avg}
                                                        className={`h-1.5 bg-gray-200 [&>div]:${accent.bar}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── MAIN CONTENT GRID ───────────────────────────────────────── */}
            <div data-guide="dashboard-primary-panel" className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Left 2/3 */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* My Exams — maroon accent */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-primary" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} className="text-primary" /> My Exams
                                </CardTitle>
                                <Link to="/manage-exams">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70"
                                    >
                                        View all
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {recentExams.length === 0 ? (
                                <EmptyState message="No exams created yet." />
                            ) : (
                                recentExams.map((exam, index) => {
                                    const displayStatus = normalizeStatus(exam.status);
                                    const attemptCount = exam._count?.attempts ?? 0;
                                    const accent = subjectAccent(normalizeExamSubject(exam.subject));
                                    return (
                                        <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1 truncate">
                                                    {exam.title}
                                                </p>
                                                <Badge
                                                    className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(displayStatus)}`}
                                                >
                                                    {displayStatus}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold ${accent.bg} ${accent.text}`}>
                                                    {normalizeExamSubject(exam.subject)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {attemptCount} attempt{attemptCount === 1 ? '' : 's'}
                                                    </span>
                                                    {attemptCount > 0 && (
                                                        <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary/40 rounded-full"
                                                                style={{ width: `${Math.min(100, (attemptCount / Math.max(...recentExams.map(e => e._count?.attempts ?? 0), 1)) * 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-300 flex items-center gap-0.5 font-mono">
                                                    <Clock3 size={9} />{formatRelativeTime(exam.updatedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Student Attempts — violet accent */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-400" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <ClipboardList size={12} className="text-violet-500" /> Student Attempts
                                </CardTitle>
                                <Link to="/exam-performance">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70"
                                    >
                                        View all
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {recentAttempts.length === 0 ? (
                                <EmptyState message="No student attempts yet." />
                            ) : (
                                recentAttempts.slice(0, 6).map((attempt, index) => {
                                    const pct = Math.round(attempt.percentage ?? 0);
                                    const rawSubject = attempt.exam?.subject;
                                    const subjectLabel =
                                        !rawSubject || rawSubject.toLowerCase() === 'general section'
                                            ? null
                                            : rawSubject;
                                    const accent = subjectLabel ? subjectAccent(subjectLabel) : null;
                                    return (
                                        <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 shrink-0">
                                                    <AvatarFallback className="text-[9px]">
                                                        {initialsFromName(
                                                            attempt.user?.firstName,
                                                            attempt.user?.lastName
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <p className="text-[12px] font-semibold text-gray-800 truncate flex-1">
                                                    {attempt.user
                                                        ? `${attempt.user.firstName} ${attempt.user.lastName}`
                                                        : 'Unknown'}
                                                </p>
                                                <ScorePill score={pct} />
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-700 mt-0.5 truncate">
                                                {attempt.exam?.title || 'N/A'}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {subjectLabel && accent && (
                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold ${accent.bg} ${accent.text}`}>
                                                        {subjectLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <MiniScoreBar pct={pct} />
                                                <span className="text-[10px] text-gray-300 font-mono shrink-0">
                                                    {formatRelativeTime(attempt.submittedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right 1/3 */}
                <div className="flex flex-col gap-3">
                    {/* Activity Feed — proper timeline */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-gray-400 to-gray-300" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Layers size={12} className="text-gray-400" /> Activity Feed
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0">
                            {parsedActivity.length === 0 ? (
                                <EmptyState message="No recent activity." />
                            ) : (
                                <div className="relative">
                                    {/* Vertical timeline line */}
                                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-100" />
                                    <div className="space-y-2.5">
                                        {parsedActivity.map((item, index) => (
                                            <div key={index} className="flex items-start gap-2.5 relative">
                                                {/* Timeline dot */}
                                                <div className="relative z-10 mt-1 shrink-0">
                                                    <Circle
                                                        size={14}
                                                        className={`${item.color} fill-current`}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {item.sub}
                                                        {item.subjectLabel ? ` · ${item.subjectLabel}` : ''}
                                                    </p>
                                                    <p className="text-[9px] text-gray-300 mt-0.5 font-mono">
                                                        {item.time}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Conferences */}
                    <ConferencesWidget />

                    {/* Calendar & Events */}
                    <CalendarEventsWidget />

                    {/* Quick Access — clean icon grid */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-primary/60 to-secondary/60" />
                        <div className="px-4 pt-3 pb-4">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3">
                                Quick Access
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    {
                                        label: 'Manage Exams',
                                        to: '/manage-exams',
                                        icon: FileText,
                                        color: 'bg-primary/10 text-primary',
                                    },
                                    {
                                        label: 'Study Decks',
                                        to: '/study',
                                        icon: BookOpen,
                                        color: 'bg-secondary/20 text-amber-700',
                                    },
                                    {
                                        label: 'Performance',
                                        to: '/exam-performance',
                                        icon: BarChart3,
                                        color: 'bg-violet-50 text-violet-600',
                                    },
                                    {
                                        label: 'Conferences',
                                        to: '/conferences',
                                        icon: Users,
                                        color: 'bg-emerald-50 text-emerald-600',
                                    },
                                ].map((item, i) => (
                                    <Link key={i} to={item.to}>
                                        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50/50 py-3 px-2 hover:bg-primary/5 hover:border-primary/20 transition-colors cursor-pointer group">
                                            <div
                                                className={`p-2 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}
                                            >
                                                <item.icon size={14} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-gray-600 group-hover:text-primary transition-colors">
                                                {item.label}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
