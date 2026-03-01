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
    // Auth context used for future protected actions
    useAuth();

    const adminStats = [
        { label: 'Total Users', value: Number(stats?.totalUsers ?? 0), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Pending Approvals', value: Number(stats?.pendingApprovals ?? 0), icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Active Sessions', value: Number(stats?.activeSessions ?? 0), icon: Activity, color: 'text-secondary', bg: 'bg-secondary/10' },
    ];

    const toLabelCase = (value: string) => value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    const formatRelativeTime = (dateValue?: string) => {
        if (!dateValue) return 'Recently';

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Recently';

        const diffMs = Date.now() - date.getTime();
        const minute = 60_000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diffMs < minute) return 'Just now';
        if (diffMs < hour) return `${Math.floor(diffMs / minute)} mins ago`;
        if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`;
        return `${Math.floor(diffMs / day)} days ago`;
    };

    const normalizeExamStatus = (status: string) => {
        if (status === 'LIVE') return 'Published';
        return toLabelCase(status);
    };

    const initialsFromName = (name: string) => {
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    };

    const recentMockExams = stats?.recentMockExams?.length
        ? stats.recentMockExams.map((item) => ({
            title: item.title,
            program: item.program,
            time: formatRelativeTime(item.createdAt),
            status: normalizeExamStatus(item.status),
            uploaderName: item.uploaderName,
            uploaderAvatar: item.uploaderAvatar,
        }))
        : [];

    const recentMaterials = stats?.recentMaterials?.length
        ? stats.recentMaterials.map((item) => ({
            title: item.title,
            category: toLabelCase(item.category),
            time: formatRelativeTime(item.createdAt),
            uploaderName: item.uploaderName,
            uploaderAvatar: item.uploaderAvatar,
        }))
        : [];

    const recentSubmissions = stats?.recentSubmissions?.length
        ? stats.recentSubmissions.map((item) => ({
            student: item.student,
            studentAvatar: item.studentAvatar,
            task: item.task,
            score: `${Math.round(item.score)}%`,
            time: formatRelativeTime(item.submittedAt),
        }))
        : [];

    const recentUsers = stats?.recentUsers?.length
        ? stats.recentUsers.map((item) => ({
            name: item.name,
            major: item.major,
            status: toLabelCase(item.status),
            date: formatRelativeTime(item.createdAt),
        }))
        : [];

    const activityFeed = stats?.activityFeed?.length
        ? stats.activityFeed.map((item) => ({
            title: item.title,
            sub: item.sub,
            time: formatRelativeTime(item.createdAt),
        }))
        : [];

    const statusBadgeClass = (status: string) => {
        if (status === 'Published' || status === 'Active' || status === 'Live') return 'bg-green-100 text-green-700';
        if (status === 'Pending' || status === 'Draft') return 'bg-yellow-100 text-yellow-700';
        if (status === 'Disabled' || status === 'Archived' || status === 'Closed') return 'bg-red-100 text-red-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="flex flex-col gap-4 font-lexend pb-8">
            <header className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Admin Dashboard
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2 py-0.5">Control Center</Badge>
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">Compact overview of operations, content, and learner activity.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/manage-exams/create">
                            <Button className="bg-primary hover:bg-primary/90 text-white font-semibold h-9 text-xs flex gap-2">
                                <PlusCircle size={14} />
                                New Mock Exam
                            </Button>
                        </Link>
                        <Link to="/materials/create">
                            <Button variant="outline" className="h-9 text-xs font-semibold flex gap-2">
                                <Upload size={14} />
                                Add Material
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {adminStats.map((stat, i) => (
                    <Card key={i} className="border-gray-100 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={18} />
                                </div>
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-none font-semibold text-[10px]">
                                    Live
                                </Badge>
                            </div>
                            <div className="space-y-0.5 mt-3">
                                <h3 className="text-2xl font-bold text-gray-900 leading-none">{stat.value}</h3>
                                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText size={15} /> Recently Added Mock Exams
                                </CardTitle>
                                <Link to="/manage-exams">
                                    <Button variant="link" className="h-auto p-0 text-xs">View all</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {recentMockExams.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">No recent mock exams.</p>
                            ) : (
                                recentMockExams.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-gray-100 px-3 py-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 leading-tight">{item.title}</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{item.program}</p>
                                            </div>
                                            <Badge className={`${statusBadgeClass(item.status)} border-none text-[10px] font-semibold`}>
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock3 size={11} /> {item.time}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} alt={item.uploaderName} />
                                                <AvatarFallback className="text-[9px] font-semibold">{initialsFromName(item.uploaderName)}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-[11px] text-gray-500">Uploaded by {item.uploaderName}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FolderOpen size={15} /> Recently Added Materials
                                </CardTitle>
                                <Link to="/materials">
                                    <Button variant="link" className="h-auto p-0 text-xs">View all</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {recentMaterials.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">No recent materials.</p>
                            ) : (
                                recentMaterials.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-gray-100 px-3 py-2">
                                        <p className="text-sm font-medium text-gray-900 leading-tight">{item.title}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <Badge variant="outline" className="text-[10px] font-medium border-gray-200 bg-slate-50 text-slate-600">
                                                {item.category}
                                            </Badge>
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <Clock3 size={11} /> {item.time}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={item.uploaderAvatar ?? undefined} alt={item.uploaderName} />
                                                <AvatarFallback className="text-[9px] font-semibold">{initialsFromName(item.uploaderName)}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-[11px] text-gray-500">Uploaded by {item.uploaderName}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <ClipboardCheck size={15} /> Recent Student Submissions
                                </CardTitle>
                                <Link to="/students">
                                    <Button variant="link" className="h-auto p-0 text-xs">View all</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {recentSubmissions.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">No recent submissions.</p>
                            ) : (
                                recentSubmissions.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-gray-100 px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={item.studentAvatar ?? undefined} alt={item.student} />
                                                <AvatarFallback className="text-[10px] font-semibold">{initialsFromName(item.student)}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-sm font-medium text-gray-900 leading-tight">{item.student}</p>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{item.task}</p>
                                        <div className="mt-1 flex items-center justify-between">
                                            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-semibold">Score {item.score}</Badge>
                                            <span className="text-[11px] text-gray-400">{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-4">
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <UserCheck size={15} /> Recent Registrations
                                </CardTitle>
                                <Link to="/admin/users">
                                    <Button variant="link" className="h-auto p-0 text-xs">Manage users</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {recentUsers.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">No recent registrations.</p>
                            ) : (
                                recentUsers.map((userItem, index) => (
                                    <div key={index} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 leading-tight">{userItem.name}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{userItem.major}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{userItem.date}</p>
                                        </div>
                                        <Badge className={`${statusBadgeClass(userItem.status)} border-none text-[10px] font-semibold`}>
                                            {userItem.status}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Layers size={15} /> System Activity
                                </CardTitle>
                                <Link to="/admin/logs">
                                    <Button variant="link" className="h-auto p-0 text-xs">Open logs</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            {activityFeed.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">No recent system activity.</p>
                            ) : (
                                activityFeed.map((log, index) => (
                                    <div key={index} className="border-l-2 border-slate-200 pl-3">
                                        <p className="text-sm font-medium text-gray-900">{log.title}</p>
                                        <p className="text-[11px] text-gray-500">{log.sub}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{log.time}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-dashed border-secondary/30 bg-secondary/5 shadow-none">
                        <CardContent className="p-3">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">Quick Access</p>
                            <div className="grid grid-cols-1 gap-2">
                                <Link to="/manage-exams">
                                    <Button variant="outline" className="w-full justify-between text-xs h-8">
                                        Manage Mock Exams <ChevronRight size={14} />
                                    </Button>
                                </Link>
                                <Link to="/materials">
                                    <Button variant="outline" className="w-full justify-between text-xs h-8">
                                        Manage Materials <ChevronRight size={14} />
                                    </Button>
                                </Link>
                                <Link to="/students">
                                    <Button variant="outline" className="w-full justify-between text-xs h-8">
                                        Open Student Submissions <ChevronRight size={14} />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
