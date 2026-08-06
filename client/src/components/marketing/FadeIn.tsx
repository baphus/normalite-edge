import React from 'react';
import { motion } from 'motion/react';
import { useMotionPreference } from '@/contexts/MotionContext';

type Direction = 'up' | 'down' | 'left' | 'right';

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: Direction;
}

const directionOffset: Record<Direction, { x?: number; y?: number }> = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
};

/**
 * Fades children in from a given direction when they scroll into view.
 * Respects the user's reduced-motion preference — when active, renders
 * children immediately with no animation.
 */
const FadeIn: React.FC<FadeInProps> = ({
    children,
    className,
    delay = 0,
    direction = 'up',
}) => {
    const { reducedMotion } = useMotionPreference();

    if (reducedMotion) {
        return <div className={className}>{children}</div>;
    }

    const offset = directionOffset[direction];

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, ...offset }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
                duration: 0.6,
                delay,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {children}
        </motion.div>
    );
};

export default FadeIn;
