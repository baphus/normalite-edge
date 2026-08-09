import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import TimerHeader from '@/components/exam/TimerHeader';

type TimerHeaderProps = ComponentProps<typeof TimerHeader>;

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeProps = (overrides: Partial<TimerHeaderProps> = {}): TimerHeaderProps => ({
    endsAt: new Date(NOW.getTime() + 3600 * 1000).toISOString(),
    examTitle: 'Mock Exam 3',
    subject: 'Professional Education',
    sectionLabel: 'Section A (3/5)',
    saveStatus: 'saved',
    isOnline: true,
    onTimeUp: vi.fn(),
    ...overrides,
});

describe('TimerHeader', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('renders the exam title and subject', () => {
        render(<TimerHeader {...makeProps()} />);

        expect(screen.getByRole('heading', { name: 'Mock Exam 3' })).toBeInTheDocument();
        expect(screen.getByText('Professional Education · Section A (3/5)')).toBeInTheDocument();
    });

    it('formats the remaining time as HH:MM:SS at or above one hour', () => {
        render(<TimerHeader {...makeProps()} />);

        expect(screen.getByText('01:00:00')).toBeInTheDocument();
    });

    it('formats the remaining time as MM:SS below one hour', () => {
        render(
            <TimerHeader
                {...makeProps({ endsAt: new Date(NOW.getTime() + 3599 * 1000).toISOString() })}
            />,
        );

        expect(screen.getByText('59:59')).toBeInTheDocument();
    });

    it('renders the countdown ring with role="timer"', () => {
        render(<TimerHeader {...makeProps()} />);

        const timer = screen.getByRole('timer');
        expect(timer).toHaveAttribute('aria-label', 'Time remaining: 01:00:00');
    });

    it('renders an aria-live region for time warnings', () => {
        render(<TimerHeader {...makeProps()} />);

        const liveRegion = screen.getByTestId('timer-live-region');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveClass('sr-only');
    });

    it('shows the save status indicator', () => {
        render(<TimerHeader {...makeProps({ saveStatus: 'pending' })} />);

        expect(screen.getByText('Pending sync')).toBeInTheDocument();
    });

    it('shows the online/offline status', () => {
        const { rerender } = render(<TimerHeader {...makeProps({ isOnline: true })} />);
        expect(screen.getByText('Online')).toBeInTheDocument();

        rerender(<TimerHeader {...makeProps({ isOnline: false })} />);
        expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('announces the 5-minute warning through the aria-live region', () => {
        render(<TimerHeader {...makeProps()} />);

        act(() => {
            vi.advanceTimersByTime(3300 * 1000);
        });

        expect(screen.getByText('5 minutes remaining')).toBeInTheDocument();
    });

    it('announces the 30-second warning through the aria-live region', () => {
        render(<TimerHeader {...makeProps()} />);

        act(() => {
            vi.advanceTimersByTime(3570 * 1000);
        });

        expect(screen.getByText('30 seconds remaining')).toBeInTheDocument();
    });

    it('clears the aria-live warning after three seconds', () => {
        render(<TimerHeader {...makeProps()} />);

        act(() => {
            vi.advanceTimersByTime(3300 * 1000);
        });
        expect(screen.getByText('5 minutes remaining')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(3000);
        });
        expect(screen.queryByText('5 minutes remaining')).not.toBeInTheDocument();
    });

    it('switches the ring to amber below 20% time remaining', () => {
        const { container } = render(<TimerHeader {...makeProps()} />);

        act(() => {
            vi.advanceTimersByTime(2900 * 1000);
        });

        expect(container.querySelector('circle.stroke-amber-500')).toBeInTheDocument();
    });

    it('fires onTimeUp when the countdown reaches zero', () => {
        const onTimeUp = vi.fn();
        render(<TimerHeader {...makeProps({ onTimeUp })} />);

        act(() => {
            vi.advanceTimersByTime(3600 * 1000 + 500);
        });

        expect(onTimeUp).toHaveBeenCalledTimes(1);
    });

    it('catches the timer up when the tab becomes visible again', () => {
        render(<TimerHeader {...makeProps()} />);

        // jsdom always reports the tab visible, so simulate a throttled hidden
        // period by jumping the clock forward, then returning to the tab.
        vi.setSystemTime(new Date(NOW.getTime() + 1200 * 1000));

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(screen.getByText('40:00')).toBeInTheDocument();
    });
});
