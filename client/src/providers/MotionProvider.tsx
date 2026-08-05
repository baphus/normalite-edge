import type { ReactNode } from 'react';
import { MotionPreferenceContext, useMotionPreferenceValue } from '@/contexts/MotionContext';

/**
 * Provides the global motion preference derived from the `pref-reduced-motion`
 * localStorage setting and the operating system's `prefers-reduced-motion`
 * setting, applying the `.reduce-motion` class to <html> while active.
 */
export const MotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const value = useMotionPreferenceValue();

    return <MotionPreferenceContext.Provider value={value}>{children}</MotionPreferenceContext.Provider>;
};
