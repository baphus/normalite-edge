import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Grid,
    Layers,
    UserRound,
    Users,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface ExamTrack {
    id?: string;
    name: string;
    code?: string | null;
}

interface ExamSection {
    id?: string;
    title?: string;
    orderNo?: number;
}

interface ExamQuestion {
    id: string;
    orderNo?: number;
    questionText?: string;
    imageUrl?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    rationalization?: string | null;
    sectionId?: string;
    section?: { id?: string; title?: string } | null;
}

interface ExamDetails {
    id: string;
    title?: string;
    description?: string | null;
    category?: string;
    status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
    questionCount?: number;
    totalItems?: number;
    duration?: number;
    timeLimit?: number;
    maxAttempts?: number | null;
    deadline?: string | null;
    scheduledDate?: string | null;
    closeOnDeadline?: boolean;
    tracks?: ExamTrack[];
    program_track?: string | null;
    sections?: ExamSection[];
    questions?: ExamQuestion[];
    creator?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
}

interface AttemptItem {
    id: string;
    status: string;
    submittedAt?: string | null;
    startedAt?: string;
    user?: {
        id: string;
        name?: string;
        email?: string;
        programTrack?: string | null;
        profilePicture?: string | null;
    };
}

const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return 'N/A';

    return dateValue.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getAvatarFallback = (name?: string) => {
    const cleaned = (name || '').trim();
    if (!cleaned) return 'U';
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getAvatarUrl = (name?: string, explicit?: string | null) => {
    if (explicit) return explicit;
    const encoded = encodeURIComponent(name || 'User');
    return `https://ui-avatars.com/api/?name=${encoded}&background=random&rounded=true`;
};

const ManageExamViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [attempts, setAttempts] = useState<AttemptItem[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError('Missing exam ID.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const [examResponse, attemptsResponse] = await Promise.all([
                    api.get(`/exams/${id}?questions=true`),
                    api.get('/attempts', { params: { examId: id, page: 1, limit: 200 } }),
                ]);

                setExam((examResponse.data?.data || null) as ExamDetails | null);
                setAttempts((attemptsResponse.data?.data || []) as AttemptItem[]);
            } catch (loadErr) {
                console.error('Failed to load exam details page', loadErr);
                setError('Unable to load exam details right now.');
                setExam(null);
                setAttempts([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const questionCount = Math.max(Number(exam?.questionCount || exam?.totalItems || 0), 0);
    const visibleToLabel = useMemo(() => {
        const tracks = exam?.tracks || [];
        if (tracks.length > 0) {
            return tracks
                .map((track) => (track.code ? `${track.name} (${track.code})` : track.name))
                .join(', ');
        }

        if (exam?.program_track?.trim()) return exam.program_track;
        return 'All Programs';
    }, [exam]);

    const sectionsLabel = useMemo(() => {
        const sectionTitles = (exam?.sections || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0))
            .map((section) => section.title?.trim())
            .filter((section): section is string => Boolean(section));

        if (sectionTitles.length === 0) return 'General Section';
        return sectionTitles.join(', ');
    }, [exam]);

    const creatorName = useMemo(() => {
        if (!exam?.creator) return 'Unknown author';
        return exam.creator.name
            || `${exam.creator.firstName || ''} ${exam.creator.lastName || ''}`.trim()
            || 'Unknown author';
    }, [exam]);

    const canEditExam = useMemo(() => {
        if (!exam) return false;
        if (user?.role === 'ADMIN') return true;
        return Boolean(exam.creator?.id && exam.creator.id === user?.id);
    }, [exam, user?.id, user?.role]);

    const submittedAttempts = useMemo(() => {
        return attempts
            .filter((attempt) => attempt.status === 'SUBMITTED')
            .slice()
            .sort((first, second) => {
                const left = new Date(first.submittedAt || first.startedAt || 0).getTime();
                const right = new Date(second.submittedAt || second.startedAt || 0).getTime();
                return right - left;
            });
    }, [attempts]);

    const recentSubmitters = useMemo(() => {
        const seen = new Set<string>();
        const users: Array<Required<AttemptItem>['user'] & { submittedAt?: string | null }> = [];

        for (const attempt of submittedAttempts) {
            if (!attempt.user?.id || seen.has(attempt.user.id)) continue;
            seen.add(attempt.user.id);
            users.push({
                id: attempt.user.id,
                name: attempt.user.name || 'Unknown User',
                email: attempt.user.email || 'No email',
                programTrack: attempt.user.programTrack || null,
                profilePicture: attempt.user.profilePicture || null,
                submittedAt: attempt.submittedAt,
            });
            if (users.length >= 10) break;
        }

        return users;
    }, [submittedAttempts]);

    const questions = useMemo(() => {
        return (exam?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0));
    }, [exam]);

    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">Loading exam details...</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => navigate('/manage-exams')}
                    >
                        <ArrowLeft size={15} />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight">Exam Details</h1>
                        <p className="text-[11px] text-gray-400 mt-0.5">Full exam setup and recent submissions.</p>
                    </div>
                </div>
                {exam && canEditExam ? (
                    <Link to={`/manage-exams/${exam.id}/edit`}>
                        <Button className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold text-xs gap-1.5">
                            Edit Exam
                        </Button>
                    </Link>
                ) : null}
            </header>

            {error ? (
                <Card className="rounded-lg border-red-100 bg-red-50/40">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <p className="text-xs font-semibold text-red-700">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/manage-exams')} className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50">
                            Back to Exams
                        </Button>
                    </CardContent>
                </Card>
            ) : !exam ? (
                <Card className="rounded-lg border-gray-100 bg-white">
                    <CardContent className="p-4 text-xs font-semibold text-gray-500">Exam not found.</CardContent>
                </Card>
            ) : (
                <>
                    <Card className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">
                                    {exam.category || 'No Category'}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`font-black text-[10px] uppercase tracking-widest ${
                                        exam.status === 'LIVE' || exam.status === 'PUBLISHED'
                                            ? 'border-green-200 text-green-700 bg-green-50'
                                            : exam.status === 'DRAFT'
                                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                                : exam.status === 'CLOSED'
                                                    ? 'border-red-200 text-red-700 bg-red-50'
                                                    : 'border-gray-200 text-gray-700 bg-gray-50'
                                    }`}
                                >
                                    {exam.status || 'UNKNOWN'}
                                </Badge>
                            </div>

                            <div>
                                <h2 className="text-sm font-bold text-gray-900 tracking-tight">{exam.title || 'Untitled Exam'}</h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">{exam.description || 'No description provided.'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Grid size={12} /> Questions
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{questionCount}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={12} /> Duration
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{Number(exam.timeLimit || exam.duration || 0)} min</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <CheckCircle2 size={12} /> Max Attempts
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{exam.maxAttempts ?? 1}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={12} /> Deadline
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{formatDate(exam.deadline || exam.scheduledDate)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers size={12} /> Sections
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">{sectionsLabel}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Users size={12} /> Visible To
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1 line-clamp-2">{visibleToLabel}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UserRound size={12} /> Author
                                    </p>
                                    <p className="text-sm font-black text-gray-900 mt-1">{creatorName}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Students Recently Submitted</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">
                                        {submittedAttempts.length} submissions
                                    </Badge>
                                    <Link to={`/manage-exams/${exam.id}/submissions`}>
                                        <Button variant="outline" className="h-8 rounded-lg border-gray-200 text-[10px] font-black uppercase tracking-widest">
                                            View All Submissions
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {recentSubmitters.length === 0 ? (
                                <p className="text-sm font-semibold text-gray-500">No submitted attempts yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {recentSubmitters.map((student) => (
                                        <div key={student.id} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={getAvatarUrl(student.name, student.profilePicture)} alt={student.name} />
                                                <AvatarFallback className="font-black text-xs">{getAvatarFallback(student.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 truncate">{student.name}</p>
                                                <p className="text-xs text-gray-500 font-medium truncate">{student.email}</p>
                                                <p className="text-[11px] text-gray-500 font-semibold truncate">
                                                    {student.programTrack || 'N/A'} • {formatDate(student.submittedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <section className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">All Questions and Answers</h3>

                        {questions.length === 0 ? (
                            <Card className="rounded-lg border-gray-100 bg-white">
                                <CardContent className="p-4 text-xs font-semibold text-gray-500">
                                    This mock exam has no questions yet.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const options = [
                                        { key: 'A', value: question.choiceA },
                                        { key: 'B', value: question.choiceB },
                                        { key: 'C', value: question.choiceC },
                                        { key: 'D', value: question.choiceD },
                                    ].filter((option) => Boolean(option.value));

                                    const sectionTitle = question.section?.title
                                        || exam.sections?.find((section) => section.id === question.sectionId)?.title
                                        || 'General Section';

                                    return (
                                        <Card key={question.id} className="rounded-lg border-gray-100 bg-white">
                                            <CardContent className="p-5 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        Question {index + 1} • {sectionTitle}
                                                    </p>
                                                    <p className="text-sm md:text-base font-bold text-gray-900 mt-1 leading-relaxed">
                                                        {question.questionText || 'No question text available.'}
                                                    </p>
                                                </div>

                                                {question.imageUrl ? (
                                                    <img
                                                        src={question.imageUrl}
                                                        alt={`Question ${index + 1}`}
                                                        className="w-full max-h-72 object-contain rounded-xl border border-gray-100 bg-gray-50"
                                                    />
                                                ) : null}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {options.map((option) => {
                                                        const isCorrect = option.key === (question.correctChoice || '').toUpperCase();
                                                        return (
                                                            <div
                                                                key={`${question.id}-${option.key}`}
                                                                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                                                    isCorrect
                                                                        ? 'border-green-200 bg-green-50 text-green-800'
                                                                        : 'border-gray-200 bg-white text-gray-700'
                                                                }`}
                                                            >
                                                                <span className="font-black mr-1.5">{option.key}.</span>
                                                                {option.value}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-xs text-gray-600 font-medium leading-relaxed">
                                                    <span className="font-black text-gray-800">Rationalization: </span>
                                                    {question.rationalization || 'No explanation provided.'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <Card className="rounded-lg border-gray-100 bg-white">
                        <CardContent className="p-3 flex items-center justify-end">
                            <Link to={`/manage-exams/${exam.id}/edit`}>
                                <Button className="h-8 rounded-md bg-primary hover:bg-primary/95 text-white font-semibold text-xs gap-1.5">
                                    <FileText size={13} /> Manage Exam
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default ManageExamViewPage;
