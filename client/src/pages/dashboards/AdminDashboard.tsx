import React from 'react';
import {
    Users,
    UserPlus,
    Activity,
    PlusCircle,
    FileText,
    Upload,
    ChevronRight,
    Clock3,
    ClipboardCheck,
    UserCheck,
    FolderOpen,
    Layers
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
    useAuth();

    const adminStats = [
        { label: 'Total Users', value: Number(stats?.totalUsers ?? 0), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Pending Approvals', value: Number(stats?.pendingApprovals ?? 0), icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Active Sessions', value: Number(stats?.activeSessions ?? 0), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    const toLabelCase = (value?: unknown) => String(value ?? '')
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

    const recentMockExams = Array.isArray(stats?.recentMockExams)
        ? stats.recentMockExams.map((item) => ({
            title: item.title,
            program: item.program,
            time: formatRelativeTime(item.createdAt),
            status: normalizeExamStatus(item.status),
            uploaderName: item.uploaderName,
            uploaderAvatar: item.uploaderAvatar,
        }))
        : [];

    const recentMaterials = Array.isArray(stats?.recentMaterials)
        ? stats.recentMaterials.map((item) => ({
            title: item.title,
            category: toLabelCase(item.category),
            time: formatRelativeTime(item.createdAt),
            uploaderName: item.uploaderName,
            uploaderAvatar: item.uploaderAvatar,
        }))
        : [];

    const recentSubmissions = Array.isArray(stats?.recentSubmissions)
        ? stats.recentSubmissions.map((item) => ({
            student: item.student,
            studentAvatar: item.studentAvatar,
            task: item.task,
            score: `${Math.round(item.score)}%`,
            time: formatRelativeTime(item.submittedAt),
        }))
        : [];

    const recentUsers = Array.isArray(stats?.recentUsers)
        ? stats.recentUsers.map((item) => ({
            name: item.name,
            major: item.major,
            status: toLabelCase(item.status),
            date: formatRelativeTime(item.createdAt),
        }))
        : [];

    const activityFeed = Array.isArray(stats?.activityFeed)
        ? stats.activityFeed.map((item) => ({
            title: item.title,
            sub: item.sub,
            time: formatRelativeTime(item.createdAt),
        }))
        : [];

    const statusBadgeClass = (status: string) => {
        if (status === 'Published' || status === 'Active' || status === 'Live') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (status === 'Pending' || status === 'Draft') return 'bg-amber-50 text-amber-700 border-amber-100';
        if (status === 'Disabled' || status === 'Archived' || status === 'Closed') return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const EmptyState: React.FC<{ message: string }> = ({ message }) => (
        <p className="text-xs text-gray-400 py-2">{message}</p>
    );

    return (
        <div className="flex flex-col gap-3 pb-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Operations overview for administrators.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/manage-exams/create">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold h-8 text-xs px-3 gap-1.5">
                            <PlusCircle size={12} />
                            New Exam
                        </Button>
                    </Link>
                    <Link to="/materials/create">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3 gap-1.5 bg-white">
                            <Upload size={12} />
                            Add Material
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-3 gap-2.5">
                {adminStats.map((stat, i) => (
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Left 2/3 - three column card row */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Recent Exams */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} /> Mock Exams
                                </CardTitle>
                                <Link to="/manage-exams">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
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
                                            <p className="text-[12px] font-semibold text-gray-800 leading-tight flex-1 truncate">{item.title}</p>
                                            <Badge className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(item.status)}`}>
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.program}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} />
                                                <AvatarFallback className="text-[8px]">{initialsFromName(item.uploaderName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-gray-400 flex-1 truncate">{item.uploaderName}</span>
                                            <span className="text-[10px] text-gray-300 flex items-center gap-0.5 shrink-0"><Clock3 size={9} />{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Materials */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FolderOpen size={12} /> Materials
                                </CardTitle>
                                <Link to="/materials">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                                        View all
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {recentMaterials.length === 0 ? (
                                <EmptyState message="No recent materials." />
                            ) : (
                                recentMaterials.map((item, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <p className="text-[12px] font-semibold text-gray-800 leading-tight truncate">{item.title}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge variant="outline" className="text-[9px] font-medium border-gray-200 bg-slate-50 text-slate-500 px-1.5 py-0">
                                                {item.category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} />
                                                <AvatarFallback className="text-[8px]">{initialsFromName(item.uploaderName)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-gray-400 flex-1 truncate">{item.uploaderName}</span>
                                            <span className="text-[10px] text-gray-300 flex items-center gap-0.5 shrink-0"><Clock3 size={9} />{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Submissions */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <ClipboardCheck size={12} /> Submissions
                                </CardTitle>
                                <Link to="/students">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                                        View all
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {recentSubmissions.length === 0 ? (
                                <EmptyState message="No recent submissions." />
                            ) : (
                                recentSubmissions.map((item, index) => (
                                    <div key={index} className="py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5 shrink-0">
                                                <AvatarImage src={item.studentAvatar ?? undefined} />
                                                <AvatarFallback className="text-[9px]">{initialsFromName(item.student)}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-[12px] font-semibold text-gray-800 truncate flex-1">{item.student}</p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.task}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0">
                                                {item.score}
                                            </Badge>
                                            <span className="text-[10px] text-gray-300">{item.time}</span>
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
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <UserCheck size={12} /> Registrations
                                </CardTitle>
                                <Link to="/admin/users">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
                            {recentUsers.length === 0 ? (
                                <EmptyState message="No recent registrations." />
                            ) : (
                                recentUsers.map((userItem, index) => (
                                    <div key={index} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-gray-800 truncate">{userItem.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{userItem.major} Â· {userItem.date}</p>
                                        </div>
                                        <Badge className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 border ${statusBadgeClass(userItem.status)}`}>
                                            {userItem.status}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* System Activity */}
                    <Card className="border-gray-100 shadow-sm rounded-lg">
                        <CardHeader className="px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <Layers size={12} /> Activity
                                </CardTitle>
                                <Link to="/admin/logs">
                                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">
                                        Open logs
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                            {activityFeed.length === 0 ? (
                                <EmptyState message="No recent system activity." />
                            ) : (
                                activityFeed.map((log, index) => (
                                    <div key={index} className="border-l-2 border-primary/20 pl-2.5 py-0.5">
                                        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{log.title}</p>
                                        <p className="text-[10px] text-gray-400">{log.sub}</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">{log.time}</p>
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
                                    Manage Mock Exams <ChevronRight size={12} />
                                </Button>
                            </Link>
                            <Link to="/materials">
                                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5 px-2">
                                    Manage Materials <ChevronRight size={12} />
                                </Button>
                            </Link>
                            <Link to="/students">
                                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5 px-2">
                                    Student Submissions <ChevronRight size={12} />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
