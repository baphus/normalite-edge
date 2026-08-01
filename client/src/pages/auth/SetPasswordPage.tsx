import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/marketing/AuthLayout';

const setPasswordSchema = z.object({
    password: z
        .string()
        .min(12, 'Use at least 12 characters')
        .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

/**
 * Landing page for admin-generated invite and recovery links.
 *
 * The link establishes a Supabase session before this renders, so setting the
 * password is just an authenticated `updateUser` call. Only external staff
 * accounts ever get here — institutional users have no password at all.
 */
const SetPasswordPage: React.FC = () => {
    const { status, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SetPasswordValues>({ resolver: zodResolver(setPasswordSchema) });

    const onSubmit = async (data: SetPasswordValues) => {
        setSaving(true);
        setError(null);

        const { error: updateError } = await supabase.auth.updateUser({
            password: data.password,
        });

        if (updateError) {
            setError(updateError.message);
            setSaving(false);
            return;
        }

        await refreshProfile();
        navigate('/dashboard', { replace: true });
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F4EE] font-lexend text-[#6B5B5B]">
                Checking your link…
            </div>
        );
    }

    // No session means the link was already used, has expired, or was altered.
    if (status === 'signedOut') {
        return (
            <AuthLayout
                title="This link has expired"
                subtitle="Invite and reset links are single-use and time-limited."
                footer={
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                        Back to login
                    </Link>
                }
            >
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>Ask your administrator to generate a new link for you.</span>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Set your password"
            subtitle="Choose a password to finish setting up your account."
            footer={
                <Link to="/login" className="font-semibold text-primary hover:underline">
                    Back to login
                </Link>
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
                    <Label htmlFor="password">New password</Label>
                    <div className="group relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                            <Lock size={18} />
                        </div>
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            className="h-12 pl-11 pr-11"
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
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        className="h-12"
                        {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                        <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={saving}
                    className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-white shadow-sm transition-all hover:bg-[#5a1010] active:scale-[0.99]"
                >
                    {saving ? 'Saving…' : 'Set password and continue'}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default SetPasswordPage;
