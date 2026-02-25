import React from 'react';
import {
    Users,
    UserPlus,
    ShieldCheck,
    Activity,
    Settings,
    PlusCircle,
    CheckCircle2,
    Database,
    Lock,
    Search,
    ChevronRight,
    TrendingUp,
    History,
    FileDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

import { Link } from 'react-router-dom';

interface AdminDashboardProps {
    stats: {
        totalUsers?: number | string;
        pendingApprovals?: number | string;
        activeSessions?: number | string;
    } | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
    // Auth context used for future protected actions
    useAuth();

    const adminStats = [
        { label: 'Total Registered', value: stats?.totalUsers || '1,248', icon: Users, color: 'text-primary', bg: 'bg-primary/10', trend: '+12%' },
        { label: 'Pending Approvals', value: stats?.pendingApprovals || '14', icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50', status: 'Priority' },
        { label: 'Active Sessions', value: stats?.activeSessions || '84', icon: Activity, color: 'text-secondary', bg: 'bg-secondary/10', trend: 'Normal' },
        { label: 'System Health', value: '99.9%', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', status: 'Stable' },
    ];

    const recentUsers = [
        { name: 'Juan Dela Cruz', major: 'BSEd - English', date: 'Oct 26, 2023', status: 'Active' },
        { name: 'Maria Santos', major: 'BEEd - Generalist', date: 'Oct 25, 2023', status: 'Pending' },
        { name: 'Pedro Penduko', major: 'BSEd - Math', date: 'Oct 25, 2023', status: 'Active' },
        { name: 'Elena Guerrero', major: 'BSEd - Science', date: 'Oct 24, 2023', status: 'Active' },
    ];

    const auditLogs = [
        { title: 'Bulk Upload', sub: 'Admin uploaded 50 questions to Prof Ed.', time: '2 hours ago', icon: Database },
        { title: 'New User Approval', sub: 'Approved 5 pending student accounts.', time: '5 hours ago', icon: UserPlus },
        { title: 'System Security', sub: 'Firewall rules updated for API gateway.', time: '1 day ago', icon: Lock },
    ];

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            Admin Dashboard
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2 py-0.5">Control Panel</Badge>
                        </h1>
                        <p className="text-gray-500 mt-2 text-base">Overview of user statistics and system performance.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <Input placeholder="Search users/logs..." className="pl-9 h-11 border-gray-200" />
                        </div>
                        <Link to="/manage-exams/create">
                            <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-11 flex gap-2">
                                <PlusCircle size={18} />
                                Create Mock Exam
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {adminStats.map((stat, i) => (
                    <Card key={i} className="border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                {stat.trend ? (
                                    <Badge variant="outline" className={`${stat.trend.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'} border-none font-bold text-[10px] flex gap-1 items-center`}>
                                        {stat.trend.startsWith('+') && <TrendingUp size={10} />} {stat.trend}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className={`${stat.status === 'Priority' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'} border-none font-bold text-[10px]`}>
                                        {stat.status}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    {/* Recent Registrations */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Recent Registrations</h2>
                            <Link to="/admin/users">
                                <Button variant="link" className="text-primary font-bold p-0 flex gap-1 items-center">
                                    View All Users <ChevronRight size={16} />
                                </Button>
                            </Link>
                        </div>
                        <Card className="border-gray-100 shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 tracking-widest py-4">Student Name</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 tracking-widest py-4">Major</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 tracking-widest py-4">Date Joined</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 tracking-widest py-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentUsers.map((u, i) => (
                                        <TableRow key={i} className="hover:bg-gray-50/30">
                                            <TableCell className="font-bold text-gray-900 py-4">{u.name}</TableCell>
                                            <TableCell className="text-gray-500 font-medium">{u.major}</TableCell>
                                            <TableCell className="text-gray-500 font-medium text-xs">{u.date}</TableCell>
                                            <TableCell>
                                                <Badge className={`${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} font-bold border-none text-[10px]`}>
                                                    {u.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </section>
                </div>

                <div className="flex flex-col gap-6">
                    {/* System Audit Log */}
                    <Card className="border-gray-100 shadow-sm flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold">System Audit Log</CardTitle>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                                <History size={18} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1">
                            {auditLogs.map((log, i) => (
                                <div key={i} className="flex gap-4 items-start group">
                                    <div className="bg-gray-50 rounded-xl h-12 w-12 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-primary group-hover:text-white transition-all">
                                        <log.icon size={22} className="text-gray-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm text-gray-900">{log.title}</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium">{log.sub}</p>
                                        <span className="text-[10px] text-gray-400 font-bold block pt-1 uppercase tracking-widest">{log.time}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <div className="p-4 border-t border-gray-50">
                            <Link to="/admin/logs">
                                <Button variant="outline" className="w-full h-11 border-dashed text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest">
                                    View Full System Logs
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* Admin Quick Actions */}
                    <section className="bg-secondary/5 rounded-2xl p-6 border border-secondary/20 border-dashed">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 opacity-70">Admin Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => alert('All pending users approved!')} className="bg-white border-gray-200 text-gray-600 font-bold text-xs h-10 flex gap-2 justify-start px-4">
                                <CheckCircle2 size={16} /> Approve All
                            </Button>
                            <Button variant="outline" onClick={() => alert('Database backup initiated successfully!')} className="bg-white border-gray-200 text-gray-600 font-bold text-xs h-10 flex gap-2 justify-start px-4">
                                <Database size={16} /> Backup DB
                            </Button>
                            <Button variant="outline" onClick={() => alert('System data exported to Excel/CSV')} className="bg-white border-gray-200 text-gray-600 font-bold text-xs h-10 flex gap-2 justify-start px-4">
                                <FileDown size={16} /> Export Data
                            </Button>
                            <Link to="/settings">
                                <Button variant="outline" className="bg-white border-gray-200 text-gray-600 font-bold text-xs h-10 flex gap-2 justify-start px-4 w-full">
                                    <Settings size={16} /> Settings
                                </Button>
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
