import { createContext, useContext, useEffect, useState } from 'react'
import { useReducedMotion as useFramerReducedMotion } from 'motion/react'

/* ── Types ── */

export type MotionSource = 'system' | 'user';

export interface MotionPreference {
    reducedMotion: boolean;
    source: MotionSource;
}

/* ── Context ── */

export const MotionPreferenceContext = createContext<MotionPreference | undefined>(undefined);

/** localStorage key used by both the provider and the Settings page. */
export const MOTION_PREFERENCE_KEY = 'pref-reduced-motion';

type StoredReducedMotion = 'system' | 'on' | 'off';

const readStoredPreference = (): StoredReducedMotion => {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(MOTION_PREFERENCE_KEY);
    return stored === 'on' || stored === 'off' ? stored : 'system';
};

/**
 * Core preference logic for the MotionProvider.
 *
 * - `'on'`  → reduced motion always on, source `'user'`
 * - `'off'` → reduced motion always off, source `'user'`
 * - `'system'` (default) → mirrors the OS `prefers-reduced-motion` setting,
 *   source `'system'`
 *
 * Keeps the `.reduce-motion` class on `document.documentElement` in sync and
 * listens for `storage` events so a preference change (from this tab via the
 * Settings page, or from another tab) takes effect immediately.
 */
export const useMotionPreferenceValue = (): MotionPreference => {
    const systemPrefersReducedMotion = useFramerReducedMotion();
    const [stored, setStored] = useState<StoredReducedMotion>(() => readStoredPreference());

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== MOTION_PREFERENCE_KEY) return;
            setStored(readStoredPreference());
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const reducedMotion =
        stored === 'on' ? true : stored === 'off' ? false : Boolean(systemPrefersReducedMotion);
    const source: MotionSource = stored === 'system' ? 'system' : 'user';

    useEffect(() => {
        const root = document.documentElement;
        if (reducedMotion) {
            root.classList.add('reduce-motion');
        } else {
            root.classList.remove('reduce-motion');
        }
        return () => {
            root.classList.remove('reduce-motion');
        };
    }, [reducedMotion]);

    return { reducedMotion, source };
};

/* ── Hook ── */

export const useMotionPreference = (): MotionPreference => {
    const context = useContext(MotionPreferenceContext);
    if (context === undefined) {
        throw new Error('useMotionPreference must be used within a MotionProvider');
    }
    return context;
};
