import React from 'react';

/**
 * A circular countdown ring for exam timers.
 *
 * `value` is the fraction of time remaining (0..1). The ring is full at
 * `value = 1` and depletes clockwise: the empty slice grows clockwise from
 * 12 o'clock, reaching empty at `value = 0`, at which point `onTimeUp` fires
 * exactly once.
 *
 * Colour follows the design system: a `slate-200` track with a `slate-700`
 * active ring, switching to `amber-500` (with a subtle pulse) for the last
 * 20% of time (`value < 0.2`). Because the component only receives the
 * remaining fraction, the pulse runs whenever the low-time amber state is
 * active — for short exams "last 20%" and "last minute" coincide.
 */
interface CircularProgressRingProps {
    /** Fraction of time remaining, 0..1. 0 triggers `onTimeUp`. */
    value: number;
    /** Formatted time shown in the center, e.g. "59:59" or "01:05:30". */
    label: string;
    /** Ring diameter in rem. Defaults to 5rem. */
    sizeRem?: number;
    /** Called exactly once when `value` reaches 0. */
    onTimeUp?: () => void;
}

const RADIUS = 45;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LOW_TIME_THRESHOLD = 0.2;

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
    value,
    label,
    sizeRem = 5,
    onTimeUp,
}) => {
    const timeUpFired = React.useRef(false);

    React.useEffect(() => {
        if (value <= 0 && !timeUpFired.current) {
            timeUpFired.current = true;
            onTimeUp?.();
        }
    }, [value, onTimeUp]);

    const lowTime = value < LOW_TIME_THRESHOLD;
    // Offset C * (value - 1): 0 at value 1 (full ring), -C at value 0 (empty).
    // The remaining dash is anchored at the path start (12 o'clock after the
    // -90° rotation) and its leading edge sweeps clockwise as time runs out,
    // so the ring depletes clockwise.
    const dashOffset = CIRCUMFERENCE * (value - 1);
    const ringClass = lowTime
        ? 'stroke-amber-500 animate-amber-pulse transition-colors duration-500'
        : 'stroke-slate-700 transition-colors duration-500';

    return (
        <div
            className="relative inline-flex items-center justify-center"
            style={{ width: `${sizeRem}rem`, height: `${sizeRem}rem` }}
        >
            <svg
                className="h-full w-full"
                viewBox="0 0 100 100"
                role="timer"
                aria-label={`Time remaining: ${label}`}
                aria-atomic="true"
            >
                {/* Background track */}
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    className="stroke-slate-200"
                />
                {/* Foreground arc */}
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 50 50)"
                    className={ringClass}
                />
            </svg>

            {/* Center label — value is conveyed to assistive tech via the
                svg's aria-label, so the visible text is hidden from AT to
                avoid double announcement. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
                <span className="text-[14px] font-semibold tabular-nums text-slate-900">
                    {label}
                </span>
            </div>

            {/* Self-contained keyframes — injected once */}
            <style>{`
                @keyframes amberPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .animate-amber-pulse {
                    animation: amberPulse 1s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-amber-pulse {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default CircularProgressRing;
