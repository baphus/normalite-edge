import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollectionError } from '@/components/manage/CollectionState';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { useAuth } from '@/contexts/AuthContext';
import {
    buildScoreDistribution,
    rankProgramsByVolume,
    sortAttemptsByRecency,
    summariseAttempts,
} from '@/lib/examAnalytics';
import {
    exportReportToPdf,
    exportScoresToXlsx,
    toQuestionAppendixRows,
    toStudentScoreRows,
    type ExamReportInput,
} from '@/lib/examReportExport';
import { ExamDetailHeader } from '@/components/exam-view/ExamDetailHeader';
import { ExamResultsTab } from '@/components/exam-view/ExamResultsTab';
import { ExamSubmissionsTab } from '@/components/exam-view/ExamSubmissionsTab';
import { ExamQuestionsTab, type QuestionWithSection } from '@/components/exam-view/ExamQuestionsTab';
import { ExportScoresDialog, type ExportFormat } from '@/components/exam-view/ExportScoresDialog';
import { useSubmissionFilters } from '@/components/exam-view/useSubmissionFilters';
import {
    DEFAULT_EXPORT_COLUMNS,
    type AttemptItem,
    type ExamDetails,
    type ExportColumnKey,
    type ExportScope,
    type SubmissionAnalytics,
} from '@/components/exam-view/types';

const TAB_VALUES = ['results', 'submissions', 'questions'] as const;
type TabValue = typeof TAB_VALUES[number];

const isTabValue = (value: string | null): value is TabValue =>
    TAB_VALUES.includes((value || '') as TabValue);

const ManageExamViewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Each resource settles on its own. Previously all three shared a Promise.all,
    // so a failure of the analytics call — the least important of the three —
    // discarded the exam and every attempt and rendered the whole page as an error.
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [examError, setExamError] = useState<string | null>(null);
    const [examLoading, setExamLoading] = useState(true);

    const [attempts, setAttempts] = useState<AttemptItem[]>([]);
    const [attemptsError, setAttemptsError] = useState<string | null>(null);
    const [attemptsLoading, setAttemptsLoading] = useState(true);

    const [analytics, setAnalytics] = useState<SubmissionAnalytics | null>(null);

    const [exportOpen, setExportOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const loadExam = useCallback(async () => {
        if (!id) return;
        setExamLoading(true);
        setExamError(null);
        try {
            const response = await api.get(`/exams/${id}?questions=true`);
            setExam((response.data?.data || null) as ExamDetails | null);
        } catch (error) {
            console.error('Failed to load exam detail', error);
            setExam(null);
            setExamError('Could not load this exam');
        } finally {
            setExamLoading(false);
        }
    }, [id]);

    const loadAttempts = useCallback(async () => {
        if (!id) return;
        setAttemptsLoading(true);
        setAttemptsError(null);
        try {
            const result = await fetchAllPages<AttemptItem>(
                (page, limit) => api.get('/attempts', { params: { examId: id, page, limit } }),
                { limit: 200 },
            );
            setAttempts(result.items);
            if (result.truncated) {
                toast.warning(
                    'This exam has an unusually large number of attempts — some may be missing from the table and from exports.',
                );
            }
        } catch (error) {
            console.error('Failed to load exam attempts', error);
            setAttempts([]);
            setAttemptsError('Could not load submissions');
        } finally {
            setAttemptsLoading(false);
        }
    }, [id]);

    // Supplementary: supplies the schedule-end fallback and the plain-English
    // submission message, so a failure degrades those quietly rather than taking
    // the page down. The request is not optional despite its small payload — the
    // endpoint also closes exams whose deadline has passed.
    const loadAnalytics = useCallback(async () => {
        if (!id) return;
        try {
            const response = await api.get(`/exams/${id}/submission-analytics`);
            setAnalytics((response.data?.data || null) as SubmissionAnalytics | null);
        } catch (error) {
            console.error('Failed to load submission analytics', error);
            setAnalytics(null);
        }
    }, [id]);

    useEffect(() => {
        if (!id) {
            setExamError('Missing exam ID');
            setExamLoading(false);
            setAttemptsLoading(false);
            return;
        }
        void loadExam();
        void loadAttempts();
        void loadAnalytics();
    }, [id, loadExam, loadAttempts, loadAnalytics]);

    const tabParam = searchParams.get('tab');
    const activeTab: TabValue = isTabValue(tabParam) ? tabParam : 'results';

    const handleTabChange = useCallback(
        (value: string) => {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.set('tab', value);
                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const questionCount = Math.max(Number(exam?.questionCount || exam?.totalItems || 0), 0);

    const canEditExam = useMemo(() => {
        if (!exam) return false;
        if (exam.status === 'LIVE' || exam.status === 'PUBLISHED') return false;
        if (user?.role === 'ADMIN') return true;
        return Boolean(exam.creator?.id && exam.creator.id === user?.id);
    }, [exam, user?.id, user?.role]);

    const sortedAttempts = useMemo(() => sortAttemptsByRecency(attempts), [attempts]);
    const summary = useMemo(() => summariseAttempts(attempts), [attempts]);
    const distribution = useMemo(() => buildScoreDistribution(attempts), [attempts]);
    const topPrograms = useMemo(() => rankProgramsByVolume(attempts), [attempts]);

    const filters = useSubmissionFilters(sortedAttempts);

    const questionsWithSection = useMemo<QuestionWithSection[]>(() => {
        const ordered = [...(exam?.questions || [])].sort(
            (first, second) => (first.orderNo || 0) - (second.orderNo || 0),
        );

        return ordered.map((question, index) => ({
            question,
            globalQuestionNo: index + 1,
            sectionTitle:
                question.section?.title
                || exam?.sections?.find((section) => section.id === question.sectionId)?.title
                || 'Full exam',
        }));
    }, [exam?.questions, exam?.sections]);

    const sections = useMemo(() => {
        const fromExam = [...(exam?.sections || [])]
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0))
            .map((section) => section.title?.trim())
            .filter((title): title is string => Boolean(title));

        const fromQuestions = questionsWithSection
            .map((entry) => entry.sectionTitle.trim())
            .filter(Boolean);

        return ['ALL', ...Array.from(new Set([...fromExam, ...fromQuestions]))];
    }, [exam?.sections, questionsWithSection]);

    const deadline = analytics?.examStatus?.scheduleEnd || exam?.deadline || exam?.scheduledDate;

    const buildReportInput = useCallback(
        (scope: ExportScope, columnKeys: ExportColumnKey[]): ExamReportInput => {
            const source = scope === 'FILTERED' ? filters.filteredAttempts : sortedAttempts;
            return {
                exam,
                questionCount,
                deadline,
                summary,
                distribution,
                topPrograms,
                questionRows: toQuestionAppendixRows(questionsWithSection),
                rows: toStudentScoreRows(source, questionCount),
                columnKeys,
                scope,
            };
        },
        [
            exam,
            questionCount,
            deadline,
            summary,
            distribution,
            topPrograms,
            questionsWithSection,
            filters.filteredAttempts,
            sortedAttempts,
        ],
    );

    const handleExport = useCallback(
        async (format: ExportFormat, scope: ExportScope, columnKeys: ExportColumnKey[]) => {
            if (exporting) return;
            setExporting(true);
            try {
                const input = buildReportInput(scope, columnKeys);
                if (format === 'pdf') {
                    await exportReportToPdf(input);
                } else {
                    await exportScoresToXlsx(input);
                }
                setExportOpen(false);
            } catch (error) {
                console.error('Failed to generate export', error);
                toast.error('Could not generate the export. Please try again.');
            } finally {
                setExporting(false);
            }
        },
        [buildReportInput, exporting],
    );

    if (examLoading) {
        return (
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-5 w-72" />
                    <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-80 rounded-lg" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-[92px] rounded-xl" />
                    ))}
                </div>
                <span className="sr-only" role="status">Loading exam…</span>
            </div>
        );
    }

    if (examError || !exam) {
        return (
            <div className="flex flex-col gap-3 pb-6 font-lexend">
                <CollectionError
                    message={examError || 'Exam not found'}
                    onRetry={examError ? () => void loadExam() : undefined}
                />
            </div>
        );
    }

    const attemptsState = attemptsLoading ? 'loading' : attemptsError ? 'error' : 'ready';
    const tabTriggerClass =
        'rounded-md px-3 text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-white';

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            <ExamDetailHeader
                exam={exam}
                questionCount={questionCount}
                deadline={deadline}
                statusMessage={analytics?.examStatus?.message}
                canEdit={canEditExam}
                onExportFullReport={() => void handleExport('pdf', 'ALL', [...DEFAULT_EXPORT_COLUMNS])}
                onCustomiseExport={() => setExportOpen(true)}
                exportDisabled={exporting || attemptsLoading}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-3">
                <TabsList className="h-9 w-full justify-start gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:w-auto">
                    <TabsTrigger value="results" className={tabTriggerClass}>
                        Results
                    </TabsTrigger>
                    <TabsTrigger value="submissions" className={tabTriggerClass}>
                        Submissions
                        <span className="ml-1.5 tabular-nums opacity-70">{summary.total}</span>
                    </TabsTrigger>
                    <TabsTrigger value="questions" className={tabTriggerClass}>
                        Questions
                        <span className="ml-1.5 tabular-nums opacity-70">
                            {questionsWithSection.length}
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="mt-0">
                    <ExamResultsTab
                        summary={summary}
                        distribution={distribution}
                        topPrograms={topPrograms}
                        loading={attemptsLoading}
                        error={attemptsError}
                        onRetry={() => void loadAttempts()}
                    />
                </TabsContent>

                <TabsContent value="submissions" className="mt-0">
                    <ExamSubmissionsTab
                        filters={filters}
                        questionCount={questionCount}
                        state={attemptsState}
                        error={attemptsError}
                        onRetry={() => void loadAttempts()}
                    />
                </TabsContent>

                <TabsContent value="questions" className="mt-0">
                    <ExamQuestionsTab
                        questions={questionsWithSection}
                        sections={sections}
                        state="ready"
                        onRetry={() => void loadExam()}
                    />
                </TabsContent>
            </Tabs>

            <ExportScoresDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                allCount={sortedAttempts.length}
                filteredCount={filters.filteredAttempts.length}
                busy={exporting}
                onExport={(format, scope, columnKeys) => void handleExport(format, scope, columnKeys)}
            />
        </div>
    );
};

export default ManageExamViewPage;
