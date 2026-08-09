import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionBreakdown, { type SectionData } from '@/components/exam/SectionBreakdown';

// 18/20 = 90% → Strong → 750s = "12m 30s"
// 14/20 = 70% → On Track → 620s = "10m 20s"
// 8/20  = 40% → Needs Work → 540s = "9m 0s"
const sections: SectionData[] = [
    { name: 'Professional Education', total: 20, correct: 18, elapsedSeconds: 750 },
    { name: 'General Education', total: 20, correct: 14, elapsedSeconds: 620 },
    { name: 'Major Subject', total: 20, correct: 8, elapsedSeconds: 540 },
];

describe('SectionBreakdown', () => {
    it('renders sections with correct tier labels', () => {
        render(<SectionBreakdown sections={sections} />);

        expect(screen.getByText('Professional Education')).toBeInTheDocument();
        expect(screen.getByText('General Education')).toBeInTheDocument();
        expect(screen.getByText('Major Subject')).toBeInTheDocument();

        expect(screen.getByText('Strong')).toBeInTheDocument();
        expect(screen.getByText('On Track')).toBeInTheDocument();
        expect(screen.getByText('Needs Work')).toBeInTheDocument();
    });

    it('shows timing for each section', () => {
        render(<SectionBreakdown sections={sections} />);

        expect(screen.getByText('12m 30s')).toBeInTheDocument();
        expect(screen.getByText('10m 20s')).toBeInTheDocument();
        expect(screen.getByText('9m 0s')).toBeInTheDocument();
    });

    it('hides when only one section is provided', () => {
        const { container } = render(<SectionBreakdown sections={[sections[0]]} />);

        expect(screen.queryByText('Professional Education')).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
    });

    it('shows a progress bar with the correct width per section', () => {
        render(<SectionBreakdown sections={sections} />);

        const bars = screen.getAllByTestId('section-bar-fill');
        expect(bars).toHaveLength(3);
        expect(bars[0]).toHaveStyle({ width: '90%' });
        expect(bars[1]).toHaveStyle({ width: '70%' });
        expect(bars[2]).toHaveStyle({ width: '40%' });
    });

    it('renders a colour-coded section dot for every section', () => {
        render(<SectionBreakdown sections={sections} />);

        expect(screen.getAllByTestId('section-dot')).toHaveLength(3);
    });

    it('shows the exact percentage inline, not only on hover', () => {
        render(<SectionBreakdown sections={sections} />);

        expect(screen.getByText('90%')).toBeInTheDocument();
        expect(screen.getByText('70%')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
    });
});
