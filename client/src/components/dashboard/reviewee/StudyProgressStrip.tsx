import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionLabel } from './SectionLabel';
import type { SubjectAverage } from './types';

type Status = 'loading' | 'ready' | 'error';

/**
 * Horizontal, scrollable strip of recent per-subject progress. Owns its own
 * fetch of GET /dashboard/stats so it can render real skeleton/error states
 * independently of the parent page's stats load.
 */
export const StudyProgressStrip: React.FC = () => {
    const [subjects, setSubjects] = useState<SubjectAverage[]>([]);
    const [status, setStatus] = useState<Status>('loading');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api.get('/dashboard/stats')
            .then((response) => {
                if (cancelled) return;
                const averages = (response.data?.data?.averagesBySubject as SubjectAverage[] | undefined) ?? [];
                setSubjects(averages);
                setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    if (status === 'loading') {
        return (
            <div>
                <SectionLabel>Study progress</SectionLabel>
                <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Loading study progress">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[104px] w-44 shrink-0 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div>
                <SectionLabel>Study progress</SectionLabel>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600">We could not load your study progress. Please try again.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                            setStatus('loading');
                            setReloadKey((k) => k + 1);
                        }}
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (subjects.length === 0) {
        return (
            <div>
                <SectionLabel>Study progress</SectionLabel>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    No study progress yet. Take a mock exam to see your per-subject average.
                </div>
            </div>
        );
    }

    return (
        <div>
            <SectionLabel>Study progress</SectionLabel>
            <ul className="flex gap-3 overflow-x-auto pb-2" aria-label="Study progress by subject">
                {subjects.map((s) => (
                    <li key={s.subject} className="w-44 shrink-0 rounded-xl border border-slate-200 bg-white p-4">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                            {s.subject}
                        </p>
                        <p className="mt-1.5 text-[24px] font-semibold leading-tight tabular-nums text-slate-900">
                            {s.average}%
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, Math.max(0, s.average))}%` }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default StudyProgressStrip;
