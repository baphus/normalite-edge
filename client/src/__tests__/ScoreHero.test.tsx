import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreHero from '@/components/exam/ScoreHero';
import type { ScoreTrendPoint } from '@/lib/examTheme';

// Mock the confetti overlay so celebrations can be asserted deterministically
// (no timers, no reduced-motion/confetti-preference plumbing).
vi.mock('@/components/ConfettiCelebration', () => ({
    default: ({ trigger, numberOfPieces }: { trigger: boolean; numberOfPieces?: number }) =>
        trigger ? (
            <div data-testid="confetti-celebration" data-pieces={numberOfPieces} />
        ) : null,
}));

const defaultTrend: ScoreTrendPoint[] = [
    { score: 62, label: 'Attempt 1' },
    { score: 78, label: 'Attempt 2' },
];

interface ScoreHeroOverrides {
    score?: number;
    correct?: number;
    total?: number;
    attemptNo?: number;
    totalAttempts?: number;
    trend?: ScoreTrendPoint[];
    justSubmitted?: boolean;
    showConfetti?: boolean;
}

const renderHero = (overrides: ScoreHeroOverrides = {}) => {
    const props = {
        score: 82,
        correct: 41,
        total: 50,
        attemptNo: 3,
        totalAttempts: 3,
        trend: defaultTrend,
        justSubmitted: false,
        showConfetti: true,
        ...overrides,
    };
    return render(<ScoreHero {...props} />);
};

describe('ScoreHero', () => {
    it('renders pass state with correct banner text', () => {
        renderHero({ score: 82 });

        expect(screen.getByText('Congratulations! You passed!')).toBeInTheDocument();
    });

    it('renders fail state with correct banner text', () => {
        renderHero({ score: 50 });

        expect(screen.getByText("Here's where to focus")).toBeInTheDocument();
    });

    it('shows "Outstanding!" banner text for scores ≥ 90%', () => {
        renderHero({ score: 95 });

        expect(screen.getByText('Outstanding! You passed!')).toBeInTheDocument();
    });

    it('shows score percentage', () => {
        renderHero({ score: 82 });

        expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('shows "X/Y correct" subtitle', () => {
        renderHero({ correct: 41, total: 50 });

        expect(screen.getByText('41/50 correct')).toBeInTheDocument();
    });

    it('shows attempt counter', () => {
        renderHero({ attemptNo: 3, totalAttempts: 3 });

        expect(screen.getByText('Attempt 3 of 3')).toBeInTheDocument();
    });

    it('renders sparkline when trend data provided', () => {
        renderHero();

        expect(screen.getByTestId('score-sparkline')).toBeInTheDocument();
    });

    it('has an aria-live region announcing pass/fail', () => {
        renderHero();

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('fires full confetti for scores ≥ 90% on fresh submission', () => {
        renderHero({ score: 95, justSubmitted: true });

        expect(screen.getByTestId('confetti-celebration')).toBeInTheDocument();
        expect(screen.getByTestId('confetti-celebration')).toHaveAttribute('data-pieces', '300');
    });

    it('fires subtle confetti for scores 75–89% on fresh submission', () => {
        renderHero({ score: 82, justSubmitted: true });

        expect(screen.getByTestId('confetti-celebration')).toHaveAttribute('data-pieces', '120');
    });

    it('does not fire confetti when the result is not a fresh submission', () => {
        renderHero({ score: 95, justSubmitted: false });

        expect(screen.queryByTestId('confetti-celebration')).not.toBeInTheDocument();
    });

    it('does not fire confetti below 75%', () => {
        renderHero({ score: 70, justSubmitted: true });

        expect(screen.queryByTestId('confetti-celebration')).not.toBeInTheDocument();
    });
});
