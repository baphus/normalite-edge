import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MobileExamNav, {
    useExamFocusMode,
    type MobileNavProps,
    type MobileQuestion,
    type MobileSection,
} from '@/components/exam/MobileExamNav';

const EXAM_FOCUS_MODE_KEY = 'exam-focus-mode';

const sections: MobileSection[] = [
    { name: 'Professional Education', answered: 12, total: 20 },
    { name: 'General Education', answered: 8, total: 15 },
];

const questions: MobileQuestion[] = [
    { id: 'q1', orderNo: 1, status: 'current' },
    { id: 'q2', orderNo: 2, status: 'answered' },
    { id: 'q3', orderNo: 3, status: 'open' },
    { id: 'q4', orderNo: 4, status: 'flagged' },
];

const makeProps = (overrides: Partial<MobileNavProps> = {}): MobileNavProps => ({
    sections,
    activeSection: 'Professional Education',
    onSectionChange: vi.fn(),
    questions,
    currentQuestionId: 'q1',
    onQuestionClick: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    hasPrev: true,
    hasNext: true,
    isFocusMode: false,
    onToggleFocusMode: vi.fn(),
    isFlagged: false,
    onToggleFlag: vi.fn(),
    ...overrides,
});

/** Harness for `useExamFocusMode` so the hook can be exercised via the DOM. */
function FocusModeHarness() {
    const { isFocusMode, onToggleFocusMode } = useExamFocusMode();
    return (
        <div>
            <span data-testid="focus-state">{String(isFocusMode)}</span>
            <button type="button" onClick={onToggleFocusMode}>
                Toggle focus
            </button>
        </div>
    );
}

describe('MobileExamNav', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders section tabs with answered/total counts', () => {
        render(<MobileExamNav {...makeProps()} />);

        expect(
            screen.getByRole('tab', { name: 'Professional Education (12/20)' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'General Education (8/15)' })).toBeInTheDocument();
    });

    it('calls onSectionChange when a section tab is clicked', () => {
        const onSectionChange = vi.fn();
        render(<MobileExamNav {...makeProps({ onSectionChange })} />);

        fireEvent.click(screen.getByRole('tab', { name: 'General Education (8/15)' }));

        expect(onSectionChange).toHaveBeenCalledWith('General Education');
    });

    it('toggles focus mode via the eye button', () => {
        const onToggleFocusMode = vi.fn();
        render(<MobileExamNav {...makeProps({ onToggleFocusMode })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Enter focus mode' }));

        expect(onToggleFocusMode).toHaveBeenCalledTimes(1);
    });

    it('reflects an active focus mode in the toggle', () => {
        render(<MobileExamNav {...makeProps({ isFocusMode: true })} />);

        expect(screen.getByRole('button', { name: 'Exit focus mode' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('calls onPrev and onNext from the bottom nav', () => {
        const onPrev = vi.fn();
        const onNext = vi.fn();
        render(<MobileExamNav {...makeProps({ onPrev, onNext })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
        expect(onPrev).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables Prev/Next when navigation is unavailable', () => {
        render(<MobileExamNav {...makeProps({ hasPrev: false, hasNext: false })} />);

        expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('calls onToggleFlag when the flag button is clicked', () => {
        const onToggleFlag = vi.fn();
        render(<MobileExamNav {...makeProps({ onToggleFlag })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Flag' }));

        expect(onToggleFlag).toHaveBeenCalledTimes(1);
    });

    it('reflects the flagged state on the flag button', () => {
        render(<MobileExamNav {...makeProps({ isFlagged: true })} />);

        const flagButton = screen.getByRole('button', { name: 'Flagged' });
        expect(flagButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('opens the question grid in a bottom sheet', async () => {
        render(<MobileExamNav {...makeProps()} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open question grid' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('tab', { name: 'Professional Education (12/20)' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Question 1, current' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Question 4, flagged' })).toBeInTheDocument();
    });

    it('calls onQuestionClick when a question is selected in the sheet', async () => {
        const onQuestionClick = vi.fn();
        render(<MobileExamNav {...makeProps({ onQuestionClick })} />);

        fireEvent.click(screen.getByRole('button', { name: 'Open question grid' }));
        const dialog = await screen.findByRole('dialog');

        fireEvent.click(within(dialog).getByRole('button', { name: 'Question 3, open' }));

        expect(onQuestionClick).toHaveBeenCalledTimes(1);
        expect(onQuestionClick).toHaveBeenCalledWith('q3');
    });

    it('persists the focus-mode preference to localStorage', () => {
        render(<MobileExamNav {...makeProps({ isFocusMode: true })} />);

        expect(localStorage.getItem(EXAM_FOCUS_MODE_KEY)).toBe('true');
    });

    it('useExamFocusMode restores a saved preference on mount', () => {
        localStorage.setItem(EXAM_FOCUS_MODE_KEY, 'true');

        render(<FocusModeHarness />);

        expect(screen.getByTestId('focus-state').textContent).toBe('true');
    });

    it('useExamFocusMode persists toggles to localStorage', () => {
        render(<FocusModeHarness />);

        expect(screen.getByTestId('focus-state').textContent).toBe('false');

        fireEvent.click(screen.getByRole('button', { name: 'Toggle focus' }));

        expect(screen.getByTestId('focus-state').textContent).toBe('true');
        expect(localStorage.getItem(EXAM_FOCUS_MODE_KEY)).toBe('true');
    });
});
