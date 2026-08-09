import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgressRing } from '../components/exam/CircularProgressRing';

describe('CircularProgressRing', () => {
    it('renders with default props', () => {
        const { container } = render(<CircularProgressRing value={0.5} label="30:00" />);

        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('viewBox', '0 0 100 100');

        // Default size is 5rem and it is rem-based.
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper).toHaveStyle({ width: '5rem', height: '5rem' });

        // Track + foreground arc.
        expect(container.querySelectorAll('circle')).toHaveLength(2);
    });

    it('honours a custom sizeRem prop', () => {
        const { container } = render(
            <CircularProgressRing value={0.5} label="30:00" sizeRem={3} />,
        );

        expect(container.firstElementChild).toHaveStyle({ width: '3rem', height: '3rem' });
    });

    it('shows the label text in the center', () => {
        render(<CircularProgressRing value={0.5} label="59:59" />);

        expect(screen.getByText('59:59')).toBeInTheDocument();
    });

    it('has role="timer" and an aria-label with the remaining time', () => {
        render(<CircularProgressRing value={0.5} label="01:05:30" />);

        const timer = screen.getByRole('timer');
        expect(timer).toHaveAttribute('aria-label', 'Time remaining: 01:05:30');
        expect(timer).toHaveAttribute('aria-atomic', 'true');
    });

    it('uses the slate ring at value 0.2 or above', () => {
        const { container } = render(<CircularProgressRing value={0.2} label="12:00" />);

        expect(container.querySelector('circle.stroke-slate-700')).toBeInTheDocument();
        expect(container.querySelector('circle.stroke-amber-500')).not.toBeInTheDocument();
    });

    it('applies the amber ring when value < 0.2', () => {
        const { container } = render(<CircularProgressRing value={0.1} label="00:06" />);

        const ring = container.querySelector('circle.stroke-amber-500');
        expect(ring).toBeInTheDocument();
        expect(ring).toHaveClass('animate-amber-pulse');
    });

    it('calls onTimeUp when value reaches 0', () => {
        const onTimeUp = vi.fn();
        const { rerender } = render(
            <CircularProgressRing value={0.5} label="30:00" onTimeUp={onTimeUp} />,
        );

        expect(onTimeUp).not.toHaveBeenCalled();

        rerender(<CircularProgressRing value={0} label="00:00" onTimeUp={onTimeUp} />);

        expect(onTimeUp).toHaveBeenCalledTimes(1);
    });

    it('calls onTimeUp exactly once, even across re-renders', () => {
        const onTimeUp = vi.fn();
        const { rerender } = render(
            <CircularProgressRing value={0} label="00:00" onTimeUp={onTimeUp} />,
        );

        rerender(<CircularProgressRing value={0} label="00:00" onTimeUp={onTimeUp} />);
        rerender(<CircularProgressRing value={0} label="00:00" onTimeUp={onTimeUp} />);

        expect(onTimeUp).toHaveBeenCalledTimes(1);
    });
});
