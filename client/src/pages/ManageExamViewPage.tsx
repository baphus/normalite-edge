import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Activity,
    ArrowLeft,
    ArrowUpDown,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Clock3,
    Download,
    FileText,
    FileQuestion,
    Grid,
    Layers,
    Search,
    ShieldCheck,
    Trophy,
    UserRound,
    Users,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    const [questionSortMode, setQuestionSortMode] = useState<QuestionSortMode>('hardest');
    const [selectedSection, setSelectedSection] = useState('ALL');
    const [questionViewMode, setQuestionViewMode] = useState<'cards' | 'list'>('cards');

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

        if (sectionTitles.length === 0) return 'Full Exam';
        return sectionTitles.join(', ');
    }, [exam]);

    const creatorName = useMemo(() => {
        if (!exam?.creator) return 'Unknown author';
        if (user?.role === 'REVIEWER' && exam.creator.id === user?.id) return 'You';
        return exam.creator.name
            || `${exam.creator.firstName || ''} ${exam.creator.lastName || ''}`.trim()
            || 'Unknown author';
    }, [exam, user?.id, user?.role]);

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
        if (!term) return allAttemptsSorted;

        return allAttemptsSorted.filter((attempt) => {
            const name = attempt.user?.name?.toLowerCase() || '';
            const email = attempt.user?.email?.toLowerCase() || '';
            const track = attempt.user?.programTrack?.toLowerCase() || '';
            return name.includes(term) || email.includes(term) || track.includes(term);
        });
    }, [allAttemptsSorted, search]);

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

    const submissionsByDay = useMemo(() => {
        const labels = Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            date.setHours(0, 0, 0, 0);
            return date;
        });

        const values = labels.map((date) => {
            const next = new Date(date);
            next.setDate(next.getDate() + 1);
            const count = submittedAttempts.filter((attempt) => {
                const when = new Date(attempt.submittedAt || attempt.startedAt || 0);
                return when >= date && when < next;
            }).length;

            return {
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
            };
        });

        const maxCount = Math.max(...values.map((value) => value.count), 1);
        return values.map((value) => ({
            ...value,
            height: Math.max((value.count / maxCount) * 100, value.count > 0 ? 10 : 0),
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

    const hardestQuestion = rankedQuestionStats.find((question) => question.attemptedCount > 0) || null;

    const submissionBreakdown = useMemo(() => {
        const total = attempts.length || 1;
        const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED').length;
        const inProgress = attempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length;
        const other = Math.max(attempts.length - submitted - inProgress, 0);

        return {
            submitted,
            inProgress,
            other,
            submittedPercent: (submitted / total) * 100,
            inProgressPercent: (inProgress / total) * 100,
            otherPercent: (other / total) * 100,
        };
    }, [attempts]);

    const passFailBreakdown = useMemo(() => {
        const passMark = 75;
        const submitted = submittedAttempts;
        const passed = submitted.filter((attempt) => Number(attempt.percentage || 0) >= passMark).length;
        const failed = Math.max(submitted.length - passed, 0);
        const base = submitted.length || 1;

        return {
            passMark,
            passed,
            failed,
            passedPercent: (passed / base) * 100,
            failedPercent: (failed / base) * 100,
        };
    }, [submittedAttempts]);

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

    const topPerformers = useMemo(() => {
        return submittedAttempts
            .slice()
            .sort((left, right) => {
                const rightScore = Number(right.percentage || 0);
                const leftScore = Number(left.percentage || 0);
                if (rightScore !== leftScore) return rightScore - leftScore;
                const rightTime = new Date(right.submittedAt || right.startedAt || 0).getTime();
                const leftTime = new Date(left.submittedAt || left.startedAt || 0).getTime();
                return rightTime - leftTime;
            })
            .slice(0, 5);
    }, [submittedAttempts]);

    const submissionTrendSparkline = useMemo(() => {
        if (submissionsByDay.length === 0) return '';

        const width = 220;
        const height = 56;
        const maxCount = Math.max(...submissionsByDay.map((day) => day.count), 1);
        const stepX = submissionsByDay.length > 1 ? width / (submissionsByDay.length - 1) : width;

        const points = submissionsByDay.map((day, index) => {
            const x = Math.round(index * stepX * 10) / 10;
            const y = Math.round((height - ((day.count / maxCount) * (height - 8) + 4)) * 10) / 10;
            return `${x},${y}`;
        });

        return points.join(' ');
    }, [submissionsByDay]);

    const questionDifficultySnapshot = useMemo(() => {
        return rankedQuestionStats.slice(0, 5);
    }, [rankedQuestionStats]);

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

                    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <CardContent className="p-4 md:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Submissions + Details Unified Dashboard</span>
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Exam ID: {exam.id}</span>
                                    </div>
                                    <h2 className="text-lg font-black tracking-tight text-gray-900">{exam.title || 'Mock Exam'} Performance</h2>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1">
                                            <UserRound size={12} /> Author: {creatorName}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1">
                                            <FileQuestion size={12} /> {questionCount} questions
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1">
                                            <Clock3 size={12} /> {Number(exam.timeLimit || exam.duration || 0)} min
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1">
                                            <Calendar size={12} /> Deadline: {submissionStatus?.scheduleEnd ? formatDate(submissionStatus.scheduleEnd) : formatDate(exam.deadline || exam.scheduledDate)}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Attempts</p>
                                        <p className="mt-1 text-xl font-black text-gray-900">{formatCompactNumber(attemptSummary.total)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Students</p>
                                        <p className="mt-1 text-xl font-black text-gray-900">{formatCompactNumber(attemptSummary.uniqueStudents)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Avg Score</p>
                                        <p className="mt-1 text-xl font-black text-gray-900">{formatPercent(attemptSummary.averageScore)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Best</p>
                                        <p className="mt-1 text-xl font-black text-emerald-700">{formatPercent(attemptSummary.highestScore)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lowest</p>
                                        <p className="mt-1 text-xl font-black text-rose-700">{formatPercent(attemptSummary.lowestScore)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Submitted</p>
                                        <p className="mt-1 text-xl font-black text-gray-900">{formatCompactNumber(attemptSummary.submitted)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr,1fr,1fr]">
                        <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <CardContent className="space-y-4 p-4 md:p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900">
                                        <Activity size={13} /> Submission Health
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-black uppercase tracking-widest ${submissionStatus?.canStudentsSubmit ? 'border-emerald-300 text-emerald-700' : 'border-rose-300 text-rose-700'}`}
                                    >
                                        {submissionStatus?.canStudentsSubmit ? 'Open' : 'Closed'}
                                    </Badge>
                                </div>
                                <p className="text-xs font-semibold text-gray-600">
                                    {submissionStatus?.message || 'Submission availability is currently unavailable.'}
                                </p>

                                <div className="space-y-2.5">
                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-gray-600">
                                            <span>Status Mix</span>
                                            <span>{attemptSummary.total} attempts</span>
                                        </div>
                                        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                                            <div className="bg-emerald-500" style={{ width: `${submissionBreakdown.submittedPercent}%` }} />
                                            <div className="bg-amber-500" style={{ width: `${submissionBreakdown.inProgressPercent}%` }} />
                                            <div className="bg-slate-400" style={{ width: `${submissionBreakdown.otherPercent}%` }} />
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-emerald-700">Submitted {submissionBreakdown.submitted}</span>
                                            <span className="text-amber-700">In Progress {submissionBreakdown.inProgress}</span>
                                            <span className="text-slate-600">Other {submissionBreakdown.other}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-gray-600">
                                            <span>Pass vs Fail (Pass Mark {passFailBreakdown.passMark}%)</span>
                                            <span>{attemptSummary.submitted} submitted</span>
                                        </div>
                                        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                                            <div className="bg-sky-600" style={{ width: `${passFailBreakdown.passedPercent}%` }} />
                                            <div className="bg-rose-500" style={{ width: `${passFailBreakdown.failedPercent}%` }} />
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-sky-700">Passed {passFailBreakdown.passed}</span>
                                            <span className="text-rose-700">Failed {passFailBreakdown.failed}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">7-Day Submission Velocity</p>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Trendline</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <svg width="220" height="56" viewBox="0 0 220 56" className="block">
                                            <polyline fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={submissionTrendSparkline} />
                                        </svg>
                                    </div>
                                    <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-widest text-gray-500">
                                        {submissionsByDay.map((day) => (
                                            <span key={day.label}>{day.label.split(' ')[0]}</span>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <CardContent className="space-y-4 p-4 md:p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900">
                                        <BarChart3 size={13} /> Score Bands
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">Submitted</Badge>
                                </div>
                                <div className="space-y-2">
                                    {scoreDistribution.map((bin) => (
                                        <div key={bin.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                                                <span>{bin.label}%</span>
                                                <span>{bin.count}</span>
                                            </div>
                                            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${bin.width}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Top Programs by Submissions</p>
                                    <div className="mt-2 space-y-1.5">
                                        {topPrograms.length === 0 ? (
                                            <p className="text-xs font-semibold text-gray-500">No submitted program data yet.</p>
                                        ) : (
                                            topPrograms.map((program) => (
                                                <div key={program.program} className="flex items-center justify-between gap-2 text-[11px]">
                                                    <p className="truncate font-semibold text-gray-700">{program.program}</p>
                                                    <p className="shrink-0 font-black text-gray-900">{program.count} ({formatPercent(program.averageScore)})</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <CardContent className="space-y-4 p-4 md:p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900">
                                        <Trophy size={13} /> Top Performers
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">Live</Badge>
                                </div>
                                <div className="space-y-2">
                                    {topPerformers.length === 0 ? (
                                        <p className="text-xs font-semibold text-gray-500">No submitted attempts yet.</p>
                                    ) : (
                                        topPerformers.map((attempt, index) => {
                                            const name = attempt.user?.name?.trim() || 'Unknown User';
                                            return (
                                                <div key={attempt.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-black text-gray-900">#{index + 1} {name}</p>
                                                        <p className="truncate text-[11px] font-semibold text-gray-500">Attempt {attempt.attemptNo ?? 'N/A'}</p>
                                                    </div>
                                                    <p className="shrink-0 text-sm font-black text-emerald-700">{formatPercent(attempt.percentage)}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Exam Owner</p>
                                        <ShieldCheck size={12} className="text-gray-500" />
                                    </div>
                                    <div className="mt-2 flex items-center gap-2.5">
                                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white">
                                            {getAvatarFallback(creatorName)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900">{creatorName}</p>
                                            <p className="text-[11px] font-semibold text-gray-500">{canEditExam ? 'Can manage this exam' : 'Read-only permissions'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hardest Questions (Answered Attempts)</p>
                                    <div className="mt-2 space-y-1.5">
                                        {questionDifficultySnapshot.length === 0 ? (
                                            <p className="text-xs font-semibold text-gray-500">No question analytics yet.</p>
                                        ) : (
                                            questionDifficultySnapshot.map((question) => (
                                                <div key={question.questionId} className="space-y-1">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-black text-gray-700">Q{question.orderNo}</span>
                                                        <span className="font-black text-rose-700">{question.wrongRate.toFixed(0)}% wrong of answered</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                        <div className="h-full bg-rose-500" style={{ width: `${Math.min(question.wrongRate, 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <CardContent className="p-4 md:p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-900"><Users size={13} /> Student Submission Details</h3>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search student, email, track"
                                        className="h-8 rounded-md pl-8 border-gray-200 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mb-4">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Exam Status</p><p className="text-sm font-black text-gray-900 mt-1">{submissionStatus?.canStudentsSubmit ? 'Open' : 'Closed'}</p></div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Author</p><p className="text-sm font-black text-gray-900 mt-1 truncate">{creatorName}</p></div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Questions</p><p className="text-sm font-black text-gray-900 mt-1">{questionCount}</p></div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duration</p><p className="text-sm font-black text-gray-900 mt-1">{Number(exam.timeLimit || exam.duration || 0)} min</p></div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="min-w-full text-sm">
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Student</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Program</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Attempt #</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Score</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Raw</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAttempts.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-6 text-center text-sm font-semibold text-gray-500">
                                                    No attempts found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAttempts.map((attempt) => {
                                                const studentName = attempt.user?.name?.trim() || 'Unknown User';
                                                const studentEmail = attempt.user?.email?.trim() || 'No email';
                                                const studentProgram = attempt.user?.programTrack?.trim() || 'N/A';

                                                return (
                                                    <tr key={attempt.id} className="border-b border-gray-100 last:border-none">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={getAvatarUrl(studentName, attempt.user?.profilePicture)} alt={studentName} />
                                                                    <AvatarFallback className="text-[10px] font-black">{getAvatarFallback(studentName)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-900 truncate">{studentName}</p>
                                                                    <p className="text-xs text-gray-500 truncate">{studentEmail}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">{studentProgram}</td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">{attempt.attemptNo ?? '—'}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`font-black text-[10px] uppercase tracking-widest ${
                                                                    attempt.status === 'SUBMITTED'
                                                                        ? 'border-green-200 text-green-700 bg-green-50'
                                                                        : 'border-amber-200 text-amber-700 bg-amber-50'
                                                                }`}
                                                            >
                                                                {attempt.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-black text-gray-900">
                                                            {attempt.status === 'SUBMITTED' ? formatPercent(attempt.percentage) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                                            {attempt.status === 'SUBMITTED' ? Number(attempt.score || 0) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                                            {formatDate(attempt.submittedAt || attempt.startedAt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <CardContent className="space-y-4 p-4 md:p-5">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Question Outcome Analytics</h3>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                        Review by hardest question, slowest question, or original question order, then export the current view.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                        {submissionAnalytics?.submissionStats?.submittedCount || 0} submitted attempts
                                    </Badge>
                                    <div className="w-full sm:w-44">
                                        <Select value={questionSortMode} onValueChange={(value) => setQuestionSortMode(value as QuestionSortMode)}>
                                            <SelectTrigger className="h-8 rounded-md border-gray-200 text-xs font-semibold">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <ArrowUpDown size={12} />
                                                    <SelectValue placeholder="Sort questions" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hardest">Hardest first</SelectItem>
                                                <SelectItem value="slowest">Slowest first</SelectItem>
                                                <SelectItem value="original">Original order</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-8 rounded-md border-gray-200 text-xs font-semibold"
                                        onClick={handleExportQuestionAnalytics}
                                        disabled={questionAnalyticsRows.length === 0}
                                    >
                                        <Download size={13} /> Export CSV
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hardest Question Right Now (Answered Attempts)</p>
                                    <p className="text-sm font-black text-gray-900 mt-1">
                                        {hardestQuestion ? `Question ${hardestQuestion.orderNo}` : 'N/A'}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">
                                        {hardestQuestion ? truncateQuestion(hardestQuestion.questionText, 88) : 'No submitted question analytics yet.'}
                                    </p>
                                    <p className="text-xs font-black text-rose-700 mt-2">
                                        {hardestQuestion ? `${hardestQuestion.wrongRate.toFixed(1)}% wrong of answered attempts` : 'N/A'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">How To Read This</p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">
                                        Hardest ranking uses wrong rate among answered attempts only. Each row still shows the full mix: right, wrong, and unanswered counts.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Question</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Outcome Mix</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Right</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Wrong</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Unanswered</th>
                                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Avg. Time to Answer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questionAnalyticsRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold text-gray-500">
                                                    No submitted question analytics yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            questionAnalyticsRows.map((question) => (
                                                <tr key={question.questionId} className="border-b border-gray-100 last:border-none align-top">
                                                    <td className="px-4 py-3 min-w-80">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-gray-900">Question {question.orderNo}</p>
                                                            <p className="text-xs font-semibold text-gray-700 leading-relaxed">{truncateQuestion(question.questionText)}</p>
                                                            {question.section ? (
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{question.section}</p>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 min-w-52">
                                                        <div className="space-y-2">
                                                            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 flex">
                                                                <div
                                                                    className="h-full bg-emerald-500"
                                                                    style={{ width: `${question.correctRate}%` }}
                                                                    title={`Right: ${question.correctRate.toFixed(1)}%`}
                                                                />
                                                                <div
                                                                    className="h-full bg-rose-500"
                                                                    style={{ width: `${question.wrongRate}%` }}
                                                                    title={`Wrong: ${question.wrongRate.toFixed(1)}%`}
                                                                />
                                                                <div
                                                                    className="h-full bg-amber-400"
                                                                    style={{ width: `${question.unansweredRate}%` }}
                                                                    title={`Unanswered: ${question.unansweredRate.toFixed(1)}%`}
                                                                />
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                                                <span className="text-emerald-700">{question.correctRate.toFixed(0)}% right</span>
                                                                <span className="text-rose-700">{question.wrongRate.toFixed(0)}% wrong</span>
                                                                <span className="text-amber-700">{question.unansweredRate.toFixed(0)}% unanswered</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-black text-emerald-700">{question.rightCount}</td>
                                                    <td className="px-4 py-3 text-xs font-black text-rose-700">{question.wrongCount}</td>
                                                    <td className="px-4 py-3 text-xs font-black text-amber-700">{question.unansweredCount}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatDuration(question.averageAnswerSeconds)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Students Recently Submitted</h3>
                                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">
                                    {submittedAttempts.length} submissions
                                </Badge>
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">All Questions and Answers</h3>
                            <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5 bg-white">
                                <Button
                                    type="button"
                                    variant={questionViewMode === 'cards' ? 'default' : 'ghost'}
                                    className="h-7 px-2.5 rounded text-[11px] font-semibold"
                                    onClick={() => setQuestionViewMode('cards')}
                                >
                                    Cards
                                </Button>
                                <Button
                                    type="button"
                                    variant={questionViewMode === 'list' ? 'default' : 'ghost'}
                                    className="h-7 px-2.5 rounded text-[11px] font-semibold"
                                    onClick={() => setQuestionViewMode('list')}
                                >
                                    List
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {availableSections.map((section) => (
                                <Button
                                    key={section}
                                    type="button"
                                    variant={selectedSection === section ? 'default' : 'outline'}
                                    className="h-7 rounded-md text-[10px] font-black uppercase tracking-widest px-2.5"
                                    onClick={() => setSelectedSection(section)}
                                >
                                    {section === 'ALL' ? 'All Sections' : section}
                                </Button>
                            ))}
                        </div>

                        {questions.length === 0 ? (
                            <Card className="rounded-lg border-gray-100 bg-white">
                                <CardContent className="p-4 text-xs font-semibold text-gray-500">
                                    This mock exam has no questions yet.
                                </CardContent>
                            </Card>
                        ) : visibleQuestions.length === 0 ? (
                            <Card className="rounded-lg border-gray-100 bg-white">
                                <CardContent className="p-4 text-xs font-semibold text-gray-500">
                                    No questions found in this section.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className={questionViewMode === 'cards' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'rounded-lg border border-gray-100 bg-white divide-y divide-gray-100'}>
                                {visibleQuestions.map(({ question, sectionTitle, globalQuestionNo }) => {
                                    const options = [
                                        { key: 'A', value: question.choiceA },
                                        { key: 'B', value: question.choiceB },
                                        { key: 'C', value: question.choiceC },
                                        { key: 'D', value: question.choiceD },
                                    ].filter((option) => Boolean(option.value));

                                    return (
                                        <Card key={question.id} className={questionViewMode === 'cards' ? 'rounded-lg border-gray-100 bg-white' : 'rounded-none border-none shadow-none'}>
                                            <CardContent className={questionViewMode === 'cards' ? 'p-5 space-y-4' : 'p-4 space-y-3'}>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        Question {globalQuestionNo} • {sectionTitle}
                                                    </p>
                                                    <p className={`${questionViewMode === 'cards' ? 'text-sm md:text-base' : 'text-sm'} font-bold text-gray-900 mt-1 leading-relaxed`}>
                                                        {question.questionText || 'No question text available.'}
                                                    </p>
                                                </div>

                                                {question.imageUrl ? (
                                                    <img
                                                        src={question.imageUrl}
                                                        alt={`Question ${globalQuestionNo}`}
                                                        className="w-full max-h-72 object-contain rounded-xl border border-gray-100 bg-gray-50"
                                                    />
                                                ) : null}

                                                <div className={`grid grid-cols-1 ${questionViewMode === 'cards' ? 'md:grid-cols-2 gap-2.5' : 'gap-1.5'}`}>
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
