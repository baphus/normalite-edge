import { useCallback, useMemo, useState } from 'react';
import type { ActiveFilterChip, ToolbarSegment } from '@/components/manage/ManageToolbar';
import type { AttemptItem, AttemptStatusFilter, ScoreBandFilter } from './types';

/**
 * Filter state for the submissions panel.
 *
 * Lives in a hook rather than inside the tab because the export dialog offers a
 * "filtered rows" scope, so the page needs the narrowed set too. One source of
 * truth; the tab renders it and the exporter consumes it.
 */

const SCORE_BAND_LABEL: Record<Exclude<ScoreBandFilter, 'ALL'>, string> = {
    HIGH: '90–100%',
    PASSING: '75–89%',
    AT_RISK: 'Below 75%',
    NO_SCORE: 'No score yet',
};

export interface SubmissionFilters {
    search: string;
    setSearch: (value: string) => void;
    program: string;
    setProgram: (value: string) => void;
    campus: string;
    setCampus: (value: string) => void;
    status: AttemptStatusFilter;
    setStatus: (value: AttemptStatusFilter) => void;
    scoreBand: ScoreBandFilter;
    setScoreBand: (value: ScoreBandFilter) => void;

    programOptions: string[];
    campusOptions: string[];
    segments: ToolbarSegment[];
    chips: ActiveFilterChip[];
    /** Includes the status segment, which is not chipped but does narrow the list. */
    filtersActive: boolean;
    clearAll: () => void;
    resetKey: string;

    filteredAttempts: AttemptItem[];
}

const matchesBand = (band: ScoreBandFilter, attempt: AttemptItem): boolean => {
    if (band === 'ALL') return true;
    const submitted = attempt.status === 'SUBMITTED';
    const percentage = Number(attempt.percentage || 0);

    if (band === 'NO_SCORE') return !submitted;
    if (!submitted) return false;
    if (band === 'HIGH') return percentage >= 90;
    if (band === 'PASSING') return percentage >= 75 && percentage < 90;
    return percentage < 75;
};

export function useSubmissionFilters(attempts: AttemptItem[]): SubmissionFilters {
    const [search, setSearch] = useState('');
    const [program, setProgram] = useState('ALL');
    const [campus, setCampus] = useState('ALL');
    const [status, setStatus] = useState<AttemptStatusFilter>('ALL');
    const [scoreBand, setScoreBand] = useState<ScoreBandFilter>('ALL');

    const programOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    attempts
                        .map((attempt) => attempt.user?.programTrack)
                        .filter((value): value is string => Boolean(value)),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [attempts],
    );

    const campusOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    attempts
                        .map((attempt) => attempt.user?.campus)
                        .filter((value): value is string => Boolean(value)),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [attempts],
    );

    /** Every filter except status — so the segmented control can show honest counts. */
    const beforeStatus = useMemo(() => {
        const term = search.trim().toLowerCase();

        return attempts.filter((attempt) => {
            const haystack = [
                attempt.user?.name,
                attempt.user?.email,
                attempt.user?.programTrack,
                attempt.user?.yearLevel,
                attempt.user?.section,
                attempt.user?.campus,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesSearch = !term || haystack.includes(term);
            const matchesProgram = program === 'ALL' || attempt.user?.programTrack === program;
            const matchesCampus = campus === 'ALL' || attempt.user?.campus === campus;

            return matchesSearch && matchesProgram && matchesCampus && matchesBand(scoreBand, attempt);
        });
    }, [attempts, search, program, campus, scoreBand]);

    const segments = useMemo<ToolbarSegment[]>(
        () => [
            { value: 'ALL', label: 'All', count: beforeStatus.length },
            {
                value: 'SUBMITTED',
                label: 'Submitted',
                count: beforeStatus.filter((attempt) => attempt.status === 'SUBMITTED').length,
            },
            {
                value: 'IN_PROGRESS',
                label: 'In progress',
                count: beforeStatus.filter((attempt) => attempt.status === 'IN_PROGRESS').length,
            },
        ],
        [beforeStatus],
    );

    const filteredAttempts = useMemo(
        () => (status === 'ALL' ? beforeStatus : beforeStatus.filter((attempt) => attempt.status === status)),
        [beforeStatus, status],
    );

    const clearAll = useCallback(() => {
        setSearch('');
        setProgram('ALL');
        setCampus('ALL');
        setStatus('ALL');
        setScoreBand('ALL');
    }, []);

    const chips = useMemo(() => {
        const next: ActiveFilterChip[] = [];
        if (search.trim().length > 0) {
            next.push({ id: 'search', label: `Search: ${search.trim()}`, onClear: () => setSearch('') });
        }
        if (program !== 'ALL') {
            next.push({ id: 'program', label: `Program: ${program}`, onClear: () => setProgram('ALL') });
        }
        if (campus !== 'ALL') {
            next.push({ id: 'campus', label: `Campus: ${campus}`, onClear: () => setCampus('ALL') });
        }
        if (scoreBand !== 'ALL') {
            next.push({
                id: 'band',
                label: `Score: ${SCORE_BAND_LABEL[scoreBand]}`,
                onClear: () => setScoreBand('ALL'),
            });
        }
        return next;
    }, [search, program, campus, scoreBand]);

    return {
        search,
        setSearch,
        program,
        setProgram,
        campus,
        setCampus,
        status,
        setStatus,
        scoreBand,
        setScoreBand,
        programOptions,
        campusOptions,
        segments,
        chips,
        filtersActive: chips.length > 0 || status !== 'ALL',
        clearAll,
        resetKey: `${search}|${program}|${campus}|${status}|${scoreBand}`,
        filteredAttempts,
    };
}
