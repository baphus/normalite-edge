import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublishReadinessProps {
    readyCount: number;
    totalCount: number;
    /** Human-readable reasons publishing is blocked, in the order they should be fixed. */
    blockers: string[];
    onShowIncomplete?: () => void;
}

/**
 * Replaces the old chain of submit-time toasts: the editor states up front whether it
 * is publishable and what is standing in the way, with a jump into the offending
 * questions rather than an anonymous "some question is incomplete".
 */
export const PublishReadiness: React.FC<PublishReadinessProps> = ({
    readyCount,
    totalCount,
    blockers,
    onShowIncomplete,
}) => (
    <section
        aria-label="Publish readiness"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
        <h2 className="bg-slate-50/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Ready to publish
        </h2>
        <div className="space-y-2 px-4 py-3">
            <p className="text-[13px] text-slate-700">
                <span className="font-semibold tabular-nums">{readyCount}</span> of{' '}
                <span className="font-semibold tabular-nums">{totalCount}</span> question
                {totalCount === 1 ? '' : 's'} complete
            </p>
            {blockers.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                    <CheckCircle2 size={13} aria-hidden="true" /> Everything looks good
                </p>
            ) : (
                <ul className="space-y-1">
                    {blockers.map((blocker) => (
                        <li key={blocker} className="flex items-start gap-1.5 text-[12px] text-amber-700">
                            <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                            <span>{blocker}</span>
                        </li>
                    ))}
                </ul>
            )}
            {onShowIncomplete && (
                <Button
                    variant="outline"
                    className="h-7 w-full rounded-lg border-slate-200 text-[12px] font-semibold"
                    onClick={onShowIncomplete}
                >
                    Show incomplete questions
                </Button>
            )}
        </div>
    </section>
);

export default PublishReadiness;
