import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Rocket } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToCloudinary } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const OnboardingPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const roleMessage = useMemo(
        () => 'Set up your learner profile so your study sessions and exams are personalized from day one.',
        []
    );

    useEffect(() => {
        if (user && user.role !== 'REVIEWEE') {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate, user]);

    const completeOnboarding = async (skipPhoto = false) => {
        setSubmitting(true);
        setError(null);

        try {
            let uploadedPicture: string | undefined;
            if (!skipPhoto && avatarFile) {
                uploadedPicture = await uploadImageToCloudinary(avatarFile, 'profile-pics');
            }

            const response = await api.post('/auth/onboarding', {
                picture: uploadedPicture,
            });

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
                <p className="mt-2 text-sm text-slate-600">{roleMessage}</p>

                <div className="mt-8 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[auto,1fr] md:items-center">
                    <div>
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Profile preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-200" />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
                                <Camera size={24} />
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-900">Upload profile photo (optional)</p>
                        <p className="mt-1 text-xs text-slate-600">
                            A profile image helps teammates and students identify you quickly.
                        </p>
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
                            className="mt-3 text-xs"
                        />
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 size={16} />
                        After this step, page-by-page guides will appear the first time you visit each area.
                    </p>
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <div className="mt-6 flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={() => completeOnboarding(false)}
                        disabled={submitting}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                        {submitting ? 'Finishing setup...' : 'Continue to dashboard'}
                    </Button>
                    <Button type="button" variant="outline" disabled={submitting} onClick={() => completeOnboarding(true)}>
                        Skip photo
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
