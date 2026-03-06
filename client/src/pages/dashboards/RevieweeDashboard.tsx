import React, { useEffect, useState } from 'react';
import {
    Sparkles,
    Video,
    Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

interface RevieweeDashboardProps {
    stats: {
        overallAverage?: number;
        totalMaterials?: number;
        totalExamsAvailable?: number;
        upcomingSessions?: UpcomingSession[];
        recentAttempts?: RecentAttempt[];
    } | null;
}

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

    const loadMotivationalQuote = async () => {
        try {
            setIsQuoteLoading(true);
            setQuoteError('');

            const todayKey = new Date().toISOString().slice(0, 10);
            const cached = localStorage.getItem(QUOTE_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached) as { date: string; quote: MotivationalQuote };
                if (parsed?.date === todayKey && parsed?.quote?.text) {
                    setQuote(parsed.quote);
                    return;
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
        setQuoteError('Quote of the Day updates once daily. Please come back tomorrow for a new one.');
    };

    useEffect(() => {
        const loadDailyQuestion = async () => {
            try {
                setIsDailyLoading(true);
                setDailyError('');
                const response = await api.get('/dashboard/daily-question');
                setDailyQuestion(response.data?.data || null);
                setSelectedChoice('');
                setDailyResult(null);
            } catch {
                setDailyQuestion(null);
                setDailyError('Failed to load daily question. Please try again.');
            } finally {
                setIsDailyLoading(false);
            }
        };
        loadDailyQuestion();
    }, []);

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
            setDailyResult(response.data?.data || null);
        } catch {
            setDailyError('Unable to submit your answer right now. Please try again.');
        } finally {
            setIsSubmittingDaily(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">{programTrack}</p>
                </div>
                <span className="text-sm font-semibold text-gray-500">Welcome back, {firstName} 👋</span>
            </header>

            {/* Daily Question — compact card */}
            <Card className="border-gray-100 shadow-sm rounded-lg">
                <CardContent className="p-3 flex items-center gap-3">
                    <div className="shrink-0 p-2 rounded-md bg-primary/10 text-primary">
                        <Zap size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Daily Question</p>
                        {isDailyLoading ? (
                            <p className="text-xs text-gray-400">Loading...</p>
                        ) : dailyQuestion ? (
                            <p className="text-xs font-semibold text-gray-800 truncate">{dailyQuestion.questionText}</p>
                        ) : (
                            <p className="text-xs text-gray-400">No question available today.</p>
                        )}
                    </div>
                    {dailyQuestion && (
                        <Button
                            size="sm"
                            className="shrink-0 h-7 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-white gap-1"
                            onClick={() => { setIsDailyModalOpen(true); setDailyError(''); }}
                            disabled={isDailyLoading}
                        >
                            {dailyResult ? 'View Result' : 'Answer Now →'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Daily Question Modal */}
            <Dialog open={isDailyModalOpen} onOpenChange={(open) => { if (!isSubmittingDaily) setIsDailyModalOpen(open); }}>
                <DialogContent className="sm:max-w-lg rounded-lg font-lexend">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="text-sm font-bold text-gray-900">Daily Question</DialogTitle>
                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold uppercase">Today</Badge>
                        </div>
                    </DialogHeader>

                    {dailyQuestion && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{dailyQuestion.questionText}</p>

                            {!dailyResult && (
                                <RadioGroup
                                    value={selectedChoice}
                                    onValueChange={(value) => { setSelectedChoice(value as 'A' | 'B' | 'C' | 'D'); setDailyError(''); }}
                                    className="gap-2"
                                >
                                    {(['A', 'B', 'C', 'D'] as const).map((choiceKey) => (
                                        <div key={choiceKey} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 transition-colors hover:bg-gray-50">
                                            <RadioGroupItem value={choiceKey} id={`dq-${choiceKey}`} className="mt-0.5" />
                                            <Label htmlFor={`dq-${choiceKey}`} className="cursor-pointer text-xs text-gray-700 leading-relaxed">
                                                <span className="font-bold mr-1">{choiceKey}.</span>
                                                {dailyQuestion.choices[choiceKey]}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {dailyResult && (
                                <div className={`rounded-lg border p-3 space-y-1.5 ${
                                    dailyResult.isCorrect ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                                }`}>
                                    <p className={`text-xs font-bold ${ dailyResult.isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                                        {dailyResult.isCorrect ? '\u2713 Correct! Great job.' : '\u2717 Not quite this time.'}
                                    </p>
                                    <p className="text-xs text-gray-700"><span className="font-bold">Question:</span> {dailyQuestion.questionText}</p>
                                    <p className="text-xs text-gray-700">Your answer: <span className="font-bold">{dailyResult.selectedChoice}</span></p>
                                    <p className="text-xs text-gray-700">Correct answer: <span className="font-bold">{dailyResult.correctChoice}</span></p>
                                    <p className="text-xs text-gray-600">
                                        <span className="font-bold text-gray-700">Rationalization:</span>{' '}
                                        {dailyResult.rationalization || 'No rationalization provided.'}
                                    </p>
                                </div>
                            )}

                            {dailyError && <p className="text-xs text-red-600 font-medium">{dailyError}</p>}

                            {!dailyResult && (
                                <Button
                                    onClick={handleSubmitDailyAnswer}
                                    disabled={isSubmittingDaily || !selectedChoice}
                                    className="w-full h-8 text-xs font-bold"
                                >
                                    {isSubmittingDaily ? 'Submitting...' : 'Submit Answer'}
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Left 2/3 — recent attempts */}
                <section className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">My Recent Exam Attempts</h2>
                        <Link to="/exams">
                            <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">View All</Button>
                        </Link>
                    </div>

                    <Card className="border-gray-100 shadow-sm rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-gray-100">
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Exam</TableHead>
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Score</TableHead>
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Date</TableHead>
                                    <TableHead className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentAttempts.length > 0 ? recentAttempts.map((attempt) => (
                                    <TableRow key={attempt.id} className="border-gray-100 hover:bg-gray-50/70">
                                        <TableCell className="px-3 py-2.5">
                                            <p className="text-xs font-bold text-gray-900 truncate max-w-48">{attempt.exam?.title || 'Mock Exam'}</p>
                                            <p className="text-[10px] text-gray-400">{attempt.exam?.timeLimitMinutes || 0} min</p>
                                        </TableCell>
                                        <TableCell className="px-3 py-2.5">
                                            <p className="text-xs font-bold text-gray-900">{attempt.score}</p>
                                            <p className="text-[10px] font-semibold text-green-600">{Number(attempt.percentage || 0).toFixed(1)}%</p>
                                        </TableCell>
                                        <TableCell className="px-3 py-2.5 text-xs text-gray-500">
                                            {attempt.submittedAt
                                                ? new Date(attempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : 'In Progress'}
                                        </TableCell>
                                        <TableCell className="px-3 py-2.5">
                                            <Badge className={attempt.submissionType === 'AUTO'
                                                ? 'bg-amber-50 text-amber-700 border-none text-[9px] font-bold uppercase'
                                                : 'bg-green-50 text-green-700 border-none text-[9px] font-bold uppercase'}>
                                                {attempt.submissionType === 'AUTO' ? 'Auto' : 'Submitted'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="px-3 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                            No recent exam attempts yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </section>

                {/* Right sidebar */}
                <div className="flex flex-col gap-3">
                    {/* Upcoming Conferences */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Upcoming Conferences</p>
                            <Link to="/conferences">
                                <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70">View All</Button>
                            </Link>
                        </div>
                        <Card className="border-gray-100 shadow-sm rounded-lg">
                            <CardContent className="p-0 divide-y divide-gray-100">
                                {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 3).map((session) => (
                                    <Link to="/conferences" key={session.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50/70 transition-colors">
                                        <div className="shrink-0 p-1.5 bg-primary/5 text-primary rounded-md">
                                            <Video className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 truncate">{session.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {formatDateRange(session.startAt, session.endAt)}
                                            </p>
                                        </div>
                                        {isTodaySession(session.startAt) && (
                                            <span className="shrink-0 text-[9px] font-bold uppercase bg-primary/10 text-primary rounded px-1.5 py-0.5">Live</span>
                                        )}
                                    </Link>
                                )) : (
                                    <div className="px-3 py-6 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                        No upcoming conferences.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Calendar & Events */}
                    <CalendarEventsWidget />

                    {/* Motivational Quote */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-secondary" /> Quote of the Day
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-0 px-0 text-[11px] text-primary font-semibold hover:bg-transparent hover:text-primary/70 gap-1"
                                onClick={handleRequestAnotherQuote}
                                disabled={isQuoteLoading}
                            >
                                Another quote?
                            </Button>
                        </div>
                        <Card className="border-gray-100 shadow-sm rounded-lg">
                            <CardContent className="px-3 py-2.5 space-y-1">
                                {isQuoteLoading ? (
                                    <p className="text-xs text-gray-400">Loading quote...</p>
                                ) : quote ? (
                                    <>
                                        <p className="text-xs text-gray-700 leading-relaxed">"{quote.text}"</p>
                                        <p className="text-[10px] font-semibold text-primary">— {quote.author}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400">Unable to load quote right now.</p>
                                )}
                                {quoteError && (
                                    <p className="text-[10px] text-amber-600 font-medium">{quoteError}</p>
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
