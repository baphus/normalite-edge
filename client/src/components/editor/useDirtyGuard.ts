import { useEffect } from 'react';

/**
 * Warns before the tab is closed or reloaded with unsaved editor state.
 *
 * Scope note: this covers browser-level navigation only. The app mounts plain
 * <Routes>, not a data router, so React Router's useBlocker is unavailable and
 * in-app navigation (sidebar links) cannot be intercepted here. The Discard
 * button confirms explicitly instead — see EditorShell.
 */
export function useDirtyGuard(isDirty: boolean): void {
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Legacy browsers require returnValue to be set for the prompt to show.
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
}

export default useDirtyGuard;
