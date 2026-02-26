import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    CalendarClock,
    CheckSquare,
    Clock3,
    LineChart,
    PlayCircle,
    RefreshCw,
    Sparkles,
    Video,
    VideoIcon,
    User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    const averageScore = Number(stats?.overallAverage || 0);
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

    const dashboardStats = [
        {
            label: 'Available Study Decks',
            value: `${stats?.totalMaterials || 0} Decks`,
            icon: BookOpen,
        },
        {
            label: 'Available Mock Exams',
            value: `${stats?.totalExamsAvailable || 0} Exams`,
            icon: CheckSquare,
        },
        {
            label: 'Upcoming Conferences',
            value: `${upcomingSessions.length} Sessions`,
            icon: CalendarClock,
        },
        {
            label: 'My Average Score',
            value: `${averageScore}%`,
            icon: LineChart,
            emphasized: true,
        },
    ];

    const continueLearning = recentAttempts[0];

    const getHostName = (session: UpcomingSession) => {
        if (!session.host?.firstName && !session.host?.lastName) return 'TBA';
        return `${session.host?.firstName || ''} ${session.host?.lastName || ''}`.trim();
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

    const isTodaySession = (startAt: string) => {
        const start = new Date(startAt);
        return start.toDateString() === today.toDateString();
    };

    const progressPercent = continueLearning?.exam
        ? Math.min(100, Math.max(0, Number(continueLearning.percentage || 0)))
        : 0;

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

            const response = await fetch('https://dummyjson.com/quotes/random');
            if (!response.ok) {
                throw new Error('Failed to fetch quote');
            }

            const data = await response.json();
            setQuote({
                text: data?.quote || fallbackQuotes[0].text,
                author: data?.author || 'Unknown',
            });
        } catch {
            const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            setQuote(randomFallback);
            setQuoteError('Showing offline fallback quote.');
        } finally {
            setIsQuoteLoading(false);
        }
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
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back, {firstName} 👋</h1>
                <p className="text-slate-500 mt-1">{programTrack}</p>
            </header>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    Continue Learning
                </h2>
                <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-48 h-32 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/20 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-primary/60" />
                        </div>

                        {continueLearning?.exam ? (
                            <>
                                <div className="flex-1 space-y-3 w-full">
                                    <div>
                                        <Badge className="bg-secondary/20 text-secondary-foreground border-none text-[10px] font-bold uppercase">Quiz Mode</Badge>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1">{continueLearning.exam.title}</h3>
                                        <p className="text-sm text-slate-500">{continueLearning.exam.subject || 'General Subject'}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-slate-500">Last attempt score: {continueLearning.score}</span>
                                            <span className="text-primary">{progressPercent}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto flex flex-col gap-2">
                                    <Link to="/exams" className="w-full">
                                        <Button className="w-full md:w-auto px-8 font-bold">Resume</Button>
                                    </Link>
                                    <Link to="/exams" className="w-full">
                                        <Button variant="ghost" className="w-full md:w-auto text-slate-600 font-semibold">View Details</Button>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 w-full space-y-3">
                                <h3 className="text-lg font-bold text-slate-900">No recent learning session yet</h3>
                                <p className="text-sm text-slate-500">Start a study deck or mock exam to track progress and continue where you left off.</p>
                                <div className="flex gap-2">
                                    <Link to="/study">
                                        <Button className="font-bold">Open Study Decks</Button>
                                    </Link>
                                    <Link to="/exams">
                                        <Button variant="outline" className="font-semibold">Open Mock Exams</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="max-w-3xl">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900">Daily Question</CardTitle>
                                <CardDescription className="text-xs">Answer one random question from mock exam database.</CardDescription>
                            </div>
                            <Badge className="bg-primary/10 text-primary border-none uppercase text-[10px] font-bold">Today</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isDailyLoading ? (
                            <p className="text-sm text-slate-500">Loading daily question...</p>
                        ) : dailyQuestion ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{dailyQuestion.examTitle}</p>
                                    <p className="text-sm font-semibold text-slate-900">{dailyQuestion.questionText}</p>
                                </div>

                                <RadioGroup
                                    value={selectedChoice}
                                    onValueChange={(value) => {
                                        setSelectedChoice(value as 'A' | 'B' | 'C' | 'D');
                                        setDailyError('');
                                    }}
                                    className="gap-2"
                                    disabled={!!dailyResult}
                                >
                                    {(['A', 'B', 'C', 'D'] as const).map((choiceKey) => (
                                        <div key={choiceKey} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50 transition-colors">
                                            <RadioGroupItem value={choiceKey} id={`daily-choice-${choiceKey}`} className="mt-0.5" />
                                            <Label htmlFor={`daily-choice-${choiceKey}`} className="cursor-pointer text-xs text-slate-700 leading-relaxed">
                                                <span className="font-bold mr-1">{choiceKey}.</span>
                                                {dailyQuestion.choices[choiceKey]}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>

                                {dailyResult ? (
                                    <div className={`rounded-lg border p-4 space-y-2 ${dailyResult.isCorrect ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                                        <p className={`text-sm font-bold ${dailyResult.isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                                            {dailyResult.isCorrect ? 'Correct! Great job.' : 'Not quite this time.'}
                                        </p>
                                        <p className="text-sm text-slate-700">
                                            Correct answer: <span className="font-bold">{dailyResult.correctChoice}</span>
                                        </p>
                                        {dailyResult.rationalization && (
                                            <p className="text-sm text-slate-600">Rationalization: {dailyResult.rationalization}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Button onClick={handleSubmitDailyAnswer} disabled={isSubmittingDaily || !selectedChoice} className="font-bold">
                                            {isSubmittingDaily ? 'Submitting...' : 'Submit Answer'}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No daily question available yet. Please check back later.</p>
                        )}

                        {dailyError && (
                            <p className="text-sm text-red-600 font-medium">{dailyError}</p>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((item) => (
                    <Card key={item.label} className="border border-slate-200 shadow-sm border-t-4 border-t-primary">
                        <CardContent className="p-6 space-y-4">
                            <div className="inline-flex p-2 rounded-lg bg-primary/10 text-primary">
                                <item.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                <h3 className={`text-2xl font-black mt-1 ${item.emphasized ? 'text-primary' : 'text-slate-900'}`}>{item.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900">My Recent Exam Attempts</h2>
                        <Link to="/exams">
                            <Button variant="link" className="p-0 text-primary font-bold">View All</Button>
                        </Link>
                    </div>

                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Title</TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</TableHead>
                                    <TableHead className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentAttempts.length > 0 ? recentAttempts.map((attempt) => (
                                    <TableRow key={attempt.id} className="hover:bg-slate-50/60">
                                        <TableCell className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{attempt.exam?.title || 'Mock Exam'}</p>
                                            <p className="text-[10px] text-slate-400">{attempt.exam?.timeLimitMinutes || 0} Minutes</p>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{attempt.score}</span>
                                                <span className="text-xs font-semibold text-green-600">{Number(attempt.percentage || 0).toFixed(1)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-slate-500">
                                            {attempt.submittedAt
                                                ? new Date(attempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : 'In Progress'}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge className={attempt.submissionType === 'AUTO'
                                                ? 'bg-amber-100 text-amber-700 border-none text-[10px] font-bold uppercase'
                                                : 'bg-green-100 text-green-700 border-none text-[10px] font-bold uppercase'}>
                                                {attempt.submissionType === 'AUTO' ? 'Auto-submitted' : 'Submitted'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500 font-medium">
                                            No recent exam attempts yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Upcoming Conferences</h2>
                        <Link to="/conferences">
                            <Button variant="link" className="p-0 text-primary font-bold">View All</Button>
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 2).map((session) => (
                            <Card key={session.id} className="border border-slate-200 shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-primary/5 text-primary rounded-lg">
                                            <VideoIcon className="h-5 w-5" />
                                        </div>
                                        <Badge className={isTodaySession(session.startAt)
                                            ? 'bg-primary/10 text-primary border-none text-[10px] font-bold uppercase'
                                            : 'bg-slate-100 text-slate-500 border-none text-[10px] font-bold uppercase'}>
                                            {isTodaySession(session.startAt) ? 'Live Today' : new Date(session.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-slate-900 leading-tight">{session.title}</h3>
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock3 className="h-4 w-4" />
                                            {formatDateRange(session.startAt, session.endAt)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User className="h-4 w-4" />
                                            Host: {getHostName(session)}
                                        </div>
                                    </div>

                                    <Link to="/conferences" className="block mt-4">
                                        <Button className="w-full font-bold">
                                            <Video className="h-4 w-4" />
                                            {isTodaySession(session.startAt) ? 'Join Room' : 'View Schedule'}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )) : (
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold text-slate-900">No upcoming conferences</CardTitle>
                                    <CardDescription>Check conference schedules from your reviewer or admin.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Link to="/conferences">
                                        <Button variant="outline" className="w-full font-semibold">Open Conferences</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>
            </div>

            <section>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-secondary" />
                                <CardTitle className="text-xl font-bold text-slate-900">Motivational Quote</CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600"
                                onClick={loadMotivationalQuote}
                                disabled={isQuoteLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isQuoteLoading ? 'animate-spin' : ''}`} />
                                New Quote
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isQuoteLoading ? (
                            <p className="text-sm text-slate-500">Loading quote...</p>
                        ) : quote ? (
                            <>
                                <p className="text-base text-slate-800 leading-relaxed">“{quote.text}”</p>
                                <p className="text-sm font-semibold text-primary">— {quote.author}</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">Unable to load quote right now.</p>
                        )}

                        {quoteError && (
                            <p className="text-xs text-amber-600 font-medium">{quoteError}</p>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default RevieweeDashboard;
