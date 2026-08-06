import React, { useEffect, useRef, useState } from 'react';
import { useMotionPreference } from '@/contexts/MotionContext';

interface StreakCelebrationProps {
    /** Set to true to trigger the fire celebration. Auto-clears after 3 seconds. */
    trigger: boolean;
    /** The streak count achieved — shown as a label below the flame. */
    streakCount?: number;
    /** Optional callback fired when the celebration ends. */
    onComplete?: () => void;
}

const CELEBRATION_DURATION_MS = 3000;

/**
 * A fire-themed celebratory overlay that appears briefly when the user
 * gains a streak. Respects the user's reduced-motion preference — when
 * motion is reduced, the popup appears instantly without animation.
 *
 * Pattern follows `ConfettiCelebration`: trigger prop, auto-dismiss,
 * `aria-hidden`, `pointer-events-none` overlay.
 */
const StreakCelebration: React.FC<StreakCelebrationProps> = ({
    trigger,
    streakCount,
    onComplete,
}) => {
    const { reducedMotion } = useMotionPreference();
    const [isActive, setIsActive] = useState(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const shouldRun = Boolean(trigger && !reducedMotion);

    useEffect(() => {
        if (shouldRun) {
            // Small delay so the DOM paint settles before animation starts
            const start = window.setTimeout(() => setIsActive(true), 0);
            const finish = window.setTimeout(() => {
                setIsActive(false);
                onCompleteRef.current?.();
            }, CELEBRATION_DURATION_MS);

            return () => {
                window.clearTimeout(start);
                window.clearTimeout(finish);
            };
        }

        const stop = window.setTimeout(() => setIsActive(false), 0);
        return () => window.clearTimeout(stop);
    }, [shouldRun]);

    if (!isActive) return null;

    return (
        <div
            className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
            aria-hidden="true"
            data-testid="streak-celebration"
        >
            {/* Backdrop glow */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at center, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.04) 40%, transparent 70%)',
                    animation: reducedMotion
                        ? undefined
                        : 'streak-fade-in 0.3s ease-out forwards',
                }}
            />

            {/* Fire emoji */}
            <div
                className="relative flex flex-col items-center gap-2"
                style={{
                    animation: reducedMotion
                        ? undefined
                        : 'streak-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, streak-fade-out 0.4s ease-in 2.6s forwards',
                }}
            >
                <span
                    className="text-[80px] leading-none drop-shadow-lg"
                    style={{
                        animation: reducedMotion
                            ? undefined
                            : 'streak-flicker 0.3s ease-in-out infinite alternate',
                        filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
                    }}
                >
                    🔥
                </span>
                {streakCount !== undefined && streakCount > 0 && (
                    <span
                        className="rounded-full bg-orange-500 px-4 py-1 text-sm font-semibold text-white shadow-lg"
                        style={{
                            animation: reducedMotion
                                ? undefined
                                : 'streak-slide-up 0.4s ease-out 0.2s both',
                        }}
                    >
                        {streakCount} day streak!
                    </span>
                )}
            </div>

            {/* Inline keyframes — injected once */}
            <style>{`
                @keyframes streak-pop {
                    0% { transform: scale(0.3); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes streak-fade-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes streak-fade-out {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
                @keyframes streak-flicker {
                    0% { transform: scale(1) rotate(-2deg); }
                    100% { transform: scale(1.05) rotate(2deg); }
                }
                @keyframes streak-slide-up {
                    0% { transform: translateY(10px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default StreakCelebration;
