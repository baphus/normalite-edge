import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpenCheck, Compass, X } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePageGuide } from '@/lib/pageGuides';

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 340;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const findGuideTarget = (selectors: string[]) => {
    for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
            return element;
        }
    }

    return null;
};

const PageGuideOverlay: React.FC = () => {
    const location = useLocation();
    const { user, updateUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<Rect | null>(null);

    const guide = useMemo(() => {
        if (!user?.role) {
            return null;
        }

        return resolvePageGuide(location.pathname, user.role);
    }, [location.pathname, user?.role]);

    const currentStep = useMemo(() => {
        if (!guide || !guide.steps.length) {
            return null;
        }

        return guide.steps[stepIndex] || null;
    }, [guide, stepIndex]);

    useEffect(() => {
        if (!user?.isOnboarded || !guide?.id) {
            setOpen(false);
            setStepIndex(0);
            return;
        }

        const completedTours = user.completedTours || [];
        const shouldOpen = !completedTours.includes(guide.id);
        setOpen(shouldOpen);
        setStepIndex(0);
    }, [guide?.id, user?.completedTours, user?.isOnboarded]);

    useEffect(() => {
        if (!open || !currentStep) {
            setTargetRect(null);
            return;
        }

        const updateTargetRect = () => {
            const target = findGuideTarget(currentStep.selectors);
            if (!target) {
                setTargetRect(null);
                return;
            }

            const rect = target.getBoundingClientRect();
            setTargetRect({
                top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
                left: Math.max(0, rect.left - SPOTLIGHT_PADDING),
                width: rect.width + SPOTLIGHT_PADDING * 2,
                height: rect.height + SPOTLIGHT_PADDING * 2,
            });
        };

        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect, true);

        return () => {
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect, true);
        };
    }, [open, currentStep]);

    const markAsCompleted = async () => {
        if (!guide?.id || saving) {
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/auth/me/tours', { tourId: guide.id });
            if (response.data?.data) {
                updateUser(response.data.data);
            }
            setOpen(false);
        } catch (error) {
            console.error('Failed to mark guide as completed', error);
        } finally {
            setSaving(false);
        }
    };

    if (!open || !guide) {
        return null;
    }

    const tooltipTop = targetRect
        ? clamp(targetRect.top + targetRect.height + 12, 12, window.innerHeight - 280)
        : 24;
    const tooltipLeft = targetRect
        ? clamp(targetRect.left, 12, Math.max(12, window.innerWidth - TOOLTIP_WIDTH - 12))
        : Math.max(12, (window.innerWidth - TOOLTIP_WIDTH) / 2);
    const isLastStep = stepIndex >= guide.steps.length - 1;
    const stepLabel = `${stepIndex + 1}/${guide.steps.length}`;

    const closeForNow = () => {
        setOpen(false);
        setStepIndex(0);
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/40" />
            {targetRect && (
                <div
                    className="pointer-events-none fixed z-50 rounded-xl border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                    }}
                />
            )}
            <div
                className="fixed z-50 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
                style={{ top: tooltipTop, left: tooltipLeft }}
            >
            <button
                type="button"
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                onClick={closeForNow}
                aria-label="Close guide"
            >
                <X size={16} />
            </button>

            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Compass size={13} />
                First-time page guide {stepLabel}
            </p>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{currentStep?.title || guide.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{currentStep?.description || 'Explore this page with confidence.'}</p>

            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={closeForNow}
                >
                    Later
                </button>
                {stepIndex > 0 && (
                    <button
                        type="button"
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                    >
                        Back
                    </button>
                )}
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    onClick={() => {
                        if (isLastStep) {
                            void markAsCompleted();
                            return;
                        }

                        setStepIndex((prev) => Math.min(guide.steps.length - 1, prev + 1));
                    }}
                    disabled={saving}
                >
                    <BookOpenCheck size={14} />
                    {saving ? 'Saving...' : isLastStep ? 'Finish guide' : 'Next'}
                </button>
            </div>
            </div>
        </>
    );
};

export default PageGuideOverlay;
