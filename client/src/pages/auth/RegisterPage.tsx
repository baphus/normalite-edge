import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Mail, Lock, ArrowRight, AlertCircle, UserRound, Camera, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/axios';
import { uploadImageToCloudinary } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NO_SUFFIX_VALUE, SUFFIX_OPTIONS, YEAR_LEVEL_OPTIONS } from '@/lib/userOptions';
import AuthLayout from '@/components/marketing/AuthLayout';

const registerSchema = z.object({
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
    email: z.string().email('Invalid school email address').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type ApiErrorResponse = {
    message?: string;
};

type TrackOption = {
    id: string;
    name: string;
    code?: string | null;
};

const RegisterPage: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [campuses, setCampuses] = useState<TrackOption[]>([]);
    const [tracksLoading, setTracksLoading] = useState(true);
    const [campusesLoading, setCampusesLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            middleInitial: '',
            suffix: '',
            trackId: '',
            campusId: '',
            yearLevel: '',
            section: '',
        },
    });

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const response = await api.get('/tracks');
                setTracks(response.data?.data || []);
            } catch (err) {
                console.error('Failed to load tracks', err);
                setError('Unable to load program tracks. Please refresh and try again.');
            } finally {
                setTracksLoading(false);
            }
        };

        const fetchCampuses = async () => {
            try {
                const response = await api.get('/campuses');
                setCampuses(response.data?.data || []);
            } catch (err) {
                console.error('Failed to load campuses', err);
                setError('Unable to load campuses. Please refresh and try again.');
            } finally {
                setCampusesLoading(false);
            }
        };

        fetchTracks();
        fetchCampuses();
    }, []);

    // Revoke the avatar preview blob URL when the component unmounts.
    useEffect(() => {
        return () => {
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const onSubmit = async (data: RegisterFormValues) => {
        setLoading(true);
        setError(null);

        try {
            let uploadedPicture: string | undefined;
            if (avatarFile) {
                uploadedPicture = await uploadImageToCloudinary(avatarFile, 'profile-pics');
            }

            await api.post('/auth/register', {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                middleInitial: data.middleInitial?.trim() || undefined,
                suffix: data.suffix?.trim() || undefined,
                email: data.email.trim().toLowerCase(),
                password: data.password,
                picture: uploadedPicture,
                track_id: data.trackId.trim(),
                campus_id: data.campusId.trim(),
                yearLevel: data.yearLevel.trim(),
                section: data.section.trim(),
            });

            navigate('/pending', {
                state: {
                    email: data.email.trim().toLowerCase(),
                },
            });
        } catch (err: unknown) {
            if (isAxiosError<ApiErrorResponse>(err)) {
                setError(err.response?.data?.message ?? err.message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const iconClass =
        'absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 transition-colors group-focus-within:text-primary pointer-events-none';

    return (
        <AuthLayout
            wide
            title="Create your account"
            subtitle="Register with your CNU email — an admin activates it before you sign in."
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                        Log in
                    </Link>
                </>
            }
        >
            {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="rounded-xl border border-[#e6ddd3] bg-white/60 p-4">
                    <p className="text-sm font-semibold text-[#1A0E0E]">Profile photo (optional)</p>
                    <p className="mt-1 text-xs text-[#6B5B5B]">
                        Add your picture now for a personalized learner profile.
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar preview" className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/15" />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
                                <Camera size={20} />
                            </div>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                if (avatarPreview) {
                                    URL.revokeObjectURL(avatarPreview);
                                }
                                setAvatarFile(file);
                                if (file) {
                                    setAvatarPreview(URL.createObjectURL(file));
                                } else {
                                    setAvatarPreview(null);
                                }
                            }}
                            className="text-xs"
                        />
                    </div>
                </div>

                <Input type="hidden" {...register('trackId')} />
                <Input type="hidden" {...register('campusId')} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="group relative">
                            <div className={iconClass}>
                                <UserRound size={18} />
                            </div>
                            <Input id="firstName" {...register('firstName')} className="pl-11" placeholder="Juan" />
                        </div>
                        {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" {...register('lastName')} placeholder="Dela Cruz" />
                        {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="middleInitial">Middle Initial</Label>
                        <Input id="middleInitial" {...register('middleInitial')} placeholder="M" maxLength={1} />
                        {errors.middleInitial && <p className="text-xs text-red-500">{errors.middleInitial.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="suffix">Suffix (Optional)</Label>
                        <Select
                            value={watch('suffix') || NO_SUFFIX_VALUE}
                            onValueChange={(value) => setValue('suffix', value === NO_SUFFIX_VALUE ? '' : value, { shouldValidate: true })}
                        >
                            <SelectTrigger id="suffix">
                                <SelectValue placeholder="Select suffix" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_SUFFIX_VALUE}>No suffix</SelectItem>
                                {SUFFIX_OPTIONS.map((suffixOption) => (
                                    <SelectItem key={suffixOption} value={suffixOption}>{suffixOption}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.suffix && <p className="text-xs text-red-500">{errors.suffix.message}</p>}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="trackId">Program Track</Label>
                    <Select
                        value={watch('trackId')}
                        onValueChange={(value) => setValue('trackId', value, { shouldValidate: true })}
                        disabled={tracksLoading || tracks.length === 0}
                    >
                        <SelectTrigger id="trackId">
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
                    {errors.trackId && <p className="text-xs text-red-500">{errors.trackId.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="campusId">Campus</Label>
                    <Select
                        value={watch('campusId')}
                        onValueChange={(value) => setValue('campusId', value, { shouldValidate: true })}
                        disabled={campusesLoading || campuses.length === 0}
                    >
                        <SelectTrigger id="campusId">
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
                    {errors.campusId && <p className="text-xs text-red-500">{errors.campusId.message}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="yearLevel">Year</Label>
                        <Select
                            value={watch('yearLevel')}
                            onValueChange={(value) => setValue('yearLevel', value, { shouldValidate: true })}
                        >
                            <SelectTrigger id="yearLevel">
                                <SelectValue placeholder="Select year level" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR_LEVEL_OPTIONS.map((yearLevelOption) => (
                                    <SelectItem key={yearLevelOption} value={yearLevelOption}>{yearLevelOption}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.yearLevel && <p className="text-xs text-red-500">{errors.yearLevel.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="section">Section</Label>
                        <Input id="section" {...register('section')} placeholder="A" />
                        {errors.section && <p className="text-xs text-red-500">{errors.section.message}</p>}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email">School Email</Label>
                    <div className="group relative">
                        <div className={iconClass}>
                            <Mail size={18} />
                        </div>
                        <Input
                            id="email"
                            type="email"
                            placeholder="juan@cnu.edu.ph"
                            className="pl-11"
                            {...register('email')}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="group relative">
                        <div className={iconClass}>
                            <Lock size={18} />
                        </div>
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-11 pr-11"
                            {...register('password')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="group relative">
                        <div className={iconClass}>
                            <Lock size={18} />
                        </div>
                        <Input
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-11 pr-11"
                            {...register('confirmPassword')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 flex h-12 w-full items-center gap-2 rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a1010] active:scale-[0.99]"
                >
                    {loading ? 'Creating account…' : 'Create account'}
                    {!loading && <ArrowRight size={18} />}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
