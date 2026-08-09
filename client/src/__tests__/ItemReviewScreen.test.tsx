import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ItemReviewScreen from '@/components/exam/ItemReviewScreen';

const questions: ComponentProps<typeof ItemReviewScreen>['questions'] = [
    { id: 'q1', orderNo: 1, section: 'Professional Education', isAnswered: true, isFlagged: false },
    { id: 'q2', orderNo: 2, section: 'Professional Education', isAnswered: false, isFlagged: false },
    { id: 'q3', orderNo: 3, section: 'Professional Education', isAnswered: false, isFlagged: true },
    { id: 'q4', orderNo: 4, section: 'General Education', isAnswered: true, isFlagged: false },
];

type ItemReviewScreenProps = ComponentProps<typeof ItemReviewScreen>;

const makeProps = (overrides: Partial<ItemReviewScreenProps> = {}): ItemReviewScreenProps => ({
    questions,
    onQuestionClick: vi.fn(),
    onBackToExam: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    ...overrides,
});

describe('ItemReviewScreen', () => {
    it('renders questions grouped by section with section headers', () => {
        render(<ItemReviewScreen {...makeProps()} />);

        expect(screen.getByText('Professional Education (3)')).toBeInTheDocument();
        expect(screen.getByText('General Education (1)')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 2, skipped' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 3, flagged' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Question 4, answered' })).toBeInTheDocument();
    });

    it('shows summary stats', () => {
        render(<ItemReviewScreen {...makeProps()} />);

        expect(screen.getByText('2 Answered')).toBeInTheDocument();
        expect(screen.getByText('2 Skipped')).toBeInTheDocument();
        expect(screen.getByText('1 Flagged')).toBeInTheDocument();
        expect(screen.getByText('4 Total')).toBeInTheDocument();
    });

    it('calls onQuestionClick when a question is clicked', () => {
        const onQuestionClick = vi.fn();
        render(<ItemReviewScreen {...makeProps({ onQuestionClick })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Question 3, flagged' }));

        expect(onQuestionClick).toHaveBeenCalledTimes(1);
        expect(onQuestionClick).toHaveBeenCalledWith('q3');
    });

    it('calls onBackToExam when the Back to Exam button is clicked', () => {
        const onBackToExam = vi.fn();
        render(<ItemReviewScreen {...makeProps({ onBackToExam })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Back to Exam' }));

        expect(onBackToExam).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmit when the Submit Exam button is clicked', () => {
        const onSubmit = vi.fn();
        render(<ItemReviewScreen {...makeProps({ onSubmit })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Submit Exam' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('shows a loading state on the submit button when isSubmitting is true', () => {
        const onSubmit = vi.fn();
        render(<ItemReviewScreen {...makeProps({ onSubmit, isSubmitting: true })} />);

        const submitButton = screen.getByRole('button', { name: 'Submitting…' });
        expect(submitButton).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Submit Exam' })).not.toBeInTheDocument();

        fireEvent.click(submitButton);
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
