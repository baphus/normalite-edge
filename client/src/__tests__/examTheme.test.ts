import { describe, it, expect } from 'vitest';
import {
    getTierLabel,
    TIER_COLORS,
    PASS_FAIL_COLORS,
    getScoreTrend,
} from '@/lib/examTheme';

// ── getTierLabel ──────────────────────────────────────────────────────────────

describe('getTierLabel', () => {
    it('returns "Strong" for scores >= 85%', () => {
        expect(getTierLabel(85)).toBe('Strong');
        expect(getTierLabel(90)).toBe('Strong');
        expect(getTierLabel(100)).toBe('Strong');
    });

    it('returns "On Track" for scores 65-84%', () => {
        expect(getTierLabel(65)).toBe('On Track');
        expect(getTierLabel(75)).toBe('On Track');
        expect(getTierLabel(84)).toBe('On Track');
    });

    it('returns "Needs Work" for scores < 65%', () => {
        expect(getTierLabel(0)).toBe('Needs Work');
        expect(getTierLabel(50)).toBe('Needs Work');
        expect(getTierLabel(64)).toBe('Needs Work');
    });

    it('returns null for NaN', () => {
        expect(getTierLabel(NaN)).toBeNull();
    });

    it('returns null for Infinity', () => {
        expect(getTierLabel(Infinity)).toBeNull();
        expect(getTierLabel(-Infinity)).toBeNull();
    });

    it('returns null for null and undefined', () => {
        expect(getTierLabel(null)).toBeNull();
        expect(getTierLabel(undefined)).toBeNull();
    });

    it('handles negative scores as "Needs Work"', () => {
        expect(getTierLabel(-10)).toBe('Needs Work');
    });

    it('handles decimal scores', () => {
        expect(getTierLabel(84.9)).toBe('On Track');
        expect(getTierLabel(85.0)).toBe('Strong');
        expect(getTierLabel(64.99)).toBe('Needs Work');
        expect(getTierLabel(65.0)).toBe('On Track');
    });
});

// ── TIER_COLORS ───────────────────────────────────────────────────────────────

describe('TIER_COLORS', () => {
    it('has entries for all three tiers', () => {
        expect(TIER_COLORS).toHaveProperty('Strong');
        expect(TIER_COLORS).toHaveProperty('On Track');
        expect(TIER_COLORS).toHaveProperty('Needs Work');
    });

    it('maps Strong to green classes', () => {
        expect(TIER_COLORS['Strong']).toContain('green');
    });

    it('maps On Track to blue/slate classes', () => {
        const classes = TIER_COLORS['On Track'];
        expect(classes).toMatch(/blue|slate/);
    });

    it('maps Needs Work to amber classes', () => {
        expect(TIER_COLORS['Needs Work']).toContain('amber');
    });

    it('follows the design-system recipe: border-*-200 bg-*-50 text-*-700', () => {
        const recipe = /border-\w+-200 bg-\w+-50 text-\w+-700/;
        expect(TIER_COLORS['Strong']).toMatch(recipe);
        expect(TIER_COLORS['On Track']).toMatch(recipe);
        expect(TIER_COLORS['Needs Work']).toMatch(recipe);
    });
});

// ── PASS_FAIL_COLORS ──────────────────────────────────────────────────────────

describe('PASS_FAIL_COLORS', () => {
    it('has pass and fail entries', () => {
        expect(PASS_FAIL_COLORS).toHaveProperty('pass');
        expect(PASS_FAIL_COLORS).toHaveProperty('fail');
    });

    it('maps pass to green accent', () => {
        expect(PASS_FAIL_COLORS.pass).toContain('green');
    });

    it('maps fail to amber accent', () => {
        expect(PASS_FAIL_COLORS.fail).toContain('amber');
    });

    it('follows the same design-system recipe as TIER_COLORS', () => {
        const recipe = /border-\w+-200 bg-\w+-50 text-\w+-700/;
        expect(PASS_FAIL_COLORS.pass).toMatch(recipe);
        expect(PASS_FAIL_COLORS.fail).toMatch(recipe);
    });
});

// ── getScoreTrend ─────────────────────────────────────────────────────────────

describe('getScoreTrend', () => {
    it('returns empty array for empty input', () => {
        expect(getScoreTrend([])).toEqual([]);
    });

    it('maps attempts to score trend points', () => {
        const attempts = [
            { percentage: 70, submittedAt: '2026-01-15T10:00:00Z' },
            { percentage: 85, submittedAt: '2026-01-20T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ score: 70, label: 'Attempt 1' });
        expect(result[1]).toEqual({ score: 85, label: 'Attempt 2' });
    });

    it('labels attempts sequentially', () => {
        const attempts = [
            { percentage: 60, submittedAt: '2026-01-10T10:00:00Z' },
            { percentage: 70, submittedAt: '2026-01-15T10:00:00Z' },
            { percentage: 90, submittedAt: '2026-01-20T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);

        expect(result[0].label).toBe('Attempt 1');
        expect(result[1].label).toBe('Attempt 2');
        expect(result[2].label).toBe('Attempt 3');
    });

    it('skips attempts with null percentage', () => {
        const attempts = [
            { percentage: 70, submittedAt: '2026-01-15T10:00:00Z' },
            { percentage: null, submittedAt: '2026-01-20T10:00:00Z' },
            { percentage: 85, submittedAt: '2026-01-25T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ score: 70, label: 'Attempt 1' });
        expect(result[1]).toEqual({ score: 85, label: 'Attempt 2' });
    });

    it('skips attempts with undefined percentage', () => {
        const attempts = [
            { submittedAt: '2026-01-15T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);
        expect(result).toEqual([]);
    });

    it('skips attempts with NaN percentage', () => {
        const attempts = [
            { percentage: NaN, submittedAt: '2026-01-15T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);
        expect(result).toEqual([]);
    });

    it('preserves score as number', () => {
        const attempts = [
            { percentage: 78.5, submittedAt: '2026-01-15T10:00:00Z' },
        ];
        const result = getScoreTrend(attempts);
        expect(typeof result[0].score).toBe('number');
        expect(result[0].score).toBe(78.5);
    });
});
