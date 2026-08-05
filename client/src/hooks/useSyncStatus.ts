import { useCallback, useEffect, useState } from 'react';
import {
    getSyncStatus,
    manualSync,
    processQueue,
    subscribeToSyncStatus,
    type SyncStatus,
} from '@/lib/offline-sync';

export interface UseSyncStatusResult {
    status: SyncStatus;
    syncNow: () => Promise<void>;
}

/**
 * Reactive view of the offline sync queue (ticket #58).
 *
 * Subscribes to the queue status so `status` stays in sync with `queueProgress`
 * / `processQueue`, and re-runs the flush when connectivity returns so the
 * Settings "Sync now" button reflects the real world.
 */
export function useSyncStatus(): UseSyncStatusResult {
    const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

    useEffect(() => subscribeToSyncStatus(setStatus), []);

    useEffect(() => {
        const handleOnline = () => {
            void processQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const syncNow = useCallback(() => manualSync(), []);

    return { status, syncNow };
}
