import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/manage/StatusPill';
import { formatShortDate } from '@/lib/formatters';
import { SectionLabel } from './SectionLabel';
import type { RecentAttempt } from './types';

interface RecentAttemptsProps {
    attempts: RecentAttempt[];
}

const subjectLabel = (raw: string | null | undefined): string | null => {
    if (!raw || raw.toLowerCase() === 'general section') return null;
    return raw;
};

/**
 * The most recent mock attempts. Status is conveyed by dot + text via
 * `StatusPill`; the score itself stays untinted so colour never carries it.
 */
export const RecentAttempts: React.FC<RecentAttemptsProps> = ({ attempts }) => {
    if (attempts.length === 0) {
        return (
            <div>
                <SectionLabel
                    action={
                        <Link to="/exams" className="text-xs font-semibold text-primary hover:underline">
                            View all
                        </Link>
                    }
                >
                    Recent mock attempts
                </SectionLabel>
                <Card>
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                        <ClipboardList className="h-6 w-6 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No attempts yet</p>
                        <p className="max-w-xs text-xs text-slate-500">
                            Your mock exam scores will show up here once you finish your first one.
                        </p>
                        <Link to="/exams">
                            <Button variant="outline" className="mt-2">
                                Browse exams
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <SectionLabel
                action={
                    <Link to="/exams" className="text-xs font-semibold text-primary hover:underline">
                        View all
                    </Link>
                }
            >
                Recent mock attempts
            </SectionLabel>
            <Card>
                <ul className="divide-y divide-slate-200" aria-label="Recent mock attempts">
                    {attempts.map((attempt) => {
                        const pct = Math.round(Number(attempt.percentage || 0));
                        const isDone = attempt.status === 'SUBMITTED';
                        const href = attempt.exam?.id
                            ? isDone
                                ? `/exams/${attempt.exam.id}/result`
                                : `/exams/${attempt.exam.id}/take`
                            : null;
                        const subject = subjectLabel(attempt.exam?.subject);

                        const rowInner = (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {attempt.exam?.title || 'Mock Exam'}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs text-slate-500">
                                            {attempt.exam?.timeLimitMinutes || 0} min
                                            {attempt.submittedAt
                                                ? ` · ${formatShortDate(attempt.submittedAt)}`
                                                : ' · in progress'}
                                        </span>
                                        {subject && (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                {subject}
                                            </span>
                                        )}
                                        <StatusPill
                                            tone={isDone ? 'success' : 'pending'}
                                            label={isDone ? 'Submitted' : 'In progress'}
                                        />
                                        <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600">
                                            {attempt.submissionType === 'AUTO' ? 'Auto' : 'Manual'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                    {isDone ? (
                                        <div className="min-w-[88px]">
                                            <p className="text-right text-base font-semibold leading-none tabular-nums text-slate-900">
                                                {pct}%
                                            </p>
                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                />
                                            </div>
                                            <p className="mt-0.5 text-right text-xs text-slate-500">{attempt.score} pts</p>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-semibold text-primary">Resume</span>
                                    )}
                                </div>
                            </>
                        );

                        const rowClass =
                            'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between';

                        return (
                            <li key={attempt.id}>
                                {href ? (
                                    <Link
                                        to={href}
                                        className={`${rowClass} transition-colors hover:bg-slate-50`}
                                    >
                                        {rowInner}
                                    </Link>
                                ) : (
                                    <div className={rowClass}>{rowInner}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </div>
    );
};

export default RecentAttempts;
