/** Shared entity/prop types for the reviewee dashboard sections. */

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';
export type SubmissionType = 'AUTO' | 'MANUAL';
export type ChoiceKey = 'A' | 'B' | 'C' | 'D';

export interface RecentAttempt {
    id: string;
    score: number;
    percentage: number;
    status: AttemptStatus;
    submittedAt: string | null;
    submissionType: SubmissionType;
    exam?: {
        id: string;
        title: string;
        subject: string | null;
        timeLimitMinutes: number;
    };
}

export interface DailyQuestion {
    questionId: string;
    examId: string;
    examTitle: string;
    subject?: string | null;
    questionText: string;
    choices: Record<ChoiceKey, string>;
}

export interface DailyAnswerResult {
    questionId?: string;
    examId?: string;
    examTitle?: string;
    questionText?: string;
    selectedChoice: ChoiceKey;
    correctChoice: ChoiceKey;
    isCorrect: boolean;
    rationalization?: string | null;
}

/** Per-subject average derived from submitted attempts. */
export interface SubjectPerformanceItem {
    subject: string;
    avg: number;
    best: number;
    count: number;
}

/** Per-subject average as served by GET /dashboard/stats. */
export interface SubjectAverage {
    subject: string;
    average: number;
}

export interface UpcomingSession {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    host?: {
        firstName?: string;
        lastName?: string;
    };
}

export interface UpcomingExam {
    id: string;
    title: string;
    subject: string | null;
    scheduleStart: string;
    scheduleEnd: string | null;
    programTrack: string | null;
    status: string;
}

/** Stats payload passed from DashboardPage (GET /dashboard/stats). */
export interface RevieweeStats {
    overallAverage?: number;
    totalMaterials?: number;
    totalExamsAvailable?: number;
    totalExamsTaken?: number;
    averagesBySubject?: SubjectAverage[];
    upcomingSessions?: UpcomingSession[];
    recentAttempts?: RecentAttempt[];
    upcomingExams?: UpcomingExam[];
}
