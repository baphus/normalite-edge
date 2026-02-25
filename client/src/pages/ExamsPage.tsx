import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FileText,
    Clock,
    Play,
    BarChart3,
    Lock,
    CheckCircle2,
    Calendar,
    AlertCircle,
    TrendingUp,
    MoreVertical
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Exam {
    id: string;
    title: string;
    description: string;
    category: string;
    questionCount: number;
    duration: number;
    status: string;
    attempts_remaining: number;
    deadline?: string;
    lastScore?: number;
}

const ExamsPage: React.FC = () => {
    // Auth context used for future protected actions
    useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [status, setStatus] = useState('all');

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/exams');
                setExams(response.data.data);
            } catch (error) {
                console.error('Failed to fetch exams', error);
                setExams([]);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase()) ||
            exam.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || exam.category === category;
        const matchesStatus = status === 'all' ||
            (status === 'available' && exam.status === 'AVAILABLE' && exam.attempts_remaining > 0) ||
            (status === 'completed' && exam.status === 'COMPLETED') ||
            (status === 'locked' && (exam.status === 'LOCKED' || exam.attempts_remaining === 0));

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = ['All', 'Professional Education', 'General Education', 'Specialization'];

    const getStatusBadge = (exam: Exam) => {
        if (exam.status === 'COMPLETED') {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold text-[10px] flex gap-1"><CheckCircle2 size={10} /> COMPLETED</Badge>;
        }
        if (exam.attempts_remaining === 0 || exam.status === 'LOCKED') {
            return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-none font-bold text-[10px] flex gap-1"><Lock size={10} /> NO ATTEMPTS</Badge>;
        }
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px] uppercase tracking-wider">{exam.category}</Badge>;
    };

    return (
        <div className="flex flex-col gap-6 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Mock Exams</h1>
                    <p className="text-gray-500 text-sm font-medium">Select a practice exam to begin your preparation.</p>
                </div>
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <Input
                        placeholder="Search exams, categories, or topics..."
                        className="pl-11 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100">
                <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-0.5">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`py-3 px-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${category === cat
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {cat === 'All' ? 'All Exams' : cat}
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${category === cat ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                                }`}>
                                {cat === 'All' ? exams.length : exams.filter(e => e.category === cat).length}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 py-2 shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status:</span>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[140px] h-9 text-xs border-none bg-gray-50 font-bold focus:ring-0">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="locked">Locked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="border-gray-100 h-64 shadow-sm overflow-hidden">
                            <CardContent className="p-6 space-y-4">
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <div className="flex gap-4">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-4 w-1/3" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {filteredExams.map((exam) => (
                        <Card
                            key={exam.id}
                            className={`group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col ${exam.attempts_remaining === 0 ? 'opacity-80' : ''
                                }`}
                        >
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    {getStatusBadge(exam)}
                                    <button className="text-gray-300 hover:text-gray-600 transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-snug">
                                    {exam.title}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2 font-medium">
                                    {exam.lastScore ? `Last score: ${exam.lastScore}% - ${exam.description}` : exam.description}
                                </p>

                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                        <FileText size={14} className="text-primary" />
                                        {exam.questionCount} Questions
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                        <Clock size={14} className="text-primary" />
                                        {exam.duration} Minutes
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <TrendingUp size={12} className="text-gray-300" />
                                            Attempts:
                                            <span className={`ml-1 ${exam.attempts_remaining > 0 ? 'text-primary' : 'text-red-500'}`}>
                                                {exam.attempts_remaining} remaining
                                            </span>
                                        </div>
                                    </div>
                                    {exam.deadline && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Calendar size={12} className="text-gray-300" />
                                            Deadline:
                                            <span className="ml-1 text-gray-600">
                                                {new Date(exam.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <div className="p-4 bg-gray-50/50 border-t border-gray-100 mt-auto">
                                {exam.status === 'COMPLETED' ? (
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 border-2 border-primary text-primary hover:bg-primary/5 font-bold flex gap-2"
                                    >
                                        Review Results
                                        <BarChart3 size={18} />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => navigate(`/exams/${exam.id}/take`)}
                                        disabled={exam.attempts_remaining === 0 || exam.status === 'LOCKED'}
                                        className={`w-full h-11 font-bold flex gap-2 shadow-md ${exam.attempts_remaining > 0
                                            ? 'bg-primary hover:bg-primary/95 text-white shadow-primary/20'
                                            : 'bg-gray-200 text-gray-400 border-none'
                                            }`}
                                    >
                                        {exam.attempts_remaining > 0 ? (
                                            <>Start Exam <Play size={18} fill="currentColor" /></>
                                        ) : (
                                            <>No Attempts Left <Lock size={18} /></>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {filteredExams.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <AlertCircle size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-gray-900">No exams found</h3>
                        <p className="text-sm text-gray-500 font-medium">Try adjusting your filters or search query.</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => { setSearch(''); setCategory('All'); setStatus('all'); }}
                        className="font-bold border-gray-200"
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ExamsPage;
