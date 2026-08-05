import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Clock,
    FileText,
    Flame,
    Lightbulb,
    PlayCircle,
    Sparkles,
    Target,
    Video,
    XCircle,
    Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import CalendarEventsWidget from './CalendarEventsWidget';

/* -------------------------------------------------------------------------- */
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */

type UpcomingSession = {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    host?: {
        firstName?: string;
        lastName?: string;
    };
};

type RecentAttempt = {
    id: string;
    score: number;
    percentage: number;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    submittedAt: string | null;
    submissionType: 'AUTO' | 'MANUAL';
    exam?: {
        id: string;
        title: string;
        subject: string | null;
        timeLimitMinutes: number;
    };
};

type DailyQuestion = {
    questionId: string;
    examId: string;
    examTitle: string;
    subject?: string | null;
    questionText: string;
    choices: {
        A: string;
        B: string;
        C: string;
        D: string;
    };
};

type DailyAnswerResult = {
    selectedChoice: 'A' | 'B' | 'C' | 'D';
    correctChoice: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
    rationalization?: string | null;
};

type MotivationalQuote = { text: string; author: string };

type DailyAnswerCache = {
    date: string;
    userId: string;
    questionId: string;
    result: DailyAnswerResult;
};

interface RevieweeDashboardProps {
    stats: {
        overallAverage?: number;
        totalMaterials?: number;
        totalExamsAvailable?: number;
        upcomingSessions?: UpcomingSession[];
        recentAttempts?: RecentAttempt[];
        upcomingExams?: {
            id: string;
            title: string;
            subject: string | null;
            scheduleStart: string;
            scheduleEnd: string | null;
            programTrack: string | null;
            status: string;
        }[];
    } | null;
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                  */
/* -------------------------------------------------------------------------- */

const DAILY_ANSWER_STORAGE_KEY = 'reviewee-dashboard-daily-answer';
/** The LET headline passing mark is a 75% general average. */
const PASS_MARK = 75;

/** Compact subject label palette — maps subject keywords to accent colours. */
const SUBJECT_ACCENTS: Record<string, { bg: string; text: string; bar: string }> = {
    general:  { bg: 'bg-primary/8',  text: 'text-primary',       bar: 'bg-primary' },
    math:     { bg: 'bg-amber-50',   text: 'text-amber-700',     bar: 'bg-amber-500' },
    science:  { bg: 'bg-emerald-50', text: 'text-emerald-700',   bar: 'bg-emerald-500' },
    english:  { bg: 'bg-blue-50',    text: 'text-blue-700',       bar: 'bg-blue-500' },
    filipino: { bg: 'bg-violet-50',  text: 'text-violet-700',    bar: 'bg-violet-500' },
    social:   { bg: 'bg-rose-50',    text: 'text-rose-700',       bar: 'bg-rose-500' },
};

const getSubjectAccent = (subject: string) => {
    const lower = subject.toLowerCase();
    for (const [key, accent] of Object.entries(SUBJECT_ACCENTS)) {
        if (lower.includes(key)) return accent;
    }
    return SUBJECT_ACCENTS.general;
};

/* -------------------------------------------------------------------------- */
/*                                Helper hooks                                 */
/* -------------------------------------------------------------------------- */

/** Derive subject-level performance stats from recent attempts. */
function useSubjectPerformance(attempts: RecentAttempt[]) {
    return useMemo(() => {
        const grouped: Record<string, { total: number; count: number; best: number }> = {};
        for (const a of attempts) {
            if (a.status !== 'SUBMITTED') continue;
            const raw = a.exam?.subject;
            const subject = (!raw || raw.toLowerCase() === 'general section')
                ? 'General'
                : raw;
            if (!grouped[subject]) grouped[subject] = { total: 0, count: 0, best: 0 };
            grouped[subject].total += Number(a.percentage || 0);
            grouped[subject].count += 1;
            grouped[subject].best = Math.max(grouped[subject].best, Number(a.percentage || 0));
        }
        return Object.entries(grouped)
            .map(([subject, data]) => ({
                subject,
                avg: Math.round(data.total / data.count),
                best: data.best,
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count || b.avg - a.avg)
            .slice(0, 5);
    }, [attempts]);
}

/** Compute study-progress metrics from attempts. */
function useStudyProgress(attempts: RecentAttempt[]) {
    return useMemo(() => {
        const submitted = attempts.filter((a) => a.status === 'SUBMITTED');
        const totalQuestions = submitted.reduce(
            (sum, a) => sum + (a.exam?.timeLimitMinutes ?? 0),
            0,
        );
        // Estimated question count: ~1.5 questions per minute (LET standard)
        const estimatedQuestions = Math.round(totalQuestions * 1.5);

        // Streak: count unique days (in reverse) from most recent
        const days = new Set<number>();
        for (const a of submitted) {
            if (a.submittedAt) {
                const d = new Date(a.submittedAt);
                days.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
            }
        }
        const sortedDays = [...days].sort((a, b) => b - a);
        let streak = 0;
        if (sortedDays.length > 0) {
            const msPerDay = 86_400_000;
            const today = new Date();
            const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            let cursor = todayMidnight;
            for (const day of sortedDays) {
                if (day === cursor || day === cursor - msPerDay) {
                    streak++;
                    cursor = day - msPerDay;
                } else {
                    break;
                }
            }
        }

        // Average time per question (estimated from timeLimitMinutes, since
        // we don't have actual elapsed-time data on the client).
        const avgMinutesPerQ = submitted.length > 0
            ? Math.round((totalQuestions * 1.5) > 0 ? (totalQuestions / submitted.length) : 0)
            : 0;

        return {
            totalQuestions: estimatedQuestions,
            streak,
            avgTimePerQ: avgMinutesPerQ,
        };
    }, [attempts]);
}

/** Compute stat-tile contextual hints. */
function useStatHints(attempts: RecentAttempt[]) {
    return useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const thisWeek = attempts.filter(
            (a) => a.status === 'SUBMITTED' && a.submittedAt && new Date(a.submittedAt) >= weekAgo,
        ).length;
        const thisMonth = attempts.filter(
            (a) => a.status === 'SUBMITTED' && a.submittedAt && new Date(a.submittedAt) >= monthAgo,
        ).length;

        return { thisWeek, thisMonth };
    }, [attempts]);
}

/* -------------------------------------------------------------------------- */
/*                             Shared components                               */
/* -------------------------------------------------------------------------- */

/** Small mono eyebrow that labels a section. */
const SectionLabel: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({
    children,
    action,
}) => (
    <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
            {children}
        </p>
        {action}
    </div>
);

const scoreTone = (pct: number) =>
    pct >= PASS_MARK
        ? 'text-emerald-600'
        : pct >= 50
            ? 'text-amber-600'
            : 'text-red-500';

const scoreBg = (pct: number) =>
    pct >= PASS_MARK
        ? 'bg-emerald-500'
        : pct >= 50
            ? 'bg-amber-500'
            : 'bg-red-400';

/** Inline mini progress bar for scores. */
const MiniScoreBar: React.FC<{ pct: number }> = ({ pct }) => (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
            className={`h-full rounded-full transition-all duration-500 ${scoreBg(pct)}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
    </div>
);

/* -------------------------------------------------------------------------- */
/*                            Internal sub-sections                            */
/* -------------------------------------------------------------------------- */

/** Subject performance breakdown — top subjects with horizontal bars. */
const SubjectPerformance: React.FC<{ subjects: ReturnType<typeof useSubjectPerformance> }> = ({ subjects }) => {
    if (subjects.length === 0) return null;
    const maxAvg = Math.max(...subjects.map((s) => s.avg), 1);

    return (
        <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-4 sm:p-5">
                <SectionLabel>Subject performance</SectionLabel>
                <div className="mt-2 space-y-3">
                    {subjects.map((s) => {
                        const accent = getSubjectAccent(s.subject);
                        return (
                            <div key={s.subject} className="group">
                                <div className="mb-1 flex items-center justify-between">
                                    <span className={`text-xs font-semibold ${accent.text}`}>
                                        {s.subject}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] text-gray-400">
                                            {s.count} attempt{s.count === 1 ? '' : 's'}
                                        </span>
                                        <span className={`font-mono text-[11px] font-semibold ${scoreTone(s.avg)}`}>
                                            {s.avg}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${accent.bar}`}
                                        style={{ width: `${Math.min(100, (s.avg / maxAvg) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

/** Study progress strip — quick stats between hero and daily challenge. */
const StudyProgressStrip: React.FC<{ progress: ReturnType<typeof useStudyProgress> }> = ({ progress }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
            <div className="flex items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <Target size={14} />
                </div>
                <div>
                    <p className="font-serif text-lg font-semibold leading-none text-[#1A0E0E]">
                        {progress.totalQuestions}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
                        Questions answered
                    </p>
                </div>
            </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
            <div className="flex items-center gap-2">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${progress.streak > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Flame size={14} />
                </div>
                <div>
                    <p className="font-serif text-lg font-semibold leading-none text-[#1A0E0E]">
                        {progress.streak}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">d</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
                        Current streak
                    </p>
                </div>
            </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
            <div className="flex items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Clock size={14} />
                </div>
                <div>
                    <p className="font-serif text-lg font-semibold leading-none text-[#1A0E0E]">
                        {progress.avgTimePerQ || '—'}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">min</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500">
                        Avg per question
                    </p>
                </div>
            </div>
        </div>
    </div>
);

/** Enhanced stat tile with contextual hint. */
const StatTile: React.FC<{
    to: string;
    icon: React.ReactNode;
    value: React.ReactNode;
    label: string;
    hint?: string;
    accent?: string;
}> = ({ to, icon, value, label, hint, accent = 'bg-primary/5 text-primary' }) => (
    <Link
        to={to}
        className="group flex flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
    >
        <div>
            <span className="text-[24px] font-semibold tabular-nums text-slate-950">{value}</span>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p>
            {hint && (
                <p className="mt-0.5 font-mono text-[10px] text-gray-400">{hint}</p>
            )}
        </div>
        <span className={`flex size-9 items-center justify-center rounded-lg transition-colors ${accent}`}>
            {icon}
        </span>
    </Link>
);

/* -------------------------------------------------------------------------- */
/*                              Main Dashboard                                 */
/* -------------------------------------------------------------------------- */

const RevieweeDashboard: React.FC<RevieweeDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Learner';
    const programTrack = user?.program_track || user?.programTrack || user?.program || user?.major || 'Program track not set';
    const upcomingSessions = stats?.upcomingSessions || [];
    const recentAttempts = stats?.recentAttempts || [];
    const upcomingExams = stats?.upcomingExams || [];
    const today = new Date();

    const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
    const [isDailyLoading, setIsDailyLoading] = useState(true);
    const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | ''>('');
    const [dailyResult, setDailyResult] = useState<DailyAnswerResult | null>(null);
    const [dailyError, setDailyError] = useState('');
    const [isSubmittingDaily, setIsSubmittingDaily] = useState(false);
    const [quote, setQuote] = useState<MotivationalQuote>({ text: 'Small, focused practice sessions add up.', author: 'Normalite EDGE' });
    const isQuoteLoading = false;
    const quoteError = '';
    const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

    const todayKey = new Date().toISOString().slice(0, 10);

    const handleRequestAnotherQuote = () => {
        setQuote((current) => current.text.startsWith('Small')
            ? { text: 'Review what you missed, then try again with purpose.', author: 'Normalite EDGE' }
            : { text: 'Small, focused practice sessions add up.', author: 'Normalite EDGE' });
    };

    // Derived data
    const hasAttempts = recentAttempts.length > 0 || (stats?.overallAverage ?? 0) > 0;
    const average = Math.round(Number(stats?.overallAverage ?? 0));
    const meetsPassMark = average >= PASS_MARK;
    const pointsToPass = Math.max(0, PASS_MARK - average);
    const inProgress = recentAttempts.find((a) => a.status === 'IN_PROGRESS');
    const submittedCount = recentAttempts.filter((a) => a.status === 'SUBMITTED').length;

    const subjectPerformance = useSubjectPerformance(recentAttempts);
    const studyProgress = useStudyProgress(recentAttempts);
    const statHints = useStatHints(recentAttempts);

    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const formatDateRange = (startAt: string, endAt: string) => {
        const start = new Date(startAt);
        const end = new Date(endAt);
        const sameDay = start.toDateString() === end.toDateString();
        if (sameDay) {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
        return `${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    };

    const formatDateTime = (dateValue: string) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'TBD';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const isTodaySession = (startAt: string) => {
        const start = new Date(startAt);
        return start.toDateString() === today.toDateString();
    };

    useEffect(() => {
        const loadDailyQuestion = async () => {
            try {
                setIsDailyLoading(true);
                setDailyError('');
                const response = await api.get('/dashboard/daily-question');
                const question = response.data?.data || null;
                setDailyQuestion(question);
                setSelectedChoice('');
                setDailyResult(null);

                if (!question || !user?.id) {
                    return;
                }

                const cached = localStorage.getItem(DAILY_ANSWER_STORAGE_KEY);
                if (!cached) {
                    return;
                }

                try {
                    const parsed = JSON.parse(cached) as DailyAnswerCache;
                    const isMatch = parsed?.date === todayKey
                        && parsed?.userId === user.id
                        && parsed?.questionId === question.questionId
                        && parsed?.result;

                    if (isMatch) {
                        setDailyResult(parsed.result);
                        setSelectedChoice(parsed.result.selectedChoice);
                    }
                } catch {
                    localStorage.removeItem(DAILY_ANSWER_STORAGE_KEY);
                }
            } catch {
                setDailyQuestion(null);
                setDailyError('Failed to load daily question. Please try again.');
            } finally {
                setIsDailyLoading(false);
            }
        };
        loadDailyQuestion();
    }, [todayKey, user?.id]);

    const handleSubmitDailyAnswer = async () => {
        if (!dailyQuestion || !selectedChoice) {
            setDailyError('Please select an answer before submitting.');
            return;
        }
        try {
            setIsSubmittingDaily(true);
            setDailyError('');
            const response = await api.post('/dashboard/daily-question/answer', {
                questionId: dailyQuestion.questionId,
                selectedChoice,
            });
            const result = response.data?.data || null;
            setDailyResult(result);

            if (result && user?.id) {
                const payload: DailyAnswerCache = {
                    date: todayKey,
                    userId: user.id,
                    questionId: dailyQuestion.questionId,
                    result,
                };
                localStorage.setItem(DAILY_ANSWER_STORAGE_KEY, JSON.stringify(payload));
            }
        } catch {
            setDailyError('Unable to submit your answer right now. Please try again.');
        } finally {
            setIsSubmittingDaily(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*                              RENDER                                 */
    /* ------------------------------------------------------------------ */

    const focusAction = inProgress?.exam?.id
        ? { to: `/exams/${inProgress.exam.id}/take`, label: 'Resume your mock', description: inProgress.exam.title || 'Continue the mock exam you started.', icon: <PlayCircle className="size-5" /> }
        : (stats?.totalExamsAvailable ?? 0) > 0
            ? { to: '/exams', label: 'Take a practice exam', description: 'Build confidence with a timed LET mock exam.', icon: <ClipboardList className="size-5" /> }
            : { to: '/study', label: 'Review study materials', description: 'Strengthen a topic before your next mock exam.', icon: <BookOpen className="size-5" /> };

    return (
        <div className="flex flex-col gap-6 pb-8 font-lexend text-slate-900 sm:gap-8">

            {/* ── Header ─────────────────────────────────────────────── */}
            <header data-guide="dashboard-header" className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{dateLabel}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-950">{greeting}, {firstName}</h1>
                        <p className="mt-1 text-sm text-slate-600">Here is the clearest next step for your LET preparation.</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        {programTrack}
                    </span>
                </div>
            </header>

            {/* ── Resume banner ──────────────────────────────────────── */}
            {focusAction && (
                <Link
                    to={focusAction.to}
                    className="answer-grid-invert group flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary p-5 text-white transition-colors hover:bg-primary/95 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-secondary">{focusAction.icon}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">Today’s focus</p>
                            <p className="mt-1 text-lg font-semibold">{focusAction.label}</p>
                            <p className="mt-1 text-sm text-white/80">{focusAction.description}</p>
                        </div>
                    </div>
                    <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground">Get started <ArrowRight className="size-4" /></span>
                </Link>
            )}

            {/* ── Readiness hero + stat tiles ────────────────────────── */}
            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="relative overflow-hidden rounded-2xl border-gray-100 shadow-sm">
                    <div className="answer-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
                    {/* Subtle gradient overlay for depth */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/[0.03]" aria-hidden />
                    <CardContent className="relative p-5 sm:p-6">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gray-500">Exam readiness</p>

                        {hasAttempts ? (
                            <>
                                <div className="mt-2 flex items-end gap-3">
                                    <span className={`font-serif text-5xl font-semibold leading-none ${meetsPassMark ? 'text-emerald-600' : 'text-[#1A0E0E]'}`}>
                                        {average}
                                        <span className="text-2xl">%</span>
                                    </span>
                                    <span className="mb-1 text-sm text-gray-500">
                                        your overall average
                                    </span>
                                </div>

                                {/* Attempt count pill */}
                                <div className="mt-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                                        <ClipboardList size={10} />
                                        {submittedCount} submitted mock{submittedCount === 1 ? '' : 's'}
                                    </span>
                                </div>

                                {/* Meter with the 75% pass-line marker */}
                                <div className="mt-4">
                                    <div className="relative h-3 w-full rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${meetsPassMark ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary/80 to-primary'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, average))}%` }}
                                        />
                                        {/* Pass-line marker */}
                                        <div
                                            className="absolute -top-1 -bottom-1 w-0.5 bg-[#1A0E0E]/80"
                                            style={{ left: `${PASS_MARK}%` }}
                                            aria-hidden
                                        />
                                    </div>
                                    <div className="relative mt-1.5 h-4">
                                        <span
                                            className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-medium text-[#1A0E0E]"
                                            style={{ left: `${PASS_MARK}%` }}
                                        >
                                            75% · LET passing
                                        </span>
                                    </div>
                                </div>

                                <p className="mt-2 text-sm font-medium" style={{ textWrap: 'balance' }}>
                                    {meetsPassMark ? (
                                        <span className="text-emerald-700">Above the 75% passing average. Keep it steady across every area.</span>
                                    ) : (
                                        <span className="text-[#4a3a3a]">
                                            <span className="font-semibold text-primary">{pointsToPass} point{pointsToPass === 1 ? '' : 's'}</span> to the 75% passing average.
                                        </span>
                                    )}
                                </p>
                            </>
                        ) : (
                            <div className="mt-3">
                                <p className="font-serif text-2xl font-semibold text-[#1A0E0E]">No mocks yet</p>
                                <p className="mt-1 max-w-sm text-sm text-gray-500">
                                    Take your first timed mock exam to measure where you stand against the 75% LET passing average.
                                </p>
                                <Link to="/exams">
                                    <Button className="mt-4 h-10 gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-[#5a1010]">
                                        Browse exams <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actionable stat tiles */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <StatTile
                        to="/exams"
                        icon={<ClipboardList className="h-4 w-4" />}
                        value={recentAttempts.length}
                        label="Mocks taken"
                        hint={statHints.thisWeek > 0 ? `${statHints.thisWeek} this week` : statHints.thisMonth > 0 ? `${statHints.thisMonth} this month` : undefined}
                    />
                    <StatTile
                        to="/exams"
                        icon={<FileText className="h-4 w-4" />}
                        value={stats?.totalExamsAvailable ?? 0}
                        label="Exams available"
                    />
                    <StatTile
                        to="/study"
                        icon={<BookOpen className="h-4 w-4" />}
                        value={stats?.totalMaterials ?? 0}
                        label="Study materials"
                    />
                </div>
            </section>

            {/* ── Study progress strip ───────────────────────────────── */}
            <StudyProgressStrip progress={studyProgress} />

            {/* ── Daily challenge ────────────────────────────────────── */}
            <Card data-guide="dashboard-daily-challenge" className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
                <CardContent className="flex items-center gap-3.5 border-l-4 border-secondary p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                        <Zap size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">Daily challenge</p>
                            {dailyResult && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                    dailyResult.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {dailyResult.isCorrect
                                        ? <><CheckCircle2 size={9} /> Correct</>
                                        : <><XCircle size={9} /> Incorrect</>}
                                </span>
                            )}
                        </div>
                        {isDailyLoading ? (
                            <p className="mt-0.5 text-sm text-gray-400">Loading today&rsquo;s question…</p>
                        ) : dailyQuestion ? (
                            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">{dailyQuestion.questionText}</p>
                        ) : (
                            <p className="mt-0.5 text-sm text-gray-400">No question available today.</p>
                        )}
                    </div>
                    {dailyQuestion && (
                        <Button
                            size="sm"
                            variant={dailyResult ? 'outline' : 'default'}
                            className={`h-9 shrink-0 gap-1 rounded-lg px-4 text-xs font-semibold ${
                                !dailyResult ? 'border-0 bg-primary text-white hover:bg-[#5a1010]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => { setIsDailyModalOpen(true); setDailyError(''); }}
                            disabled={isDailyLoading}
                        >
                            {dailyResult ? 'View result' : 'Answer now'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* ── Daily Question Modal ───────────────────────────────── */}
            <Dialog open={isDailyModalOpen} onOpenChange={(open) => { if (!isSubmittingDaily) setIsDailyModalOpen(open); }}>
                <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 font-lexend sm:max-w-lg">
                    <DialogHeader className="border-b border-gray-100 px-5 pb-4 pt-5">
                        <div className="flex items-center gap-2.5">
                            <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
                                <Zap size={14} />
                            </div>
                            <DialogTitle className="font-serif text-base font-semibold text-gray-900">Daily Challenge</DialogTitle>
                            <div className="ml-auto flex items-center gap-1.5">
                                <Badge className="border-none bg-gray-100 font-mono text-[9px] font-medium text-gray-400">
                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Badge>
                            </div>
                        </div>
                    </DialogHeader>

                    {dailyQuestion && (
                        <div className="space-y-3.5 px-5 py-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-sm font-semibold leading-relaxed text-gray-900">{dailyQuestion.questionText}</p>
                            </div>

                            {dailyResult && (
                                <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${
                                    dailyResult.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                                }`}>
                                    {dailyResult.isCorrect
                                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                        : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                                    <p className={`text-xs font-bold ${dailyResult.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {dailyResult.isCorrect
                                            ? 'Correct! Great job.'
                                            : `Not quite. The correct answer was ${dailyResult.correctChoice}.`}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {(['A', 'B', 'C', 'D'] as const).map((choiceKey) => {
                                    const isSelected = selectedChoice === choiceKey;
                                    const isCorrectChoice = dailyResult?.correctChoice === choiceKey;
                                    const isWrongSelection = dailyResult?.selectedChoice === choiceKey && !dailyResult.isCorrect;
                                    const isAnswered = !!dailyResult;

                                    let cardClass = 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 cursor-pointer';
                                    let letterClass = 'bg-gray-100 text-gray-600';
                                    let textClass = 'text-gray-700 font-medium';

                                    if (isAnswered) {
                                        if (isCorrectChoice) {
                                            cardClass = 'border-emerald-300 bg-emerald-50 cursor-default';
                                            letterClass = 'bg-emerald-500 text-white';
                                            textClass = 'text-emerald-800 font-semibold';
                                        } else if (isWrongSelection) {
                                            cardClass = 'border-red-300 bg-red-50 cursor-default';
                                            letterClass = 'bg-red-400 text-white';
                                            textClass = 'text-red-700 font-medium';
                                        } else {
                                            cardClass = 'border-gray-100 bg-gray-50 opacity-50 cursor-default';
                                            letterClass = 'bg-gray-200 text-gray-400';
                                            textClass = 'text-gray-400';
                                        }
                                    } else if (isSelected) {
                                        cardClass = 'border-primary bg-primary/5 cursor-pointer ring-1 ring-primary/20';
                                        letterClass = 'bg-primary text-white';
                                        textClass = 'text-primary font-semibold';
                                    }

                                    return (
                                        <button
                                            key={choiceKey}
                                            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${cardClass}`}
                                            onClick={() => {
                                                if (!isAnswered && !isSubmittingDaily) {
                                                    setSelectedChoice(choiceKey);
                                                    setDailyError('');
                                                }
                                            }}
                                        >
                                            <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${letterClass}`}>
                                                {choiceKey}
                                            </span>
                                            <span className={`flex-1 text-xs leading-relaxed ${textClass}`}>
                                                {dailyQuestion.choices[choiceKey]}
                                            </span>
                                            {isAnswered && isCorrectChoice && (
                                                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                                            )}
                                            {isAnswered && isWrongSelection && (
                                                <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {dailyResult && (
                                <div className="flex gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                                    <div>
                                        <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-blue-500">Rationalization</p>
                                        <p className="text-xs leading-relaxed text-blue-800">
                                            {dailyResult.rationalization || 'No rationalization provided for this question.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {dailyError && (
                                <p className="text-xs font-medium text-red-600">{dailyError}</p>
                            )}

                            {!dailyResult && (
                                <Button
                                    onClick={handleSubmitDailyAnswer}
                                    disabled={isSubmittingDaily || !selectedChoice}
                                    className="h-10 w-full rounded-xl text-sm font-bold"
                                >
                                    {isSubmittingDaily ? (
                                        <span className="flex items-center gap-2">
                                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Submitting…
                                        </span>
                                    ) : 'Submit answer'}
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Main content grid ──────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">

                {/* Primary panel — Recent attempts + Subject performance */}
                <section data-guide="dashboard-primary-panel" className="lg:col-span-2 flex flex-col gap-4">
                    {/* Subject performance breakdown */}
                    {subjectPerformance.length > 0 && (
                        <SubjectPerformance subjects={subjectPerformance} />
                    )}

                    {/* Recent attempts */}
                    <div>
                        <SectionLabel
                            action={
                                <Link to="/exams" className="font-mono text-[11px] font-semibold text-primary hover:underline">
                                    View all
                                </Link>
                            }
                        >
                            Recent mock attempts
                        </SectionLabel>

                        <Card className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
                            {recentAttempts.length > 0 ? (
                                <ul className="divide-y divide-gray-100">
                                    {recentAttempts.map((attempt) => {
                                        const pct = Number(attempt.percentage || 0);
                                        const isDone = attempt.status === 'SUBMITTED';
                                        const href = attempt.exam?.id
                                            ? (isDone ? `/exams/${attempt.exam.id}/result` : `/exams/${attempt.exam.id}/take`)
                                            : null;

                                        // Subject label
                                        const rawSubject = attempt.exam?.subject;
                                        const subjectLabel = (!rawSubject || rawSubject.toLowerCase() === 'general section')
                                            ? null
                                            : rawSubject;
                                        const subjectAccent = subjectLabel ? getSubjectAccent(subjectLabel) : null;

                                        const rowClass = 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between';
                                        const rowInner = (
                                            <>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-gray-900">{attempt.exam?.title || 'Mock Exam'}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        <span className="font-mono text-[11px] text-gray-500">
                                                            {attempt.exam?.timeLimitMinutes || 0} min
                                                            {attempt.submittedAt
                                                                ? ` · ${new Date(attempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                                : ' · in progress'}
                                                        </span>
                                                        {subjectLabel && subjectAccent && (
                                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold ${subjectAccent.bg} ${subjectAccent.text}`}>
                                                                {subjectLabel}
                                                            </span>
                                                        )}
                                                        <Badge className={`border-none text-[9px] font-bold uppercase ${
                                                            attempt.submissionType === 'AUTO' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                            {attempt.submissionType === 'AUTO' ? 'Auto' : 'Submitted'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {isDone ? (
                                                        <div className="min-w-[72px]">
                                                            <div className="flex items-center justify-between sm:justify-end sm:text-right">
                                                                <p className={`font-serif text-xl font-semibold leading-none ${scoreTone(pct)}`}>{pct.toFixed(0)}%</p>
                                                                <span className="font-mono text-[10px] text-gray-500 sm:hidden">{attempt.score} pts</span>
                                                            </div>
                                                            <div className="mt-1.5">
                                                                <MiniScoreBar pct={pct} />
                                                            </div>
                                                            <p className="mt-0.5 font-mono text-[10px] text-gray-500 sm:text-right">{attempt.score} pts</p>
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-amber-600">Resume</span>
                                                    )}
                                                </div>
                                            </>
                                        );
                                        return (
                                            <li key={attempt.id}>
                                                {href ? (
                                                    <Link to={href} className={`${rowClass} transition-colors hover:bg-gray-50/70`}>
                                                        {rowInner}
                                                    </Link>
                                                ) : (
                                                    <div className={rowClass}>{rowInner}</div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                    <ClipboardList className="h-6 w-6 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-500">No attempts yet</p>
                                    <p className="max-w-xs text-xs text-gray-400">
                                        Your mock exam scores will show up here once you finish your first one.
                                    </p>
                                    <Link to="/exams">
                                        <Button variant="outline" className="mt-2 h-9 rounded-lg text-xs font-semibold">Browse exams</Button>
                                    </Link>
                                </div>
                            )}
                        </Card>
                    </div>
                </section>

                {/* ── Sidebar ──────────────────────────────────────── */}
                <div data-guide="dashboard-side-panel" className="flex flex-col gap-4 lg:gap-5">
                    {/* Upcoming Exams */}
                    <div>
                        <SectionLabel
                            action={
                                <Link to="/exams" className="font-mono text-[11px] font-semibold text-primary hover:underline">
                                    View all
                                </Link>
                            }
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarClock className="h-3 w-3 text-emerald-500" /> Upcoming exams
                            </span>
                        </SectionLabel>
                        <Card className="rounded-2xl border-gray-100 shadow-sm">
                            <CardContent className="divide-y divide-gray-100 p-0">
                                {upcomingExams.length > 0 ? upcomingExams.slice(0, 5).map((exam) => {
                                    const rawSubject = exam.subject;
                                    const subjectLabel = (!rawSubject || rawSubject.toLowerCase() === 'general section')
                                        ? null
                                        : rawSubject;
                                    const accent = subjectLabel ? getSubjectAccent(subjectLabel) : null;
                                    return (
                                        <Link
                                            key={exam.id}
                                            to={`/exams`}
                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/70"
                                        >
                                            <div className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                                <CalendarClock className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-gray-900">{exam.title}</p>
                                                <div className="mt-0.5 flex items-center gap-1.5">
                                                    {subjectLabel && accent && (
                                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold ${accent.bg} ${accent.text}`}>
                                                            {subjectLabel}
                                                        </span>
                                                    )}
                                                    <span className="truncate font-mono text-[11px] text-gray-500">
                                                        {formatDateTime(exam.scheduleStart)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                }) : (
                                    <div className="px-4 py-6 text-center">
                                        <p className="text-xs font-medium text-gray-400">No upcoming exams</p>
                                        <Link to="/exams">
                                            <Button variant="outline" size="sm" className="mt-2 h-8 rounded-lg text-[11px] font-semibold">
                                                Browse exams
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Upcoming conferences */}
                    <div>
                        <SectionLabel
                            action={
                                <Link to="/conferences" className="font-mono text-[11px] font-semibold text-primary hover:underline">
                                    View all
                                </Link>
                            }
                        >
                            Upcoming conferences
                        </SectionLabel>
                        <Card className="rounded-2xl border-gray-100 shadow-sm">
                            <CardContent className="divide-y divide-gray-100 p-0">
                                {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 3).map((session) => (
                                    <Link to="/conferences" key={session.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/70">
                                        <div className="shrink-0 rounded-lg bg-primary/5 p-2 text-primary">
                                            <Video className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-900">{session.title}</p>
                                            <p className="truncate font-mono text-[11px] text-gray-500">
                                                {formatDateRange(session.startAt, session.endAt)}
                                            </p>
                                        </div>
                                        {isTodaySession(session.startAt) && (
                                            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-primary">Today</span>
                                        )}
                                    </Link>
                                )) : (
                                    <div className="px-4 py-8 text-center text-xs font-medium text-gray-400">
                                        No upcoming conferences.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Calendar & events */}
                    <CalendarEventsWidget />

                    {/* Quote of the day */}
                    <div>
                        <SectionLabel
                            action={
                                <button
                                    type="button"
                                    className="font-mono text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                                    onClick={handleRequestAnotherQuote}
                                    disabled={isQuoteLoading}
                                >
                                    Shuffle
                                </button>
                            }
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-secondary" /> Quote of the day
                            </span>
                        </SectionLabel>
                        <Card className="rounded-2xl border-gray-100 shadow-sm">
                            <CardContent className="space-y-1.5 px-4 py-4">
                                {isQuoteLoading ? (
                                    <p className="text-sm text-gray-400">Loading quote…</p>
                                ) : quote ? (
                                    <>
                                        <p className="font-serif text-[15px] italic leading-relaxed text-gray-700">&ldquo;{quote.text}&rdquo;</p>
                                        <p className="font-mono text-[11px] font-medium text-primary">— {quote.author}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400">Unable to load quote right now.</p>
                                )}
                                {quoteError && (
                                    <p className="font-mono text-[10px] font-medium text-amber-600">{quoteError}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevieweeDashboard;
