import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FileText,
    Clock,
    Play,
    Lock,
    Calendar,
    AlertCircle,
    TrendingUp,
    Eye
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    description?: string;
    category: string;
    program_track?: string | null;
    tracks?: Array<{ id?: string; name: string; code?: string | null }>;
    questionCount: number;
    duration: number;
    status: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | string;
    attempts_remaining?: number;
    hasSubmitted?: boolean;
    userAttemptStatus?: 'IN_PROGRESS' | 'SUBMITTED' | string;
    deadline?: string;
    lastScore?: number;
    sections?: Array<{ id?: string; title?: string; orderNo?: number }>;
}

const ExamsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [status, setStatus] = useState('all');
    const [viewingExam, setViewingExam] = useState<Exam | null>(null);

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

    const revieweeTrack = (user?.program_track || user?.programTrack || user?.program || '').trim().toLowerCase();

    const visibleExams = exams.filter((exam) => {
        const examTracks = exam.tracks || [];
        const hasTrackLinks = examTracks.length > 0;
        const legacyProgramTrack = (exam.program_track || '').trim();
        const isPublic = !hasTrackLinks && !legacyProgramTrack;

        if (isPublic) return true;
        if (!revieweeTrack) return false;

        const matchesTrackLink = examTracks.some((track) =>
            [track.name, track.code]
                .filter((value): value is string => Boolean(value && value.trim()))
                .some((value) => value.trim().toLowerCase() === revieweeTrack)
        );

        const matchesLegacyProgram = !hasTrackLinks && legacyProgramTrack.toLowerCase() === revieweeTrack;

        return matchesTrackLink || matchesLegacyProgram;
    });

    const filteredExams = visibleExams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase()) ||
            (exam.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || exam.category === category;
        const attemptsRemaining = exam.attempts_remaining ?? 0;
        const hasSubmitted = Boolean(exam.hasSubmitted || exam.userAttemptStatus === 'SUBMITTED' || attemptsRemaining === 0);
        const matchesStatus = status === 'all' ||
            (status === 'published' && exam.status === 'LIVE' && !hasSubmitted) ||
            (status === 'submitted' && hasSubmitted) ||
            (status === 'locked' && !hasSubmitted && exam.status !== 'LIVE');

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = ['All', 'Professional Education', 'General Education', 'Specialization'];

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
                            className={`py-3 px-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${category === cat ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                        >
                            {cat === 'All' ? 'All Exams' : cat}
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${category === cat ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                {cat === 'All' ? visibleExams.length : visibleExams.filter(e => e.category === cat).length}
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
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
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
                    {filteredExams.map((exam) => {
                        const attemptsRemaining = exam.attempts_remaining ?? 0;
                        const hasSubmitted = Boolean(exam.hasSubmitted || exam.userAttemptStatus === 'SUBMITTED' || attemptsRemaining === 0);
                        const isLive = exam.status === 'LIVE';
                        const canTake = isLive && !hasSubmitted;
                        const sectionTitles = (exam.sections || [])
                            .map((section) => section.title?.trim())
                            .filter((title): title is string => Boolean(title));
                        return (
                            <Card
                                key={exam.id}
                                className={`group border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col ${hasSubmitted ? 'opacity-80' : ''}`}
                            >
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-snug">
                                        {exam.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 font-medium whitespace-pre-wrap break-words">
                                        {exam.description?.trim() || 'No description provided.'}
                                    </p>

                                    <p className="text-[11px] text-gray-600 font-semibold mb-4 whitespace-pre-wrap break-words">
                                        Sections: {sectionTitles.length > 0 ? sectionTitles.join(', ') : 'General Section'}
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
                                                <span className={`ml-1 ${canTake ? 'text-primary' : 'text-red-500'}`}>
                                                    {attemptsRemaining} remaining
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
                                <div className="p-4 bg-gray-50/50 border-t border-gray-100 mt-auto grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 border-gray-200 font-bold flex gap-2"
                                        onClick={() => setViewingExam(exam)}
                                    >
                                        <Eye size={16} /> View Exam
                                    </Button>
                                    <Button
                                        onClick={() => navigate(`/exams/${exam.id}/take`)}
                                        disabled={!canTake}
                                        className={`w-full h-11 font-bold flex gap-2 shadow-md ${canTake
                                            ? 'bg-primary hover:bg-primary/95 text-white shadow-primary/20'
                                            : 'bg-gray-200 text-gray-400 border-none'
                                            }`}
                                    >
                                        {canTake ? (
                                            <>Take Exam <Play size={18} fill="currentColor" /></>
                                        ) : (
                                            <>No Attempts Left <Lock size={18} /></>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={Boolean(viewingExam)} onOpenChange={(open) => !open && setViewingExam(null)}>
                <DialogContent className="rounded-2xl max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">{viewingExam?.title}</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 whitespace-pre-wrap break-words">
                            {viewingExam?.description?.trim() || 'No description provided.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</p>
                            <p className="font-semibold text-gray-800">{viewingExam?.category || 'No Category'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Deadline</p>
                            <p className="font-semibold text-gray-800">
                                {viewingExam?.deadline
                                    ? new Date(viewingExam.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                    : 'No deadline'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sections</p>
                            <p className="font-semibold text-gray-800 whitespace-pre-wrap break-words">
                                {(viewingExam?.sections || [])
                                    .map((section) => section.title?.trim())
                                    .filter((title): title is string => Boolean(title))
                                    .join(', ') || 'General Section'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attempts Remaining</p>
                            <p className="font-semibold text-gray-800">{viewingExam?.attempts_remaining ?? 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Questions</p>
                            <p className="font-semibold text-gray-800">{viewingExam?.questionCount || 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Duration</p>
                            <p className="font-semibold text-gray-800">{viewingExam?.duration || 0} Minutes</p>
                        </div>
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-2">
                                        <Button
                            variant="outline"
                            className="h-11 font-bold"
                            onClick={() => setViewingExam(null)}
                        >
                            Close
                        </Button>
                        <Button
                            className="h-11 font-bold"
                            onClick={() => viewingExam && navigate(`/exams/${viewingExam.id}/take`)}
                            disabled={!(viewingExam && viewingExam.status === 'LIVE' && !Boolean(viewingExam.hasSubmitted || viewingExam.userAttemptStatus === 'SUBMITTED' || (viewingExam.attempts_remaining ?? 0) === 0))}
                        >
                            Take Exam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
