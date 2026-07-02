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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
        campus?: string | null;
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
type ExportScope = 'ALL' | 'FILTERED';

interface StudentScoreRow {
    id?: string;
    rowNo: number;
    studentName: string;
    studentEmail: string;
    program: string;
    campus: string;
    yearLevel: string;
    section: string;
    attemptNo: number;
    status: string;
    rawScore: string;
    percentage: string;
    timeSpent: string;
    startedAt: string;
    submittedAt: string;
    profilePicture?: string | null;
}

const EXPORT_COLUMNS = [
    { key: 'rowNo', label: 'No.' },
    { key: 'studentName', label: 'Student' },
    { key: 'studentEmail', label: 'Email' },
    { key: 'program', label: 'Program' },
    { key: 'campus', label: 'Campus' },
    { key: 'yearLevel', label: 'Year Level' },
    { key: 'section', label: 'Section' },
    { key: 'attemptNo', label: 'Attempt No.' },
    { key: 'status', label: 'Status' },
    { key: 'rawScore', label: 'Raw Score' },
    { key: 'percentage', label: 'Percentage' },
    { key: 'timeSpent', label: 'Time Spent' },
    { key: 'startedAt', label: 'Started At' },
    { key: 'submittedAt', label: 'Submitted At' },
] as const satisfies ReadonlyArray<{ key: keyof StudentScoreRow; label: string }>;

type ExportColumnKey = typeof EXPORT_COLUMNS[number]['key'];
const DEFAULT_EXPORT_COLUMNS = EXPORT_COLUMNS.map((column) => column.key);

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

const getExcelColumnName = (index: number) => {
    let column = '';
    let current = index + 1;

    while (current > 0) {
        const remainder = (current - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        current = Math.floor((current - 1) / 26);
    }

    return column;
};

const createXlsxWorkbookBlob = async (
    headers: string[],
    rows: Array<Array<string | number | null | undefined>>
) => {
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ('default' in ExcelJSModule ? ExcelJSModule.default : ExcelJSModule) as typeof ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Scores', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    workbook.creator = 'Normalite Edge';
    workbook.created = new Date();

    worksheet.columns = headers.map((header, columnIndex) => ({
        header,
        key: `column-${columnIndex}`,
        width: Math.min(
            Math.max(header.length, ...rows.map((row) => String(row[columnIndex] ?? '').length), 10) + 2,
            36
        ),
        style: { numFmt: '@' },
    }));
    worksheet.addRows(rows.map((row) => row.map((value) => value ?? '')));

    const lastColumn = getExcelColumnName(headers.length - 1);
    const lastRow = Math.max(rows.length + 1, 1);
    worksheet.autoFilter = {
        from: 'A1',
        to: `${lastColumn}${lastRow}`,
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF800000' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
    });

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return new Blob([workbookBuffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    const [submissionAnalytics, setSubmissionAnalytics] = useState<SubmissionAnalytics | null>(null);
    const [search, setSearch] = useState('');
    const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
    const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<AttemptStatusFilter>('ALL');
    const [selectedScoreBandFilter, setSelectedScoreBandFilter] = useState<ScoreBandFilter>('ALL');
    const [selectedSection, setSelectedSection] = useState('ALL');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportScope, setExportScope] = useState<ExportScope>('ALL');
    const [selectedExportColumns, setSelectedExportColumns] = useState<ExportColumnKey[]>([...DEFAULT_EXPORT_COLUMNS]);
    const [exportingScores, setExportingScores] = useState(false);
    const [studentFiltersOpen, setStudentFiltersOpen] = useState(false);

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
            const campus = attempt.user?.campus?.toLowerCase() || '';
            const percentage = Number(attempt.percentage || 0);
            const isSubmitted = attempt.status === 'SUBMITTED';

            const matchesSearch = !term
                || name.includes(term)
                || email.includes(term)
                || track.includes(term)
                || yearLevel.includes(term)
                || section.includes(term)
                || campus.includes(term);
            const matchesProgram = selectedProgramFilter === 'ALL' || attempt.user?.programTrack === selectedProgramFilter;
            const matchesCampus = selectedCampusFilter === 'ALL' || attempt.user?.campus === selectedCampusFilter;
            const matchesStatus = selectedStatusFilter === 'ALL' || attempt.status === selectedStatusFilter;
            const matchesScoreBand = selectedScoreBandFilter === 'ALL'
                || (selectedScoreBandFilter === 'HIGH' && isSubmitted && percentage >= 90)
                || (selectedScoreBandFilter === 'PASSING' && isSubmitted && percentage >= 75 && percentage < 90)
                || (selectedScoreBandFilter === 'AT_RISK' && isSubmitted && percentage < 75)
                || (selectedScoreBandFilter === 'NO_SCORE' && !isSubmitted);

            return matchesSearch && matchesProgram && matchesCampus && matchesStatus && matchesScoreBand;
        });
    }, [allAttemptsSorted, search, selectedCampusFilter, selectedProgramFilter, selectedScoreBandFilter, selectedStatusFilter]);

    const programOptions = useMemo(() => {
        const specs = new Set<string>();
        allAttemptsSorted.forEach((a) => {
            if (a.user?.programTrack) specs.add(a.user.programTrack);
        });
        return Array.from(specs).sort();
    }, [allAttemptsSorted]);

    const campusOptions = useMemo(() => {
        const campuses = new Set<string>();
        allAttemptsSorted.forEach((attempt) => {
            if (attempt.user?.campus) campuses.add(attempt.user.campus);
        });
        return Array.from(campuses).sort();
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
            const campus = attempt.user?.campus?.trim() || 'N/A';
            const isSubmitted = attempt.status === 'SUBMITTED';

            return {
                rowNo: index + 1,
                studentName,
                studentEmail,
                program,
                yearLevel,
                section,
                campus,
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
            const campus = attempt.user?.campus?.trim() || 'N/A';
            const isSubmitted = attempt.status === 'SUBMITTED';

            return {
                id: attempt.id,
                rowNo: index + 1,
                studentName,
                studentEmail,
                program,
                yearLevel,
                section,
                campus,
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
        || selectedCampusFilter !== 'ALL'
        || selectedStatusFilter !== 'ALL'
        || selectedScoreBandFilter !== 'ALL';
    const activeStudentFilterCount = [
        Boolean(search.trim()),
        selectedProgramFilter !== 'ALL',
        selectedCampusFilter !== 'ALL',
        selectedStatusFilter !== 'ALL',
        selectedScoreBandFilter !== 'ALL',
    ].filter(Boolean).length;

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
        setSelectedCampusFilter('ALL');
        setSelectedStatusFilter('ALL');
        setSelectedScoreBandFilter('ALL');
    };

    const toggleExportColumn = (columnKey: ExportColumnKey) => {
        setSelectedExportColumns((current) => {
            if (current.includes(columnKey)) {
                if (current.length === 1) return current;
                return current.filter((key) => key !== columnKey);
            }

            return [...current, columnKey];
        });
    };

    const selectAllExportColumns = () => {
        setSelectedExportColumns([...DEFAULT_EXPORT_COLUMNS]);
    };

    const resetExportColumns = () => {
        setSelectedExportColumns([...DEFAULT_EXPORT_COLUMNS]);
        setExportScope('ALL');
    };

    const getSafeExamTitle = () => (
        (exam?.title || 'exam')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            || 'exam'
    );

    const addPdfSectionTitle = (doc: jsPDF, title: string, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(128, 0, 0);
        doc.text(title, 12, y);
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.35);
        doc.line(12, y + 2.5, doc.internal.pageSize.getWidth() - 12, y + 2.5);
    };

    const addCnuWatermarkAndFooter = (doc: jsPDF, generatedAt: string) => {
        const pageCount = doc.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
            doc.setPage(pageNumber);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(30);
            doc.setTextColor(232, 222, 222);
            doc.text('CEBU NORMAL UNIVERSITY', pageWidth / 2, pageHeight / 2, {
                align: 'center',
                angle: 32,
            });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            doc.text(`Generated ${generatedAt}`, 12, pageHeight - 8);
            doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
        }
    };

    const getNextPdfY = (doc: jsPDF, fallbackY: number, requiredHeight = 18) => {
        const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
        const pageHeight = doc.internal.pageSize.getHeight();
        let nextY = Math.max(lastTable?.finalY ? lastTable.finalY + 12 : fallbackY, fallbackY);

        if (nextY + requiredHeight > pageHeight - 18) {
            doc.addPage();
            nextY = 18;
        }

        return nextY;
    };

    const handleExportPDF = (scope: ExportScope = 'ALL', columnKeys: ExportColumnKey[] = [...DEFAULT_EXPORT_COLUMNS]) => {
        const sourceRows = scope === 'FILTERED' ? visibleStudentScoreRows : studentScoreRows;
        const activeColumns = EXPORT_COLUMNS.filter((column) => columnKeys.includes(column.key));
        const generatedAt = formatDate(new Date().toISOString());
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const reportTitle = exam?.title || 'Untitled Exam';
        const durationMinutes = Number(exam?.timeLimit || exam?.duration || 0);
        const scoreColumnWidths: Record<ExportColumnKey, number> = {
            rowNo: 10,
            studentName: 28,
            studentEmail: 35,
            program: 28,
            campus: 24,
            yearLevel: 18,
            section: 18,
            attemptNo: 16,
            status: 18,
            rawScore: 18,
            percentage: 18,
            timeSpent: 20,
            startedAt: 26,
            submittedAt: 26,
        };
        const scoreColumnStyles = activeColumns.reduce<Record<number, { cellWidth: number; halign?: 'left' | 'center' }>>((styles, column, index) => {
            styles[index] = {
                cellWidth: scoreColumnWidths[column.key],
                halign: ['rowNo', 'attemptNo', 'status', 'rawScore', 'percentage', 'timeSpent'].includes(column.key) ? 'center' : 'left',
            };
            return styles;
        }, {});
        const trackList = exam?.tracks?.map((track) => track.name || track.code).filter(Boolean).join(', ')
            || exam?.program_track
            || 'All / N/A';
        const creatorName = exam?.creator?.name
            || `${exam?.creator?.firstName || ''} ${exam?.creator?.lastName || ''}`.trim()
            || 'N/A';

        doc.setFillColor(128, 0, 0);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Cebu Normal University', 12, 11);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Normalite Edge Exam Performance Report', 12, 19);
        doc.text(`Scope: ${scope === 'FILTERED' ? 'Filtered student score rows' : 'All student score rows'}`, pageWidth - 12, 11, { align: 'right' });
        doc.text(`Generated: ${generatedAt}`, pageWidth - 12, 19, { align: 'right' });

        doc.setTextColor(24, 24, 27);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(reportTitle, 12, 39, { maxWidth: pageWidth - 24 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(82, 82, 91);
        doc.text(exam?.description || 'No description provided.', 12, 46, { maxWidth: pageWidth - 24 });

        autoTable(doc, {
            startY: 53,
            body: [
                ['Status', exam?.status || 'UNKNOWN', 'Category', exam?.category || 'N/A', 'Applicable Track(s)', trackList],
                ['Questions', String(questionCount), 'Duration', durationMinutes > 0 ? `${durationMinutes} minutes` : 'N/A', 'Maximum Attempts', String(exam?.maxAttempts ?? 'N/A')],
                ['Deadline / Schedule End', formatDate(submissionStatus?.scheduleEnd || exam?.deadline || exam?.scheduledDate), 'Close on Deadline', exam?.closeOnDeadline ? 'Yes' : 'No', 'Created By', creatorName],
            ],
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [128, 0, 0], cellWidth: 32 },
                2: { fontStyle: 'bold', textColor: [128, 0, 0], cellWidth: 34 },
                4: { fontStyle: 'bold', textColor: [128, 0, 0], cellWidth: 38 },
            },
        });

        const summaryY = getNextPdfY(doc, 80, 26);
        addPdfSectionTitle(doc, 'Performance Summary', summaryY);
        autoTable(doc, {
            startY: summaryY + 6,
            head: [['Total Attempts', 'Submitted', 'In Progress', 'Unique Students', 'Average Score', 'Highest Score', 'Lowest Score']],
            body: [[
                attemptSummary.total,
                attemptSummary.submitted,
                attemptSummary.inProgress,
                attemptSummary.uniqueStudents,
                formatPercent(attemptSummary.averageScore),
                formatPercent(attemptSummary.highestScore),
                formatPercent(attemptSummary.lowestScore),
            ]],
            theme: 'grid',
            headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontSize: 7.5, halign: 'center' },
            bodyStyles: { fontSize: 9, fontStyle: 'bold', halign: 'center', textColor: [24, 24, 27] },
            styles: { cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.15 },
        });

        const distributionY = getNextPdfY(doc, 112, 34);
        addPdfSectionTitle(doc, 'Score Distribution and Program Performance', distributionY);
        autoTable(doc, {
            startY: distributionY + 6,
            head: [['Score Band', ...scoreDistribution.map((bin) => `${bin.label}%`)]],
            body: [['Students', ...scoreDistribution.map((bin) => bin.count)]],
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center' },
            styles: { cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
        });

        autoTable(doc, {
            startY: getNextPdfY(doc, distributionY + 28, 22),
            head: [['Program', 'Submitted Attempts', 'Average Score']],
            body: topPrograms.length > 0
                ? topPrograms.map((program) => [program.program, program.count, formatPercent(program.averageScore)])
                : [['No program data available', '-', '-']],
            theme: 'striped',
            headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
        });

        const scoreRowsY = getNextPdfY(doc, 158, 44);
        addPdfSectionTitle(doc, `Student Score Rows (${sourceRows.length})`, scoreRowsY);
        autoTable(doc, {
            startY: scoreRowsY + 6,
            head: [activeColumns.map((column) => column.label)],
            body: sourceRows.length > 0
                ? sourceRows.map((row) => activeColumns.map((column) => String(row[column.key] ?? '')))
                : [activeColumns.map(() => '-')],
            theme: 'striped',
            headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontSize: 6.4, halign: 'center' },
            styles: { fontSize: 5.8, cellPadding: 1.35, overflow: 'linebreak', valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.1 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: scoreColumnStyles,
            margin: { left: 8, right: 8 },
        });

        const questionRows = questionsWithSection.map(({ question, globalQuestionNo, sectionTitle }) => {
            const choiceMap = question as ExamQuestion & Record<string, string | null | undefined>;
            const choices = ['A', 'B', 'C', 'D']
                .map((choice) => `${choice}. ${choiceMap[`choice${choice}`] || 'N/A'}`)
                .join('\n');

            return [
                globalQuestionNo,
                sectionTitle,
                question.questionText || 'Untitled question',
                choices,
                question.correctChoice || 'N/A',
                question.rationalization || 'N/A',
            ];
        });

        const questionsY = getNextPdfY(doc, 176, 54);
        addPdfSectionTitle(doc, `Exam Question Appendix (${questionRows.length})`, questionsY);
        autoTable(doc, {
            startY: questionsY + 6,
            head: [['No.', 'Section', 'Question', 'Choices', 'Correct Answer', 'Rationalization']],
            body: questionRows.length > 0 ? questionRows : [['-', '-', 'No questions found for this exam.', '-', '-', '-']],
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 6.5 },
            styles: { fontSize: 5.8, cellPadding: 1.4, overflow: 'linebreak', valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.1 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 30 },
                2: { cellWidth: 78 },
                3: { cellWidth: 70 },
                4: { halign: 'center', cellWidth: 24 },
                5: { cellWidth: 72 },
            },
            margin: { left: 8, right: 8 },
        });

        addCnuWatermarkAndFooter(doc, generatedAt);
        doc.save(`${getSafeExamTitle()}-complete-report.pdf`);
    };

    const handleExportStudentScores = async () => {
        const sourceRows = exportScope === 'FILTERED' ? visibleStudentScoreRows : studentScoreRows;
        const activeColumns = EXPORT_COLUMNS.filter((column) => selectedExportColumns.includes(column.key));

        if (sourceRows.length === 0 || activeColumns.length === 0 || exportingScores) {
            return;
        }

        setExportingScores(true);

        try {
            const headers = activeColumns.map((column) => column.label);
            const exportRows = sourceRows.map((row) => activeColumns.map((column) => row[column.key]));
            const blob = await createXlsxWorkbookBlob(headers, exportRows);
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeTitle = (exam?.title || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            link.href = downloadUrl;
            link.download = `${safeTitle || 'exam'}-student-scores.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            setExportDialogOpen(false);
        } finally {
            setExportingScores(false);
        }
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
                            onClick={() => handleExportPDF('ALL', [...DEFAULT_EXPORT_COLUMNS])}
                            className="bg-white text-slate-700 border border-primary/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-shadow shadow-sm h-10"
                        >
                            <Download size={16} />
                            Export Full PDF
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
                                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                                        {visibleStudentScoreRows.length} shown
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                                        {attemptSummary.submitted} submitted
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStudentFiltersOpen((open) => !open)}
                                        aria-expanded={studentFiltersOpen}
                                        className="h-10 rounded-lg border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 gap-2"
                                    >
                                        <Filter size={15} />
                                        Filters
                                        {activeStudentFilterCount > 0 && (
                                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-white">
                                                {activeStudentFilterCount}
                                            </span>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => setExportDialogOpen(true)}
                                        disabled={studentScoreRows.length === 0}
                                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 shadow-sm h-10"
                                    >
                                        <FileSpreadsheet size={16} /> Export Scores
                                    </Button>
                                </div>
                            </div>

                            {studentFiltersOpen && (
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                                        <div className="relative group md:col-span-2 xl:col-span-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                                            <Input
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Search name, email, program, campus..."
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
                                        <Select value={selectedCampusFilter} onValueChange={setSelectedCampusFilter}>
                                            <SelectTrigger className="bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm h-10">
                                                <SelectValue placeholder="All Campuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">All Campuses</SelectItem>
                                                {campusOptions.map((campus) => (
                                                    <SelectItem key={campus} value={campus}>{campus}</SelectItem>
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
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1080px] text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-primary/10">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Program / Section</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Campus</th>
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
                                            <td colSpan={9} className="px-6 py-10 text-center">
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
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{row.campus}</td>
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
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent className="max-w-2xl rounded-2xl font-lexend">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black text-slate-900">Customize Score Export</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Rows</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={exportScope === 'ALL' ? 'default' : 'outline'}
                                    onClick={() => setExportScope('ALL')}
                                    className={`h-10 rounded-lg text-xs font-bold ${exportScope === 'ALL' ? 'bg-primary text-white' : 'border-slate-200 text-slate-600'}`}
                                >
                                    All Rows ({studentScoreRows.length})
                                </Button>
                                <Button
                                    type="button"
                                    variant={exportScope === 'FILTERED' ? 'default' : 'outline'}
                                    onClick={() => setExportScope('FILTERED')}
                                    className={`h-10 rounded-lg text-xs font-bold ${exportScope === 'FILTERED' ? 'bg-primary text-white' : 'border-slate-200 text-slate-600'}`}
                                >
                                    Filtered Rows ({visibleStudentScoreRows.length})
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Columns</p>
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="ghost" onClick={selectAllExportColumns} className="h-7 px-2 text-[11px] font-bold text-slate-500">
                                        Select All
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={resetExportColumns} className="h-7 px-2 text-[11px] font-bold text-slate-500">
                                        Reset
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {EXPORT_COLUMNS.map((column) => {
                                    const checked = selectedExportColumns.includes(column.key);
                                    const disableUncheck = checked && selectedExportColumns.length === 1;

                                    return (
                                        <label
                                            key={column.key}
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                                                checked ? 'border-primary/30 bg-primary/5 text-slate-900' : 'border-slate-200 text-slate-500'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                disabled={disableUncheck}
                                                onCheckedChange={() => toggleExportColumn(column.key)}
                                            />
                                            {column.label}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setExportDialogOpen(false)} className="h-9 rounded-lg text-xs font-bold">
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExportStudentScores}
                            disabled={exportingScores || (exportScope === 'FILTERED' ? visibleStudentScoreRows.length : studentScoreRows.length) === 0 || selectedExportColumns.length === 0}
                            className="h-9 rounded-lg border-slate-200 text-xs font-bold"
                            variant="outline"
                        >
                            <FileSpreadsheet size={14} className="mr-1.5" /> {exportingScores ? 'Exporting...' : 'Export Excel'}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                handleExportPDF(exportScope, selectedExportColumns);
                                setExportDialogOpen(false);
                            }}
                            disabled={(exportScope === 'FILTERED' ? visibleStudentScoreRows.length : studentScoreRows.length) === 0 || selectedExportColumns.length === 0}
                            className="h-9 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                        >
                            <Download size={14} className="mr-1.5" /> Export PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageExamViewPage;
