import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isAxiosError } from 'axios';
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
                    && message.toLowerCase().includes('verify your email');

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-lexend overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 z-10"></div>
                <div
                    className="w-full h-full bg-cover bg-center blur-sm opacity-20"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArzNvjpM81ghaYuiyQxM5qpbcgLPEq0jo8N-mkUsqhp24cgYqCleIywecsORTOG8yNrwi5WSxuvAcxTBUXSdXI-qwtnNBKZ6jXC2cPxHRnfGhWX9Ek1iZFqkUkixfJAOK6Cbd2300a9h0fgWx4Vm41iEKXkdk5InX7ez7OOmacb2mWhSSfIzcHggdwKPpuwdkhar-Pnt5HRb_NuLsQ6sy2ESZ51mk7upMt0FcDZCtLjECee98BD7_ALEkLTSLB-kY4Qc_TFKZ5gsny')" }}
                />
            </div>

            <div className="relative z-10 w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
                <div className="pt-10 px-8 pb-2 text-center">
                    <Link to="/" className="inline-flex items-center justify-center mb-4">
                        <img src="/NormaliteEdgeLogo.png" alt="Normalite EDGE" className="h-16 w-16 object-contain" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                        Sign in to your account
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base">
                        Access Normalite EDGE for LET preparation.
                    </p>
                </div>

                {error && (
                    <div className="mx-8 mt-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <ShieldCheck size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Mail size={18} />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@domain.com"
                                className="pl-11 py-6 h-12 text-base ring-offset-primary/20 focus-visible:ring-primary"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link to="/forgot-password" className="text-xs font-semibold text-secondary-foreground hover:text-primary transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="pl-11 py-6 h-12 text-base ring-offset-primary/20 focus-visible:ring-primary"
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 text-base font-bold bg-primary hover:bg-primary/90 text-white flex gap-2 shadow-lg transition-transform active:scale-[0.99]"
                        >
                            {loading ? 'Signing in...' : 'Login'}
                            {!loading && <LogIn size={20} />}
                        </Button>
                    </div>
                </form>

                <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-bold text-primary hover:underline transition-colors">
                            Sign Up
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

export default LoginPage;
