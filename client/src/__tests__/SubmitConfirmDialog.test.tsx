import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SubmitConfirmDialog from '@/components/exam/SubmitConfirmDialog';

type SubmitConfirmDialogProps = ComponentProps<typeof SubmitConfirmDialog>;

const makeProps = (overrides: Partial<SubmitConfirmDialogProps> = {}): SubmitConfirmDialogProps => ({
    open: true,
    totalQuestions: 50,
    answeredCount: 46,
    unansweredNumbers: [12, 15, 23, 31],
    onSubmit: vi.fn(),
    onReview: vi.fn(),
    isSubmitting: false,
    ...overrides,
});

describe('SubmitConfirmDialog', () => {
    it('renders when open', () => {
        render(<SubmitConfirmDialog {...makeProps()} />);

        expect(screen.getByRole('heading', { name: 'Submit Exam?' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit Exam' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Review Answers' })).toBeInTheDocument();
    });

    it('renders nothing when closed', () => {
        render(<SubmitConfirmDialog {...makeProps({ open: false })} />);

        expect(screen.queryByRole('heading', { name: 'Submit Exam?' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit Exam' })).not.toBeInTheDocument();
    });

    it('shows answered/unanswered counts', () => {
        render(<SubmitConfirmDialog {...makeProps()} />);

        expect(
            screen.getByText('You have answered 46/50 questions. 4 questions are unanswered.')
        ).toBeInTheDocument();
    });

    it('lists unanswered question numbers', () => {
        render(<SubmitConfirmDialog {...makeProps()} />);

        expect(screen.getByText('Unanswered: 12, 15, 23, 31')).toBeInTheDocument();
    });

    it('omits the unanswered list when every question is answered', () => {
        render(<SubmitConfirmDialog {...makeProps({ unansweredNumbers: [], answeredCount: 50 })} />);

        // The stats sentence appears both visibly and in the visually-hidden
        // accessible description, so expect at least one match.
        expect(
            screen.getAllByText('You have answered 50/50 questions. 0 questions are unanswered.')
        ).not.toHaveLength(0);
        expect(screen.queryByText(/^Unanswered:/)).not.toBeInTheDocument();
    });

    it('calls onSubmit when the Submit Exam button is clicked', () => {
        const onSubmit = vi.fn();
        render(<SubmitConfirmDialog {...makeProps({ onSubmit })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Submit Exam' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onReview when the Review Answers button is clicked', () => {
        const onReview = vi.fn();
        render(<SubmitConfirmDialog {...makeProps({ onReview })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Review Answers' }));

        expect(onReview).toHaveBeenCalledTimes(1);
    });

    it('disables both buttons and shows a loading state while submitting', () => {
        const onSubmit = vi.fn();
        const onReview = vi.fn();
        render(<SubmitConfirmDialog {...makeProps({ onSubmit, onReview, isSubmitting: true })} />);

        const submitButton = screen.getByRole('button', { name: 'Submitting…' });
        expect(submitButton).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Submit Exam' })).not.toBeInTheDocument();

        const reviewButton = screen.getByRole('button', { name: 'Review Answers' });
        expect(reviewButton).toBeDisabled();

        fireEvent.click(submitButton);
        fireEvent.click(reviewButton);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onReview).not.toHaveBeenCalled();
    });

    it('is not dismissable by clicking outside', () => {
        render(<SubmitConfirmDialog {...makeProps()} />);

        fireEvent.pointerDown(document.body);

        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit Exam' })).toBeInTheDocument();
    });

    it('is not dismissable with the Escape key', () => {
        render(<SubmitConfirmDialog {...makeProps()} />);

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
});
