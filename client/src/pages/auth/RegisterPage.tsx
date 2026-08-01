import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/marketing/AuthLayout';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const STEPS = [
    'Sign in with your @cnu.edu.ph Google account',
    'Pick your program track, campus, year and section',
    'Start taking mock exams straight away',
];

/**
 * Sign-up entry point.
 *
 * `signInWithOAuth` creates the identity if it does not exist and signs in if
 * it does, so this fires exactly the same call as the login page — only the
 * framing differs. A returning user who lands here is simply signed in, which
 * is the correct outcome rather than an error.
 *
 * The route is kept because eight marketing CTAs link to /register.
 */
const RegisterPage: React.FC = () => {
    const { status } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (status === 'ready') navigate('/dashboard', { replace: true });
        if (status === 'needsProfile') navigate('/complete-profile', { replace: true });
    }, [status, navigate]);

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Your university Google account is all you need — no password to remember."
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                        Log in
                    </Link>
                </>
            }
        >
            <GoogleSignInButton label="Sign up with Google" />

            <p className="mt-3 text-center text-xs text-[#6B5B5B]">
                Only <strong>@cnu.edu.ph</strong> accounts can register.
            </p>

            <ul className="mt-8 flex flex-col gap-3 rounded-lg border border-[#e6ddd3] bg-white/60 p-5">
                {STEPS.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-[#3d2c2c]">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                        <span>
                            <span className="font-mono text-[11px] text-[#9a8a8a]">
                                {String(index + 1).padStart(2, '0')}
                            </span>{' '}
                            {step}
                        </span>
                    </li>
                ))}
            </ul>

            <p className="mt-6 text-center text-xs leading-relaxed text-[#6B5B5B]">
                Reviewers and partners from outside the university are added by an administrator.
            </p>
        </AuthLayout>
    );
};

export default RegisterPage;
