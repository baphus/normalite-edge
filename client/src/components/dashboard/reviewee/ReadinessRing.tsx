import React from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** The LET headline passing mark is a 75% general average. */
const PASS_MARK = 75;

/** Ring geometry — viewBox "0 0 120 120", r=50 at (60,60), stroke-width 8. */
const RADIUS = 50;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ReadinessRingProps {
    /** Overall average across submitted mocks, 0–100. */
    average: number;
    /** Number of submitted mock attempts. */
    submittedCount: number;
    /** True when there is at least one score to show. */
    hasAttempts: boolean;
}

/**
 * The headline readiness panel: a large SVG circular progress ring showing the
 * reviewee's overall mock exam average against the LET 75% pass mark, plus a
 * no-mocks-yet call to action when there is no data.
 *
 * The ring is emerald when the average clears the pass mark and orange while it
 * trails it — but colour never carries the status alone: the contextual message
 * below states it in text (WCAG 1.4.1).
 */
export const ReadinessRing: React.FC<ReadinessRingProps> = ({
    average,
    submittedCount,
    hasAttempts,
}) => {
    const meetsPassMark = average >= PASS_MARK;
    const pointsToPass = Math.max(0, PASS_MARK - average);
    const clamped = Math.min(100, Math.max(0, average));

    // Animate the fill on mount: start with the ring empty (offset =
    // circumference) and settle on the target offset after the first paint so
    // the CSS transition has a starting value to animate from.
    const [dashOffset, setDashOffset] = React.useState(CIRCUMFERENCE);
    React.useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setDashOffset(CIRCUMFERENCE * (1 - clamped / 100));
        });
        return () => cancelAnimationFrame(frame);
    }, [clamped]);

    const activeStroke = meetsPassMark ? 'stroke-emerald-500' : 'stroke-orange-500';
    const valueColor = meetsPassMark ? 'text-emerald-600' : 'text-orange-500';

    return (
        <Card className="rounded-[16px]">
            <CardContent className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Exam readiness
                </p>

                {hasAttempts ? (
                    <div className="mt-3 flex flex-col items-center text-center">
                        {/* Ring with the numeric average at its centre */}
                        <div className="relative h-40 w-40">
                            <svg className="h-full w-full" viewBox="0 0 120 120" aria-hidden="true">
                                {/* Background track */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={RADIUS}
                                    fill="none"
                                    strokeWidth={STROKE_WIDTH}
                                    className="stroke-slate-100"
                                />
                                {/* Foreground arc */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={RADIUS}
                                    fill="none"
                                    strokeWidth={STROKE_WIDTH}
                                    strokeLinecap="round"
                                    strokeDasharray={CIRCUMFERENCE}
                                    strokeDashoffset={dashOffset}
                                    transform="rotate(-90 60 60)"
                                    className={`${activeStroke} transition-[stroke-dashoffset] duration-700 ease-out`}
                                />
                            </svg>
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <span className={`text-[24px] font-semibold leading-tight tabular-nums ${valueColor}`}>
                                    {average}
                                    <span className="text-sm">%</span>
                                </span>
                            </div>
                        </div>

                        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            <ClipboardList size={10} />
                            {submittedCount} submitted mock{submittedCount === 1 ? '' : 's'}
                        </span>

                        <p className="mt-3 text-sm font-medium" style={{ textWrap: 'balance' }}>
                            {meetsPassMark ? (
                                <span className="text-emerald-700">
                                    Above the {PASS_MARK}% passing average. Keep it steady across every area.
                                </span>
                            ) : (
                                <span className="text-slate-600">
                                    <span className="font-semibold text-primary">
                                        {pointsToPass} point{pointsToPass === 1 ? '' : 's'}
                                    </span>{' '}
                                    to the {PASS_MARK}% passing average.
                                </span>
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="mt-3">
                        <p className="text-[18px] font-semibold tracking-tight text-slate-900">No mocks yet</p>
                        <p className="mt-1 max-w-sm text-sm text-slate-600">
                            Take your first timed mock exam to measure where you stand against the {PASS_MARK}% LET
                            passing average.
                        </p>
                        <Link to="/exams">
                            <Button className="mt-4 gap-2">
                                Browse exams <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ReadinessRing;
