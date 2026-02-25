import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    RefreshCw,
    TrendingUp,
    Search,
    ChevronDown,
    BarChart3,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    Info,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Empty state for the page
const stats: any[] = [
    { label: 'Total Examinees', value: '0', trend: '', trendType: 'success' },
    { label: 'Average Score', value: '0', sub: '/0 (0%)' },
    { label: 'Passing Rate', value: '0/0', sub: '0% passed', color: 'text-amber-600' },
    { label: 'Avg Time / Question', value: '0s', progress: 0 },
    { label: 'Completion Rate', value: '0%', sub: '0 completed' },
];

const students: any[] = [];

const difficulties: any[] = [];

const ExamPerformancePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    const openAnalysis = (student: any) => {
        setSelectedStudent(student);
        setIsAnalysisOpen(true);
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/manage-exams')}
                        className="rounded-full hover:bg-white hover:shadow-md transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Exam Performance</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">LET 2024 Comprehensive: Professional Education {id ? `(Exam ID: ${id})` : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 rounded-2xl px-6 font-black border-gray-100 gap-2 uppercase tracking-widest text-[10px]">
                        <Download size={16} /> Export CSV
                    </Button>
                    <Button className="h-11 rounded-2xl px-6 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2 uppercase tracking-widest text-[10px]">
                        <RefreshCw size={16} /> Refresh
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="rounded-[2rem] border-gray-100 shadow-xl shadow-gray-200/20 bg-white overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{stat.label}</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
                                {stat.sub && <span className="text-xs font-bold text-gray-400">{stat.sub}</span>}
                            </div>
                            {stat.trend && (
                                <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${stat.trendType === 'success' ? 'text-emerald-500' : 'text-primary'}`}>
                                    <TrendingUp size={12} /> {stat.trend}
                                </p>
                            )}
                            {stat.progress !== undefined && (
                                <div className="mt-4">
                                    <Progress value={stat.progress} className="h-1.5 bg-gray-50" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Student Results Table */}
                <Card className="lg:col-span-2 rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                            Student Results <span className="text-gray-400 font-bold text-xs ml-2">(124 total)</span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
                                <Input
                                    placeholder="Search student..."
                                    className="pl-9 h-10 w-48 rounded-xl border-gray-100 bg-gray-50/50 shadow-none focus:ring-primary/20 text-xs font-bold"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-gray-100">
                                <Filter size={16} className="text-gray-400" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-gray-50">
                                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-gray-400 h-12">Student Name</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center h-12">Score</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center h-12">Avg Time</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center h-12">Status</TableHead>
                                    <TableHead className="pr-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right h-12">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id} className="group hover:bg-gray-50/50 transition-colors border-gray-50">
                                        <TableCell className="pl-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-2xl ${student.color} flex items-center justify-center font-black text-xs shadow-sm`}>
                                                    {student.initials}
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">{student.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-sm text-gray-700">
                                            {student.score}
                                            <span className="text-[10px] text-gray-300 ml-0.5">/150</span>
                                        </TableCell>
                                        <TableCell className="text-center text-gray-500 font-bold text-xs">{student.time}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`rounded-xl font-black text-[9px] px-3 py-1 uppercase tracking-widest border-none ${student.status === 'Passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {student.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => openAnalysis(student)}
                                                className="text-primary hover:text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px] group"
                                            >
                                                Analyze Results <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-6 border-t border-gray-50 flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing 8 of 124 students</p>
                            <Button variant="ghost" className="text-primary font-black uppercase tracking-widest text-xs gap-2">
                                View All Results <ChevronDown size={14} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Question Difficulty & Misconception */}
                <div className="space-y-6">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 bg-white overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <BarChart3 size={20} className="text-primary" /> Difficulty Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            {difficulties.map((diff, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-gray-900">{diff.topic}</p>
                                            <p className="text-[10px] font-bold text-gray-400 italic">{diff.status}</p>
                                        </div>
                                        <span className={`font-black text-sm ${diff.percentage < 40 ? 'text-red-500' : 'text-gray-900'}`}>{diff.percentage}%</span>
                                    </div>
                                    <div className="relative h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${diff.color}`}
                                            style={{ width: `${diff.percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{diff.detail}</p>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full h-11 rounded-2xl border-gray-100 font-black uppercase tracking-widest text-[10px] mt-4 shadow-sm">
                                Full Analysis Report
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-amber-100 bg-amber-50/30 shadow-none overflow-hidden border-2">
                        <CardContent className="p-8 space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5">
                                    Key Finding
                                </Badge>
                                <h4 className="font-black text-amber-900 text-xs uppercase tracking-widest">Common Misconception</h4>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-amber-900/80">Q24: Behaviorist vs Cognitivist Theories</p>
                                <p className="text-xs font-medium text-amber-700 leading-relaxed italic">
                                    65% confused operant conditioning (Choice B) with social learning theory (Choice C - Correct). Recommend reviewing Bandura's work in next session.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Analysis Modal */}
            <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                <DialogContent className="max-w-4xl p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl bg-white">
                    <DialogHeader className="hidden">
                        <DialogTitle>Student Analysis</DialogTitle>
                    </DialogHeader>
                    <div className="p-0">
                        <div className="bg-white p-8 border-b border-gray-50 flex items-center justify-between relative">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-[1.5rem] ${selectedStudent?.color} flex items-center justify-center font-black text-2xl shadow-md`}>
                                    {selectedStudent?.initials}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-900">{selectedStudent?.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <Badge className={`rounded-xl font-black text-[10px] px-3 py-1 uppercase tracking-widest border-none ${selectedStudent?.status === 'Passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {selectedStudent?.status}
                                        </Badge>
                                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                                            <Clock size={14} /> {selectedStudent?.time} avg / question
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-gray-900">{selectedStudent?.score}<span className="text-lg text-gray-300 font-bold ml-1">/150</span></p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total score (94.6%)</p>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/30 space-y-8">
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: 'Correct', value: selectedStudent?.score, icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
                                    { label: 'Incorrect', value: 150 - (selectedStudent?.score || 0), icon: <XCircle size={16} className="text-primary" /> },
                                    { label: 'Fastest', value: '12s', icon: <Clock size={16} className="text-blue-500" /> },
                                    { label: 'Slowest', value: '118s', icon: <Clock size={16} className="text-amber-500" /> },
                                ].map((box, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 group hover:ring-2 hover:ring-primary/5 transition-all">
                                        <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-primary/5 transition-colors">{box.icon}</div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{box.label}</p>
                                            <p className="text-xl font-black text-gray-900">{box.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <Info size={16} className="text-primary" /> Detailed Review
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Select defaultValue="all">
                                            <SelectTrigger className="w-40 h-9 rounded-xl border-gray-100 text-[10px] font-black bg-white uppercase tracking-widest focus:ring-primary/20">
                                                <SelectValue placeholder="All Sections" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Sections</SelectItem>
                                                <SelectItem value="prof">Prof Ed</SelectItem>
                                                <SelectItem value="gen">Gen Ed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select defaultValue="incorrect">
                                            <SelectTrigger className="w-40 h-9 rounded-xl border-gray-100 text-[10px] font-black bg-white uppercase tracking-widest focus:ring-primary/20">
                                                <SelectValue placeholder="Results" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Questions</SelectItem>
                                                <SelectItem value="correct">Correct Only</SelectItem>
                                                <SelectItem value="incorrect">Incorrect Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {[1, 2, 3].map(q => (
                                        <div key={q} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm group hover:border-primary/20 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-primary">
                                                        <XCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 tracking-tight">Question #{24 + q}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Child Development Theory</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-gray-50 text-gray-400 font-black text-[9px] uppercase tracking-widest border-none px-2 py-0.5">
                                                    <Clock size={10} className="mr-1" /> 52s
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-8 pl-1">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Student Answer</p>
                                                    <Badge className="bg-red-50 text-red-600 font-black text-xs px-3 rounded-lg border-none shadow-sm">B</Badge>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Correct Answer</p>
                                                    <Badge className="bg-emerald-50 text-emerald-600 font-black text-xs px-3 rounded-lg border-none shadow-sm">C</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-8 bg-white border-t border-gray-50 flex sm:justify-between items-center">
                            <Button variant="ghost" className="h-11 rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] gap-2 border border-transparent hover:border-gray-100">
                                <Download size={16} /> Export Student Report
                            </Button>
                            <Button onClick={() => setIsAnalysisOpen(false)} className="h-11 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-[10px]">
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExamPerformancePage;
