import React from 'react';
import {
    FileText,
    Users,
    Clock,
    TrendingUp,
    Plus,
    BarChart3,
    Calendar,
    Gavel,
    History,
    Edit,
    Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Link } from 'react-router-dom';

interface ReviewerDashboardProps {
    stats: {
        totalExams?: number;
        pendingExams?: number;
        activeUsers?: number;
    } | null;
}

const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ stats }) => {
    // Auth context used for future protected actions
    useAuth();

    const reviewerStats = [
        { label: 'Total Mock Exams', value: stats?.totalExams || 0, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', status: 'Active' },
        { label: 'Exams for Review', value: stats?.pendingExams || 0, icon: Clock, color: 'text-primary', bg: 'bg-primary/5', status: 'Pending' },
        { label: 'Active Students', value: stats?.activeUsers || 0, icon: Users, color: 'text-secondary', bg: 'bg-secondary/10', trend: '' },
    ];

    const recentExams: any[] = [];

    const performanceTable: any[] = [];

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="bg-white border border-gray-100 px-6 py-8 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Welcome back, Reviewer!</h1>
                        <p className="text-gray-500 flex items-center gap-2 text-sm font-medium">
                            <Calendar size={16} />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-primary font-bold">{stats?.totalExams || 12} Published Exams</span>
                        </p>
                    </div>
                    <Link to="/manage-exams/create">
                        <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 flex gap-2">
                            <Plus size={20} />
                            Create New Exam
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviewerStats.map((stat, i) => (
                    <Card key={i} className="border-gray-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                {stat.status ? (
                                    <Badge variant="outline" className={`${stat.bg} ${stat.color} border-none font-bold text-[10px]`}>
                                        {stat.status}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-none font-bold text-[10px] flex gap-1">
                                        <TrendingUp size={10} /> {stat.trend}
                                    </Badge>
                                )}
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Recent Exams */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-bold">Recent Mock Exams</CardTitle>
                            <Link to="/manage-exams">
                                <Button variant="link" className="text-primary font-bold">View Library</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentExams.map((exam, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
                                    <div className={`p-3 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors ${i % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{exam.title}</h3>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">{exam.meta}</p>
                                            </div>
                                            <Badge className={exam.status === 'Published' ? 'bg-green-100 text-green-700 font-bold' : 'bg-orange-100 text-orange-700 font-bold'}>
                                                {exam.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-400 font-bold">
                                            <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                                <Calendar size={12} /> {exam.date}
                                            </span>
                                            <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                                <Users size={12} /> {exam.students} Students
                                            </span>
                                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-primary">
                                                <BarChart3 size={12} /> {exam.avg} Avg Score
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Performance Table */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
                        <Card className="border-gray-100 shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs uppercase text-gray-400 py-4">Exam Title</TableHead>
                                        <TableHead className="font-bold text-xs uppercase text-gray-400 py-4">Attempts</TableHead>
                                        <TableHead className="font-bold text-xs uppercase text-gray-400 py-4">Avg Score</TableHead>
                                        <TableHead className="font-bold text-xs uppercase text-gray-400 py-4">Pass Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceTable.map((row, i) => (
                                        <TableRow key={i} className="hover:bg-gray-50/50">
                                            <TableCell className="font-bold text-gray-900">{row.title}</TableCell>
                                            <TableCell className="text-gray-500">{row.attempts}</TableCell>
                                            <TableCell className="text-gray-500 font-medium">{row.avg}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-100 text-green-700 font-bold border-none">{row.passRate}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </section>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Action Required */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#5a0000] p-6 text-white shadow-lg space-y-4">
                        <div className="flex items-center gap-2 text-white/80">
                            <Gavel size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Action Required</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold leading-tight">5 Upcoming Sessions</h3>
                            <p className="text-white/70 text-sm mt-1">You have scheduled video conferences today.</p>
                        </div>
                        <Link to="/conferences">
                            <Button className="w-full bg-white text-primary hover:bg-gray-100 font-bold h-11 border-none mt-2">
                                View Schedule
                            </Button>
                        </Link>
                        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
                    </div>

                    {/* Recent Activity */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[
                                { title: 'New Mock Exam', sub: "Created 'Prof Ed: Final Drill'.", time: '2 hours ago', icon: FileText },
                                { title: 'Exam Published', sub: "Published 'Gen Ed: Comprehensive Review'.", time: '1 day ago', icon: History },
                                { title: 'Exam Updated', sub: "Modified 'English Language Skills' questions.", time: '2 days ago', icon: Edit },
                            ].map((activity, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="bg-gray-50 rounded-lg h-10 w-10 flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                        <activity.icon size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm text-gray-900 leading-none">{activity.title}</h4>
                                        <p className="text-xs text-gray-500 leading-snug">{activity.sub}</p>
                                        <span className="text-[10px] text-gray-400 font-bold block pt-1 uppercase tracking-wider">{activity.time}</span>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" onClick={() => alert('Full activity log filtered for reviewer!')} className="w-full mt-4 h-10 border-dashed text-gray-400 hover:text-gray-600 font-bold text-xs">
                                View All Activities
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="bg-secondary/5 border-secondary/20 shadow-none">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest opacity-70">Quick Actions</h3>
                            <div className="flex flex-col gap-3">
                                <Link to="/manage-exams">
                                    <Button variant="link" className="justify-start p-0 h-auto text-sm font-bold text-gray-600 hover:text-primary flex gap-2">
                                        <Edit size={16} /> Manage Exams
                                    </Button>
                                </Link>
                                <Button variant="link" onClick={() => alert('Exam analytics and student performance data exported!')} className="justify-start p-0 h-auto text-sm font-bold text-gray-600 hover:text-primary flex gap-2">
                                    <Download size={16} /> Export Exam Data
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
