import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Mail, Lock, ArrowRight, ShieldCheck, UserRound } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [tracksLoading, setTracksLoading] = useState(true);
    const navigate = useNavigate();
    const { login } = useAuth();

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

        fetchTracks();
    }, []);

    const onSubmit = async (data: RegisterFormValues) => {
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/register', {
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                middleInitial: data.middleInitial?.trim() || undefined,
                suffix: data.suffix?.trim() || undefined,
                email: data.email.trim().toLowerCase(),
                password: data.password,
                track_id: data.trackId.trim(),
                yearLevel: data.yearLevel.trim(),
                section: data.section.trim(),
            });

            const loginResponse = await api.post('/auth/login', {
                email: data.email.trim().toLowerCase(),
                password: data.password,
            });
            const { accessToken, user } = loginResponse.data.data;
            login(accessToken, user);
            navigate('/dashboard');
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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-lexend overflow-y-auto pt-12 pb-12">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 z-10"></div>
                <div
                    className="w-full h-full bg-cover bg-center blur-sm opacity-20"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArzNvjpM81ghaYuiyQxM5qpbcgLPEq0jo8N-mkUsqhp24cgYqCleIywecsORTOG8yNrwi5WSxuvAcxTBUXSdXI-qwtnNBKZ6jXC2cPxHRnfGhWX9Ek1iZFqkUkixfJAOK6Cbd2300a9h0fgWx4Vm41iEKXkdk5InX7ez7OOmacb2mWhSSfIzcHggdwKPpuwdkhar-Pnt5HRb_NuLsQ6sy2ESZ51mk7upMt0FcDZCtLjECee98BD7_ALEkLTSLB-kY4Qc_TFKZ5gsny')" }}
                />
            </div>

            <div className="relative z-10 w-full max-w-[580px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                <div className="pt-8 px-8 pb-2 text-center">
                    <Link to="/" className="inline-flex items-center justify-center mb-4">
                        <img src="/NormaliteEdgeLogo.png" alt="Normalite EDGE" className="h-16 w-16 object-contain" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                        Create your account
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base">
                        Join Normalite EDGE for LET preparation.
                    </p>
                </div>

                {error && (
                    <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <ShieldCheck size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-4">
                    <Input type="hidden" {...register('trackId')} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>First Name</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                    <UserRound size={18} />
                                </div>
                                <Input {...register('firstName')} className="pl-11" placeholder="Juan" />
                            </div>
                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Last Name</Label>
                            <Input {...register('lastName')} placeholder="Dela Cruz" />
                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Middle Initial</Label>
                            <Input {...register('middleInitial')} placeholder="M" maxLength={1} />
                            {errors.middleInitial && <p className="text-xs text-red-500">{errors.middleInitial.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Suffix (Optional)</Label>
                            <Input {...register('suffix')} placeholder="Jr." />
                            {errors.suffix && <p className="text-xs text-red-500">{errors.suffix.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Program Track</Label>
                        <Select
                            value={watch('trackId')}
                            onValueChange={(value) => setValue('trackId', value, { shouldValidate: true })}
                            disabled={tracksLoading || tracks.length === 0}
                        >
                            <SelectTrigger>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Year</Label>
                            <Select
                                value={watch('yearLevel')}
                                onValueChange={(value) => setValue('yearLevel', value, { shouldValidate: true })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                                    <SelectItem value="4th Year">4th Year</SelectItem>
                                    <SelectItem value="Alumni">Alumni</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.yearLevel && <p className="text-xs text-red-500">{errors.yearLevel.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Section</Label>
                            <Input {...register('section')} placeholder="A" />
                            {errors.section && <p className="text-xs text-red-500">{errors.section.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>School Email</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Mail size={18} />
                            </div>
                            <Input
                                type="email"
                                placeholder="juan@cnu.edu.ph"
                                className="pl-11"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Password</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11"
                                {...register('password')}
                            />
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Confirm Password</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-11"
                                {...register('confirmPassword')}
                            />
                        </div>
                        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 text-base font-bold bg-primary hover:bg-primary/90 text-white flex gap-2 shadow-lg transition-transform active:scale-[0.99]"
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                            {!loading && <ArrowRight size={20} />}
                        </Button>
                    </div>
                </form>

                <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold text-primary hover:underline transition-colors">
                            Login
                        </Link>
                    </p>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500 opacity-80 z-10">
                © 2024 Normalite EDGE. Cebu Normal University.
            </div>
        </div>
    );
};

export default RegisterPage;
