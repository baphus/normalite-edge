import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Archive,
    Copy,
    Eye,
    Clock,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Grid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Exam {
    id: string;
    title: string;
    category: string;
    program: string;
    questionCount: number;
    duration: number;
    status: 'live' | 'draft' | 'archived';
    maxAttempts: number;
    deadline: string;
}

const ManageExamsPage: React.FC = () => {
    const [exams, setExams] = useState<Exam[]>([]);

    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'archived'>('all');
    const [search, setSearch] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);

    const filteredExams = exams.filter(exam => {
        const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
        const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleDelete = () => {
        if (examToDelete) {
            setExams(prev => prev.filter(e => e.id !== examToDelete));
            setIsDeleteDialogOpen(false);
            setExamToDelete(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Exam Library</h1>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Manage and organize all LET preparation exams.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="Search exams..."
                            className="pl-10 h-11 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link to="/manage-exams/create">
                        <Button className="h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2">
                            <Plus size={18} /> Create Exam
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {(['all', 'live', 'draft', 'archived'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`py-3.5 px-6 text-sm font-black whitespace-nowrap transition-all border-b-2 uppercase tracking-widest flex items-center gap-2 ${statusFilter === status
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-gray-600 font-bold'
                            }`}
                    >
                        {status === 'all' ? 'All Exams' :
                            status === 'live' ? 'Active / Live' :
                                status.charAt(0).toUpperCase() + status.slice(1)}
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {status === 'all' ? exams.length : exams.filter(e => e.status === status).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {filteredExams.map((exam) => (
                    <Card key={exam.id} className="group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-[2rem] overflow-hidden bg-white">
                        <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <Badge className={`font-black text-[10px] uppercase tracking-widest border-none ${exam.status === 'live' ? 'bg-green-50 text-green-600' :
                                    exam.status === 'draft' ? 'bg-amber-50 text-amber-600' :
                                        'bg-gray-50 text-gray-500'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${exam.status === 'live' ? 'bg-green-600' :
                                        exam.status === 'draft' ? 'bg-amber-600' :
                                            'bg-gray-500'
                                        }`} />
                                    {exam.status}
                                </Badge>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400">
                                            <MoreHorizontal size={18} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl w-40">
                                        <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5">
                                            <Copy size={14} /> Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 font-bold text-xs py-2.5">
                                            <Archive size={14} /> Archive
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="gap-2 font-bold text-xs py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={() => {
                                                setExamToDelete(exam.id);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-2 mb-6">
                                <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors leading-tight">
                                    {exam.title}
                                </h3>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/5 rounded-md px-1.5">
                                    Show to: {exam.program}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 mb-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Grid size={12} /> Questions
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{exam.questionCount} Items</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={12} /> Timer
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{exam.duration} Min</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-accent" /> Attempts
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-gray-900">{exam.maxAttempts}</span>
                                        <Button variant="link" className="h-auto p-0 text-[10px] font-black text-primary uppercase">Edit</Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} className="text-red-500" /> Deadline
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-gray-900">{new Date(exam.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <Button variant="link" className="h-auto p-0 text-[10px] font-black text-primary uppercase">Edit</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <Link to={`/reports/exam-performance/${exam.id}`} className="w-full">
                                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 font-black text-xs gap-2 w-full">
                                        <Eye size={14} /> Analytics
                                    </Button>
                                </Link>
                                <Link to={`/manage-exams/${exam.id}/edit`} className="w-full">
                                    <Button className="h-10 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border-none font-black text-xs gap-2 w-full">
                                        <Edit size={14} /> Edit Exam
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Create New Card */}
                <Link to="/manage-exams/create" className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/50 transition-all group min-h-[300px]">
                    <div className="bg-white p-5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={32} className="text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-sm text-gray-900 uppercase tracking-tight">Create New Mock Exam</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest max-w-[200px]">Start from scratch or use a predefined template</p>
                    </div>
                </Link>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
                    <DialogHeader className="space-y-4 text-center items-center">
                        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-black">Delete Exam?</DialogTitle>
                            <DialogDescription className="font-medium">
                                Are you sure you want to delete this exam? This action cannot be undone and all student results will be lost.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-12 rounded-xl font-black border-gray-200">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} className="h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black border-none shadow-lg shadow-red-500/20">
                            Yes, Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageExamsPage;
