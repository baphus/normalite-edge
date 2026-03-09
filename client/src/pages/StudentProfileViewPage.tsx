import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Mail, Timer, Trophy, XCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import { formatUserDisplayName } from '@/lib/formatUserDisplayName';

type ProfilePerformanceStats = {
    totalExamsAnswered: number;
    averageScore: number;
    averageCompletionSeconds: number;
    averageTimePerAnsweredQuestionSeconds: number;
    accuracy: number;
    totals: {
        correctAnswers: number;
        wrongAnswers: number;
        answeredQuestions: number;
        skippedQuestions: number;
        questionsServed: number;
    };
    highestScore: {
        percentage: number;
        examTitle: string;
    } | null;
    fastestCompletion: {
        seconds: number;
        examTitle: string;
    } | null;
};

type StudentProfilePayload = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    middleInitial?: string | null;
    suffix?: string | null;
    picture?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    status?: string;
    role?: string;
    campus?: { name: string } | null;
    track?: { name: string } | null;
    performance?: ProfilePerformanceStats | null;
};

type StudentSummaryState = {
    student?: {
        id: string;
        name: string;
        email: string;
        status?: string;
        programTrack?: string;
        campus?: string;
        yearLevel?: string;
        section?: string;
        attempts?: number;
        completedAttempts?: number;
        avgPercentage?: number;
        bestPercentage?: number;
    };
};

const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
};

const formatPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`;

const StudentProfileViewPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const navState = (location.state || null) as StudentSummaryState | null;
    const stateStudent = navState?.student;
    const [profile, setProfile] = useState<StudentProfilePayload | null>(null);
    const [loading, setLoading] = useState(!stateStudent);
    const [error, setError] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!stateStudent || profile) return;

        setProfile({
            id: stateStudent.id,
            email: stateStudent.email,
            firstName: stateStudent.name.split(' ').filter(Boolean)[0] || '',
            lastName: stateStudent.name.split(' ').filter(Boolean).slice(1).join(' '),
            status: stateStudent.status,
            yearLevel: stateStudent.yearLevel,
            section: stateStudent.section,
            campus: stateStudent.campus ? { name: stateStudent.campus } : null,
            track: stateStudent.programTrack ? { name: stateStudent.programTrack } : null,
            performance: {
                totalExamsAnswered: Number(stateStudent.attempts || 0),
                averageScore: Number(stateStudent.avgPercentage || 0),
                averageCompletionSeconds: 0,
                averageTimePerAnsweredQuestionSeconds: 0,
                accuracy: 0,
                totals: {
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    answeredQuestions: 0,
                    skippedQuestions: 0,
                    questionsServed: 0,
                },
                highestScore: {
                    percentage: Number(stateStudent.bestPercentage || 0),
                    examTitle: 'Best attempt',
                },
                fastestCompletion: null,
            },
        });
    }, [profile, stateStudent]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) {
                setError('Invalid student id.');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const response = await api.get(`/users/${id}/profile`);
                setProfile((response.data?.data || null) as StudentProfilePayload | null);
            } catch (fetchError: unknown) {
                if (!stateStudent) {
                    const message = typeof fetchError === 'object' && fetchError !== null && 'response' in fetchError
                        ? ((fetchError as { response?: { data?: { message?: string } } }).response?.data?.message || 'Unable to load student profile.')
                        : 'Unable to load student profile.';
                    setError(message);
                }
            } finally {
                setLoading(false);
            }
        };
        void fetchProfile();
    }, [id, stateStudent]);

    const displayName = useMemo(() => formatUserDisplayName({
        firstName: profile?.firstName || '',
        middleInitial: profile?.middleInitial || '',
        lastName: profile?.lastName || '',
        suffix: profile?.suffix || '',
        name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email,
    }), [profile]);

    const userInitials = useMemo(() => displayName.split(' ').filter(Boolean).map((part) => part[0]?.toUpperCase() || '').join('').slice(0, 2), [displayName]);

    if (loading) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Skeleton className="h-10 w-56" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <Skeleton className="h-72 lg:col-span-4" />
                    <Skeleton className="h-72 lg:col-span-8" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col gap-3 font-lexend pb-6">
                <Button variant="outline" className="w-fit h-8 text-xs" onClick={() => navigate('/students')}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Student Management
                </Button>
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="p-4 text-sm font-semibold text-rose-700">{error || 'Student profile was not found.'}</CardContent>
                </Card>
            </div>
        );
    }

    const performance = profile.performance;

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" className="h-8 text-xs" onClick={() => navigate('/students')}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Student Management
                </Button>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">{profile.role || 'REVIEWEE'}</Badge>
            </div>

            <header className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Profile</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Student profile overview and exam performance.</p>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold rounded-md border border-gray-200 bg-white px-2.5 py-1 text-gray-500">{profile.status || 'ACTIVE'}</div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <Card className="lg:col-span-4 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <div className="bg-primary px-4 py-3.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[8px] font-medium text-white/60 tracking-[0.2em] uppercase leading-none">Republic of the Philippines</p>
                                    <p className="text-[15px] font-black text-white tracking-tight leading-tight mt-1">NORMALITE EDGE</p>
                                    <p className="text-[10px] font-semibold text-white/80 leading-snug mt-0.5">Cebu Normal University</p>
                                    <p className="text-[8px] font-medium text-white/50 tracking-[0.18em] uppercase mt-2">Student Identification Card</p>
                                </div>
                                <div className="border border-white/30 rounded px-2 py-1 shrink-0 mt-0.5"><p className="text-[9px] uppercase tracking-wider font-bold text-white">REVIEWEE</p></div>
                            </div>
                        </div>
                        <div className="px-4 pt-4 pb-4 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="shrink-0">
                                    {profile.picture && !imgError ? (
                                        <img src={profile.picture} alt="Profile" className="h-24 w-18 object-cover border-2 border-primary" onError={() => setImgError(true)} />
                                    ) : (
                                        <div className="h-24 w-18 bg-primary/10 text-primary font-black text-xl flex items-center justify-center border-2 border-primary">{userInitials}</div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.18em] font-semibold text-gray-400 leading-none">Name</p>
                                        <p className="text-sm font-black text-gray-900 break-words leading-snug mt-0.5">{displayName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] uppercase tracking-[0.18em] font-semibold text-gray-400 leading-none">Email</p>
                                        <p className="text-[10px] font-medium text-gray-600 break-all leading-snug mt-0.5">{profile.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-dashed border-gray-200" />
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3"><p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 shrink-0">Campus</p><p className="text-[11px] font-semibold text-gray-800 text-right leading-snug">{profile.campus?.name || '—'}</p></div>
                                <div className="flex items-start justify-between gap-3"><p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 shrink-0">Track</p><p className="text-[11px] font-semibold text-gray-800 text-right leading-snug">{profile.track?.name || '—'}</p></div>
                                <div className="flex items-start justify-between gap-3"><p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 shrink-0">Year Level</p><p className="text-[11px] font-semibold text-gray-800 text-right">{profile.yearLevel || '—'}</p></div>
                                <div className="flex items-start justify-between gap-3"><p className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 shrink-0">Section</p><p className="text-[11px] font-semibold text-gray-800 text-right">{profile.section || '—'}</p></div>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                                <p className="font-mono text-[9px] tracking-[0.14em] text-gray-400 uppercase">{profile.id.slice(0, 8).toUpperCase()}-NE</p>
                                <p className="text-[9px] uppercase tracking-widest font-black text-primary">{new Date().getFullYear()}</p>
                            </div>
                        </div>
                        <div className="h-1.5 bg-primary" />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-8 border-gray-100 rounded-lg bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-900">Personal Information</CardTitle>
                        <CardDescription className="text-[11px] text-gray-400">Profile details used across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">First Name</Label><Input value={profile.firstName || ''} readOnly className="h-9 rounded-md border-gray-200 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Last Name</Label><Input value={profile.lastName || ''} readOnly className="h-9 rounded-md border-gray-200 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Middle Initial</Label><Input value={profile.middleInitial || ''} readOnly className="h-9 rounded-md border-gray-200 text-xs" /></div>
                            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Suffix</Label><Input value={profile.suffix || ''} readOnly className="h-9 rounded-md border-gray-200 text-xs" /></div>
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Email Address</Label>
                                <div className="relative"><Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} /><Input value={profile.email} readOnly className="pl-8 h-9 rounded-md border-gray-200 text-xs bg-gray-50" /></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-gray-100 rounded-lg bg-white">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-gray-900">Exam Performance</CardTitle>
                    <CardDescription className="text-[11px] text-gray-400">A quick, profile-level summary of exam progress and speed.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                    {!performance && <p className="text-xs text-gray-500">No exam analytics available yet.</p>}
                    {performance && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Trophy size={12} /> Highest Score</p><p className="text-sm font-bold text-gray-900 mt-1">{performance.highestScore ? formatPercent(performance.highestScore.percentage) : 'N/A'}</p><p className="text-[11px] text-gray-500 truncate">{performance.highestScore?.examTitle || 'No submitted exams yet'}</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><BarChart3 size={12} /> Average Score</p><p className="text-sm font-bold text-gray-900 mt-1">{formatPercent(performance.averageScore)}</p><p className="text-[11px] text-gray-500">Across {performance.totalExamsAnswered} exam(s)</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Timer size={12} /> Fastest Completion</p><p className="text-sm font-bold text-gray-900 mt-1">{performance.fastestCompletion ? formatDuration(performance.fastestCompletion.seconds) : 'N/A'}</p><p className="text-[11px] text-gray-500 truncate">{performance.fastestCompletion?.examTitle || 'No submitted exams yet'}</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Clock3 size={12} /> Avg Time / Question</p><p className="text-sm font-bold text-gray-900 mt-1">{formatDuration(performance.averageTimePerAnsweredQuestionSeconds)}</p><p className="text-[11px] text-gray-500">Based on answered items</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Exams Answered</p><p className="text-sm font-bold text-gray-900 mt-1">{performance.totalExamsAnswered}</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Accuracy</p><p className="text-sm font-bold text-gray-900 mt-1">{formatPercent(performance.accuracy)}</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-600" /> Correct Answers</p><p className="text-sm font-bold text-gray-900 mt-1">{performance.totals.correctAnswers}</p></div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><XCircle size={12} className="text-red-500" /> Wrong Answers</p><p className="text-sm font-bold text-gray-900 mt-1">{performance.totals.wrongAnswers}</p></div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StudentProfileViewPage;
