import React from 'react';
import { ArrowRight, Award, BarChart3, BookOpen, Download, RotateCcw } from 'lucide-react';
import { getTierLabel, TIER_COLORS } from '@/lib/examTheme';
import { cn } from '@/lib/utils';

export interface SectionTier {
    name: string;
    tier: 'Strong' | 'On Track' | 'Needs Work';
    percentage: number;
}

export interface WhatNextCTAsProps {
    /** Whether the attempt passed (derived from `getTierLabel(score) >= 65`). */
    passed: boolean;
    /** Percentage score, 0–100. */
    score: number;
    /** Current attempt number, 1-based. */
    attemptNo: number;
    /** Maximum attempts allowed; `null` means unlimited. */
    maxAttempts: number | null;
    /** Per-section tier breakdown, used to find the weakest section. */
    sections: SectionTier[];
    /** Triggers the PDF report export (actual export lives outside this component). */
    onDownload: () => void;
    /** Pass-only: view/download the certificate. */
    onViewCertificate?: () => void;
    /** Compare this attempt against previous ones. */
    onCompare?: () => void;
    /** Retake the exam. */
    onRetake: () => void;
    /** Fail-only: open study material for a section. */
    onStudySection?: (sectionName: string) => void;
}

/** Shared icon badge — a muted square carrying each CTA's lucide icon. */
const IconBadge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
    <span
        aria-hidden="true"
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', className)}
    >
        {children}
    </span>
);

interface CtaCardProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

/**
 * One action card: icon, label and supporting text in a bordered, rounded box.
 * Renders as a real `<button>` so keyboard users get native focus behaviour and
 * disabled retake cards are unreachable.
 */
const CtaCard: React.FC<CtaCardProps> = ({ icon, label, description, onClick, disabled = false, className }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
            'flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left',
            'transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-slate-300 hover:bg-slate-50',
            className,
        )}
    >
        {icon}
        <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-slate-900">{label}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{description}</span>
        </span>
    </button>
);

const ICON_SIZE = 'h-4 w-4';

/**
 * Context-dependent "What's next?" CTAs for the exam results page.
 *
 * Pass state: download report plus the retake card, and — when their handlers
 * are wired — the certificate and compare cards. Fail state: a highlighted
 * weakest-section card with a study-material link (when `onStudySection` is
 * provided), plus retake/compare/download actions. Cards stack vertically on
 * mobile and form a 2-column grid from the `sm` breakpoint up.
 *
 * The retake card is disabled once `attemptNo >= maxAttempts` (or never when
 * `maxAttempts` is `null` — unlimited retakes).
 */
export const WhatNextCTAs: React.FC<WhatNextCTAsProps> = ({
    passed,
    score,
    attemptNo,
    maxAttempts,
    sections,
    onDownload,
    onViewCertificate,
    onCompare,
    onRetake,
    onStudySection,
}) => {
    // Weakest section = lowest percentage. Since tiers are monotonic in
    // percentage, this also yields the lowest tier label.
    const weakSection =
        sections.length > 0
            ? sections.reduce((min, section) => (section.percentage < min.percentage ? section : min))
            : null;
    const weakTier = weakSection ? getTierLabel(weakSection.percentage) ?? weakSection.tier : null;

    const retakeDisabled = maxAttempts !== null && attemptNo >= maxAttempts;
    const attemptsLabel = `Attempt ${attemptNo} of ${maxAttempts ?? 'unlimited'}`;

    const retakeCard = (
        <CtaCard
            icon={
                <IconBadge className="bg-amber-100 text-amber-700">
                    <RotateCcw className={ICON_SIZE} />
                </IconBadge>
            }
            label={passed ? 'Retake to improve' : 'Retake in 24h'}
            description={retakeDisabled ? 'Maximum attempts reached' : attemptsLabel}
            onClick={onRetake}
            disabled={retakeDisabled}
        />
    );

    const compareCard = onCompare ? (
        <CtaCard
            icon={
                <IconBadge className="bg-blue-100 text-blue-700">
                    <BarChart3 className={ICON_SIZE} />
                </IconBadge>
            }
            label="Compare with Previous Attempts"
            description="See how this attempt stacks up against earlier ones."
            onClick={onCompare}
        />
    ) : null;

    const downloadCard = (
        <CtaCard
            icon={
                <IconBadge className="bg-slate-100 text-slate-600">
                    <Download className={ICON_SIZE} />
                </IconBadge>
            }
            label="Download Report"
            description="Save a PDF summary of this attempt."
            onClick={onDownload}
        />
    );

    return (
        <section aria-labelledby="whats-next-heading">
            <h2 id="whats-next-heading" className="text-[13px] font-semibold text-slate-900">
                {passed ? "What's next?" : 'Study Recommendations'}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
                {passed
                    ? `You scored ${Math.round(score)}% — here's what you can do next.`
                    : `Your score of ${Math.round(score)}% is below the 65% pass mark. Focus on your weakest section before retaking.`}
            </p>

            {passed ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {downloadCard}
                    {onViewCertificate && (
                        <CtaCard
                            icon={
                                <IconBadge className="bg-green-100 text-green-700">
                                    <Award className={ICON_SIZE} />
                                </IconBadge>
                            }
                            label="View Certificate"
                            description="View or download your certificate."
                            onClick={onViewCertificate}
                        />
                    )}
                    {compareCard}
                    {retakeCard}
                </div>
            ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {weakSection && weakTier && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                            <div className="flex items-start gap-3">
                                <IconBadge className="bg-amber-100 text-amber-700">
                                    <BookOpen className={ICON_SIZE} />
                                </IconBadge>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                        Weakest section
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="text-[15px] font-semibold text-slate-900">
                                            {weakSection.name}
                                        </span>
                                        <span
                                            className={cn(
                                                'rounded-md border px-1.5 py-0.5 text-[12px] font-semibold',
                                                TIER_COLORS[weakTier],
                                            )}
                                        >
                                            {weakTier}
                                        </span>
                                        <span className="text-[12px] tabular-nums text-slate-500">
                                            {Math.round(weakSection.percentage)}%
                                        </span>
                                    </div>
                                    {onStudySection && (
                                        <button
                                            type="button"
                                            onClick={() => onStudySection(weakSection.name)}
                                            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 transition-colors hover:text-blue-800 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                                        >
                                            Review study material
                                            <ArrowRight className={ICON_SIZE} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {retakeCard}
                    {compareCard}
                    {downloadCard}
                </div>
            )}
        </section>
    );
};

export default WhatNextCTAs;
