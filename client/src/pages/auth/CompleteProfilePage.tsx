import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { AlertCircle, ArrowRight, UserRound } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NO_SUFFIX_VALUE, SUFFIX_OPTIONS, YEAR_LEVEL_OPTIONS } from '@/lib/userOptions';
import AuthLayout from '@/components/marketing/AuthLayout';

const profileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    middleInitial: z
        .string()
        .trim()
        .min(1, 'Middle initial is required')
        .refine((value) => value.length === 1, { message: 'Middle initial must be 1 character' }),
    suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
    trackId: z.string().trim().min(1, 'Program track is required'),
    campusId: z.string().trim().min(1, 'Campus is required'),
    yearLevel: z.string().trim().min(1, 'Year is required'),
    section: z.string().trim().min(1, 'Section is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type Option = { id: string; name: string; code?: string | null };

/**
 * Second half of registration.
 *
 * Google supplies an email, a name and a photo — but not the program track,
 * campus, year or section that drive exam visibility, so they are collected
 * here. Reaching this page means the user is authenticated with Supabase but
 * has no application account yet.
 */
const CompleteProfilePage: React.FC = () => {
    const { status, pending, refreshProfile, logout } = useAuth();
    const navigate = useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [tracks, setTracks] = useState<Option[]>([]);
    const [campuses, setCampuses] = useState<Option[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            middleInitial: '',
            suffix: '',
            trackId: '',
            campusId: '',
            yearLevel: '',
            section: '',
        },
    });

    // Someone who already has an account, or who is not signed in at all, has
    // no business here.
    useEffect(() => {
        if (status === 'ready') navigate('/dashboard', { replace: true });
        if (status === 'signedOut') navigate('/login', { replace: true });
    }, [status, navigate]);

    // Prefill the name Google gave us; the user can correct it.
    useEffect(() => {
        if (pending?.firstName) setValue('firstName', pending.firstName);
        if (pending?.lastName) setValue('lastName', pending.lastName);
    }, [pending?.firstName, pending?.lastName, setValue]);

    useEffect(() => {
        if (!pending?.eligible) return;

        api.get('/tracks')
            .then((res) => setTracks(res.data?.data || []))
            .catch(() => setError('Unable to load program tracks. Please refresh and try again.'));

        api.get('/campuses')
            .then((res) => setCampuses(res.data?.data || []))
            .catch(() => setError('Unable to load campuses. Please refresh and try again.'));
    }, [pending?.eligible]);

    const onSubmit = async (data: ProfileFormValues) => {
        setSubmitting(true);
        setError(null);

        try {
            await api.post('/auth/complete-profile', {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                middleInitial: data.middleInitial.trim(),
                suffix: data.suffix?.trim() || undefined,
                track_id: data.trackId,
                campus_id: data.campusId,
                yearLevel: data.yearLevel.trim(),
                section: data.section.trim(),
            });

            await refreshProfile();
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (isAxiosError<{ message?: string }>(err)) {
                setError(err.response?.data?.message ?? err.message);
            } else {
                setError('Could not finish setting up your account. Please try again.');
            }
            setSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F4EE] font-lexend text-[#6B5B5B]">
                Loading…
            </div>
        );
    }

    // Signed in with Google, but not with an institutional account. Say so
    // plainly rather than letting them fill in a form that will be rejected.
    if (pending && !pending.eligible) {
        return (
            <AuthLayout
                title="That account can’t be used"
                subtitle="Normalite EDGE is limited to Cebu Normal University Google accounts."
                footer={<>Need help? Contact your administrator.</>}
            >
                <div className="space-y-5">
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        {pending.ineligibleReason === 'provider' ? (
                            <span>
                                <strong>{pending.email}</strong> is a university address, but you signed
                                in with a password. CNU accounts must use{' '}
                                <strong>Sign in with Google</strong>.
                            </span>
                        ) : (
                            <span>
                                You signed in as <strong>{pending.email}</strong>, which is not a
                                <strong> @cnu.edu.ph</strong> account. Sign in again with your university
                                Google account.
                            </span>
                        )}
                    </div>
                    <Button
                        type="button"
                        onClick={() => void logout()}
                        className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-white"
                    >
                        Sign out and try again
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    const iconClass =
        'absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 transition-colors group-focus-within:text-primary pointer-events-none';
    const suffixValue = watch('suffix');

    return (
        <AuthLayout
            wide
            title="Finish your profile"
            subtitle={
                pending?.email
                    ? `Signed in as ${pending.email}. Tell us what you’re reviewing for.`
                    : 'Tell us what you’re reviewing for.'
            }
            footer={
                <button
                    type="button"
                    onClick={() => void logout()}
                    className="font-semibold text-primary hover:underline"
                >
                    Use a different account
                </button>
            }
        >
            {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="firstName">First name</Label>
                        <div className="group relative">
                            <div className={iconClass}>
                                <UserRound size={18} />
                            </div>
                            <Input id="firstName" className="h-12 pl-11" {...register('firstName')} />
                        </div>
                        {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input id="lastName" className="h-12" {...register('lastName')} />
                        {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="middleInitial">Middle initial</Label>
                        <Input id="middleInitial" maxLength={1} className="h-12" {...register('middleInitial')} />
                        {errors.middleInitial && (
                            <p className="text-xs text-red-500">{errors.middleInitial.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="suffix">Suffix</Label>
                        <Select
                            value={suffixValue || NO_SUFFIX_VALUE}
                            onValueChange={(value) =>
                                setValue('suffix', value === NO_SUFFIX_VALUE ? '' : value, {
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_SUFFIX_VALUE}>None</SelectItem>
                                {SUFFIX_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Program track</Label>
                    <Select
                        value={watch('trackId')}
                        onValueChange={(value) => setValue('trackId', value, { shouldValidate: true })}
                    >
                        <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select your program track" />
                        </SelectTrigger>
                        <SelectContent>
                            {tracks.map((track) => (
                                <SelectItem key={track.id} value={track.id}>
                                    {track.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.trackId && <p className="text-xs text-red-500">{errors.trackId.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>Campus</Label>
                    <Select
                        value={watch('campusId')}
                        onValueChange={(value) => setValue('campusId', value, { shouldValidate: true })}
                    >
                        <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select your campus" />
                        </SelectTrigger>
                        <SelectContent>
                            {campuses.map((campus) => (
                                <SelectItem key={campus.id} value={campus.id}>
                                    {campus.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.campusId && <p className="text-xs text-red-500">{errors.campusId.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Year level</Label>
                        <Select
                            value={watch('yearLevel')}
                            onValueChange={(value) => setValue('yearLevel', value, { shouldValidate: true })}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR_LEVEL_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.yearLevel && <p className="text-xs text-red-500">{errors.yearLevel.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="section">Section</Label>
                        <Input id="section" className="h-12" placeholder="e.g. A" {...register('section')} />
                        {errors.section && <p className="text-xs text-red-500">{errors.section.message}</p>}
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center gap-2 rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a1010] active:scale-[0.99]"
                >
                    {submitting ? 'Setting up…' : 'Start reviewing'}
                    {!submitting && <ArrowRight size={18} />}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default CompleteProfilePage;
