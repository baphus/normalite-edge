import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionReview, type ReviewQuestion, type SectionInfo } from '@/components/exam/QuestionReview';

// Professional Education: 1 correct, 1 wrong, 1 skipped.
// General Education: 1 correct, 1 wrong. Major Subject: 1 correct.
const questions: ReviewQuestion[] = [
    {
        id: 'prof-1',
        orderNo: 1,
        section: 'Professional Education',
        questionText: "What is Piaget's stage for ages 7–11?",
        choices: ['Sensorimotor', 'Preoperational', 'Concrete operational', 'Formal operational'],
        userAnswer: 'C',
        correctAnswer: 'C',
        isCorrect: true,
        rationalization: 'Concrete operational covers ages 7–11.',
    },
    {
        id: 'prof-2',
        orderNo: 2,
        section: 'Professional Education',
        questionText: 'Which law professionalized Philippine teachers?',
        choices: ['RA 7836', 'RA 4670', 'RA 10533', 'RA 9293'],
        userAnswer: 'A',
        correctAnswer: 'D',
        isCorrect: false,
        rationalization: 'RA 7836 is the Philippine Teachers Professionalization Act.',
    },
    {
        id: 'prof-3',
        orderNo: 3,
        section: 'Professional Education',
        questionText: 'Which assessment monitors learning during instruction?',
        choices: ['Formative', 'Summative', 'Diagnostic', 'Norm-referenced'],
        userAnswer: null,
        correctAnswer: 'A',
        isCorrect: false,
        rationalization: 'Formative assessment monitors learning during instruction.',
    },
    {
        id: 'gen-1',
        orderNo: 1,
        section: 'General Education',
        questionText: 'General Ed: English grammar question.',
        choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        userAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        rationalization: 'Correct tense agreement.',
    },
    {
        id: 'gen-2',
        orderNo: 2,
        section: 'General Education',
        questionText: 'General Ed: Math question.',
        choices: ['4', '5', '6', '7'],
        userAnswer: 'B',
        correctAnswer: 'A',
        isCorrect: false,
        rationalization: 'The correct sum is 4.',
    },
    {
        id: 'major-1',
        orderNo: 1,
        section: 'Major Subject',
        questionText: 'Major: Biology question.',
        choices: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'],
        userAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        rationalization: 'The mitochondrion is the powerhouse of the cell.',
    },
];

const sections: SectionInfo[] = [
    { name: 'Professional Education', total: 20, correct: 15 },
    { name: 'General Education', total: 20, correct: 14 },
    { name: 'Major Subject', total: 20, correct: 8 },
];

const renderReview = () => render(<QuestionReview questions={questions} sections={sections} />);

describe('QuestionReview', () => {
    it('renders section tabs with counts', () => {
        renderReview();

        expect(screen.getByRole('tab', { name: 'Professional Education (15/20)' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'General Education (14/20)' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Major Subject (8/20)' })).toBeInTheDocument();

        // First section is active by default.
        expect(screen.getByRole('tab', { name: 'Professional Education (15/20)' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('tab', { name: 'General Education (14/20)' })).toHaveAttribute(
            'aria-selected',
            'false',
        );
    });

    it('filters questions by section when a tab is clicked', () => {
        renderReview();

        // Default tab shows Professional Education questions only.
        expect(screen.getByText("What is Piaget's stage for ages 7–11?")).toBeInTheDocument();
        expect(screen.queryByText('General Ed: English grammar question.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'General Education (14/20)' }));

        expect(screen.getByText('General Ed: English grammar question.')).toBeInTheDocument();
        expect(screen.getByText('General Ed: Math question.')).toBeInTheDocument();
        expect(screen.queryByText("What is Piaget's stage for ages 7–11?")).not.toBeInTheDocument();
    });

    it('shows a correct, incorrect and skipped dot in the grid', () => {
        renderReview();

        const dots = screen.getAllByTestId('question-grid-dot');
        expect(dots).toHaveLength(3);

        expect(screen.getByLabelText('Question 1: Correct. Jump to review.')).toHaveClass('bg-green-100');
        expect(screen.getByLabelText('Question 2: Incorrect. Jump to review.')).toHaveClass('bg-red-100');
        expect(screen.getByLabelText('Question 3: Skipped. Jump to review.')).toHaveClass('bg-slate-100');

        // Dot numbers are rendered inside the chips.
        expect(screen.getByLabelText('Question 1: Correct. Jump to review.')).toHaveTextContent('1');
    });

    it('works with the All / Correct / Incorrect filter buttons', () => {
        renderReview();

        fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
        expect(screen.getByText("What is Piaget's stage for ages 7–11?")).toBeInTheDocument();
        expect(screen.queryByText('Which law professionalized Philippine teachers?')).not.toBeInTheDocument();
        expect(screen.queryByText('Which assessment monitors learning during instruction?')).not.toBeInTheDocument();

        // "Incorrect" covers wrong answers and skipped questions.
        fireEvent.click(screen.getByRole('button', { name: 'Incorrect' }));
        expect(screen.getByText('Which law professionalized Philippine teachers?')).toBeInTheDocument();
        expect(screen.getByText('Which assessment monitors learning during instruction?')).toBeInTheDocument();
        expect(screen.queryByText("What is Piaget's stage for ages 7–11?")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'All' }));
        expect(screen.getByText("What is Piaget's stage for ages 7–11?")).toBeInTheDocument();
        expect(screen.getByText('Which law professionalized Philippine teachers?')).toBeInTheDocument();
        expect(screen.getByText('Which assessment monitors learning during instruction?')).toBeInTheDocument();
    });

    it('expands and collapses question detail', () => {
        renderReview();

        // Cards start expanded.
        expect(screen.getByText("What is Piaget's stage for ages 7–11?")).toBeInTheDocument();

        const toggle = screen.getAllByTestId('question-toggle')[0];
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(toggle);
        expect(screen.queryByText("What is Piaget's stage for ages 7–11?")).not.toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(toggle);
        expect(screen.getByText("What is Piaget's stage for ages 7–11?")).toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('highlights the user answer and the correct answer, with a checkmark on the correct one', () => {
        renderReview();

        // prof-1 (correct, user picked C = "Concrete operational").
        const choices = screen.getAllByTestId('answer-choice');
        expect(choices[2]).toHaveClass('bg-green-50'); // user answer + correct answer row
        expect(choices[2].querySelector('svg')).not.toBeNull(); // checkmark for the correct answer
        expect(choices[0]).not.toHaveClass('bg-green-50');

        // prof-2 (wrong, user picked A = "RA 7836", correct is D = "RA 9293").
        // prof-1 renders 4 choices (indices 0–3), so prof-2's first choice is index 4.
        const profTwoChoices = screen.getAllByTestId('answer-choice')[4];
        expect(profTwoChoices).toHaveClass('bg-green-50'); // user's wrong answer still highlighted
        expect(profTwoChoices).toHaveTextContent('Your answer');
    });

    it('renders the rationalization for each question', () => {
        renderReview();

        expect(
            screen.getByText('RA 7836 is the Philippine Teachers Professionalization Act.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Concrete operational covers ages 7–11.')).toBeInTheDocument();
    });

    it('shows an empty message when the active filter matches nothing', () => {
        renderReview();

        // Major Subject has a single correct answer — "Incorrect" filters it all out.
        fireEvent.click(screen.getByRole('tab', { name: 'Major Subject (8/20)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Incorrect' }));

        expect(screen.getByText('No questions match this filter.')).toBeInTheDocument();
    });

    it('scrolls the matching card into view when a grid dot is clicked', () => {
        const scrollIntoView = vi.fn();
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = scrollIntoView;

        try {
            renderReview();

            fireEvent.click(screen.getByLabelText('Question 2: Incorrect. Jump to review.'));

            expect(scrollIntoView).toHaveBeenCalledTimes(1);
            expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        } finally {
            Element.prototype.scrollIntoView = original;
        }
    });
});
