import React from 'react';
import { getTierLabel, PASS_FAIL_COLORS, type ScoreTrendPoint } from '@/lib/examTheme';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { cn } from '@/lib/utils';

/**
 * Pass/fail hero for the exam results page: a status banner carrying the
 * score, "X/Y correct", and the attempt counter, plus a score-trend sparkline
 * and tiered confetti that fires only on a fresh submission.
 *
 * The banner is the primary visual signal (green/amber left border) and status
 * is never conveyed by colour alone — the dot and the explicit message always
 * accompany it (WCAG 1.4.1). The whole banner is a `role="status"` live region
 * so screen readers announce the pass/fail result.
 */
interface ScoreHeroProps {
    /** Percentage score, 0–100. */
    score: number;
    /** Number of correct answers. */
    correct: number;
    /** Total number of questions. */
    total: number;
    /** Current attempt number, 1-based. */
    attemptNo: number;
    /** Total number of submitted attempts. */
    totalAttempts: number;
    /** Sparkline data, oldest-first. */
    trend: ScoreTrendPoint[];
    /** True only on a fresh submission — gates confetti so revisits stay quiet. */
    justSubmitted: boolean;
    /** Master switch for confetti, controlled by the caller (e.g. user preference). */
    showConfetti: boolean;
}

type ConfettiTier = 'full' | 'subtle' | 'none';

const PASS_THRESHOLD_MESSAGE = "Here's where to focus";
const BANNER_MESSAGES = {
    outstanding: 'Outstanding! You passed!',
    congratulations: 'Congratulations! You passed!',
    passed: 'Congratulations! You passed!',
    failed: PASS_THRESHOLD_MESSAGE,
} as const;

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 40;
const SPARKLINE_PAD = 4;
const FULL_CONFETTI_PIECES = 300;
const SUBTLE_CONFETTI_PIECES = 120;

/**
 * Formats a percentage, falling back to an em-dash for missing data
 * (design system §2 no-data rule).
 */
const formatScore = (score: number): string =>
    Number.isFinite(score) ? `${Math.round(score)}%` : '—';

const clampScore = (value: number): number => Math.min(100, Math.max(0, value));

/** Builds the SVG polyline `x,y` point string for the trend data. */
const buildSparklinePoints = (points: readonly ScoreTrendPoint[]): string => {
    const count = points.length;
    if (count === 0) return '';
    const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PAD * 2;
    const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PAD * 2;
    const stepX = count === 1 ? 0 : innerWidth / (count - 1);
    return points
        .map((point, index) => {
            const x = count === 1 ? SPARKLINE_WIDTH / 2 : SPARKLINE_PAD + index * stepX;
            const y =
                SPARKLINE_HEIGHT -
                SPARKLINE_PAD -
                (clampScore(point.score) / 100) * innerHeight;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
};

const ScoreHero: React.FC<ScoreHeroProps> = ({
    score,
    correct,
    total,
    attemptNo,
    totalAttempts,
    trend,
    justSubmitted,
    showConfetti,
}) => {
    // Pass threshold (≥ 65%) is delegated to examTheme so tier logic stays in
    // one place. A non-finite score yields null → treated as fail.
    const tier = getTierLabel(score);
    const passed = tier !== null && tier !== 'Needs Work';

    const message =
        passed && score >= 90
            ? BANNER_MESSAGES.outstanding
            : passed && score >= 75
              ? BANNER_MESSAGES.congratulations
              : passed
                ? BANNER_MESSAGES.passed
                : BANNER_MESSAGES.failed;

    // Confetti tiers: ≥ 90 % full burst, 75–89 % subtle, below that none.
    const confettiTier: ConfettiTier =
        passed && score >= 90 ? 'full' : passed && score >= 75 ? 'subtle' : 'none';
    const confettiActive = Boolean(showConfetti && justSubmitted && confettiTier !== 'none');

    const bannerAccent = cn(
        'border-l-4',
        passed ? PASS_FAIL_COLORS.pass : PASS_FAIL_COLORS.fail,
        passed ? 'border-green-500' : 'border-amber-500',
    );

    const sparklinePoints = buildSparklinePoints(trend);
    const trendLabel =
        trend.length > 0
            ? `Score trend across attempts: ${trend.map((p) => `${Math.round(p.score)}%`).join(', ')}`
            : undefined;

    return (
        <div
            className="flex flex-col gap-4 lg:flex-row lg:items-stretch"
            role="status"
            aria-live="polite"
        >
            <div className={cn('flex-1 rounded-xl p-4 sm:p-5', bannerAccent)}>
                {/* Status is dot + text, never colour alone (WCAG 1.4.1). */}
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            passed ? 'bg-green-500' : 'bg-amber-500',
                        )}
                        aria-hidden="true"
                    />
                    <p
                        className={cn(
                            'text-[15px] font-semibold',
                            passed ? 'text-green-700' : 'text-amber-700',
                        )}
                    >
                        {message}
                    </p>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[32px] font-semibold leading-none tabular-nums text-slate-900">
                        {formatScore(score)}
                    </span>
                    <span className="text-[12px] font-medium text-slate-500">
                        {correct}/{total} correct
                    </span>
                </div>

                <p className="mt-1 text-[12px] text-slate-500">
                    Attempt {attemptNo} of {totalAttempts}
                </p>
            </div>

            <div className="w-full rounded-xl border border-slate-200 bg-white p-4 lg:w-60 lg:shrink-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Score trend
                </p>
                {trend.length > 0 ? (
                    <svg
                        className="mt-2 block h-10 w-full text-slate-500"
                        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                        role="img"
                        aria-label={trendLabel}
                        data-testid="score-sparkline"
                    >
                        <polyline
                            points={sparklinePoints}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ) : (
                    <p
                        className="mt-2 text-[24px] font-semibold leading-none tabular-nums text-slate-300"
                        aria-hidden="true"
                    >
                        —
                    </p>
                )}
            </div>

            {confettiTier !== 'none' && (
                <ConfettiCelebration
                    trigger={confettiActive}
                    numberOfPieces={confettiTier === 'full' ? FULL_CONFETTI_PIECES : SUBTLE_CONFETTI_PIECES}
                />
            )}
        </div>
    );
};

export default ScoreHero;
