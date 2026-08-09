import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getTierLabel, TIER_COLORS, type TierLabel } from '@/lib/examTheme';

export interface SectionData {
    name: string;
    total: number;
    correct: number;
    elapsedSeconds: number;
}

export interface SectionBreakdownProps {
    sections: SectionData[];
}

/**
 * Solid fills for the bars and section dots, one per tier. Mirrors the colour
 * family in `TIER_COLORS` (which itself is the chip recipe — border/bg/text —
 * applied to the tier label below). Tier is never conveyed by colour alone:
 * the tier label always accompanies the coloured bar and dot.
 */
const TIER_FILL: Record<TierLabel, string> = {
    Strong: 'bg-green-500',
    'On Track': 'bg-blue-500',
    'Needs Work': 'bg-amber-500',
};

/** Formats a duration in seconds as "Xm Ys" (e.g. 750 → "12m 30s"). */
const formatDuration = (totalSeconds: number): string => {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

/**
 * Per-section performance bars for the exam results page.
 *
 * The tier label is the primary signal; the coloured bar and dot are visual
 * reinforcement. The exact percentage is rendered inline (never hidden behind
 * the tooltip) and the tooltip adds the correct/total and timing breakdown on
 * hover or tap. Hidden entirely when the exam has a single section.
 */
export const SectionBreakdown: React.FC<SectionBreakdownProps> = ({ sections }) => {
    // A single section needs no breakdown — hide the whole surface.
    if (sections.length <= 1) return null;

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-[13px] font-semibold text-slate-900">Section breakdown</h3>
            <p className="mt-0.5 text-[12px] text-slate-500">Performance by exam section.</p>

            <Tooltip.Provider delayDuration={150}>
                <ul
                    aria-label="Performance by exam section"
                    className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
                >
                    {sections.map((section) => {
                        const percentage = section.total > 0 ? (section.correct / section.total) * 100 : 0;
                        const tier = getTierLabel(percentage);
                        if (tier === null) return null;
                        const width = `${Math.min(percentage, 100)}%`;

                        return (
                            <li key={section.name}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            data-testid="section-dot"
                                            className={`h-2 w-2 shrink-0 rounded-full ${TIER_FILL[tier]}`}
                                        />
                                        <span className="truncate text-[12px] font-medium text-slate-700">
                                            {section.name}
                                        </span>
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[12px] font-semibold ${TIER_COLORS[tier]}`}
                                    >
                                        {tier}
                                    </span>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
                                    <div
                                        aria-hidden="true"
                                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                                    >
                                        <div
                                            data-testid="section-bar-fill"
                                            className={`h-full rounded-full ${TIER_FILL[tier]}`}
                                            style={{ width }}
                                        />
                                    </div>
                                    <Tooltip.Root>
                                        <Tooltip.Trigger asChild>
                                            <span
                                                tabIndex={0}
                                                className="rounded text-[12px] font-semibold tabular-nums text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                                            >
                                                {Math.round(percentage)}%
                                            </span>
                                        </Tooltip.Trigger>
                                        <Tooltip.Portal>
                                            <Tooltip.Content
                                                sideOffset={4}
                                                className="z-50 rounded-md bg-slate-900 px-2 py-1 text-[12px] text-slate-50 shadow-md"
                                            >
                                                {Math.round(percentage)}% · {section.correct} of {section.total} correct
                                                · {formatDuration(section.elapsedSeconds)}
                                                <Tooltip.Arrow className="fill-slate-900" />
                                            </Tooltip.Content>
                                        </Tooltip.Portal>
                                    </Tooltip.Root>
                                    <span className="shrink-0 text-[12px] tabular-nums text-slate-500">
                                        {formatDuration(section.elapsedSeconds)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Tooltip.Provider>
        </section>
    );
};

export default SectionBreakdown;
