import React from 'react';
import {
    Clock,
    TrendingUp,
    Calendar,
    Zap,
    Quote,
    ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RevieweeDashboardProps {
    stats: {
        readiness?: number;
        avgScore?: number;
        progress?: number;
    } | null;
}

const RevieweeDashboard: React.FC<RevieweeDashboardProps> = ({ stats }) => {
    const { user } = useAuth();

    // Dashboard stats
    const summaryStats = [
        { label: 'Overall Readiness', value: stats?.readiness || 0, color: 'text-primary', up: '' },
        { label: 'Avg. Mock Score', value: stats?.avgScore || 0, color: 'text-secondary', up: '' },
        { label: 'Syllabus Progress', value: stats?.progress || 0, color: 'text-indigo-500', sub: '' },
    ];

    const recentExams: any[] = [];

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    Welcome back, {user?.name.split(' ')[0]}!
                </h1>
                <p className="text-gray-500 mt-2 text-base">
                    You're on track to top the LET. Here's your daily digest.
                </p>
            </header>

            {/* Progress Overview */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summaryStats.map((stat, idx) => (
                    <Card key={idx} className="border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                        <CardContent className="pt-6 flex flex-col items-center gap-4">
                            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">{stat.label}</h3>
                            <div className="relative h-32 w-32">
                                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path
                                        className={stat.color.replace('text-', 'stroke-')}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeDasharray={`${stat.value}, 100`}
                                        strokeLinecap="round"
                                        strokeWidth="3"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-900">{stat.value}%</span>
                                </div>
                            </div>
                            {stat.up && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 flex gap-1">
                                    <TrendingUp size={12} />
                                    {stat.up} this week
                                </Badge>
                            )}
                            {stat.sub && (
                                <span className="text-xs font-medium text-gray-400">{stat.sub}</span>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Span 2) */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Average Scores Card */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-bold">Average Exam Scores</CardTitle>
                            <Link to="/exams">
                                <Button variant="link" className="text-primary font-bold">View Analysis</Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">General Education</span>
                                    <span className="font-bold">82%</span>
                                </div>
                                <Progress value={82} className="h-3 bg-gray-100 [&>div]:bg-primary" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">Professional Education</span>
                                    <span className="font-bold">75%</span>
                                </div>
                                <Progress value={75} className="h-3 bg-gray-100 [&>div]:bg-secondary" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">Specialization - {user?.major || 'N/A'}</span>
                                    <span className="font-bold">68%</span>
                                </div>
                                <Progress value={68} className="h-3 bg-gray-100 [&>div]:bg-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Exams Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Recent Mock Exams</h2>
                            <Link to="/exams">
                                <Button variant="link" className="text-primary font-bold p-0 flex gap-1 items-center">
                                    View All <ChevronRight size={16} />
                                </Button>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {recentExams.map((exam, i) => (
                                <Card key={i} className="group border-gray-100 hover:border-primary/20 hover:shadow-md transition-all">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge className={exam.type === 'Gen Ed' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-none' : 'bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 border-none'}>
                                                {exam.type}
                                            </Badge>
                                            <span className="text-xs text-gray-400 font-medium">{exam.date}</span>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1">{exam.title}</h4>
                                        <p className="text-sm text-gray-500 mb-4">{exam.total} Items • {exam.type === 'Gen Ed' ? '2 Hours' : '1 Hour'}</p>
                                        <div className="mt-auto pt-4 flex items-center justify-between">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold">{exam.score}</span>
                                                <span className="text-sm text-gray-400">/ {exam.total}</span>
                                            </div>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-xs font-bold">
                                                {exam.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column (Span 1) */}
                <div className="flex flex-col gap-6">
                    {/* Live Sessions Card */}
                    <Card className="border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-70">Live Sessions</CardTitle>
                                <CardDescription className="text-xs mt-1">Join ongoing calls.</CardDescription>
                            </div>
                            <Button variant="link" className="text-primary text-xs font-bold p-0">View all</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">LET Coaching Call</p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Clock size={12} />
                                            <span>Today • 2:00 PM - 3:00 PM</span>
                                        </div>
                                    </div>
                                    <Badge className="bg-red-100 text-red-700 border-none flex gap-1 items-center font-bold text-[10px]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                        LIVE
                                    </Badge>
                                </div>
                                <Link to="/zoom-meeting">
                                    <Button className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-10">
                                        Join Call
                                    </Button>
                                </Link>
                            </div>

                            <div className="space-y-3 pt-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={12} /> Upcoming
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between group cursor-pointer">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold group-hover:text-primary transition-colors">Gen Ed Q&A</p>
                                            <p className="text-[11px] text-gray-400">Tomorrow • 10:00 AM</p>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary" />
                                    </div>
                                    <div className="flex items-center justify-between group cursor-pointer">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold group-hover:text-primary transition-colors">Mock Exam Debrief</p>
                                            <p className="text-[11px] text-gray-400">Feb 25 • 4:00 PM</p>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Challenge Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#5a0000] p-6 text-white shadow-lg space-y-6">
                        <div className="flex items-center gap-2 text-white/80">
                            <Zap size={18} className="fill-white" />
                            <span className="text-xs font-bold uppercase tracking-widest">Daily Challenge</span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold leading-tight">Which educational philosophy em...</h3>
                            <p className="text-white/70 text-xs font-medium">Question of the day streak: 4 🔥</p>
                        </div>

                        <div className="flex justify-between items-end gap-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <span className="text-[10px] text-white/60 font-bold">{day}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 6 ? 'bg-white text-primary' : i > 1 ? 'bg-white/20' : 'bg-black/10 text-white/40'
                                        }`}>
                                        {i === 6 ? <Calendar size={14} /> : i > 1 ? '🔥' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button className="w-full bg-white text-primary hover:bg-gray-100 font-bold h-11 border-none">
                            Answer Now
                        </Button>

                        {/* Decor Circles */}
                        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
                    </div>

                    {/* Motivational Quote */}
                    <Card className="bg-secondary/5 border-secondary/20 shadow-none">
                        <CardContent className="p-6 flex gap-4">
                            <Quote className="text-secondary shrink-0" size={32} />
                            <div className="space-y-3">
                                <p className="text-sm italic text-gray-700 leading-relaxed">
                                    "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
                                </p>
                                <p className="text-xs font-bold text-gray-900">— Malcolm X</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default RevieweeDashboard;
