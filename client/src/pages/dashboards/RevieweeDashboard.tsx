import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    CalendarClock,
    ClipboardList,
    PlayCircle,
    Sparkles,
    Video,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionLabel } from '@/components/dashboard/reviewee/SectionLabel';
import { ExamReadinessHero } from '@/components/dashboard/reviewee/ExamReadinessHero';
import { StatTiles } from '@/components/dashboard/reviewee/StatTiles';
import { StreakWidget } from '@/components/dashboard/reviewee/StreakWidget';
import { StudyProgressStrip } from '@/components/dashboard/reviewee/StudyProgressStrip';
import { DailyChallenge } from '@/components/dashboard/reviewee/DailyChallenge';
import { SubjectPerformance } from '@/components/dashboard/reviewee/SubjectPerformance';
import { RecentAttempts } from '@/components/dashboard/reviewee/RecentAttempts';
import CalendarEventsWidget from './CalendarEventsWidget';
import { useStreakData } from '@/hooks/useStreakData';
import StreakCelebration from '@/components/StreakCelebration';
import type {
    RecentAttempt,
    RevieweeStats,
    SubjectPerformanceItem,
} from '@/components/dashboard/reviewee/types';

interface RevieweeDashboardProps {
    stats: RevieweeStats | null;
}

/** Subject-level averages from submitted attempts, sorted by volume then score. */
function useSubjectPerformance(attempts: RecentAttempt[]): SubjectPerformanceItem[] {
    return useMemo(() => {
        const grouped: Record<string, { total: number; count: number; best: number }> = {};
        for (const a of attempts) {
            if (a.status !== 'SUBMITTED') continue;
            const raw = a.exam?.subject;
            const subject = !raw || raw.toLowerCase() === 'general section' ? 'General' : raw;
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



const getSubjectLabel = (raw: string | null | undefined): string | null => {
    if (!raw || raw.toLowerCase() === 'general section') return null;
    return raw;
};

const RevieweeDashboard: React.FC<RevieweeDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Learner';
    const programTrack =
        user?.program_track || user?.programTrack || user?.program || user?.major || 'Program track not set';

    const upcomingSessions = stats?.upcomingSessions || [];
    const recentAttempts = stats?.recentAttempts || [];
    const upcomingExams = stats?.upcomingExams || [];

    const today = new Date();
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const hasAttempts = recentAttempts.length > 0 || (stats?.overallAverage ?? 0) > 0;
    const average = Math.round(Number(stats?.overallAverage ?? 0));
    const submittedCount = recentAttempts.filter((a) => a.status === 'SUBMITTED').length;
    const inProgress = recentAttempts.find((a) => a.status === 'IN_PROGRESS');

    const subjectPerformance = useSubjectPerformance(recentAttempts);
    const { data: streakData, loading: streakLoading } = useStreakData();
    const navigate = useNavigate();

    // ── Streak gain detection ──────────────────────────────────────
    const prevStreakRef = useRef<number | null>(null);
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const [celebrationStreakCount, setCelebrationStreakCount] = useState(0);

    useEffect(() => {
        if (streakLoading || !streakData) return;

        const current = streakData.currentStreak;
        const prev = prevStreakRef.current;

        // First load: just record the value, don't celebrate
        if (prev === null) {
            prevStreakRef.current = current;
            return;
        }

        // Streak increased: celebrate
        if (current > prev) {
            setCelebrationStreakCount(current);
            setShowStreakCelebration(true);
        }

        prevStreakRef.current = current;
    }, [streakData, streakLoading]);

    const focusAction = inProgress?.exam?.id
        ? {
              to: `/exams/${inProgress.exam.id}/take`,
              label: 'Resume your mock',
              description: inProgress.exam.title || 'Continue the mock exam you started.',
              icon: <PlayCircle className="size-5" />,
          }
        : (stats?.totalExamsAvailable ?? 0) > 0
          ? {
                to: '/exams',
                label: 'Take a practice exam',
                description: 'Build confidence with a timed LET mock exam.',
                icon: <ClipboardList className="size-5" />,
            }
          : {
                to: '/study',
                label: 'Review study materials',
                description: 'Strengthen a topic before your next mock exam.',
                icon: <BookOpen className="size-5" />,
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

    const formatDateRange = (startAt: string, endAt: string) => {
        const start = new Date(startAt);
        const end = new Date(endAt);
        const sameDay = start.toDateString() === end.toDateString();
        if (sameDay) {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
        return `${start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    };

    const isTodaySession = (startAt: string) =>
        new Date(startAt).toDateString() === today.toDateString();

    const [quote, setQuote] = useState({
        text: 'Small, focused practice sessions add up.',
        author: 'Normalite EDGE',
    });

    const handleRequestAnotherQuote = () => {
        setQuote((current) =>
            current.text.startsWith('Small')
                ? { text: 'Review what you missed, then try again with purpose.', author: 'Normalite EDGE' }
                : { text: 'Small, focused practice sessions add up.', author: 'Normalite EDGE' },
        );
    };

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header data-guide="dashboard-header" className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{dateLabel}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                            {greeting}, {firstName}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Here is the clearest next step for your LET preparation.
                        </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        {programTrack}
                    </span>
                </div>
            </header>

            {/* ── Focus banner ───────────────────────────────────────── */}
            {focusAction && (
                <Link
                    to={focusAction.to}
                    className="answer-grid-invert group flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary p-5 text-white transition-colors hover:bg-primary/95 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-secondary">
                            {focusAction.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
                                Today&rsquo;s focus
                            </p>
                            <p className="mt-1 text-lg font-semibold">{focusAction.label}</p>
                            <p className="mt-1 text-sm text-white/80">{focusAction.description}</p>
                        </div>
                    </div>
                    <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground">
                        Get started <ArrowRight className="size-4" />
                    </span>
                </Link>
            )}

            {/* ── Readiness hero + stat tiles ────────────────────────── */}
            <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                <ExamReadinessHero average={average} submittedCount={submittedCount} hasAttempts={hasAttempts} />
                <div className="flex flex-col gap-3">
                    <StatTiles
                        totalMaterials={stats?.totalMaterials ?? 0}
                        totalExamsTaken={stats?.totalExamsTaken ?? recentAttempts.length}
                        average={hasAttempts ? average : null}
                    />
                    <StreakWidget
                        currentStreak={streakData?.currentStreak ?? 0}
                        longestStreak={streakData?.longestStreak ?? 0}
                        activeDays={streakData?.activeDays ?? []}
                        onStartStreak={() => navigate('/exams')}
                    />
                </div>
            </section>

            {/* ── Study progress strip ───────────────────────────────── */}
            <StudyProgressStrip averages={stats?.averagesBySubject} loading={false} />

            {/* ── Daily challenge ────────────────────────────────────── */}
            <DailyChallenge />

            {/* ── Main content grid ──────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
                <section data-guide="dashboard-primary-panel" className="flex flex-col gap-3 lg:col-span-2">
                    <SubjectPerformance subjects={subjectPerformance} />
                    <RecentAttempts attempts={recentAttempts} />
                </section>

                {/* ── Sidebar ─────────────────────────────────────── */}
                <div data-guide="dashboard-side-panel" className="flex flex-col gap-3">
                    {/* Upcoming exams */}
                    <div>
                        <SectionLabel
                            action={
                                <Link to="/exams" className="text-xs font-semibold text-primary hover:underline">
                                    View all
                                </Link>
                            }
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarClock className="h-3 w-3 text-emerald-600" /> Upcoming exams
                            </span>
                        </SectionLabel>
                        <Card>
                            <CardContent className="divide-y divide-slate-200 p-0">
                                {upcomingExams.length > 0 ? (
                                    upcomingExams.slice(0, 5).map((exam) => {
                                        const subject = getSubjectLabel(exam.subject);
                                        return (
                                            <Link
                                                key={exam.id}
                                                to="/exams"
                                                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                                            >
                                                <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500">
                                                    <CalendarClock className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        {exam.title}
                                                    </p>
                                                    <div className="mt-0.5 flex items-center gap-1.5">
                                                        {subject && (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                                {subject}
                                                            </span>
                                                        )}
                                                        <span className="truncate text-xs text-slate-500">
                                                            {formatDateTime(exam.scheduleStart)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <p className="text-xs font-semibold text-slate-500">No upcoming exams</p>
                                        <Link to="/exams">
                                            <Button variant="outline" size="sm" className="mt-2">
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
                                <Link
                                    to="/conferences"
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    View all
                                </Link>
                            }
                        >
                            Upcoming conferences
                        </SectionLabel>
                        <Card>
                            <CardContent className="divide-y divide-slate-200 p-0">
                                {upcomingSessions.length > 0 ? (
                                    upcomingSessions.slice(0, 3).map((session) => (
                                        <Link
                                            to="/conferences"
                                            key={session.id}
                                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                                        >
                                            <div className="shrink-0 rounded-lg bg-primary/5 p-2 text-primary">
                                                <Video className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {session.title}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {formatDateRange(session.startAt, session.endAt)}
                                                </p>
                                            </div>
                                            {isTodaySession(session.startAt) && (
                                                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-primary">
                                                    Today
                                                </span>
                                            )}
                                        </Link>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-xs font-medium text-slate-500">
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
                                    className="text-xs font-semibold text-primary hover:underline"
                                    onClick={handleRequestAnotherQuote}
                                >
                                    Shuffle
                                </button>
                            }
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-secondary" /> Quote of the day
                            </span>
                        </SectionLabel>
                        <Card>
                            <CardContent className="space-y-1.5 px-4 py-4">
                                <p className="text-sm italic leading-relaxed text-slate-700">&ldquo;{quote.text}&rdquo;</p>
                                <p className="text-[11px] font-semibold text-primary">— {quote.author}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <StreakCelebration
                trigger={showStreakCelebration}
                streakCount={celebrationStreakCount}
                onComplete={() => setShowStreakCelebration(false)}
            />
        </div>
    );
};

export default RevieweeDashboard;
