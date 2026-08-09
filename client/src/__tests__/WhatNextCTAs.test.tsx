import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhatNextCTAs, { type SectionTier, type WhatNextCTAsProps } from '@/components/exam/WhatNextCTAs';

// "Major Subject" (42%) is the weakest section — the lowest percentage and the
// only "Needs Work" tier.
const sections: SectionTier[] = [
    { name: 'Professional Education', tier: 'Strong', percentage: 88 },
    { name: 'General Education', tier: 'On Track', percentage: 70 },
    { name: 'Major Subject', tier: 'Needs Work', percentage: 42 },
];

const renderCTAs = (overrides: Partial<WhatNextCTAsProps> = {}) => {
    const props: WhatNextCTAsProps = {
        passed: false,
        score: 58,
        attemptNo: 1,
        maxAttempts: 3,
        sections,
        onDownload: vi.fn(),
        onViewCertificate: vi.fn(),
        onCompare: vi.fn(),
        onRetake: vi.fn(),
        onStudySection: vi.fn(),
        ...overrides,
    };
    return render(<WhatNextCTAs {...props} />);
};

describe('WhatNextCTAs', () => {
    it('renders pass CTAs when the attempt passed', () => {
        renderCTAs({ passed: true, score: 82 });

        expect(screen.getByText("What's next?")).toBeInTheDocument();
        expect(screen.getByText('Download Report')).toBeInTheDocument();
        expect(screen.getByText('View Certificate')).toBeInTheDocument();
        expect(screen.getByText('Compare with Previous Attempts')).toBeInTheDocument();
        expect(screen.getByText('Retake to improve')).toBeInTheDocument();
        expect(screen.queryByText('Study Recommendations')).not.toBeInTheDocument();
        expect(screen.queryByText('Weakest section')).not.toBeInTheDocument();
    });

    it('renders fail CTAs with the weakest section highlighted', () => {
        renderCTAs({ passed: false });

        expect(screen.getByText('Study Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Weakest section')).toBeInTheDocument();
        expect(screen.getByText('Major Subject')).toBeInTheDocument();
        expect(screen.getByText('Needs Work')).toBeInTheDocument();
        expect(screen.getByText('Review study material')).toBeInTheDocument();
        expect(screen.getByText('Retake in 24h')).toBeInTheDocument();
        expect(screen.getByText('Compare with Previous Attempts')).toBeInTheDocument();
        expect(screen.getByText('Download Report')).toBeInTheDocument();
        expect(screen.queryByText('View Certificate')).not.toBeInTheDocument();
    });

    it('disables retake when max attempts have been reached', async () => {
        const onRetake = vi.fn();
        const user = userEvent.setup();
        renderCTAs({ passed: false, attemptNo: 3, maxAttempts: 3, onRetake });

        const retake = screen.getByRole('button', { name: /Retake in 24h/i });
        expect(retake).toBeDisabled();

        await user.click(retake);
        expect(onRetake).not.toHaveBeenCalled();
    });

    it('keeps retake enabled when maxAttempts is null (unlimited)', () => {
        renderCTAs({ attemptNo: 5, maxAttempts: null });

        expect(screen.getByRole('button', { name: /Retake in 24h/i })).toBeEnabled();
    });

    it('calls onDownload when Download Report is clicked', async () => {
        const onDownload = vi.fn();
        const user = userEvent.setup();
        renderCTAs({ onDownload });

        await user.click(screen.getByRole('button', { name: /Download Report/i }));
        expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it('calls onRetake when retake is clicked', async () => {
        const onRetake = vi.fn();
        const user = userEvent.setup();
        renderCTAs({ onRetake });

        await user.click(screen.getByRole('button', { name: /Retake in 24h/i }));
        expect(onRetake).toHaveBeenCalledTimes(1);
    });
});
