/**
 * Tier colour utility and theme tokens for the exam UI redesign.
 *
 * Provides `getTierLabel` for mapping percentage scores to qualitative tiers,
 * Tailwind class tokens for tier and pass/fail colouring, and `getScoreTrend`
 * for sparkline data preparation.
 *
 * These are **feedback tiers** for the results/score surfaces — they are not
 * the score-band filters in `useSubmissionFilters.ts` (90/75/…), which serve
 * a different filtering purpose.
 *
 * All exports are pure functions and constants — safe for unit testing and
 * side-effect-free imports.
 */

// ── Tier labels ───────────────────────────────────────────────────────────────

export type TierLabel = 'Strong' | 'On Track' | 'Needs Work';

/**
 * Maps a percentage score (0–100) to a qualitative tier.
 *
 * - ≥ 85 % → Strong
 * - 65–84 % → On Track
 * - < 65 % → Needs Work
 *
 * Returns `null` for non-finite or missing values (NaN, Infinity, null,
 * undefined) so callers can render an em-dash instead of painting missing
 * data as the worst tier.
 */
export function getTierLabel(score: number | null | undefined): TierLabel | null {
    if (score == null || !Number.isFinite(score)) return null;
    if (score >= 85) return 'Strong';
    if (score >= 65) return 'On Track';
    return 'Needs Work';
}

// ── Colour tokens ─────────────────────────────────────────────────────────────

/**
 * Tailwind border/bg/text class triples for each tier.
 *
 * Follows the same recipe as `categoryTone.ts`: slate-200-weight border on a
 * -50 background with -700 text, which clears WCAG AA for normal text.
 * Tier is never conveyed by colour alone — the label always accompanies it.
 */
export const TIER_COLORS = {
    Strong: 'border-green-200 bg-green-50 text-green-700',
    'On Track': 'border-blue-200 bg-blue-50 text-blue-700',
    'Needs Work': 'border-amber-200 bg-amber-50 text-amber-700',
} as const;

/**
 * Pass/fail accent colour tokens for result banners and status indicators.
 * Green accent for pass, amber accent for fail. These share the same
 * Tailwind recipe as `TIER_COLORS` (Strong → pass, Needs Work → fail) but
 * represent a separate semantic decision — pass/fail is a binary threshold,
 * not a three-way tier.
 *
 * Status is never conveyed by colour alone — always pair with text (WCAG 1.4.1).
 */
export const PASS_FAIL_COLORS = {
    pass: 'border-green-200 bg-green-50 text-green-700',
    fail: 'border-amber-200 bg-amber-50 text-amber-700',
} as const;

// ── Sparkline data ────────────────────────────────────────────────────────────

export interface ScoreTrendPoint {
    score: number;
    label: string;
}

interface AttemptInput {
    percentage?: number | null;
    submittedAt?: string | null;
}

/**
 * Maps an array of attempt records to `{ score, label }` points suitable for
 * sparkline rendering. Input must already be in the desired display order
 * (typically oldest-first for a left-to-right trend).
 *
 * Attempts with no `percentage` (null/undefined) are skipped — they
 * represent in-progress submissions with no score yet, and defaulting to 0
 * would fabricate a false data point (see design system §2 no-data rule).
 * Labels are sequential ("Attempt 1", "Attempt 2", …) over the filtered set.
 */
export function getScoreTrend(attempts: readonly AttemptInput[]): ScoreTrendPoint[] {
    return attempts
        .filter((a) => a.percentage != null && Number.isFinite(a.percentage))
        .map((attempt, index) => ({
            score: Number(attempt.percentage),
            label: `Attempt ${index + 1}`,
        }));
}
