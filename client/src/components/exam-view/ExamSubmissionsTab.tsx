import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FilterField, ManageToolbar } from '@/components/manage/ManageToolbar';
import { ResourceTable, type ResourceColumn } from '@/components/manage/ResourceTable';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { formatDateTime, formatDurationSeconds, formatPercent } from '@/lib/formatters';
import type { AttemptItem, AttemptStatusFilter, ScoreBandFilter } from './types';
import type { SubmissionFilters } from './useSubmissionFilters';

interface ExamSubmissionsTabProps {
    filters: SubmissionFilters;
    questionCount: number;
    state: 'loading' | 'error' | 'ready';
    error?: string | null;
    onRetry?: () => void;
}

const STATUS_PRESENTATION: Record<string, { label: string; tone: StatusTone }> = {
    SUBMITTED: { label: 'Submitted', tone: 'success' },
    IN_PROGRESS: { label: 'In progress', tone: 'pending' },
};

/**
 * Initials are derived locally. This deliberately does not call an avatar
 * service: doing so sent every student's full name to an unauthenticated third
 * party, once per rendered row.
 */
const initialsOf = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const displayName = (attempt: AttemptItem) => attempt.user?.name?.trim() || 'Unknown user';

export const ExamSubmissionsTab: React.FC<ExamSubmissionsTabProps> = ({
    filters,
    questionCount,
    state,
    error,
    onRetry,
}) => {
    const columns = useMemo<ResourceColumn<AttemptItem>[]>(
        () => [
            {
                id: 'student',
                header: 'Student',
                primary: true,
                sortable: true,
                sortValue: (attempt) => displayName(attempt),
                className: 'min-w-[220px]',
                cell: (attempt) => {
                    const name = displayName(attempt);
                    return (
                        <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="hidden h-6 w-6 shrink-0 lg:flex">
                                {attempt.user?.profilePicture && (
                                    <AvatarImage src={attempt.user.profilePicture} alt="" />
                                )}
                                <AvatarFallback className="text-[11px] font-semibold">
                                    {initialsOf(name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <span className="block truncate font-semibold text-slate-900">{name}</span>
                                <span className="block truncate text-[12px] text-slate-400">
                                    {attempt.user?.email?.trim() || 'No email'}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'status',
                header: 'Status',
                status: true,
                sortable: true,
                sortValue: (attempt) => attempt.status,
                className: 'w-[130px]',
                cell: (attempt) => {
                    const presentation = STATUS_PRESENTATION[attempt.status] ?? {
                        label: attempt.status,
                        tone: 'neutral' as StatusTone,
                    };
                    return <StatusPill tone={presentation.tone} label={presentation.label} />;
                },
            },
            {
                id: 'program',
                header: 'Program',
                sortable: true,
                stacked: true,
                sortValue: (attempt) => attempt.user?.programTrack || '',
                className: 'min-w-[150px]',
                cell: (attempt) => (
                    <div className="min-w-0">
                        <span className="block truncate">{attempt.user?.programTrack?.trim() || '—'}</span>
                        <span className="block truncate text-[12px] text-slate-400">
                            Year {attempt.user?.yearLevel?.trim() || '—'} · Section{' '}
                            {attempt.user?.section?.trim() || '—'}
                        </span>
                    </div>
                ),
                stackedCell: (attempt) => attempt.user?.programTrack?.trim() || 'No program',
            },
            {
                id: 'campus',
                header: 'Campus',
                sortable: true,
                stacked: true,
                sortValue: (attempt) => attempt.user?.campus || '',
                className: 'w-[130px]',
                cell: (attempt) => (
                    <span className="block truncate">{attempt.user?.campus?.trim() || '—'}</span>
                ),
            },
            {
                id: 'attempt',
                header: 'Attempt',
                sortable: true,
                stacked: true,
                sortValue: (attempt) => attempt.attemptNo || 1,
                className: 'w-[90px] tabular-nums',
                cell: (attempt) => `#${attempt.attemptNo || 1}`,
            },
            {
                id: 'rawScore',
                header: 'Raw score',
                sortable: true,
                sortValue: (attempt) =>
                    attempt.status === 'SUBMITTED' ? Number(attempt.score || 0) : -1,
                className: 'w-[100px] tabular-nums',
                cell: (attempt) =>
                    attempt.status === 'SUBMITTED'
                        ? `${Number(attempt.score || 0)}/${questionCount}`
                        : '—',
            },
            {
                id: 'percentage',
                header: 'Percentage',
                sortable: true,
                stacked: true,
                sortValue: (attempt) =>
                    attempt.status === 'SUBMITTED' ? Number(attempt.percentage || 0) : -1,
                className: 'w-[110px] tabular-nums',
                // Not tinted by status: that is colour carrying meaning on a value
                // which has none, and the Status column already states the state.
                cell: (attempt) =>
                    attempt.status === 'SUBMITTED' ? formatPercent(attempt.percentage) : '—',
            },
            {
                id: 'submittedAt',
                header: 'Submitted',
                sortable: true,
                sortValue: (attempt) => new Date(attempt.submittedAt || 0).getTime(),
                className: 'w-[150px] whitespace-nowrap',
                cell: (attempt) =>
                    attempt.status === 'SUBMITTED' ? formatDateTime(attempt.submittedAt) : '—',
            },
            {
                id: 'timeSpent',
                header: 'Time spent',
                sortable: true,
                sortValue: (attempt) => Number(attempt.timeSpentSeconds || 0),
                className: 'w-[110px] whitespace-nowrap',
                cell: (attempt) => formatDurationSeconds(attempt.timeSpentSeconds),
            },
        ],
        [questionCount],
    );

    return (
        <section className="flex flex-col gap-3">
            {/* The page owns the only <h1>; this names the panel without competing with it. */}
            <h2 className="sr-only">Student submissions</h2>

            <ManageToolbar
                search={filters.search}
                onSearchChange={filters.setSearch}
                searchPlaceholder="Search name, email, program…"
                searchLabel="Search submissions"
                segments={filters.segments}
                segmentValue={filters.status}
                onSegmentChange={(value) => filters.setStatus(value as AttemptStatusFilter)}
                segmentLabel="Filter by attempt status"
                inlineFilters={
                    <Select
                        value={filters.scoreBand}
                        onValueChange={(value) => filters.setScoreBand(value as ScoreBandFilter)}
                    >
                        <SelectTrigger
                            className="h-8 w-[150px] rounded-lg border-slate-200 bg-white text-[12px]"
                            aria-label="Filter by score band"
                        >
                            <SelectValue placeholder="Score band" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All scores</SelectItem>
                            <SelectItem value="HIGH">90–100%</SelectItem>
                            <SelectItem value="PASSING">75–89%</SelectItem>
                            <SelectItem value="AT_RISK">Below 75%</SelectItem>
                            <SelectItem value="NO_SCORE">No score yet</SelectItem>
                        </SelectContent>
                    </Select>
                }
                popoverFilters={
                    <>
                        <FilterField label="Program">
                            <Select value={filters.program} onValueChange={filters.setProgram}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by program">
                                    <SelectValue placeholder="Program" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All programs</SelectItem>
                                    {filters.programOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FilterField>
                        <FilterField label="Campus">
                            <Select value={filters.campus} onValueChange={filters.setCampus}>
                                <SelectTrigger className="h-8 text-[12px]" aria-label="Filter by campus">
                                    <SelectValue placeholder="Campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All campuses</SelectItem>
                                    {filters.campusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FilterField>
                    </>
                }
                activeFilterCount={filters.chips.length}
                chips={filters.chips}
                onClearAll={filters.clearAll}
            />

            <ResourceTable
                rows={filters.filteredAttempts}
                columns={columns}
                getRowId={(attempt) => attempt.id}
                caption="Student attempts at this exam"
                state={state}
                error={error}
                onRetry={onRetry}
                filtersActive={filters.filtersActive}
                onClearFilters={filters.clearAll}
                emptyTitle="No attempts yet"
                emptyDescription="Student attempts appear here once the exam has been started."
                resetKey={filters.resetKey}
            />
        </section>
    );
};

export default ExamSubmissionsTab;
