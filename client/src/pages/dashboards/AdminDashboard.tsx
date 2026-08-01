import React from 'react';
import {
    Users,
    UserPlus,
    Activity,
    PlusCircle,
    FileText,
    Upload,
    Clock3,
    ClipboardCheck,
    UserCheck,
    FolderOpen,
    Layers,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    BarChart3,
    BookOpen,
    GraduationCap,
    FileCheck,
    Circle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

import { Link } from 'react-router-dom';
import ConferencesWidget from './ConferencesWidget';
import CalendarEventsWidget from './CalendarEventsWidget';

interface AdminDashboardProps {
    stats: {
        totalUsers?: number | string;
        pendingApprovals?: number | string;
        activeSessions?: number | string;
        recentMockExams?: {
            id: string;
            title: string;
            program: string;
            status: string;
            createdAt: string;
            uploaderName: string;
            uploaderAvatar?: string | null;
        }[];
        recentMaterials?: {
            id: string;
            title: string;
            category: string;
            visibility: string;
            createdAt: string;
            uploaderName: string;
            uploaderAvatar?: string | null;
        }[];
        recentSubmissions?: {
            id: string;
            student: string;
            studentAvatar?: string | null;
            task: string;
            score: number;
            submittedAt: string;
        }[];
        recentUsers?: {
            id: string;
            name: string;
            major: string;
            status: string;
            createdAt: string;
        }[];
        activityFeed?: {
            id: string;
            title: string;
            sub: string;
            createdAt: string;
        }[];
    } | null;
}

/* ─── helpers ──────────────────────────────────────────────────────────── */

const toLabelCase = (value?: unknown) =>
    String(value ?? '')
        .trim()
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Uncategorized';

const formatRelativeTime = (dateValue?: string) => {
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

const normalizeExamStatus = (status?: unknown) => {
    if (String(status ?? '').toUpperCase() === 'LIVE') return 'Published';
    return toLabelCase(status);
};

const initialsFromName = (name?: unknown) => {
    const parts = String(name ?? '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
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

const statusBadgeClass = (status: string) => {
    if (status === 'Published' || status === 'Active' || status === 'Live')
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'Pending' || status === 'Draft')
        return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'Disabled' || status === 'Archived' || status === 'Closed')
        return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-gray-100 text-gray-600 border-gray-200';
};

const activityIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('exam') || t.includes('mock')) return { icon: FileText, color: 'text-primary' };
    if (t.includes('user') || t.includes('register') || t.includes('student'))
        return { icon: Users, color: 'text-blue-500' };
    if (t.includes('material') || t.includes('upload'))
        return { icon: FolderOpen, color: 'text-emerald-500' };
    if (t.includes('submission') || t.includes('score'))
        return { icon: ClipboardCheck, color: 'text-violet-500' };
    if (t.includes('approve') || t.includes('pending'))
        return { icon: AlertTriangle, color: 'text-amber-500' };
    return { icon: Activity, color: 'text-gray-400' };
};

/* ─── tiny sub-components ──────────────────────────────────────────────── */

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

/* ─── Main Component ───────────────────────────────────────────────────── */

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
    useAuth();

    /* ── derived data ──────────────────────────────────────────────────── */

    const totalUsers = Number(stats?.totalUsers ?? 0);
    const pendingApprovals = Number(stats?.pendingApprovals ?? 0);
    const activeSessions = Number(stats?.activeSessions ?? 0);
    const recentSubs = Array.isArray(stats?.recentSubmissions) ? stats.recentSubmissions : [];
    const recentUsers = Array.isArray(stats?.recentUsers) ? stats.recentUsers : [];
    const recentExams = Array.isArray(stats?.recentMockExams) ? stats.recentMockExams : [];
    const recentMats = Array.isArray(stats?.recentMaterials) ? stats.recentMaterials : [];
    const activityFeed = Array.isArray(stats?.activityFeed) ? stats.activityFeed : [];

    // performance metrics derived from submissions
    const avgScore =
        recentSubs.length > 0
            ? Math.round(recentSubs.reduce((s, r) => s + r.score, 0) / recentSubs.length)
            : 0;
    const passRate =
        recentSubs.length > 0
            ? Math.round(
                  (recentSubs.filter((r) => r.score >= 75).length / recentSubs.length) * 100
              )
            : 0;
    const publishedExams = recentExams.filter(
        (e) => normalizeExamStatus(e.status) === 'Published'
    ).length;

    // "needs attention" items
    const lowScoreSubs = recentSubs.filter((s) => s.score < 50);
    const pendingExams = recentExams.filter(
        (e) =>
            normalizeExamStatus(e.status) === 'Pending' ||
            normalizeExamStatus(e.status) === 'Draft'
    );
    const pendingUsers = recentUsers.filter(
        (u) => toLabelCase(u.status) === 'Pending'
    );

    /* ── stat cards ────────────────────────────────────────────────────── */

    const adminStats = [
        {
            label: 'Total Users',
            value: totalUsers,
            icon: Users,
            color: 'text-primary',
            bg: 'bg-primary/10',
            trend: recentUsers.length > 0 ? `+${Math.min(recentUsers.length, totalUsers)} this period` : undefined,
            trendUp: true,
        },
        {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: UserPlus,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: pendingApprovals > 0 ? 'Requires review' : 'All clear',
            trendUp: pendingApprovals > 0,
        },
        {
            label: 'Active Sessions',
            value: activeSessions,
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: activeSessions > 0 ? 'In progress' : 'None active',
            trendUp: activeSessions > 0,
        },
        {
            label: 'Avg Score',
            value: `${avgScore}%`,
            icon: BarChart3,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            trend:
                avgScore >= 75
                    ? 'Above target'
                    : avgScore > 0
                      ? 'Below target'
                      : 'No data yet',
            trendUp: avgScore >= 75,
        },
    ];

    /* ── parsed lists ──────────────────────────────────────────────────── */

    const recentMockExams = recentExams.map((item) => ({
        title: item.title,
        program: item.program,
        time: formatRelativeTime(item.createdAt),
        status: normalizeExamStatus(item.status),
        uploaderName: item.uploaderName,
        uploaderAvatar: item.uploaderAvatar,
    }));

    const parsedMaterials = recentMats.map((item) => ({
        title: item.title,
        category: toLabelCase(item.category),
        time: formatRelativeTime(item.createdAt),
        uploaderName: item.uploaderName,
        uploaderAvatar: item.uploaderAvatar,
    }));

    const parsedSubmissions = recentSubs.map((item) => ({
        student: item.student,
        studentAvatar: item.studentAvatar,
        task: item.task,
        score: item.score,
        time: formatRelativeTime(item.submittedAt),
    }));

    const parsedUsers = recentUsers.map((item) => ({
        name: item.name,
        major: item.major,
        status: toLabelCase(item.status),
        date: formatRelativeTime(item.createdAt),
    }));

    const parsedActivity = activityFeed.map((item) => ({
        title: item.title,
        sub: item.sub,
        time: formatRelativeTime(item.createdAt),
        ...activityIcon(item.title),
    }));

    /* ── render ─────────────────────────────────────────────────────────── */

    return (
        <div className="flex flex-col gap-4 pb-6">
            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div data-guide="dashboard-header" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="font-serif text-xl font-bold text-gray-900 tracking-tight">
                        {getGreeting()}, Admin
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{formatDate()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Operations overview for your school&rsquo;s exam platform.
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
                    <Link to="/materials/create">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold px-3 gap-1.5 bg-white"
                        >
                            <Upload size={12} />
                            Add Material
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
                    <GraduationCap size={13} className="text-primary" />
                    <span className="font-semibold text-gray-700">{totalUsers}</span> users
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileCheck size={13} className="text-emerald-500" />
                    <span className="font-semibold text-gray-700">{publishedExams}</span> exams published
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <BarChart3 size={13} className="text-violet-500" />
                    <span className="font-semibold text-gray-700">{avgScore}%</span> avg score
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClipboardCheck size={13} className="text-amber-500" />
                    <span className="font-semibold text-gray-700">{passRate}%</span> pass rate
                </span>
            </div>

            {/* ── STAT STRIP ──────────────────────────────────────────────── */}
            <div data-guide="dashboard-stat-strip" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {adminStats.map((stat, i) => (
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
                                    <span className="text-[9px] text-gray-400 font-medium">{stat.trend}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── PERFORMANCE OVERVIEW ────────────────────────────────────── */}
            {recentSubs.length > 0 && (
                <Card data-guide="dashboard-performance" className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                    <CardHeader className="px-5 pt-4 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <BarChart3 size={13} className="text-primary" /> School Performance Overview
                            </CardTitle>
                            <span className="text-[10px] text-gray-300 font-mono">
                                {recentSubs.length} submissions
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            {/* Completion */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        Total Attempts
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">{recentSubs.length}</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {recentSubs.slice(0, 10).map((sub, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-sm ${
                                                sub.score >= 75
                                                    ? 'bg-emerald-400'
                                                    : sub.score >= 50
                                                      ? 'bg-amber-400'
                                                      : 'bg-red-400'
                                            }`}
                                            title={`${sub.student}: ${Math.round(sub.score)}%`}
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-300">
                                    Last {Math.min(recentSubs.length, 10)} submissions ·{' '}
                                    <span className="text-emerald-500">●</span> ≥75%{' '}
                                    <span className="text-amber-500">●</span> 50-74%{' '}
                                    <span className="text-red-400">●</span> &lt;50%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── NEEDS ATTENTION ─────────────────────────────────────────── */}
            {(lowScoreSubs.length > 0 || pendingExams.length > 0 || pendingUsers.length > 0) && (
                <Card
                    data-guide="dashboard-needs-attention"
                    className="border-amber-200 bg-amber-50/40 shadow-sm rounded-xl overflow-hidden"
                >
                    <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-300" />
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> Needs Attention
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {lowScoreSubs.length > 0 && (
                                <div className="rounded-lg bg-white border border-amber-100 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">
                                        Low Scores (&lt;50%)
                                    </p>
                                    <div className="space-y-1.5">
                                        {lowScoreSubs.slice(0, 3).map((sub, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <Avatar className="h-4 w-4 shrink-0">
                                                    <AvatarImage src={sub.studentAvatar ?? undefined} />
                                                    <AvatarFallback className="text-[7px]">
                                                        {initialsFromName(sub.student)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[11px] text-gray-700 truncate flex-1">
                                                    {sub.student}
                                                </span>
                                                <ScorePill score={sub.score} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pendingExams.length > 0 && (
                                <div className="rounded-lg bg-white border border-amber-100 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">
                                        Exams Pending Review
                                    </p>
                                    <div className="space-y-1.5">
                                        {pendingExams.slice(0, 3).map((exam, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <FileText size={11} className="text-amber-400 shrink-0" />
                                                <span className="text-[11px] text-gray-700 truncate flex-1">
                                                    {exam.title}
                                                </span>
                                                <Badge className={`text-[8px] font-semibold px-1 py-0 border ${statusBadgeClass(normalizeExamStatus(exam.status))}`}>
                                                    {normalizeExamStatus(exam.status)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pendingUsers.length > 0 && (
                                <div className="rounded-lg bg-white border border-amber-100 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">
                                        Users Pending Approval
                                    </p>
                                    <div className="space-y-1.5">
                                        {pendingUsers.slice(0, 3).map((user, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <UserPlus size={11} className="text-amber-400 shrink-0" />
                                                <span className="text-[11px] text-gray-700 truncate flex-1">
                                                    {user.name}
                                                </span>
                                                <span className="text-[9px] text-gray-400">{user.major}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── MAIN CONTENT GRID ───────────────────────────────────────── */}
            <div data-guide="dashboard-primary-panel" className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Left 2/3 — three column card row */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Recent Exams — maroon accent */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-primary" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} className="text-primary" /> Mock Exams
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
                            {recentMockExams.length === 0 ? (
                                <EmptyState message="No recent mock exams." />
                            ) : (
                                recentMockExams.map((item, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1 truncate">
                                                {item.title}
                                            </p>
                                            <Badge
                                                className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(item.status)}`}
                                            >
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.program}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {initialsFromName(item.uploaderName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-gray-400 flex-1 truncate">
                                                {item.uploaderName}
                                            </span>
                                            <span className="text-[10px] text-gray-300 flex items-center gap-0.5 shrink-0">
                                                <Clock3 size={9} />
                                                {item.time}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Materials — gold accent */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-secondary" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FolderOpen size={12} className="text-secondary" /> Materials
                                </CardTitle>
                                <Link to="/materials">
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
                            {parsedMaterials.length === 0 ? (
                                <EmptyState message="No recent materials." />
                            ) : (
                                parsedMaterials.map((item, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <p className="text-[12px] font-semibold text-gray-800 leading-tight truncate">
                                            {item.title}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] font-medium border-gray-200 bg-slate-50 text-slate-500 px-1.5 py-0"
                                            >
                                                {item.category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {initialsFromName(item.uploaderName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-gray-400 flex-1 truncate">
                                                {item.uploaderName}
                                            </span>
                                            <span className="text-[10px] text-gray-300 flex items-center gap-0.5 shrink-0">
                                                <Clock3 size={9} />
                                                {item.time}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Submissions — violet accent */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-400" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <ClipboardCheck size={12} className="text-violet-500" /> Submissions
                                </CardTitle>
                                <Link to="/students">
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
                            {parsedSubmissions.length === 0 ? (
                                <EmptyState message="No recent submissions." />
                            ) : (
                                parsedSubmissions.map((item, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 shrink-0">
                                                <AvatarImage src={item.studentAvatar ?? undefined} />
                                                <AvatarFallback className="text-[9px]">
                                                    {initialsFromName(item.student)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="text-[12px] font-semibold text-gray-800 truncate flex-1">
                                                {item.student}
                                            </p>
                                            <ScorePill score={item.score} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.task}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Progress
                                                value={item.score}
                                                className="h-1 flex-1 mr-2 bg-gray-100 [&>div]:bg-primary/40"
                                            />
                                            <span className="text-[10px] text-gray-300 shrink-0">{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right 1/3 */}
                <div className="flex flex-col gap-3">
                    {/* Recent Registrations */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-blue-500" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <UserCheck size={12} className="text-blue-500" /> Registrations
                                </CardTitle>
                                <Link to="/admin/users">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70"
                                    >
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
                            {parsedUsers.length === 0 ? (
                                <EmptyState message="No recent registrations." />
                            ) : (
                                parsedUsers.map((userItem, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-gray-800 truncate">
                                                {userItem.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {userItem.major} · {userItem.date}
                                            </p>
                                        </div>
                                        <Badge
                                            className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(userItem.status)}`}
                                        >
                                            {userItem.status}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* System Activity — timeline style */}
                    <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-gray-400 to-gray-300" />
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Layers size={12} className="text-gray-400" /> Activity
                                </CardTitle>
                                <Link to="/admin/logs">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70"
                                    >
                                        Open logs
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0">
                            {parsedActivity.length === 0 ? (
                                <EmptyState message="No recent system activity." />
                            ) : (
                                <div className="relative">
                                    {/* vertical timeline line */}
                                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-100" />
                                    <div className="space-y-2.5">
                                        {parsedActivity.map((log, index) => (
                                            <div key={index} className="flex items-start gap-2.5 relative">
                                                {/* timeline dot */}
                                                <div className="relative z-10 mt-1 shrink-0">
                                                    <Circle
                                                        size={14}
                                                        className={`${log.color} fill-current`}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                                                        {log.title}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">{log.sub}</p>
                                                    <p className="text-[9px] text-gray-300 mt-0.5 font-mono">{log.time}</p>
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
                                        label: 'Materials',
                                        to: '/materials',
                                        icon: BookOpen,
                                        color: 'bg-secondary/20 text-amber-700',
                                    },
                                    {
                                        label: 'Students',
                                        to: '/students',
                                        icon: GraduationCap,
                                        color: 'bg-violet-50 text-violet-600',
                                    },
                                    {
                                        label: 'Submissions',
                                        to: '/students',
                                        icon: ClipboardCheck,
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

export default AdminDashboard;
