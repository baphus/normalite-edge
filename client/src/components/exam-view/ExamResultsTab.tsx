import React from 'react';
import { MetricTile } from '@/components/manage/MetricTile';
import { CollectionError } from '@/components/manage/CollectionState';
import { formatPercent } from '@/lib/formatters';
import type { AttemptSummary, ProgramPerformance, ScoreBand } from '@/lib/examAnalytics';

interface ExamResultsTabProps {
    summary: AttemptSummary;
    distribution: ScoreBand[];
    topPrograms: ProgramPerformance[];
    error?: string | null;
    onRetry?: () => void;
    loading?: boolean;
}

/** `null` means "not measured", and must not collapse into a formatted zero. */
const asMetric = (value: number | null) => (value === null ? null : formatPercent(value));

const Panel: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
    title,
    description,
    children,
}) => (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
        {children}
    </section>
);

export const ExamResultsTab: React.FC<ExamResultsTabProps> = ({
    summary,
    distribution,
    topPrograms,
    error,
    onRetry,
    loading = false,
}) => {
    if (error) {
        return <CollectionError message={error} onRetry={onRetry} />;
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-[92px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                ))}
                <span className="sr-only" role="status">Loading results…</span>
            </div>
        );
    }

    const hasSubmissions = summary.submitted > 0;

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile
                    label="Submitted"
                    value={String(summary.submitted)}
                    hint={`of ${summary.total} attempt${summary.total === 1 ? '' : 's'}`}
                />
                <MetricTile label="Average score" value={asMetric(summary.averageScore)} />
                <MetricTile label="Highest score" value={asMetric(summary.highestScore)} />
                <MetricTile label="Lowest score" value={asMetric(summary.lowestScore)} />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Panel title="Score distribution" description="Submitted attempts by score band.">
                    {hasSubmissions ? (
                        /*
                         * Each band's count is rendered as text above its bar rather than in a
                         * hover tooltip. The bar is decoration; the number is the data, so it
                         * is available to keyboard and screen-reader users without a tooltip
                         * to make accessible.
                         */
                        <ul
                            aria-label="Submitted attempts by score band"
                            className="mt-4 flex h-44 items-end gap-2"
                        >
                            {distribution.map((band) => (
                                <li
                                    key={band.label}
                                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                                >
                                    <span className="text-[12px] font-semibold tabular-nums text-slate-700">
                                        {band.count}
                                    </span>
                                    <div
                                        aria-hidden="true"
                                        className={
                                            band.count > 0
                                                ? 'w-full rounded-t-md bg-primary/70'
                                                : 'w-full rounded-t-md bg-slate-200'
                                        }
                                        style={{ height: band.count > 0 ? `${band.width}%` : '2px' }}
                                    />
                                    <span className="text-[11px] text-slate-500">{band.label}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-6 text-[12px] text-slate-500">
                            No submitted attempts yet, so there is nothing to distribute.
                        </p>
                    )}
                </Panel>

                <Panel title="By program" description="Average score of the five busiest programs.">
                    {topPrograms.length > 0 ? (
                        <ul aria-label="Average score by program" className="mt-4 space-y-3">
                            {topPrograms.map((program) => (
                                <li key={program.program}>
                                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                                        <span className="truncate font-medium text-slate-700">
                                            {program.program}
                                        </span>
                                        <span className="shrink-0 tabular-nums text-slate-500">
                                            {formatPercent(program.averageScore)}
                                            <span className="ml-1.5 text-slate-400">
                                                ({program.count})
                                            </span>
                                        </span>
                                    </div>
                                    <div
                                        aria-hidden="true"
                                        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                                    >
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${Math.min(program.averageScore, 100)}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-6 text-[12px] text-slate-500">
                            No program data yet. It appears once attempts are submitted.
                        </p>
                    )}
                </Panel>
            </div>
        </div>
    );
};

export default ExamResultsTab;
