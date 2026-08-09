import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ExamLayout, { type QuestionStatus, type SectionTab } from '@/components/exam/ExamLayout';

const sections: SectionTab[] = [
    { name: 'Professional Education', answered: 12, total: 20 },
    { name: 'General Education', answered: 8, total: 15 },
    { name: 'Major Subject', answered: 5, total: 18 },
];

const questions: QuestionStatus[] = [
    { id: 'q1', orderNo: 1, section: 'Professional Education', status: 'current' },
    { id: 'q2', orderNo: 2, section: 'Professional Education', status: 'answered' },
    { id: 'q3', orderNo: 3, section: 'Professional Education', status: 'open' },
    { id: 'q4', orderNo: 4, section: 'Professional Education', status: 'flagged' },
    { id: 'q5', orderNo: 5, section: 'General Education', status: 'open' },
    { id: 'q6', orderNo: 6, section: 'Major Subject', status: 'answered' },
];

type ExamLayoutProps = ComponentProps<typeof ExamLayout>;

const makeProps = (overrides: Partial<ExamLayoutProps> = {}): ExamLayoutProps => ({
    sections,
    questions,
    currentQuestionId: 'q1',
    activeSection: 'Professional Education',
    onSectionChange: vi.fn(),
    onQuestionClick: vi.fn(),
    header: <div>Exam timer</div>,
    children: <div>Question content</div>,
    ...overrides,
});

/** Holds the active section in local state so tab clicks drive grid filtering. */
function StatefulHarness({ initialSection = 'Professional Education' }: { initialSection?: string }) {
    const [activeSection, setActiveSection] = useState(initialSection);
    return <ExamLayout {...makeProps({ activeSection, onSectionChange: setActiveSection })} />;
}

/** Simulates a viewport at or above the `lg` breakpoint (desktop sidebar behaviour). */
function stubDesktop() {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    );
}

describe('ExamLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders section tabs with answered/total counts', () => {
        render(<ExamLayout {...makeProps()} />);

        expect(screen.getByRole('tab', { name: 'Professional Education (12/20)' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'General Education (8/15)' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Major Subject (5/18)' })).toBeInTheDocument();
    });

    it('renders the question grid for the active section', () => {
        render(<ExamLayout {...makeProps()} />);

        expect(screen.getByRole('button', { name: 'Question 1, current' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 2, answered' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 3, open' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 4, flagged' })).toBeInTheDocument();

        // Questions from other sections are filtered out of the grid.
        expect(screen.queryByRole('button', { name: 'Question 5, open' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Question 6, answered' })).not.toBeInTheDocument();
    });

    it('toggles the desktop sidebar on and off', () => {
        stubDesktop();
        const { container } = render(<ExamLayout {...makeProps()} />);

        const aside = container.querySelector('aside');
        expect(aside).not.toBeNull();
        expect(aside).toHaveClass('lg:block');

        fireEvent.click(screen.getByRole('button', { name: 'Toggle question navigator' }));
        expect(aside).toHaveClass('lg:hidden');
        expect(aside).not.toHaveClass('lg:block');

        fireEvent.click(screen.getByRole('button', { name: 'Toggle question navigator' }));
        expect(aside).toHaveClass('lg:block');
        expect(aside).not.toHaveClass('lg:hidden');
    });

    it('opens the question navigator as a slide-over on mobile', async () => {
        // jsdom has no matchMedia, so the layout treats the viewport as mobile.
        render(<ExamLayout {...makeProps()} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open question navigator' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('tab', { name: 'Professional Education (12/20)' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Question 1, current' })).toBeInTheDocument();
    });

    it('calls onQuestionClick when a question dot is clicked', () => {
        const onQuestionClick = vi.fn();
        render(<ExamLayout {...makeProps({ onQuestionClick })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Question 2, answered' }));

        expect(onQuestionClick).toHaveBeenCalledTimes(1);
        expect(onQuestionClick).toHaveBeenCalledWith('q2');
    });

    it('calls onSectionChange when a section tab is clicked', () => {
        const onSectionChange = vi.fn();
        render(<ExamLayout {...makeProps({ onSectionChange })} />);

        fireEvent.click(screen.getByRole('tab', { name: 'General Education (8/15)' }));

        expect(onSectionChange).toHaveBeenCalledWith('General Education');
    });

    it('filters the question grid when the active section changes', () => {
        render(<StatefulHarness />);

        expect(screen.getByRole('button', { name: 'Question 1, current' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Question 5, open' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'General Education (8/15)' }));

        expect(screen.getByRole('button', { name: 'Question 5, open' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Question 1, current' })).not.toBeInTheDocument();
    });
});
