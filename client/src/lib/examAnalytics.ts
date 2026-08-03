import type { AttemptItem } from '@/components/exam-view/types';

/**
 * Pure derivations over a set of attempts. No React, no fetching — the exam
 * detail page and the report exporter both need these numbers and must not
 * compute them differently.
 */

export interface AttemptSummary {
    total: number;
    submitted: number;
    inProgress: number;
    uniqueStudents: number;
    /**
     * `null` when nothing has been submitted, never `0`. An exam with no
     * submissions has no average score; reporting `0%` states that everyone
     * failed, which is a different and false claim.
     */
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
}

export interface ScoreBand {
    label: string;
    min: number;
    max: number;
    count: number;
    /** Bar length as a percentage of the tallest band. Presentation only. */
    width: number;
}

export interface ProgramPerformance {
    program: string;
    count: number;
    averageScore: number;
}

const isSubmitted = (attempt: AttemptItem) => attempt.status === 'SUBMITTED';

/** Newest first — the order a manager expects when opening a results page. */
export function sortAttemptsByRecency(attempts: AttemptItem[]): AttemptItem[] {
    return [...attempts].sort((first, second) => {
        const left = new Date(first.submittedAt || first.startedAt || 0).getTime();
        const right = new Date(second.submittedAt || second.startedAt || 0).getTime();
        return right - left;
    });
}

export function selectSubmitted(attempts: AttemptItem[]): AttemptItem[] {
    return attempts.filter(isSubmitted);
}

export function summariseAttempts(attempts: AttemptItem[]): AttemptSummary {
    const submitted = selectSubmitted(attempts);
    const scores = submitted.map((attempt) => Number(attempt.percentage || 0));
    const hasScores = scores.length > 0;

    return {
        total: attempts.length,
        submitted: submitted.length,
        inProgress: attempts.filter((attempt) => attempt.status === 'IN_PROGRESS').length,
        uniqueStudents: new Set(
            attempts
                .map((attempt) => attempt.user?.id)
                .filter((userId): userId is string => Boolean(userId)),
        ).size,
        averageScore: hasScores ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
        highestScore: hasScores ? Math.max(...scores) : null,
        lowestScore: hasScores ? Math.min(...scores) : null,
    };
}

export function buildScoreDistribution(attempts: AttemptItem[]): ScoreBand[] {
    const bands: ScoreBand[] = [
        { label: '0–49', min: 0, max: 49.99, count: 0, width: 0 },
        { label: '50–59', min: 50, max: 59.99, count: 0, width: 0 },
        { label: '60–69', min: 60, max: 69.99, count: 0, width: 0 },
        { label: '70–79', min: 70, max: 79.99, count: 0, width: 0 },
        { label: '80–89', min: 80, max: 89.99, count: 0, width: 0 },
        { label: '90–100', min: 90, max: 100, count: 0, width: 0 },
    ];

    for (const attempt of selectSubmitted(attempts)) {
        const score = Number(attempt.percentage || 0);
        const band = bands.find((candidate) => score >= candidate.min && score <= candidate.max);
        if (band) band.count += 1;
    }

    const tallest = Math.max(...bands.map((band) => band.count), 1);
    return bands.map((band) => ({
        ...band,
        width: band.count > 0 ? Math.max((band.count / tallest) * 100, 8) : 0,
    }));
}

export function rankProgramsByVolume(attempts: AttemptItem[], limit = 5): ProgramPerformance[] {
    const totals = new Map<string, { count: number; scoreTotal: number }>();

    for (const attempt of selectSubmitted(attempts)) {
        const program = attempt.user?.programTrack?.trim() || 'Unspecified';
        const current = totals.get(program) || { count: 0, scoreTotal: 0 };
        current.count += 1;
        current.scoreTotal += Number(attempt.percentage || 0);
        totals.set(program, current);
    }

    return Array.from(totals.entries())
        .map(([program, stats]) => ({
            program,
            count: stats.count,
            averageScore: stats.count > 0 ? stats.scoreTotal / stats.count : 0,
        }))
        .sort((left, right) => right.count - left.count)
        .slice(0, limit);
}
