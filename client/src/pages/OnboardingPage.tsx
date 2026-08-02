import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Rocket } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const OnboardingPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'REVIEWEE') {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate, user]);

    const completeOnboarding = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const response = await api.post('/auth/onboarding', {});

            if (response.data?.data) {
                updateUser(response.data.data);
            }

            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Failed to complete onboarding', err);
            setError('We could not finish your onboarding. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#f0fdf4,transparent_38%),radial-gradient(circle_at_top_left,#eff6ff,transparent_40%),#f8fafc] px-6 py-10">
            <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl backdrop-blur">
                <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    <Rocket size={14} />
                    First-time onboarding
                </p>

                <h1 className="mt-4 text-3xl font-black text-slate-900">Welcome to Normalite EDGE</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Set up your learner profile so your study sessions and exams are personalized from day one.
                </p>

                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 size={16} />
                        After this step, page-by-page guides will appear the first time you visit each area.
                    </p>
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <div className="mt-6">
                    <Button
                        type="button"
                        onClick={completeOnboarding}
                        disabled={submitting}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                        {submitting ? 'Finishing setup...' : 'Continue to dashboard'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
