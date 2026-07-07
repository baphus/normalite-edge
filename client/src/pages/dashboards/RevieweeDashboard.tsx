import React, { useEffect, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ClipboardList,
    FileText,
    Lightbulb,
    PlayCircle,
    Sparkles,
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

type MotivationalQuote = {
    text: string;
    author: string;
};

const QUOTE_STORAGE_KEY = 'reviewee-dashboard-daily-quote';
const DAILY_ANSWER_STORAGE_KEY = 'reviewee-dashboard-daily-answer';

/** The LET headline passing mark is a 75% general average. */
const PASS_MARK = 75;

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
    } | null;
}

/** Small mono eyebrow that labels a section (shared look with the marketing site). */
const SectionLabel: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({
    children,
    action,
}) => (
    <div className="mb-2.5 flex items-center justify-between">
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

const RevieweeDashboard: React.FC<RevieweeDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Learner';
    const programTrack = user?.program_track || user?.programTrack || user?.program || user?.major || 'Program track not set';
    const upcomingSessions = stats?.upcomingSessions || [];
    const recentAttempts = stats?.recentAttempts || [];
    const today = new Date();

    const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
    const [isDailyLoading, setIsDailyLoading] = useState(true);
    const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | ''>('');
    const [dailyResult, setDailyResult] = useState<DailyAnswerResult | null>(null);
    const [dailyError, setDailyError] = useState('');
    const [isSubmittingDaily, setIsSubmittingDaily] = useState(false);
    const [quote, setQuote] = useState<MotivationalQuote | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(true);
    const [quoteError, setQuoteError] = useState('');
    const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

    const todayKey = new Date().toISOString().slice(0, 10);

    // Readiness figures
    const hasAttempts = recentAttempts.length > 0 || (stats?.overallAverage ?? 0) > 0;
    const average = Math.round(Number(stats?.overallAverage ?? 0));
    const meetsPassMark = average >= PASS_MARK;
    const pointsToPass = Math.max(0, PASS_MARK - average);
    const inProgress = recentAttempts.find((a) => a.status === 'IN_PROGRESS');

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

    const isTodaySession = (startAt: string) => {
        const start = new Date(startAt);
        return start.toDateString() === today.toDateString();
    };

    const fallbackQuotes: MotivationalQuote[] = [
        { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
        { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
        { text: 'Do something today that your future self will thank you for.', author: 'Unknown' },
        { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
    ];

    const loadMotivationalQuote = async (ignoreCache = false) => {
        try {
            setIsQuoteLoading(true);
            setQuoteError('');

            const todayKey = new Date().toISOString().slice(0, 10);

            if (!ignoreCache) {
                const cached = localStorage.getItem(QUOTE_STORAGE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached) as { date: string; quote: MotivationalQuote };
                    if (parsed?.date === todayKey && parsed?.quote?.text) {
                        setQuote(parsed.quote);
                        return;
                    }
                }
            }

            const response = await fetch('https://dummyjson.com/quotes/random');
            if (!response.ok) throw new Error('Failed to fetch quote');
            const data = await response.json();
            const dailyQuote = {
                text: data?.quote || fallbackQuotes[0].text,
                author: data?.author || 'Unknown',
            };
            setQuote(dailyQuote);
            localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({ date: todayKey, quote: dailyQuote }));
        } catch {
            const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            setQuote(randomFallback);
            localStorage.setItem(
                QUOTE_STORAGE_KEY,
                JSON.stringify({ date: new Date().toISOString().slice(0, 10), quote: randomFallback })
            );
            setQuoteError('Showing offline daily quote.');
        } finally {
            setIsQuoteLoading(false);
        }
    };

    const handleRequestAnotherQuote = () => {
        loadMotivationalQuote(true);
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

    useEffect(() => {
        loadMotivationalQuote();
    }, []);

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

    return (
        <div className="flex flex-col gap-5 pb-8 font-lexend text-[#1A0E0E]">
            {/* Header */}
            <header data-guide="dashboard-header" className="flex flex-col gap-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">{dateLabel}</p>
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1A0E0E] sm:text-3xl">
                        {greeting}, {firstName}.
                    </h1>
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-primary">
                        {programTrack}
                    </span>
                </div>
            </header>

            {/* Resume banner — only when an attempt is mid-flight and linkable */}
            {inProgress?.exam?.id && (
                <Link
                    to={`/exams/${inProgress.exam?.id}/take`}
                    className="group flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary px-4 py-3.5 text-white shadow-sm transition-all hover:-translate-y-0.5"
                >
                    <PlayCircle className="h-5 w-5 shrink-0 text-secondary" />
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Pick up where you left off</p>
                        <p className="truncate text-sm font-semibold">{inProgress.exam?.title || 'Your mock exam'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
            )}

            {/* Readiness hero — the one question a reviewee is really asking */}
            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="relative overflow-hidden rounded-2xl border-gray-100 shadow-sm">
                    <div className="answer-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
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
                                        your overall average across all mock exams
                                    </span>
                                </div>

                                {/* Meter with the 75% pass-line marker */}
                                <div className="mt-5">
                                    <div className="relative h-3 w-full rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full ${meetsPassMark ? 'bg-emerald-500' : 'bg-primary'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, average))}%` }}
                                        />
                                        <div
                                            className="absolute -top-1 -bottom-1 w-0.5 bg-[#1A0E0E]"
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

                                <p className="mt-3 text-sm font-medium">
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
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                    <StatTile
                        to="/exams"
                        icon={<ClipboardList className="h-4 w-4" />}
                        value={recentAttempts.length}
                        label="Mocks taken"
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

            {/* Daily challenge */}
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

            {/* Daily Question Modal (logic unchanged) */}
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

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Recent attempts */}
                <section data-guide="dashboard-primary-panel" className="lg:col-span-2">
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
                                    const rowClass = 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between';
                                    const rowInner = (
                                        <>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-900">{attempt.exam?.title || 'Mock Exam'}</p>
                                                <p className="mt-0.5 font-mono text-[11px] text-gray-500">
                                                    {attempt.exam?.timeLimitMinutes || 0} min
                                                    {attempt.submittedAt
                                                        ? ` · ${new Date(attempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                        : ' · in progress'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {isDone ? (
                                                    <div className="text-left sm:text-right">
                                                        <p className={`font-serif text-xl font-semibold leading-none ${scoreTone(pct)}`}>{pct.toFixed(0)}%</p>
                                                        <p className="mt-0.5 font-mono text-[10px] text-gray-500">{attempt.score} pts</p>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-amber-600">Resume</span>
                                                )}
                                                <Badge className={`border-none text-[9px] font-bold uppercase ${
                                                    attempt.submissionType === 'AUTO' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    {attempt.submissionType === 'AUTO' ? 'Auto' : 'Submitted'}
                                                </Badge>
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
                </section>

                {/* Sidebar */}
                <div data-guide="dashboard-side-panel" className="flex flex-col gap-5">
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

/** Compact, tappable metric that navigates somewhere useful. */
const StatTile: React.FC<{
    to: string;
    icon: React.ReactNode;
    value: React.ReactNode;
    label: string;
}> = ({ to, icon, value, label }) => (
    <Link
        to={to}
        className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 sm:p-4 lg:flex-row lg:items-center"
    >
        <div>
            <span className="font-serif text-2xl font-semibold text-[#1A0E0E]">{value}</span>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
        </div>
        <span className="mt-2 flex size-8 items-center justify-center rounded-lg bg-primary/5 text-primary transition-colors group-hover:bg-primary/10 lg:mt-0">
            {icon}
        </span>
    </Link>
);

export default RevieweeDashboard;
