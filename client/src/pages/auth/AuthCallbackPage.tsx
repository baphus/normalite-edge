import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Landing point for the Google redirect.
 *
 * The Supabase client parses the URL and establishes the session on its own
 * (`detectSessionInUrl`), so all this page does is wait for auth state to
 * settle and then route:
 *
 *   ready        → the dashboard (they already had an account: a "log in")
 *   needsProfile → profile completion (first visit: a "sign up")
 *   signedOut    → back to login, with whatever error the provider returned
 */
const AuthCallbackPage: React.FC = () => {
    const { status } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const providerError = params.get('error_description') || params.get('error');
    const next = params.get('next');

    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'ready') {
            navigate(next || '/dashboard', { replace: true });
        } else if (status === 'needsProfile') {
            navigate('/complete-profile', { replace: true });
        } else {
            navigate('/login', {
                replace: true,
                state: { error: providerError || 'Sign-in was cancelled or failed.' },
            });
        }
    }, [status, navigate, next, providerError]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F4EE] font-lexend text-[#6B5B5B]">
            Signing you in…
        </div>
    );
};

export default AuthCallbackPage;
