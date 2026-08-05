import React, { useEffect, useState } from 'react';
import {
    BarChart3,
    CheckCircle2,
    Clock3,
    Mail,
    Save,
    Timer,
    Trophy,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { formatUserDisplayName } from '@/lib/formatUserDisplayName';
import { uploadImageToCloudinary } from '@/lib/upload';
import { NO_SUFFIX_VALUE, SUFFIX_OPTIONS, YEAR_LEVEL_OPTIONS } from '@/lib/userOptions';
import { toast } from 'sonner';
import ImageCropDialog from '@/components/ui/image-crop-dialog';
import IdentificationCard from '@/components/IdentificationCard';

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
        score: number;
        examId: string;
        examTitle: string;
        submittedAt: string | null;
    } | null;
    fastestCompletion: {
        seconds: number;
        examId: string;
        examTitle: string;
        submittedAt: string | null;
    } | null;
    recentAttempts: Array<{
        id: string;
        examId: string;
        examTitle: string;
        percentage: number;
        score: number;
        timeSpentSeconds: number;
        submittedAt: string | null;
    }>;
};

type AttemptResultPayload = {
    id: string;
    percentage: number;
    score: number;
    submittedAt: string | null;
    timeSpentSeconds: number;
    exam?: {
        id: string;
        title: string;
    };
    stats?: {
        totalQuestions: number;
        correct: number;
        incorrect: number;
        skipped: number;
        answered: number;
    };
};

const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
};

const formatPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`;

const buildPerformanceFromAttemptResults = (results: AttemptResultPayload[]): ProfilePerformanceStats => {
    const submittedAttempts = results
        .filter((item) => item && item.exam?.id && item.exam?.title)
        .map((item) => ({
            id: item.id,
            percentage: Number(item.percentage || 0),
            score: Number(item.score || 0),
            submittedAt: item.submittedAt || null,
            timeSpentSeconds: Math.max(0, Number(item.timeSpentSeconds || 0)),
            exam: {
                id: String(item.exam?.id || ''),
                title: String(item.exam?.title || 'Untitled Exam'),
            },
            stats: {
                totalQuestions: Math.max(0, Number(item.stats?.totalQuestions || 0)),
                correct: Math.max(0, Number(item.stats?.correct || 0)),
                incorrect: Math.max(0, Number(item.stats?.incorrect || 0)),
                answered: Math.max(0, Number(item.stats?.answered || 0)),
            },
        }));

    const totalExamsAnswered = submittedAttempts.length;
    const totalScore = submittedAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0);
    const totalTimeSpentSeconds = submittedAttempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0);

    const totalCorrectAnswers = submittedAttempts.reduce((sum, attempt) => sum + attempt.stats.correct, 0);
    const totalWrongAnswers = submittedAttempts.reduce((sum, attempt) => sum + attempt.stats.incorrect, 0);
    const totalAnsweredQuestions = submittedAttempts.reduce((sum, attempt) => sum + attempt.stats.answered, 0);
    const totalQuestionsServed = submittedAttempts.reduce((sum, attempt) => sum + attempt.stats.totalQuestions, 0);
    const totalSkippedQuestions = Math.max(totalQuestionsServed - totalAnsweredQuestions, 0);

    const highestScoreAttempt = submittedAttempts.reduce<typeof submittedAttempts[number] | null>((best, current) => {
        if (!best) return current;
        return current.percentage > best.percentage ? current : best;
    }, null);

    const fastestCompletion = submittedAttempts.reduce<typeof submittedAttempts[number] | null>((best, current) => {
        if (!best) return current;
        return current.timeSpentSeconds < best.timeSpentSeconds ? current : best;
    }, null);

    const averageScore = totalExamsAnswered > 0 ? Math.round((totalScore / totalExamsAnswered) * 100) / 100 : 0;
    const averageCompletionSeconds = totalExamsAnswered > 0 ? Math.round(totalTimeSpentSeconds / totalExamsAnswered) : 0;
    const averageTimePerAnsweredQuestionSeconds = totalAnsweredQuestions > 0
        ? Math.round(totalTimeSpentSeconds / totalAnsweredQuestions)
        : 0;
    const accuracy = totalAnsweredQuestions > 0
        ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 10000) / 100
        : 0;

    return {
        totalExamsAnswered,
        averageScore,
        averageCompletionSeconds,
        averageTimePerAnsweredQuestionSeconds,
        accuracy,
        totals: {
            correctAnswers: totalCorrectAnswers,
            wrongAnswers: totalWrongAnswers,
            answeredQuestions: totalAnsweredQuestions,
            skippedQuestions: totalSkippedQuestions,
            questionsServed: totalQuestionsServed,
        },
        highestScore: highestScoreAttempt
            ? {
                percentage: Math.round(highestScoreAttempt.percentage * 100) / 100,
                score: highestScoreAttempt.score,
                examId: highestScoreAttempt.exam.id,
                examTitle: highestScoreAttempt.exam.title,
                submittedAt: highestScoreAttempt.submittedAt,
            }
            : null,
        fastestCompletion: fastestCompletion
            ? {
                seconds: fastestCompletion.timeSpentSeconds,
                examId: fastestCompletion.exam.id,
                examTitle: fastestCompletion.exam.title,
                submittedAt: fastestCompletion.submittedAt,
            }
            : null,
        recentAttempts: submittedAttempts
            .sort((a, b) => {
                const left = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const right = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return right - left;
            })
            .slice(0, 5)
            .map((attempt) => ({
                id: attempt.id,
                examId: attempt.exam.id,
                examTitle: attempt.exam.title,
                percentage: Math.round(attempt.percentage * 100) / 100,
                score: attempt.score,
                timeSpentSeconds: attempt.timeSpentSeconds,
                submittedAt: attempt.submittedAt,
            })),
    };
};

const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleInitial, setMiddleInitial] = useState('');
    const [suffix, setSuffix] = useState('');
    const [email, setEmail] = useState('');
    const [picture, setPicture] = useState<string>('');
    const [trackId, setTrackId] = useState('');
    const [campusId, setCampusId] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const [section, setSection] = useState('');
    const [studentId, setStudentId] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [tracks, setTracks] = useState<Array<{ id: string; name: string }>>([]);
    const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [campusesLoading, setCampusesLoading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [performance, setPerformance] = useState<ProfilePerformanceStats | null>(null);
    const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
    const [performanceError, setPerformanceError] = useState('');
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [showCropDialog, setShowCropDialog] = useState(false);

    const isReviewee = user?.role === 'REVIEWEE';
    const isReviewer = user?.role === 'REVIEWER';
    const canEditCampus = isReviewee || isReviewer;

    useEffect(() => {
        const resolvedFirstName = user?.firstName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean)[0] || '';
        const resolvedLastName = user?.lastName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean).slice(1).join(' ') || '';

        setFirstName(resolvedFirstName);
        setLastName(resolvedLastName);
        setMiddleInitial(user?.middleInitial || '');
        setSuffix(user?.suffix || '');
        setEmail(user?.email || '');
        setPicture(user?.picture || '');
        setTrackId(user?.track_id || '');
        setCampusId(user?.campus_id || '');
        setYearLevel(user?.yearLevel || '');
        setSection(user?.section || '');
        setStudentId(user?.studentId || '');
        setContactNumber(user?.contactNumber || '');
    }, [user]);

    useEffect(() => {
        if (!canEditCampus) return;

        const fetchCampuses = async () => {
            try {
                setCampusesLoading(true);
                const response = await api.get('/campuses');
                setCampuses(response.data?.data || []);
            } catch (error) {
                console.error('Failed to load campuses', error);
                toast.error('Unable to load campuses. Please refresh and try again.');
            } finally {
                setCampusesLoading(false);
            }
        };

        void fetchCampuses();
    }, [canEditCampus]);

    useEffect(() => {
        if (!isReviewee) return;

        const fetchTracks = async () => {
            try {
                setTracksLoading(true);
                const response = await api.get('/tracks');
                setTracks(response.data?.data || []);
            } catch (error) {
                console.error('Failed to load tracks', error);
                toast.error('Unable to load program tracks. Please refresh and try again.');
            } finally {
                setTracksLoading(false);
            }
        };

        void fetchTracks();
    }, [isReviewee]);

    useEffect(() => {
        if (!isReviewee) return;

        const fetchProfilePerformance = async () => {
            try {
                setIsPerformanceLoading(true);
                setPerformanceError('');
                const response = await api.get('/dashboard/profile-performance');
                setPerformance(response.data?.data || null);
            } catch (error) {
                console.error('Failed to fetch profile performance', error);
                try {
                    const attemptsResponse = await api.get('/attempts', {
                        params: {
                            page: 1,
                            limit: 200,
                        },
                    });

                    const attempts = (attemptsResponse.data?.data || []) as Array<{ id: string; status: string }>;
                    const submittedAttemptIds = attempts
                        .filter((attempt) => attempt.status === 'SUBMITTED')
                        .map((attempt) => attempt.id)
                        .slice(0, 60);

                    if (submittedAttemptIds.length === 0) {
                        setPerformance(buildPerformanceFromAttemptResults([]));
                        return;
                    }

                    const resultResponses = await Promise.allSettled(
                        submittedAttemptIds.map((attemptId) => api.get(`/attempts/${attemptId}/result`))
                    );

                    const validResults = resultResponses
                        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
                        .map((result) => result.value?.data?.data as AttemptResultPayload)
                        .filter(Boolean);

                    setPerformance(buildPerformanceFromAttemptResults(validResults));
                } catch (fallbackError) {
                    console.error('Failed to build profile performance from fallback endpoints', fallbackError);
                    setPerformance(null);
                    setPerformanceError('Unable to load exam analytics right now.');
                }
            } finally {
                setIsPerformanceLoading(false);
            }
        };

        void fetchProfilePerformance();
    }, [isReviewee]);

    const displayName = formatUserDisplayName({
        name: user?.name,
        firstName,
        middleInitial,
        lastName,
        suffix,
    });

    const handleProfilePictureSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }

        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            toast.error('Image must be 3MB or smaller.');
            return;
        }

        // Read the file and show crop dialog
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setShowCropDialog(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploadingPicture(true);
            const file = new File([croppedBlob], 'profile-pic.jpg', { type: 'image/jpeg' });
            const secureUrl = await uploadImageToCloudinary(file, 'profile-pics');
            setPicture(secureUrl);
            toast.success('Profile picture updated.');
        } catch (error) {
            console.error('Failed to upload profile picture', error);
            toast.error('Failed to upload profile picture. Please try again.');
        } finally {
            setIsUploadingPicture(false);
            setCropImageSrc(null);
        }
    };

    const handleCancel = () => {
        const resolvedFirstName = user?.firstName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean)[0] || '';
        const resolvedLastName = user?.lastName?.trim() || user?.name?.trim().split(/\s+/).filter(Boolean).slice(1).join(' ') || '';

        setFirstName(resolvedFirstName);
        setLastName(resolvedLastName);
        setMiddleInitial(user?.middleInitial || '');
        setSuffix(user?.suffix || '');
        setEmail(user?.email || '');
        setPicture(user?.picture || '');
        setTrackId(user?.track_id || '');
        setCampusId(user?.campus_id || '');
        setYearLevel(user?.yearLevel || '');
        setSection(user?.section || '');
        setStudentId(user?.studentId || '');
        setContactNumber(user?.contactNumber || '');
    };

    const handleSaveProfile = async () => {
        if (!firstName.trim()) {
            toast.error('First name is required.');
            return;
        }

        if (!lastName.trim()) {
            toast.error('Last name is required.');
            return;
        }

        if (canEditCampus && !campusId.trim()) {
            toast.error('Campus is required.');
            return;
        }

        if (isReviewee && !trackId.trim()) {
            toast.error('Program track is required.');
            return;
        }

        if (isReviewee && !yearLevel.trim()) {
            toast.error('Year is required.');
            return;
        }

        if (isReviewee && !section.trim()) {
            toast.error('Section is required.');
            return;
        }

        if (isReviewee && !studentId.trim()) {
            toast.error('Student ID is required.');
            return;
        }

        if (isReviewee && !contactNumber.trim()) {
            toast.error('Contact number is required.');
            return;
        }

        if (isReviewee && !/^09\d{9}$/.test(contactNumber.trim())) {
            toast.error('Contact number must be in Philippine format (09XXXXXXXXX).');
            return;
        }

        try {
            setIsSavingProfile(true);

            // Only send the picture when this save actually replaced it.
            // Re-sending the stored URL would put an avatar the user never
            // touched back through validation — and a legacy one hosted
            // outside the upload bucket would then block edits to unrelated
            // fields like section or contact number.
            const pictureChanged = picture !== (user?.picture || '');

            const payload: Record<string, string | undefined> = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                middleInitial: middleInitial.trim() || undefined,
                suffix: suffix.trim() || undefined,
                picture: pictureChanged ? picture || undefined : undefined,
            };

            if (isReviewee) {
                payload.track_id = trackId.trim() || undefined;
                payload.yearLevel = yearLevel.trim() || undefined;
                payload.section = section.trim() || undefined;
                payload.studentId = studentId.trim() || undefined;
                payload.contactNumber = contactNumber.trim() || undefined;
            }

            if (canEditCampus) {
                payload.campus_id = campusId.trim() || undefined;
            }

            const response = await api.patch('/auth/me/profile', payload);
            const nextUser = response.data?.data || user;
            updateUser(nextUser);
            toast.success('Profile updated successfully.');
        } catch (error: any) {
            console.error('Failed to update profile', error);
            toast.error(error?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 font-lexend pb-6">
            <header className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Profile</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Keep your account details updated and track your exam performance.</p>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold rounded-md border border-gray-200 bg-white px-2.5 py-1 text-gray-500">
                    {user?.role || 'User'}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <IdentificationCard
                    className="lg:col-span-4"
                    role={user?.role}
                    displayName={displayName}
                    email={email}
                    picture={picture}
                    campus={user?.campus || ''}
                    track={user?.program || user?.program_track || ''}
                    yearLevel={user?.yearLevel || ''}
                    section={user?.section || ''}
                    studentId={user?.studentId || ''}
                    userId={user?.id}
                    onPictureChange={handleProfilePictureSelect}
                    isUploadingPicture={isUploadingPicture}
                />

                <Card className="lg:col-span-8 border-gray-100 rounded-lg bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-900">Personal Information</CardTitle>
                        <CardDescription className="text-[11px] text-gray-400">Update profile details used across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">First Name</Label>
                                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-9 rounded-md border-gray-200 text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Last Name</Label>
                                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-9 rounded-md border-gray-200 text-xs" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Middle Initial</Label>
                                <Input
                                    value={middleInitial}
                                    onChange={(event) => setMiddleInitial(event.target.value.slice(0, 1).toUpperCase())}
                                    placeholder="M"
                                    className="h-9 rounded-md border-gray-200 text-xs"
                                    maxLength={1}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Suffix</Label>
                                <Select value={suffix || NO_SUFFIX_VALUE} onValueChange={(value) => setSuffix(value === NO_SUFFIX_VALUE ? '' : value)}>
                                    <SelectTrigger className="h-9 rounded-md border-gray-200 text-xs">
                                        <SelectValue placeholder="Select suffix" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_SUFFIX_VALUE}>No suffix</SelectItem>
                                        {SUFFIX_OPTIONS.map((suffixOption) => (
                                            <SelectItem key={suffixOption} value={suffixOption}>{suffixOption}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                    <Input value={email} disabled className="pl-8 h-9 rounded-md border-gray-200 text-xs bg-gray-50" />
                                </div>
                            </div>

                            {canEditCampus && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Campus</Label>
                                    <Select value={campusId} onValueChange={setCampusId} disabled={campusesLoading || campuses.length === 0}>
                                        <SelectTrigger className="h-9 rounded-md border-gray-200 text-xs">
                                            <SelectValue placeholder={campusesLoading ? 'Loading campuses...' : 'Select campus'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campuses.map((campus) => (
                                                <SelectItem key={campus.id} value={campus.id}>
                                                    {campus.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {isReviewee && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Program Track</Label>
                                        <Select value={trackId} onValueChange={setTrackId} disabled={tracksLoading || tracks.length === 0}>
                                            <SelectTrigger className="h-9 rounded-md border-gray-200 text-xs">
                                                <SelectValue placeholder={tracksLoading ? 'Loading tracks...' : 'Select program track'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tracks.map((track) => (
                                                    <SelectItem key={track.id} value={track.id}>
                                                        {track.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Year</Label>
                                        <Select value={yearLevel} onValueChange={setYearLevel}>
                                            <SelectTrigger className="h-9 rounded-md border-gray-200 text-xs">
                                                <SelectValue placeholder="Select year level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEAR_LEVEL_OPTIONS.map((yearLevelOption) => (
                                                    <SelectItem key={yearLevelOption} value={yearLevelOption}>{yearLevelOption}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Section</Label>
                                        <Input value={section} onChange={(event) => setSection(event.target.value)} placeholder="A" className="h-9 rounded-md border-gray-200 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Student ID</Label>
                                        <Input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="e.g. 2025-12345" className="h-9 rounded-md border-gray-200 text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Contact Number</Label>
                                        <Input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="09XXXXXXXXX" className="h-9 rounded-md border-gray-200 text-xs" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="outline" className="h-8 rounded-md px-3 text-xs font-semibold border-gray-200" onClick={handleCancel}>Cancel</Button>
                            <Button
                                onClick={() => void handleSaveProfile()}
                                disabled={isSavingProfile || isUploadingPicture}
                                className="h-8 rounded-md px-3 bg-primary hover:bg-primary/95 text-white font-semibold gap-1.5 text-xs"
                            >
                                <Save size={13} /> {isSavingProfile ? 'Saving...' : 'Save Profile'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isReviewee && (
                <Card className="border-gray-100 rounded-lg bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-900">Exam Performance</CardTitle>
                        <CardDescription className="text-[11px] text-gray-400">A quick, profile-level summary of your exam progress and speed.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        {isPerformanceLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {Array.from({ length: 8 }).map((_, idx) => (
                                    <Skeleton key={idx} className="h-18 rounded-md" />
                                ))}
                            </div>
                        )}

                        {!isPerformanceLoading && performanceError && (
                            <p className="text-xs font-medium text-red-600">{performanceError}</p>
                        )}

                        {!isPerformanceLoading && !performanceError && performance && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Trophy size={12} /> Highest Score</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{performance.highestScore ? formatPercent(performance.highestScore.percentage) : 'N/A'}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{performance.highestScore?.examTitle || 'No submitted exams yet'}</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><BarChart3 size={12} /> Average Score</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{formatPercent(performance.averageScore)}</p>
                                        <p className="text-[11px] text-gray-500">Across {performance.totalExamsAnswered} exam(s)</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Timer size={12} /> Fastest Completion</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{performance.fastestCompletion ? formatDuration(performance.fastestCompletion.seconds) : 'N/A'}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{performance.fastestCompletion?.examTitle || 'No submitted exams yet'}</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Clock3 size={12} /> Avg Time / Question</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{formatDuration(performance.averageTimePerAnsweredQuestionSeconds)}</p>
                                        <p className="text-[11px] text-gray-500">Based on answered items</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Exams Answered</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{performance.totalExamsAnswered}</p>
                                        <p className="text-[11px] text-gray-500">Submitted attempts</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Accuracy</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{formatPercent(performance.accuracy)}</p>
                                        <p className="text-[11px] text-gray-500">Correct out of answered</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-600" /> Correct Answers</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{performance.totals.correctAnswers}</p>
                                        <p className="text-[11px] text-gray-500">Total correct selections</p>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5"><XCircle size={12} className="text-red-500" /> Wrong Answers</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{performance.totals.wrongAnswers}</p>
                                        <p className="text-[11px] text-gray-500">Total incorrect selections</p>
                                    </div>
                                </div>

                                <div className="rounded-md border border-gray-200 bg-white">
                                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                        <p className="text-xs font-semibold text-gray-700">Recent Attempts</p>
                                        <p className="text-[11px] text-gray-400">Avg completion: {formatDuration(performance.averageCompletionSeconds)}</p>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {performance.recentAttempts.length === 0 && (
                                            <div className="px-3 py-4 text-xs text-gray-500">No submitted attempts yet.</div>
                                        )}
                                        {performance.recentAttempts.map((attempt) => (
                                            <div key={attempt.id} className="px-3 py-2.5 grid grid-cols-12 items-center gap-2">
                                                <div className="col-span-6 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 truncate">{attempt.examTitle}</p>
                                                    <p className="text-[11px] text-gray-400">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'No date'}</p>
                                                </div>
                                                <div className="col-span-2 text-right text-xs font-semibold text-gray-700">{formatPercent(attempt.percentage)}</div>
                                                <div className="col-span-4 text-right text-xs font-semibold text-gray-500">{formatDuration(attempt.timeSpentSeconds)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {cropImageSrc && (
                <ImageCropDialog
                    open={showCropDialog}
                    onClose={() => {
                        setShowCropDialog(false);
                        setCropImageSrc(null);
                    }}
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    aspect={1}
                    title="Crop profile photo"
                />
            )}
        </div>
    );
};

export default ProfilePage;
