import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/marketing/AuthLayout';

const loginSchema = z.object({
    email: z.string().email('Invalid school email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type ApiErrorResponse = {
    message?: string;
};

const LoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                email: data.email.trim().toLowerCase(),
                password: data.password,
            });
            const { accessToken, user } = response.data.data;

            login(accessToken, user);
            navigate('/dashboard');
        } catch (err: unknown) {
            if (isAxiosError<ApiErrorResponse>(err)) {
                const message = err.response?.data?.message ?? err.message;
                const isPendingVerification = err.response?.status === 403
                    && message.toLowerCase().includes('pending admin approval');

                if (isPendingVerification) {
                    navigate('/pending', {
                        state: { email: data.email.trim().toLowerCase() },
                    });
                    return;
                }

                setError(message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const iconClass =
        'absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 transition-colors group-focus-within:text-primary';
    const inputClass = 'h-12 pl-11 text-base focus-visible:ring-primary';

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue your LET review."
            footer={
                <>
                    Don&rsquo;t have an account?{' '}
                    <Link to="/register" className="font-semibold text-primary hover:underline">
                        Create one
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="group relative">
                        <div className={iconClass}>
                            <Mail size={18} />
                        </div>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@cnu.edu.ph"
                            className={inputClass}
                            {...register('email')}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link
                            to="/forgot-password"
                            className="text-xs font-semibold text-primary transition-colors hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="group relative">
                        <div className={iconClass}>
                            <Lock size={18} />
                        </div>
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`${inputClass} pr-11`}
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

                <Button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center gap-2 rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a1010] active:scale-[0.99]"
                >
                    {loading ? 'Signing in…' : 'Log in'}
                    {!loading && <LogIn size={18} />}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
