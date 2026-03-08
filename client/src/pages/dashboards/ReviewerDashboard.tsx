import React from 'react';
import {
    FileText,
    Users,
    BarChart3,
    PlusCircle,
    Clock3,
    Layers,
    ChevronRight,
    BookOpen,
    ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import ConferencesWidget from './ConferencesWidget';
import CalendarEventsWidget from './CalendarEventsWidget';

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

const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Reviewer';
    const normalizeExamSubject = (value?: string | null) => {
        const normalized = String(value || '').trim();

        if (!normalized || normalized.toLowerCase() === 'general section') {
            return 'Full Exam';
        }

        return normalized;
    };

    const reviewerStats = [
        { label: 'My Exams', value: stats?.examsCreated ?? 0, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'My Study Decks', value: stats?.decksCreated ?? 0, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Total Attempts', value: stats?.totalAttempts ?? 0, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Upcoming Conferences', value: stats?.upcomingSessions?.length ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

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

    const toLabelCase = (value: string) =>
        value.toLowerCase().split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    const normalizeStatus = (status: string) => {
        if (status === 'LIVE') return 'Published';
        return toLabelCase(status);
    };

    const statusBadgeClass = (status: string) => {
        if (['Published', 'Active', 'Live'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (['Pending', 'Draft'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-100';
        if (['Disabled', 'Archived', 'Closed'].includes(status)) return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const initialsFromName = (first?: string, last?: string) => {
        const f = first?.charAt(0)?.toUpperCase() || '';
        const l = last?.charAt(0)?.toUpperCase() || '';
        return `${f}${l}` || 'U';
    };

    const EmptyState: React.FC<{ message: string }> = ({ message }) => (
        <p className="text-xs text-gray-400 py-2">{message}</p>
    );

    const recentExams = stats?.recentExams ?? [];
    const recentAttempts = stats?.recentAttempts ?? [];
    const activityFeed = stats?.activityFeed ?? [];

    return (
        <div className="flex flex-col gap-3 pb-6">
            {/* Page header */}
            <div data-guide="dashboard-header" className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Welcome back, {firstName}. Here's your overview.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/manage-exams/create">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold h-8 text-xs px-3 gap-1.5">
                            <PlusCircle size={12} />
                            New Exam
                        </Button>
                    </Link>
                    <Link to="/study">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3 gap-1.5 bg-white">
                            <BookOpen size={12} />
                            My Decks
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stat strip */}
            <div data-guide="dashboard-stat-strip" className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {reviewerStats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                        <div className={`p-2 rounded-md ${stat.bg} ${stat.color} shrink-0`}>
                            <stat.icon size={15} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900 leading-none">{stat.value}</p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content grid */}
            <div data-guide="dashboard-primary-panel" className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Left 2/3 */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* My Exams */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} /> My Exams
                                </CardTitle>
                                <Link to="/manage-exams">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
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
                                    return (
                                        <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1 truncate">{exam.title}</p>
                                                <Badge className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(displayStatus)}`}>
                                                    {displayStatus}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{normalizeExamSubject(exam.subject)}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-gray-400">{exam._count?.attempts ?? 0} attempts</span>
                                                <span className="text-[10px] text-gray-300 flex items-center gap-0.5">
                                                    <Clock3 size={9} />{formatRelativeTime(exam.updatedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Student Attempts */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <ClipboardList size={12} /> Student Attempts
                                </CardTitle>
                                <Link to="/exam-performance">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                                        View all
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {recentAttempts.length === 0 ? (
                                <EmptyState message="No student attempts yet." />
                            ) : (
                                recentAttempts.slice(0, 6).map((attempt, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 shrink-0">
                                                <AvatarFallback className="text-[9px]">
                                                    {initialsFromName(attempt.user?.firstName, attempt.user?.lastName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="text-[12px] font-semibold text-gray-800 truncate flex-1">
                                                {attempt.user ? `${attempt.user.firstName} ${attempt.user.lastName}` : 'Unknown'}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{attempt.exam?.title || 'N/A'}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0">
                                                {Math.round(attempt.percentage ?? 0)}%
                                            </Badge>
                                            <span className="text-[10px] text-gray-300">{formatRelativeTime(attempt.submittedAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right 1/3 */}
                <div className="flex flex-col gap-3">
                    {/* Activity Feed */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Layers size={12} /> Activity Feed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {activityFeed.length === 0 ? (
                                <EmptyState message="No recent activity." />
                            ) : (
                                activityFeed.map((item, index) => (
                                    <div key={index} className="border-l-2 border-primary/20 pl-2.5 py-0.5">
                                        <p className="text-[12px] font-semibold text-gray-800 leading-tight truncate">{item.title}</p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {item.creator ? `${item.creator.firstName} ${item.creator.lastName}` : 'System'}
                                            {item.subject ? ` · ${normalizeExamSubject(item.subject)}` : ''}
                                        </p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">{formatRelativeTime(item.createdAt)}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Conferences */}
                    <ConferencesWidget />

                    {/* Calendar & Events */}
                    <CalendarEventsWidget />

                    {/* Quick Access */}
                    <div className="bg-white rounded-lg border border-dashed border-gray-200 p-3">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Quick Access</p>
                        <div className="space-y-1.5">
                            <Link to="/manage-exams">
                                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5 px-2">
                                    My Mock Exams <ChevronRight size={12} />
                                </Button>
                            </Link>
                            <Link to="/study">
                                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5 px-2">
                                    My Study Decks <ChevronRight size={12} />
                                </Button>
                            </Link>
                            <Link to="/exam-performance">
                                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5 px-2">
                                    Student Performance <ChevronRight size={12} />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
