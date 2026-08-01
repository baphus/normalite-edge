import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/marketing/AuthLayout';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const staffLoginSchema = z.object({
    email: z
        .string()
        .email('Invalid email address')
        .refine((email) => !email.toLowerCase().endsWith('@cnu.edu.ph'), {
            message: 'CNU accounts sign in with Google — use the button above.',
        }),
    password: z.string().min(1, 'Password is required'),
});

type StaffLoginValues = z.infer<typeof staffLoginSchema>;

/**
 * Google is the primary and only path for institutional accounts. The password
 * form below it exists solely for external staff — partner reviewers and the
 * break-glass administrator — who have no @cnu.edu.ph Workspace mailbox.
 */
const LoginPage: React.FC = () => {
    const { status, signInWithPassword } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [showStaffForm, setShowStaffForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(
        (location.state as { error?: string } | null)?.error ?? null
    );
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<StaffLoginValues>({ resolver: zodResolver(staffLoginSchema) });

    // Already signed in — send them where they belong instead of showing a
    // login form they cannot act on.
    useEffect(() => {
        if (status === 'ready') navigate('/dashboard', { replace: true });
        if (status === 'needsProfile') navigate('/complete-profile', { replace: true });
    }, [status, navigate]);

    const onSubmit = async (data: StaffLoginValues) => {
        setLoading(true);
        setError(null);

        try {
            await signInWithPassword(data.email.trim().toLowerCase(), data.password);
            // AuthContext picks up the new session and the effect above routes.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
            setLoading(false);
        }
    };

    const iconClass =
        'absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 transition-colors group-focus-within:text-primary';
    const inputClass = 'h-12 pl-11 text-base focus-visible:ring-primary';

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in with your CNU Google account to continue your LET review."
            footer={
                <>
                    New here?{' '}
                    <Link to="/register" className="font-semibold text-primary hover:underline">
                        Create your account
                    </Link>
                </>
            }
        >
            {error && (
                <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            <GoogleSignInButton label="Continue with Google" />

            <p className="mt-3 text-center text-xs text-[#6B5B5B]">
                Use your <strong>@cnu.edu.ph</strong> account.
            </p>

            <div className="my-7 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#e6ddd3]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9a8a8a]">
                    Staff and partners
                </span>
                <span className="h-px flex-1 bg-[#e6ddd3]" />
            </div>

            {!showStaffForm ? (
                <button
                    type="button"
                    onClick={() => setShowStaffForm(true)}
                    className="w-full text-center text-sm font-semibold text-primary hover:underline"
                >
                    Sign in with a password instead
                </button>
            ) : (
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
                                placeholder="you@example.org"
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
            )}
        </AuthLayout>
    );
};

export default LoginPage;
