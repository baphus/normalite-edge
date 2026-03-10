import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Activity,
    ArrowLeft,
    ArrowUpDown,
    BarChart3,
    Download,
    FileText,
    FileQuestion,
    Grid,
    Search,
    Trophy,
    Users,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    score?: number | null;
    percentage?: number | null;
    attemptNo?: number;
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

interface SubmissionAnalytics {
    examStatus: {
        status: string;
        canStudentsSubmit: boolean;
        message: string;
        scheduleEnd?: string | null;
        closeOnDeadline?: boolean;
    };
    submissionStats: {
        submittedCount: number;
        averageCompletionSeconds: number;
        slowestQuestion: {
            questionId: string;
            orderNo: number;
            questionText: string;
            averageAnswerSeconds?: number | null;
            section?: string | null;
        } | null;
    };
    questionStats: Array<{
        questionId: string;
        orderNo: number;
        section?: string | null;
        questionText: string;
        rightCount: number;
        wrongCount: number;
        unansweredCount: number;
        answeredCount: number;
        averageAnswerSeconds?: number | null;
    }>;
}

type QuestionSortMode = 'hardest' | 'slowest' | 'original';

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

const formatPercent = (value?: number | null) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0.00%';
    return `${numeric.toFixed(2)}%`;
};

const formatDuration = (seconds?: number | null) => {
    const numeric = Math.max(0, Math.round(Number(seconds || 0)));
    if (!numeric) return 'N/A';

    const hours = Math.floor(numeric / 3600);
    const minutes = Math.floor((numeric % 3600) / 60);
    const remainingSeconds = numeric % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
};

const formatCompactNumber = (value?: number | null) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
};

const truncateQuestion = (value?: string, maxLength = 110) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Question unavailable';
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const escapeCsvValue = (value: string | number | null | undefined) => {
    const normalized = String(value ?? '');
    if (!/[",\n]/.test(normalized)) return normalized;
    return `"${normalized.replace(/"/g, '""')}"`;
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
    const [submissionAnalytics, setSubmissionAnalytics] = useState<SubmissionAnalytics | null>(null);
    const [search, setSearch] = useState('');
    const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
    const [questionSortMode, setQuestionSortMode] = useState<QuestionSortMode>('hardest');
    const [selectedSection, setSelectedSection] = useState('ALL');

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
                const [examResponse, attemptsResponse, analyticsResponse] = await Promise.all([
                    api.get(`/exams/${id}?questions=true`),
                    api.get('/attempts', { params: { examId: id, page: 1, limit: 500 } }),
                    api.get(`/exams/${id}/submission-analytics`),
                ]);

                setExam((examResponse.data?.data || null) as ExamDetails | null);
                setAttempts((attemptsResponse.data?.data || []) as AttemptItem[]);
                setSubmissionAnalytics((analyticsResponse.data?.data || null) as SubmissionAnalytics | null);
            } catch (loadErr) {
                console.error('Failed to load exam details page', loadErr);
                setError('Unable to load exam details right now.');
                setExam(null);
                setAttempts([]);
                setSubmissionAnalytics(null);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const questionCount = Math.max(Number(exam?.questionCount || exam?.totalItems || 0), 0);
    const canEditExam = useMemo(() => {
        if (!exam) return false;
        if (exam.status === 'LIVE' || exam.status === 'PUBLISHED') return false;
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

    const allAttemptsSorted = useMemo(() => {
        return attempts
            .slice()
            .sort((first, second) => {
                const left = new Date(first.submittedAt || first.startedAt || 0).getTime();
                const right = new Date(second.submittedAt || second.startedAt || 0).getTime();
                return right - left;
            });
    }, [attempts]);

    const filteredAttempts = useMemo(() => {
        const term = search.trim().toLowerCase();
        return allAttemptsSorted.filter((attempt) => {
            const name = attempt.user?.name?.toLowerCase() || '';
            const email = attempt.user?.email?.toLowerCase() || '';
            const track = attempt.user?.programTrack?.toLowerCase() || '';
            
            const matchesSearch = !term || name.includes(term) || email.includes(term) || track.includes(term);
            const matchesProgram = selectedProgramFilter === 'ALL' || attempt.user?.programTrack === selectedProgramFilter;
            
            return matchesSearch && matchesProgram;
        });
    }, [allAttemptsSorted, search, selectedProgramFilter]);

    const programOptions = useMemo(() => {
        const specs = new Set<string>();
        allAttemptsSorted.forEach((a) => {
            if (a.user?.programTrack) specs.add(a.user.programTrack);
        });
        return Array.from(specs).sort();
    }, [allAttemptsSorted]);

    const attemptSummary = useMemo(() => {
        const total = attempts.length;
        const submitted = submittedAttempts.length;
        const inProgress = attempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length;
        const uniqueStudents = new Set(
            attempts
                .map((attempt) => attempt.user?.id)
                .filter((userId): userId is string => Boolean(userId))
        ).size;

        const scores = submittedAttempts.map((attempt) => Number(attempt.percentage || 0));
        const averageScore = scores.length > 0
            ? scores.reduce((sum, value) => sum + value, 0) / scores.length
            : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
            total,
            submitted,
            inProgress,
            uniqueStudents,
            averageScore,
            highestScore,
            lowestScore,
        };
    }, [attempts, submittedAttempts]);

    const scoreDistribution = useMemo(() => {
        const bins = [
            { label: '0-49', min: 0, max: 49.99, count: 0 },
            { label: '50-59', min: 50, max: 59.99, count: 0 },
            { label: '60-69', min: 60, max: 69.99, count: 0 },
            { label: '70-79', min: 70, max: 79.99, count: 0 },
            { label: '80-89', min: 80, max: 89.99, count: 0 },
            { label: '90-100', min: 90, max: 100, count: 0 },
        ];

        for (const attempt of submittedAttempts) {
            const score = Number(attempt.percentage || 0);
            const bin = bins.find((item) => score >= item.min && score <= item.max);
            if (bin) bin.count += 1;
        }

        const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

        return bins.map((bin) => ({
            ...bin,
            width: Math.max((bin.count / maxCount) * 100, bin.count > 0 ? 8 : 0),
        }));
    }, [submittedAttempts]);

    const submissionStatus = submissionAnalytics?.examStatus;
    const questionStats = submissionAnalytics?.questionStats || [];

    const enrichedQuestionStats = useMemo(() => {
        return questionStats
            .map((question) => {
                const attemptedCount = question.rightCount + question.wrongCount;
                const totalResponses = question.rightCount + question.wrongCount + question.unansweredCount;
                const wrongRate = attemptedCount > 0 ? (question.wrongCount / attemptedCount) * 100 : 0;
                const correctRate = attemptedCount > 0 ? (question.rightCount / attemptedCount) * 100 : 0;
                const unansweredRate = totalResponses > 0 ? (question.unansweredCount / totalResponses) * 100 : 0;

                return {
                    ...question,
                    attemptedCount,
                    totalResponses,
                    wrongRate,
                    correctRate,
                    unansweredRate,
                };
            });
    }, [questionStats]);

    const rankedQuestionStats = useMemo(() => {
        return enrichedQuestionStats.slice().sort((left, right) => {
            const rightHasAnswers = right.attemptedCount > 0 ? 1 : 0;
            const leftHasAnswers = left.attemptedCount > 0 ? 1 : 0;
            if (rightHasAnswers !== leftHasAnswers) {
                return rightHasAnswers - leftHasAnswers;
            }
            if (right.wrongRate !== left.wrongRate) {
                return right.wrongRate - left.wrongRate;
            }
            if (right.wrongCount !== left.wrongCount) {
                return right.wrongCount - left.wrongCount;
            }
            if (right.attemptedCount !== left.attemptedCount) {
                return right.attemptedCount - left.attemptedCount;
            }
            if (left.correctRate !== right.correctRate) {
                return left.correctRate - right.correctRate;
            }
            return left.orderNo - right.orderNo;
        });
    }, [enrichedQuestionStats]);

    const questionAnalyticsRows = useMemo(() => {
        if (questionSortMode === 'original') {
            return enrichedQuestionStats.slice().sort((left, right) => left.orderNo - right.orderNo);
        }

        if (questionSortMode === 'slowest') {
            return enrichedQuestionStats.slice().sort((left, right) => {
                const rightTime = typeof right.averageAnswerSeconds === 'number' ? right.averageAnswerSeconds : -1;
                const leftTime = typeof left.averageAnswerSeconds === 'number' ? left.averageAnswerSeconds : -1;
                if (rightTime !== leftTime) {
                    return rightTime - leftTime;
                }
                const rightHasAnswers = right.attemptedCount > 0 ? 1 : 0;
                const leftHasAnswers = left.attemptedCount > 0 ? 1 : 0;
                if (rightHasAnswers !== leftHasAnswers) {
                    return rightHasAnswers - leftHasAnswers;
                }
                if (right.wrongRate !== left.wrongRate) {
                    return right.wrongRate - left.wrongRate;
                }
                if (right.wrongCount !== left.wrongCount) {
                    return right.wrongCount - left.wrongCount;
                }
                if (right.attemptedCount !== left.attemptedCount) {
                    return right.attemptedCount - left.attemptedCount;
                }
                if (left.correctRate !== right.correctRate) {
                    return left.correctRate - right.correctRate;
                }
                return left.orderNo - right.orderNo;
            });
        }

        return rankedQuestionStats;
    }, [enrichedQuestionStats, questionSortMode, rankedQuestionStats]);

    const topPrograms = useMemo(() => {
        const mapped = new Map<string, { count: number; scoreTotal: number }>();

        for (const attempt of submittedAttempts) {
            const program = attempt.user?.programTrack?.trim() || 'Unspecified';
            const score = Number(attempt.percentage || 0);
            const current = mapped.get(program) || { count: 0, scoreTotal: 0 };
            current.count += 1;
            current.scoreTotal += score;
            mapped.set(program, current);
        }

        return Array.from(mapped.entries())
            .map(([program, stats]) => ({
                program,
                count: stats.count,
                averageScore: stats.count > 0 ? stats.scoreTotal / stats.count : 0,
            }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 5);
    }, [submittedAttempts]);

    const handleExportQuestionAnalytics = () => {
        if (questionAnalyticsRows.length === 0) {
            return;
        }

        const header = [
            'Question No',
            'Section',
            'Question Text',
            'Right Count',
            'Wrong Count',
            'Unanswered Count',
            'Right Rate %',
            'Wrong Rate %',
            'Unanswered Rate %',
            'Average Answer Time',
        ];

        const rows = questionAnalyticsRows.map((question) => [
            question.orderNo,
            question.section || '',
            question.questionText,
            question.rightCount,
            question.wrongCount,
            question.unansweredCount,
            question.correctRate.toFixed(2),
            question.wrongRate.toFixed(2),
            question.unansweredRate.toFixed(2),
            formatDuration(question.averageAnswerSeconds),
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (exam?.title || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        link.href = downloadUrl;
        link.download = `${safeTitle || 'exam'}-question-analytics-${questionSortMode}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setTextColor(128, 0, 0); // Primary color
        doc.text(`Exam Analytics: ${exam?.title || 'Untitled Exam'}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);
        doc.text(`Total Attempts: ${attemptSummary.total}`, 14, 32);
        doc.text(`Average Score: ${formatPercent(attemptSummary.averageScore)}`, 14, 38);
        doc.text(`Highest Score: ${formatPercent(attemptSummary.highestScore)}`, 14, 44);
        doc.text(`Lowest Score: ${formatPercent(attemptSummary.lowestScore)}`, 14, 50);

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Student Submissions Details', 14, 62);

        const tableColumn = ["Student", "Program", "Score", "Percentage", "Status", "Date"];
        const tableRows = allAttemptsSorted.map(attempt => [
            attempt.user?.name || 'Unknown User',
            attempt.user?.programTrack || 'N/A',
            attempt.status === 'SUBMITTED' ? `${Number(attempt.score || 0)}/${questionCount}` : '-',
            attempt.status === 'SUBMITTED' ? formatPercent(attempt.percentage) : '-',
            attempt.status,
            formatDate(attempt.submittedAt || attempt.startedAt)
        ]);

        autoTable(doc, {
            startY: 66,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [128, 0, 0] },
            styles: { fontSize: 9 },
        });

        const safeTitle = (exam?.title || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        doc.save(`${safeTitle}-analytics.pdf`);
    };

    const questions = useMemo(() => {
        return (exam?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0));
    }, [exam]);

    const questionsWithSection = useMemo(() => {
        return questions.map((question, index) => {
            const sectionTitle = question.section?.title
                || exam?.sections?.find((section) => section.id === question.sectionId)?.title
                || 'Full Exam';

            return {
                question,
                globalQuestionNo: index + 1,
                sectionTitle,
            };
        });
    }, [questions, exam?.sections]);

    const availableSections = useMemo(() => {
        const fromExam = (exam?.sections || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0))
            .map((section) => section.title?.trim())
            .filter((section): section is string => Boolean(section));

        const fromQuestions = Array.from(new Set(
            questionsWithSection
                .map((entry) => entry.sectionTitle?.trim())
                .filter((section): section is string => Boolean(section))
        ));

        const merged = Array.from(new Set([...fromExam, ...fromQuestions]));
        return ['ALL', ...merged];
    }, [exam?.sections, questionsWithSection]);

    const visibleQuestions = useMemo(() => {
        if (selectedSection === 'ALL') return questionsWithSection;
        return questionsWithSection.filter((entry) => entry.sectionTitle === selectedSection);
    }, [questionsWithSection, selectedSection]);

    useEffect(() => {
        if (!availableSections.includes(selectedSection)) {
            setSelectedSection('ALL');
        }
    }, [availableSections, selectedSection]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8f5f5] min-h-screen p-8 font-lexend">
                <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm text-sm font-semibold text-slate-500">
                    Loading exam details...
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8f5f5] min-h-screen font-lexend">
            {/* Header */}
            <header className="bg-white border-b border-primary/10 sticky top-0 z-10 px-8 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                            <Link to="/manage-exams" className="hover:text-primary transition-colors flex items-center gap-1">
                                <ArrowLeft size={12} /> Dashboard
                            </Link>
                            <span className="text-xs text-slate-300">/</span>
                            <span className="text-primary">{exam?.category || 'Exam Details'}</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="text-primary" size={24} />
                            Exam Results Analytics: {exam?.title || 'Untitled Exam'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleExportPDF}
                            className="bg-white text-slate-700 border border-primary/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-shadow shadow-sm h-10"
                        >
                            <Download size={16} />
                            Export PDF
                        </Button>
                        {exam && canEditExam && (
                            <Link to={`/manage-exams/${exam.id}/edit`}>
                                <Button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-shadow shadow-sm h-10">
                                    <FileText size={16} />
                                    Edit Exam
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {error ? (
                <div className="p-8">
                    <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm text-red-700 font-semibold flex items-center justify-between">
                        {error}
                        <Button variant="outline" size="sm" onClick={() => navigate('/manage-exams')} className="border-red-200 text-red-700 hover:bg-red-50">
                            Back to Exams
                        </Button>
                    </div>
                </div>
            ) : !exam ? (
                <div className="p-8">
                    <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm text-sm font-semibold text-slate-500">
                        Exam not found.
                    </div>
                </div>
            ) : (
                <div className="p-8 space-y-8">
                    {/* Exam Metadata summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Status</p>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                exam.status === 'LIVE' || exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' :
                                exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' :
                                exam.status === 'CLOSED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                                {exam.status || 'UNKNOWN'}
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Questions</p>
                            <p className="font-bold text-slate-900">{questionCount}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Duration</p>
                            <p className="font-bold text-slate-900">{Number(exam.timeLimit || exam.duration || 0)} min</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Deadline</p>
                            <p className="font-bold text-slate-900">{formatDate(submissionStatus?.scheduleEnd || exam.deadline || exam.scheduledDate)}</p>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Submissions</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-black text-slate-900">{formatCompactNumber(attemptSummary.submitted)}</h3>
                                <span className="flex items-center text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                    {formatCompactNumber(attemptSummary.total)} Total Attempts
                                </span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Average Score</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-black text-slate-900">{formatPercent(attemptSummary.averageScore)}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Highest Score</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-black text-slate-900">{formatPercent(attemptSummary.highestScore)}</h3>
                                <span className="flex items-center text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                    <Trophy size={12} className="mr-1" /> Top
                                </span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#D4AF37]">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Lowest Score</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-black text-slate-900">{formatPercent(attemptSummary.lowestScore)}</h3>
                                <span className="flex items-center text-rose-600 text-[10px] font-bold bg-rose-50 px-2 py-1 rounded-full">
                                    Alert
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Score Distribution */}
                        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="text-primary" size={20} />
                                    Score Distribution (%)
                                </h4>
                                <div className="flex gap-2 items-center">
                                    <span className="w-3 h-3 bg-primary rounded-sm"></span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Students Count</span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between h-48 gap-2 px-4">
                                {scoreDistribution.map((bin, i) => (
                                    <div key={bin.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                        <div 
                                            className={`w-full ${i % 2 === 0 ? 'bg-primary/80' : 'bg-primary/40'} rounded-t-lg group relative transition-all`} 
                                            style={{ height: `${Math.max(bin.width, 4)}%`, opacity: bin.width > 0 ? 1 : 0.2 }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {bin.count}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{bin.label}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Programs Performance */}
                        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Activity className="text-primary" size={20} />
                                    Top Programs Performance
                                </h4>
                            </div>
                            <div className="space-y-4">
                                {topPrograms.length === 0 ? (
                                    <p className="text-sm text-slate-500 font-medium">No program data available yet.</p>
                                ) : (
                                    topPrograms.map((program, index) => (
                                        <div key={program.program}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-medium text-slate-700">{program.program}</span>
                                                <span className="font-bold text-primary">{formatPercent(program.averageScore)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${index % 2 === 0 ? 'bg-primary' : 'bg-[#D4AF37]'}`} 
                                                    style={{ width: `${Math.min(program.averageScore, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Student Submissions Table */}
                    <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="text-primary" size={20} />
                                Detailed Student Submissions
                            </h4>
                            <div className="flex flex-wrap items-center gap-3">
                                <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                                    <SelectTrigger className="bg-slate-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm w-full md:w-44 h-10">
                                        <SelectValue placeholder="All Programs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Programs</SelectItem>
                                        {programOptions.map(prog => (
                                            <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="relative group flex-1 md:flex-none">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search students..."
                                        className="pl-10 bg-slate-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm w-full md:w-64 transition-all h-10"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-primary/10">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Program</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Score</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Percentage</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Submission Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/5">
                                    {filteredAttempts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-sm font-semibold text-slate-500">
                                                No attempts found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAttempts.map((attempt) => {
                                            const studentName = attempt.user?.name?.trim() || 'Unknown User';
                                            const studentEmail = attempt.user?.email?.trim() || 'No email';
                                            
                                            return (
                                                <tr key={attempt.id} className="hover:bg-primary/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 rounded-full bg-slate-200 border border-slate-200">
                                                                <AvatarImage src={getAvatarUrl(studentName, attempt.user?.profilePicture)} alt={studentName} />
                                                                <AvatarFallback className="text-[10px] font-black text-slate-500">{getAvatarFallback(studentName)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <span className="block font-bold text-slate-900">{studentName}</span>
                                                                <span className="block text-xs text-slate-500">{studentEmail}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{attempt.user?.programTrack || 'N/A'}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">
                                                        {attempt.status === 'SUBMITTED' ? `${Number(attempt.score || 0)}/${questionCount}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {attempt.status === 'SUBMITTED' ? (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                                                {formatPercent(attempt.percentage)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            attempt.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {attempt.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {formatDate(attempt.submittedAt || attempt.startedAt)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-primary/10 bg-slate-50 flex justify-between items-center text-xs text-slate-500 font-medium">
                            <span>Showing {filteredAttempts.length} of {attempts.length} results</span>
                        </div>
                    </div>

                    {/* Question Analytics */}
                    <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <FileQuestion className="text-primary" size={20} />
                                Question Analytics
                            </h4>
                            <div className="flex items-center gap-3">
                                <Select value={questionSortMode} onValueChange={(value) => setQuestionSortMode(value as QuestionSortMode)}>
                                    <SelectTrigger className="bg-slate-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm w-44 h-10">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpDown size={14} />
                                            <SelectValue placeholder="Sort questions" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hardest">Hardest first</SelectItem>
                                        <SelectItem value="slowest">Slowest first</SelectItem>
                                        <SelectItem value="original">Original order</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleExportQuestionAnalytics}
                                    disabled={questionAnalyticsRows.length === 0}
                                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 shadow-sm h-10"
                                >
                                    <Download size={16} /> Export
                                </Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto p-0">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-primary/10">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-1/2">Question</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Outcome Mix</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Right</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Wrong</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/5">
                                    {questionAnalyticsRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-sm font-semibold text-slate-500">
                                                No submitted question analytics yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        questionAnalyticsRows.map((question) => (
                                            <tr key={question.questionId} className="hover:bg-primary/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-primary mb-1">Q{question.orderNo} {question.section ? `• ${question.section}` : ''}</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{truncateQuestion(question.questionText, 120)}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-full max-w-[200px] space-y-1.5">
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                                            <div className="bg-emerald-500 h-full" style={{ width: `${question.correctRate}%` }}></div>
                                                            <div className="bg-rose-500 h-full" style={{ width: `${question.wrongRate}%` }}></div>
                                                            <div className="bg-amber-400 h-full" style={{ width: `${question.unansweredRate}%` }}></div>
                                                        </div>
                                                        <div className="flex gap-2 text-[10px] font-bold">
                                                            <span className="text-emerald-700">{question.correctRate.toFixed(0)}% R</span>
                                                            <span className="text-rose-700">{question.wrongRate.toFixed(0)}% W</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-emerald-700">{question.rightCount}</td>
                                                <td className="px-6 py-4 text-center font-bold text-rose-700">{question.wrongCount}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-600">{formatDuration(question.averageAnswerSeconds)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* All Questions Review */}
                    <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Grid className="text-primary" size={20} />
                                Questions Review
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {availableSections.map((section) => (
                                    <Button
                                        key={section}
                                        type="button"
                                        variant={selectedSection === section ? 'default' : 'outline'}
                                        className={`h-8 rounded-lg text-xs font-bold ${
                                            selectedSection === section ? 'bg-primary text-white' : 'border border-primary/10 text-slate-600 hover:bg-slate-50'
                                        }`}
                                        onClick={() => setSelectedSection(section)}
                                    >
                                        {section === 'ALL' ? 'All Sections' : section}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {visibleQuestions.length === 0 ? (
                                <p className="text-sm font-semibold text-slate-500 text-center py-8">No questions to display.</p>
                            ) : (
                                visibleQuestions.map(({ question, sectionTitle, globalQuestionNo }) => {
                                    const options = [
                                        { key: 'A', value: question.choiceA },
                                        { key: 'B', value: question.choiceB },
                                        { key: 'C', value: question.choiceC },
                                        { key: 'D', value: question.choiceD },
                                    ].filter((option) => Boolean(option.value));

                                    return (
                                        <div key={question.id} className="p-5 rounded-xl border border-primary/10 bg-slate-50/50">
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                                                Question {globalQuestionNo} • {sectionTitle}
                                            </p>
                                            <p className="text-sm md:text-base font-bold text-slate-900 mb-4 leading-relaxed">
                                                {question.questionText || 'No question text available.'}
                                            </p>

                                            {question.imageUrl && (
                                                <img
                                                    src={question.imageUrl}
                                                    alt={`Question ${globalQuestionNo}`}
                                                    className="w-full max-w-lg mb-4 rounded-lg border border-slate-200"
                                                />
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {options.map((option) => {
                                                    const isCorrect = option.key === (question.correctChoice || '').toUpperCase();
                                                    return (
                                                        <div
                                                            key={`${question.id}-${option.key}`}
                                                            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                                                                isCorrect
                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm'
                                                                    : 'border-slate-200 bg-white text-slate-700'
                                                            }`}
                                                        >
                                                            <span className="font-bold mr-2 text-slate-400">{option.key}.</span>
                                                            {option.value}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {question.rationalization && (
                                                <div className="rounded-lg bg-white border border-slate-100 p-4 text-sm text-slate-600 leading-relaxed shadow-sm">
                                                    <span className="font-bold text-slate-900 block mb-1">Rationalization</span>
                                                    {question.rationalization}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageExamViewPage;
