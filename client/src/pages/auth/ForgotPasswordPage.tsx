import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import AuthLayout from '@/components/marketing/AuthLayout';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const SUPPORT_EMAIL = 'support@cnu.edu.ph';

/**
 * There is no self-service password reset, because almost nobody has a
 * password.
 *
 * Institutional accounts authenticate through Google, so a forgotten password
 * is a Google problem. The handful of external staff accounts are reset by an
 * administrator generating a fresh link — which needs no mail provider and no
 * verified sending domain.
 */
const ForgotPasswordPage: React.FC = () => (
    <AuthLayout
        title="Trouble signing in?"
        subtitle="How you recover depends on the kind of account you have."
        footer={
            <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to login
            </Link>
        }
    >
        <div className="space-y-6">
            <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-[#1A0E0E]">
                    If you use a @cnu.edu.ph account
                </h2>
                <p className="text-sm leading-relaxed text-[#6B5B5B]">
                    You do not have a password here — you sign in with Google. If you cannot get into
                    your university Google account, recover it through Google or contact CNU IT
                    support.
                </p>
                <GoogleSignInButton label="Try signing in with Google" />
            </section>

            <div className="h-px bg-[#e6ddd3]" />

            <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-[#1A0E0E]">
                    If you are an external reviewer or partner
                </h2>
                <div className="flex items-start gap-2 rounded-lg border border-[#e6ddd3] bg-white/60 p-3 text-sm leading-relaxed text-[#3d2c2c]">
                    <Info size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                        Ask an administrator to send you a new set-password link. Reach them at{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
                            {SUPPORT_EMAIL}
                        </a>
                        .
                    </span>
                </div>
            </section>
        </div>
    </AuthLayout>
);

export default ForgotPasswordPage;
