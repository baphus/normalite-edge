/** Shapes shared by the exam detail page and its tab panels. */

export interface ExamTrack {
    id?: string;
    name: string;
    code?: string | null;
}

export interface ExamSection {
    id?: string;
    title?: string;
    orderNo?: number;
}

export interface ExamQuestion {
    id: string;
    orderNo?: number;
    questionText?: string;
    imageUrl?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    rationalization?: string | null;
    sectionId?: string;
    section?: { id?: string; title?: string } | null;
}

export interface ExamDetails {
    id: string;
    title?: string;
    description?: string | null;
    category?: string;
    status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
    questionCount?: number;
    totalItems?: number;
    duration?: number;
    timeLimit?: number;
    maxAttempts?: number | null;
    deadline?: string | null;
    scheduledDate?: string | null;
    closeOnDeadline?: boolean;
    tracks?: ExamTrack[];
    program_track?: string | null;
    sections?: ExamSection[];
    questions?: ExamQuestion[];
    creator?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
}

export interface AttemptItem {
    id: string;
    status: string;
    score?: number | null;
    percentage?: number | null;
    attemptNo?: number;
    timeSpentSeconds?: number | null;
    submittedAt?: string | null;
    startedAt?: string;
    user?: {
        id: string;
        name?: string;
        email?: string;
        programTrack?: string | null;
        yearLevel?: string | null;
        section?: string | null;
        campus?: string | null;
        profilePicture?: string | null;
    };
}

export interface SubmissionAnalytics {
    examStatus: {
        status: string;
        canStudentsSubmit: boolean;
        message: string;
        scheduleEnd?: string | null;
        closeOnDeadline?: boolean;
    };
}

export type AttemptStatusFilter = 'ALL' | 'SUBMITTED' | 'IN_PROGRESS';
export type ScoreBandFilter = 'ALL' | 'HIGH' | 'PASSING' | 'AT_RISK' | 'NO_SCORE';
export type ExportScope = 'ALL' | 'FILTERED';

/** One row of the exported score sheet. Every value is already display-formatted. */
export interface StudentScoreRow {
    id?: string;
    rowNo: number;
    studentName: string;
    studentEmail: string;
    program: string;
    campus: string;
    yearLevel: string;
    section: string;
    attemptNo: number;
    status: string;
    rawScore: string;
    percentage: string;
    timeSpent: string;
    startedAt: string;
    submittedAt: string;
}

export const EXPORT_COLUMNS = [
    { key: 'rowNo', label: 'No.' },
    { key: 'studentName', label: 'Student' },
    { key: 'studentEmail', label: 'Email' },
    { key: 'program', label: 'Program' },
    { key: 'campus', label: 'Campus' },
    { key: 'yearLevel', label: 'Year Level' },
    { key: 'section', label: 'Section' },
    { key: 'attemptNo', label: 'Attempt No.' },
    { key: 'status', label: 'Status' },
    { key: 'rawScore', label: 'Raw Score' },
    { key: 'percentage', label: 'Percentage' },
    { key: 'timeSpent', label: 'Time Spent' },
    { key: 'startedAt', label: 'Started At' },
    { key: 'submittedAt', label: 'Submitted At' },
] as const satisfies ReadonlyArray<{ key: keyof StudentScoreRow; label: string }>;

export type ExportColumnKey = typeof EXPORT_COLUMNS[number]['key'];

export const DEFAULT_EXPORT_COLUMNS: ExportColumnKey[] = EXPORT_COLUMNS.map((column) => column.key);
