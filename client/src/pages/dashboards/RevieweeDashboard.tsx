import React, { useState } from 'react';
import { CalendarClock, Sparkles, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionLabel } from '@/components/dashboard/reviewee/SectionLabel';
import { ReadinessRing } from '@/components/dashboard/reviewee/ReadinessRing';
import { StatTiles } from '@/components/dashboard/reviewee/StatTiles';
import { StreakWidget } from '@/components/dashboard/reviewee/StreakWidget';
import { DailyChallenge } from '@/components/dashboard/reviewee/DailyChallenge';
import { RecentAttempts } from '@/components/dashboard/reviewee/RecentAttempts';
import { useStreakContext } from '@/contexts/StreakContext';
import { StartStreakModal } from '@/components/StartStreakModal';
import type { RevieweeStats } from '@/components/dashboard/reviewee/types';

interface RevieweeDashboardProps {
    stats: RevieweeStats | null;
}

const getSubjectLabel = (raw: string | null | undefined): string | null => {
    if (!raw || raw.toLowerCase() === 'general section') return null;
    return raw;
};

const RevieweeDashboard: React.FC<RevieweeDashboardProps> = ({ stats }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[0] || 'Learner';

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

    const { streakCount, longestStreak, activeDays, refetchStreak } = useStreakContext();
    const navigate = useNavigate();

    const [streakModalOpen, setStreakModalOpen] = useState(false);

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

    const handleStreakChoice = (choice: 'daily-question' | 'study-deck' | 'take-exam') => {
        switch (choice) {
            case 'daily-question': {
                // DailyChallenge is rendered exactly once, but keep the
                // querySelectorAll + visibility check as a defensive measure
                // in case another instance ever sneaks in.
                const targets = Array.from(document.querySelectorAll<HTMLElement>('#daily-challenge'));
                const visible = targets.find((node) => node.offsetParent !== null);
                (visible ?? targets[0])?.scrollIntoView({ behavior: 'smooth' });
                break;
            }
            case 'study-deck':
                navigate('/study');
                break;
            case 'take-exam':
                navigate('/exams');
                break;
        }
    };

    const readiness = (
        <ReadinessRing average={average} submittedCount={submittedCount} hasAttempts={hasAttempts} />
    );

    const streakAndChallenge = (
        <div className="flex flex-col gap-3">
            <StreakWidget
                currentStreak={streakCount}
                longestStreak={longestStreak}
                activeDays={activeDays}
                onStartStreak={() => setStreakModalOpen(true)}
            />
            <DailyChallenge onAnswered={refetchStreak} />
        </div>
    );

    return (
        <div className="flex flex-col gap-3 pb-6 font-lexend">
            {/* ── Header (mobile: greeting + date only; desktop adds subtitle) ── */}
            <header data-guide="dashboard-header" className="flex flex-col gap-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{dateLabel}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                        {greeting}, {firstName}
                    </h1>
                    <p className="hidden text-sm text-slate-600 lg:block">
                        Here is the clearest next step for your LET preparation.
                    </p>
                </div>
            </header>

            {/* ── Dashboard body ─────────────────────────────────────────── */}
            {/* Single responsive grid visible at every breakpoint. The streak +
                daily-challenge row renders exactly once, so DailyChallenge mounts a
                single #daily-challenge node (one fetch, one tour target). StatTiles
                and the side panel are desktop-only. */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr] lg:gap-3">
                {/* Main column */}
                <section data-guide="dashboard-primary-panel" className="flex flex-col gap-3">
                    {/* Readiness ring */}
                    {readiness}

                    {/* Streak + daily challenge (rendered once at all breakpoints) */}
                    {streakAndChallenge}

                    {/* Stat tiles (desktop only) */}
                    <div className="hidden lg:block">
                        <StatTiles
                            totalMaterials={stats?.totalMaterials ?? 0}
                            totalExamsTaken={stats?.totalExamsTaken ?? recentAttempts.length}
                            average={hasAttempts ? average : null}
                        />
                    </div>

                    {/* Recent attempts */}
                    <RecentAttempts attempts={recentAttempts} maxVisible={3} />
                </section>

                {/* Sidebar (desktop only) */}
                <div data-guide="dashboard-side-panel" className="hidden flex-col gap-3 lg:flex">
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

            <StartStreakModal
                open={streakModalOpen}
                onOpenChange={setStreakModalOpen}
                onSelect={handleStreakChoice}
            />
        </div>
    );
};

export default RevieweeDashboard;
