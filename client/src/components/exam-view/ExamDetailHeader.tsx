import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Download, FileSpreadsheet, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill, type StatusTone } from '@/components/manage/StatusPill';
import { formatDurationMinutes, formatShortDate } from '@/lib/formatters';
import type { ExamDetails } from './types';

const STATUS_TONE: Record<string, StatusTone> = {
    LIVE: 'live',
    PUBLISHED: 'live',
    DRAFT: 'draft',
    CLOSED: 'closed',
    ARCHIVED: 'archived',
};

const STATUS_LABEL: Record<string, string> = {
    LIVE: 'Live',
    PUBLISHED: 'Live',
    DRAFT: 'Draft',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
};

interface ExamDetailHeaderProps {
    exam: ExamDetails;
    questionCount: number;
    openDate?: string | null;
    deadline?: string | null;
    /**
     * The server's plain-English submission state, e.g. "Students can still
     * submit until the exam deadline." Previously fetched and discarded.
     */
    statusMessage?: string;
    canEdit: boolean;
    onExportFullReport: () => void;
    onCustomiseExport: () => void;
    exportDisabled: boolean;
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-baseline gap-1">
        <dt className="text-slate-400">{label}</dt>
        <dd className="font-semibold text-slate-700">{children}</dd>
    </div>
);

/**
 * Page identity: breadcrumb, the page's single <h1>, status, actions, and the
 * exam's configuration facts. Outcomes belong in the Results tab; this strip is
 * what the exam *is*, not how it went.
 */
export const ExamDetailHeader: React.FC<ExamDetailHeaderProps> = ({
    exam,
    questionCount,
    openDate,
    deadline,
    statusMessage,
    canEdit,
    onExportFullReport,
    onCustomiseExport,
    exportDisabled,
}) => {
    const status = exam.status || '';
    const duration = Number(exam.timeLimit || exam.duration || 0);

    return (
        <header className="flex flex-col gap-2">
            <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-1.5 text-[12px] text-slate-500">
                    <li>
                        <Link
                            to="/manage-exams"
                            className="inline-flex items-center gap-1 rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                        >
                            <ArrowLeft size={12} aria-hidden="true" /> Exam library
                        </Link>
                    </li>
                    <li aria-hidden="true" className="text-slate-300">/</li>
                    <li className="truncate text-slate-500">{exam.category || 'Exam details'}</li>
                </ol>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
                        {exam.title || 'Untitled exam'}
                    </h1>
                    <StatusPill
                        tone={STATUS_TONE[status] || 'neutral'}
                        label={STATUS_LABEL[status] || 'Unknown'}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={exportDisabled}
                                className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-[12px] font-semibold"
                            >
                                <Download size={13} aria-hidden="true" /> Export
                                <ChevronDown size={12} aria-hidden="true" className="text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-lg">
                            <DropdownMenuItem
                                onClick={onExportFullReport}
                                className="gap-2 py-2 text-[12px] font-semibold"
                            >
                                <Download size={13} aria-hidden="true" /> Full report (PDF)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={onCustomiseExport}
                                className="gap-2 py-2 text-[12px] font-semibold"
                            >
                                <FileSpreadsheet size={13} aria-hidden="true" /> Customise export…
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {canEdit && (
                        <Button
                            asChild
                            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
                        >
                            <Link to={`/manage-exams/${exam.id}/edit`}>
                                <Pencil size={13} aria-hidden="true" /> Edit exam
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                <Fact label="Items">
                    <span className="tabular-nums">{questionCount}</span>
                </Fact>
                <Fact label="Duration">{formatDurationMinutes(duration)}</Fact>
                <Fact label="Opens">{formatShortDate(openDate || exam.scheduledDate || undefined)}</Fact>
                <Fact label="Closes">{formatShortDate(deadline || undefined)}</Fact>
                <Fact label="Max attempts">
                    <span className="tabular-nums">{exam.maxAttempts ?? '—'}</span>
                </Fact>
                {exam.closeOnDeadline && <Fact label="Auto-close">on deadline</Fact>}
            </dl>

            {statusMessage && <p className="text-[12px] text-slate-500">{statusMessage}</p>}
        </header>
    );
};

export default ExamDetailHeader;
