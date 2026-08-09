import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExamInstructions, {
    KeyboardShortcutsHelp,
    type ExamInstructionsProps,
} from '@/components/exam/ExamInstructions';

const makeProps = (overrides: Partial<ExamInstructionsProps> = {}): ExamInstructionsProps => ({
    examTitle: 'Licensure Exam for Teachers',
    subject: 'Professional Education',
    totalQuestions: 100,
    timeLimitMinutes: 120,
    enforceSingleTab: true,
    tabSwitchGraceSeconds: 5,
    isOnline: true,
    onStart: vi.fn(),
    isLoading: false,
    ...overrides,
});

describe('ExamInstructions', () => {
    it('renders the exam title and subject', () => {
        render(<ExamInstructions {...makeProps()} />);

        expect(
            screen.getByRole('heading', { name: 'Licensure Exam for Teachers' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Professional Education/)).toBeInTheDocument();
        expect(screen.getByText(/100 questions/)).toBeInTheDocument();
        expect(screen.getByText(/120 minutes/)).toBeInTheDocument();
    });

    it('shows the keyboard shortcuts table', () => {
        render(<ExamInstructions {...makeProps()} />);

        expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Next question')).toBeInTheDocument();
        expect(screen.getByText('Previous question')).toBeInTheDocument();
        expect(screen.getByText('Flag for review')).toBeInTheDocument();
        expect(screen.getByText('Select A, B, C, or D')).toBeInTheDocument();
    });

    it('calls onStart when Start Exam and Timer is clicked', () => {
        const onStart = vi.fn();
        render(<ExamInstructions {...makeProps({ onStart })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Start Exam and Timer' }));

        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('shows the offline banner and disables the start button when offline', () => {
        render(<ExamInstructions {...makeProps({ isOnline: false })} />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start Exam and Timer' })).toBeDisabled();
    });

    it('shows a loading state on the start button', () => {
        render(<ExamInstructions {...makeProps({ isLoading: true })} />);

        const startButton = screen.getByRole('button', { name: 'Start Exam and Timer' });
        expect(startButton).toBeDisabled();
        expect(startButton.querySelector('svg')).not.toBeNull();
    });
});

describe('KeyboardShortcutsHelp', () => {
    /** jsdom lacks ResizeObserver, which @floating-ui/dom instantiates on open. */
    const stubResizeObserver = () => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
    };

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('opens a popover listing all keyboard shortcuts', async () => {
        stubResizeObserver();

        render(<KeyboardShortcutsHelp enabled />);

        fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Next question')).toBeInTheDocument();
        expect(screen.getByText('Previous question')).toBeInTheDocument();
        expect(screen.getByText('Flag for review')).toBeInTheDocument();
        expect(screen.getByText('Select A, B, C, or D')).toBeInTheDocument();
    });

    it('notes that shortcuts are paused when disabled', async () => {
        stubResizeObserver();

        render(<KeyboardShortcutsHelp enabled={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/shortcuts are paused/i)).toBeInTheDocument();
    });
});
