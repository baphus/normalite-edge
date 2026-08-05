import React from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** The LET headline passing mark is a 75% general average. */
const PASS_MARK = 75;

interface ExamReadinessHeroProps {
    /** Overall average across submitted mocks, 0–100. */
    average: number;
    /** Number of submitted mock attempts. */
    submittedCount: number;
    /** True when there is at least one score to show. */
    hasAttempts: boolean;
}

/**
 * The headline readiness panel: overall average against the LET 75% pass
 * line, plus a no-mocks-yet call to action when there is no data.
 */
export const ExamReadinessHero: React.FC<ExamReadinessHeroProps> = ({
    average,
    submittedCount,
    hasAttempts,
}) => {
    const meetsPassMark = average >= PASS_MARK;
    const pointsToPass = Math.max(0, PASS_MARK - average);
    const clamped = Math.min(100, Math.max(2, average));

    return (
        <Card className="relative overflow-hidden">
            <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/[0.04]"
                aria-hidden
            />
            <CardContent className="relative p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Exam readiness
                </p>

                {hasAttempts ? (
                    <>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-[24px] font-semibold leading-tight tabular-nums text-slate-900">
                                {average}
                                <span className="text-sm">%</span>
                            </span>
                            <span className="text-xs text-slate-500">your overall average</span>
                        </div>

                        <div className="mt-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                <ClipboardList size={10} />
                                {submittedCount} submitted mock{submittedCount === 1 ? '' : 's'}
                            </span>
                        </div>

                        {/* Meter with the 75% pass-line marker */}
                        <div className="mt-4">
                            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                                    style={{ width: `${clamped}%` }}
                                />
                                <div
                                    className="absolute -top-1 -bottom-1 w-0.5 bg-slate-500"
                                    style={{ left: `${PASS_MARK}%` }}
                                    aria-hidden
                                />
                            </div>
                            <div className="relative mt-1.5 h-4">
                                <span
                                    className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-slate-500"
                                    style={{ left: `${PASS_MARK}%` }}
                                >
                                    {PASS_MARK}% · LET passing
                                </span>
                            </div>
                        </div>

                        <p className="mt-2 text-sm font-medium" style={{ textWrap: 'balance' }}>
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
                    </>
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

export default ExamReadinessHero;
