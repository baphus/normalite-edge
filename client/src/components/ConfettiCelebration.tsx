import React, { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import { useMotionPreference } from '@/contexts/MotionContext';

interface ConfettiCelebrationProps {
    /** Set to true to fire a confetti celebration. It auto-clears after 4 seconds. */
    trigger: boolean;
    /** Optional callback fired when the celebration ends. */
    onComplete?: () => void;
    /**
     * Number of confetti pieces. Defaults to the full 300-piece burst;
     * pass a smaller value (e.g. 120) for a subtler celebration.
     */
    numberOfPieces?: number;
}

const CONFETTI_DURATION_MS = 4000;
const CONFETTI_SETTING_KEY = 'pref-confetti';

/**
 * Reads the user's confetti preference from localStorage.
 * The setting is opt-out: anything other than the literal string
 * "false" keeps confetti enabled.
 */
const isConfettiEnabled = (): boolean => {
    try {
        return localStorage.getItem(CONFETTI_SETTING_KEY) !== 'false';
    } catch {
        return true;
    }
};

/**
 * Full-viewport confetti overlay (react-confetti) gated behind the
 * user's confetti preference and reduced-motion preference. When either
 * gate blocks the celebration, nothing renders at all.
 */
const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
    trigger,
    onComplete,
    numberOfPieces = 300,
}) => {
    const { reducedMotion } = useMotionPreference();
    const [isActive, setIsActive] = useState(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const confettiEnabled = isConfettiEnabled();
    const shouldRun = Boolean(trigger && confettiEnabled && !reducedMotion);

    // State transitions are deferred into timer callbacks so the effect
    // body stays free of synchronous setState.
    useEffect(() => {
        if (shouldRun) {
            const start = window.setTimeout(() => setIsActive(true), 0);
            const finish = window.setTimeout(() => {
                setIsActive(false);
                onCompleteRef.current?.();
            }, CONFETTI_DURATION_MS);

            return () => {
                window.clearTimeout(start);
                window.clearTimeout(finish);
            };
        }

        const stop = window.setTimeout(() => setIsActive(false), 0);
        return () => window.clearTimeout(stop);
    }, [shouldRun]);

    if (!confettiEnabled || reducedMotion || !isActive) return null;

    const handleConfettiComplete = () => {
        setIsActive(false);
        onCompleteRef.current?.();
    };

    return (
        <div
            className="pointer-events-none fixed inset-0 z-[100]"
            aria-hidden="true"
            data-testid="confetti-celebration"
        >
            <Confetti
                run={isActive}
                recycle={false}
                numberOfPieces={numberOfPieces}
                onConfettiComplete={handleConfettiComplete}
            />
        </div>
    );
};

export default ConfettiCelebration;
