import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Activity,
    ArrowLeft,
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    Grid,
    RotateCcw,
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
    timeSpentSeconds?: number | null;
    submittedAt?: string | null;
    startedAt?: string;
    user?: {
        id: string;
        name?: string;
        email?: string;
        programTrack?: string | null;
        yearLevel?: string | null;
        section?: string | null;
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
}

type AttemptStatusFilter = 'ALL' | 'SUBMITTED' | 'IN_PROGRESS';
type ScoreBandFilter = 'ALL' | 'HIGH' | 'PASSING' | 'AT_RISK' | 'NO_SCORE';

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

const escapeExcelValue = (value: string | number | null | undefined) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<AttemptStatusFilter>('ALL');
    const [selectedScoreBandFilter, setSelectedScoreBandFilter] = useState<ScoreBandFilter>('ALL');
    const [selectedSection, setSelectedSection] = useState('ALL');

    const fetchAllAttempts = async (examId: string) => {
        const pageSize = 500;
        let page = 1;
        let totalPages = 1;
        const rows: AttemptItem[] = [];

        do {
            const response = await api.get('/attempts', {
                params: { examId, page, limit: pageSize },
            });
            const pageRows = (response.data?.data || []) as AttemptItem[];
            rows.push(...pageRows);
            totalPages = Number(response.data?.meta?.totalPages || page);

            if (pageRows.length === 0) {
                break;
            }

            page += 1;
        } while (page <= totalPages);

        return rows;
    };

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
                    fetchAllAttempts(id),
                    api.get(`/exams/${id}/submission-analytics`),
                ]);

                setExam((examResponse.data?.data || null) as ExamDetails | null);
                setAttempts(attemptsResponse);
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
            const yearLevel = attempt.user?.yearLevel?.toLowerCase() || '';
            const section = attempt.user?.section?.toLowerCase() || '';
            const percentage = Number(attempt.percentage || 0);
            const isSubmitted = attempt.status === 'SUBMITTED';

            const matchesSearch = !term
                || name.includes(term)
                || email.includes(term)
                || track.includes(term)
                || yearLevel.includes(term)
                || section.includes(term);
            const matchesProgram = selectedProgramFilter === 'ALL' || attempt.user?.programTrack === selectedProgramFilter;
            const matchesStatus = selectedStatusFilter === 'ALL' || attempt.status === selectedStatusFilter;
            const matchesScoreBand = selectedScoreBandFilter === 'ALL'
                || (selectedScoreBandFilter === 'HIGH' && isSubmitted && percentage >= 90)
                || (selectedScoreBandFilter === 'PASSING' && isSubmitted && percentage >= 75 && percentage < 90)
                || (selectedScoreBandFilter === 'AT_RISK' && isSubmitted && percentage < 75)
                || (selectedScoreBandFilter === 'NO_SCORE' && !isSubmitted);

            return matchesSearch && matchesProgram && matchesStatus && matchesScoreBand;
        });
    }, [allAttemptsSorted, search, selectedProgramFilter, selectedScoreBandFilter, selectedStatusFilter]);

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

    const studentScoreRows = useMemo(() => {
        return allAttemptsSorted.map((attempt, index) => {
            const studentName = attempt.user?.name?.trim() || 'Unknown User';
            const studentEmail = attempt.user?.email?.trim() || 'No email';
            const program = attempt.user?.programTrack?.trim() || 'N/A';
            const yearLevel = attempt.user?.yearLevel?.trim() || 'N/A';
            const section = attempt.user?.section?.trim() || 'N/A';
            const isSubmitted = attempt.status === 'SUBMITTED';

            return {
                rowNo: index + 1,
                studentName,
                studentEmail,
                program,
                yearLevel,
                section,
                attemptNo: attempt.attemptNo || 1,
                status: attempt.status,
                rawScore: isSubmitted ? `${Number(attempt.score || 0)}/${questionCount}` : '-',
                percentage: isSubmitted ? formatPercent(attempt.percentage) : '-',
                timeSpent: formatDuration(attempt.timeSpentSeconds),
                startedAt: formatDate(attempt.startedAt),
                submittedAt: isSubmitted ? formatDate(attempt.submittedAt) : '-',
            };
        });
    }, [allAttemptsSorted, questionCount]);

    const visibleStudentScoreRows = useMemo(() => {
        return filteredAttempts.map((attempt, index) => {
            const studentName = attempt.user?.name?.trim() || 'Unknown User';
            const studentEmail = attempt.user?.email?.trim() || 'No email';
            const program = attempt.user?.programTrack?.trim() || 'N/A';
            const yearLevel = attempt.user?.yearLevel?.trim() || 'N/A';
            const section = attempt.user?.section?.trim() || 'N/A';
            const isSubmitted = attempt.status === 'SUBMITTED';

            return {
                id: attempt.id,
                rowNo: index + 1,
                studentName,
                studentEmail,
                program,
                yearLevel,
                section,
                profilePicture: attempt.user?.profilePicture || null,
                attemptNo: attempt.attemptNo || 1,
                status: attempt.status,
                rawScore: isSubmitted ? `${Number(attempt.score || 0)}/${questionCount}` : '-',
                percentage: isSubmitted ? formatPercent(attempt.percentage) : '-',
                timeSpent: formatDuration(attempt.timeSpentSeconds),
                startedAt: formatDate(attempt.startedAt),
                submittedAt: isSubmitted ? formatDate(attempt.submittedAt) : '-',
            };
        });
    }, [filteredAttempts, questionCount]);

    const hasStudentSubmissionFilters = Boolean(search.trim())
        || selectedProgramFilter !== 'ALL'
        || selectedStatusFilter !== 'ALL'
        || selectedScoreBandFilter !== 'ALL';

    const filteredSubmissionSummary = useMemo(() => {
        const submitted = filteredAttempts.filter((attempt) => attempt.status === 'SUBMITTED').length;
        const inProgress = filteredAttempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length;

        return {
            submitted,
            inProgress,
            notSubmitted: Math.max(filteredAttempts.length - submitted - inProgress, 0),
        };
    }, [filteredAttempts]);

    const resetStudentSubmissionFilters = () => {
        setSearch('');
        setSelectedProgramFilter('ALL');
        setSelectedStatusFilter('ALL');
        setSelectedScoreBandFilter('ALL');
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

    const handleExportStudentScores = () => {
        if (studentScoreRows.length === 0) {
            return;
        }

        const header = [
            'No.',
            'Student',
            'Email',
            'Program',
            'Year Level',
            'Section',
            'Attempt No.',
            'Status',
            'Raw Score',
            'Percentage',
            'Time Spent',
            'Started At',
            'Submitted At',
        ];

        const tableHead = header
            .map((column) => `<th>${escapeExcelValue(column)}</th>`)
            .join('');
        const tableRows = studentScoreRows
            .map((row) => [
                row.rowNo,
                row.studentName,
                row.studentEmail,
                row.program,
                row.yearLevel,
                row.section,
                row.attemptNo,
                row.status,
                row.rawScore,
                row.percentage,
                row.timeSpent,
                row.startedAt,
                row.submittedAt,
            ])
            .map((row) => `<tr>${row.map((value) => `<td>${escapeExcelValue(value)}</td>`).join('')}</tr>`)
            .join('');
        const worksheet = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
table { border-collapse: collapse; font-family: Arial, sans-serif; }
th { background: #800000; color: #ffffff; font-weight: 700; }
th, td { border: 1px solid #d9d9d9; padding: 8px; mso-number-format: "\\@"; }
</style>
</head>
<body>
<table>
<thead><tr>${tableHead}</tr></thead>
<tbody>${tableRows}</tbody>
</table>
</body>
</html>`;

        const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (exam?.title || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        link.href = downloadUrl;
        link.download = `${safeTitle || 'exam'}-student-scores.xls`;
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
                        <div className="p-6 border-b border-primary/10 space-y-5">
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                        <Users className="text-primary" size={20} />
                                        Detailed Student Submissions
                                    </h4>
                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                        Review every attempt, narrow the report, and export complete score data for this test.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                                        {studentScoreRows.length} total rows
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                                        {attemptSummary.submitted} submitted
                                    </span>
                                    <Button
                                        onClick={handleExportStudentScores}
                                        disabled={studentScoreRows.length === 0}
                                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 shadow-sm h-10"
                                    >
                                        <FileSpreadsheet size={16} /> Export All Scores
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                        <Filter size={14} className="text-primary" />
                                        Filters
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={resetStudentSubmissionFilters}
                                        disabled={!hasStudentSubmissionFilters}
                                        className="h-8 rounded-lg px-3 text-xs font-bold text-slate-500 hover:text-primary"
                                    >
                                        <RotateCcw size={13} className="mr-1.5" /> Reset
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                                    <div className="relative group md:col-span-2 xl:col-span-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search name, email, program..."
                                            className="pl-10 bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm w-full transition-all h-10"
                                        />
                                    </div>
                                    <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                                        <SelectTrigger className="bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm h-10">
                                            <SelectValue placeholder="All Programs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Programs</SelectItem>
                                            {programOptions.map(prog => (
                                                <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedStatusFilter} onValueChange={(value) => setSelectedStatusFilter(value as AttemptStatusFilter)}>
                                        <SelectTrigger className="bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm h-10">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Statuses</SelectItem>
                                            <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedScoreBandFilter} onValueChange={(value) => setSelectedScoreBandFilter(value as ScoreBandFilter)}>
                                        <SelectTrigger className="bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm h-10">
                                            <SelectValue placeholder="All Scores" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Scores</SelectItem>
                                            <SelectItem value="HIGH">90-100%</SelectItem>
                                            <SelectItem value="PASSING">75-89%</SelectItem>
                                            <SelectItem value="AT_RISK">Below 75%</SelectItem>
                                            <SelectItem value="NO_SCORE">No Score Yet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">Shown</p>
                                            <p className="text-sm font-black text-slate-900">{visibleStudentScoreRows.length}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">Done</p>
                                            <p className="text-sm font-black text-emerald-700">{filteredSubmissionSummary.submitted}</p>
                                        </div>
                                        <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">Open</p>
                                            <p className="text-sm font-black text-amber-700">{filteredSubmissionSummary.inProgress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-primary/10">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Program / Section</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Attempt</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Raw Score</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Percentage</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Submitted</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Time Spent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/5">
                                    {visibleStudentScoreRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-10 text-center">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {hasStudentSubmissionFilters ? 'No matching submissions found.' : 'No attempts found.'}
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-slate-500">
                                                    {hasStudentSubmissionFilters ? 'Adjust or reset filters to broaden the report.' : 'Student attempts will appear here once the test is started.'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleStudentScoreRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-primary/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 rounded-full bg-slate-200 border border-slate-200">
                                                            <AvatarImage src={getAvatarUrl(row.studentName, row.profilePicture)} alt={row.studentName} />
                                                            <AvatarFallback className="text-[10px] font-black text-slate-500">{getAvatarFallback(row.studentName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <span className="block font-bold text-slate-900">{row.studentName}</span>
                                                            <span className="block text-xs text-slate-500">{row.studentEmail}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="block text-sm font-semibold text-slate-700">{row.program}</span>
                                                    <span className="block text-xs text-slate-500">Year {row.yearLevel} / Section {row.section}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                                                        #{row.attemptNo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-900">{row.rawScore}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                        row.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {row.percentage}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        row.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{row.submittedAt}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{row.timeSpent}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-primary/10 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                            <span>Showing {visibleStudentScoreRows.length} of {studentScoreRows.length} score rows</span>
                            <span>Excel export includes every score row for this test.</span>
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
