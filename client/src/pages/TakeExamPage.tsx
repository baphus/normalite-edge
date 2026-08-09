import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CircleDot,
    Flag,
    Send,
    WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { useStreakContext } from '@/contexts/StreakContext';
import { toast } from 'sonner';
import ExamLayout, { type QuestionStatus, type SectionTab } from '@/components/exam/ExamLayout';
import TimerHeader from '@/components/exam/TimerHeader';
import ItemReviewScreen from '@/components/exam/ItemReviewScreen';
import SubmitConfirmDialog from '@/components/exam/SubmitConfirmDialog';
import ExamInstructions, {
    KeyboardShortcutsHelp,
    useExamKeyboardShortcuts,
} from '@/components/exam/ExamInstructions';
import {
    FocusModeToggle,
    MobileBottomNav,
    MobileSectionTabs,
    QuestionGridSheet,
    useExamFocusMode,
} from '@/components/exam/MobileExamNav';

interface Question {
    id: string;
    orderNo: number;
    text: string;
    imageUrl?: string | null;
    choices: string[];
    section: string;
}

interface Exam {
    id: string;
    title: string;
    subject: string;
    timeLimit: number;
    totalItems: number;
    questions: Question[];
}

interface AttemptStartResponse {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    enforceExamSingleTab?: boolean;
    tabSwitchGraceSeconds?: number;
    startedAt?: string;
    endsAt?: string;
    remainingSeconds: number | null;
    currentQuestionIndex?: number;
    lastActivityAt?: string | null;
    lastSavedAt?: string | null;
    exam: Exam;
    answers: Record<string, string>;
    answerMeta?: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>;
}

interface ExamTakeResponse {
    id: string;
    title: string;
    subject: string;
    timeLimit: number;
    totalItems: number;
    feedbackMode?: 'IMMEDIATE' | 'AFTER_SUBMIT' | string;
    scheduleEnd?: string | null;
    questions: Array<{
        id: string;
        orderNo?: number;
        orderIndex?: number;
        text?: string;
        questionText?: string;
        imageUrl?: string | null;
        choices?: string[];
        choiceA?: string;
        choiceB?: string;
        choiceC?: string;
        choiceD?: string;
        section?: string | { title?: string } | null;
    }>;
}

interface LocalDraft {
    attemptId: string;
    answers: Record<string, string>;
    flagged?: Record<string, boolean>;
    answerMeta?: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>;
    questionElapsedMs?: Record<string, number>;
    currentIndex: number;
    timeLeft: number;
    updatedAt: number;
}

interface SectionGroup {
    name: string;
    questionIndexes: number[];
    total: number;
    answered: number;
    firstIndex: number;
    lastIndex: number;
    isComplete: boolean;
}

interface RawQuestionInput {
    id?: string | number | null;
    orderNo?: number | string | null;
    orderIndex?: number | string | null;
    text?: string | null;
    questionText?: string | null;
    imageUrl?: string | null;
    choices?: unknown;
    choiceA?: unknown;
    choiceB?: unknown;
    choiceC?: unknown;
    choiceD?: unknown;
    section?: string | { title?: string | null } | null;
}

interface ApiErrorLike {
    response?: {
        data?: {
            message?: string;
        };
    };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'pending' | 'error';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

const TakeExamPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { refetchStreak } = useStreakContext();
    const [exam, setExam] = useState<Exam | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [answerMeta, setAnswerMeta] = useState<Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [enforceExamSingleTab, setEnforceExamSingleTab] = useState(false);
    const [hasReviewedInstructions, setHasReviewedInstructions] = useState(false);
    const [preflightSingleTabEnabled, setPreflightSingleTabEnabled] = useState(false);
    const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState(5);
    const [preflightTabSwitchGraceSeconds, setPreflightTabSwitchGraceSeconds] = useState(5);
    const [preflightLoading, setPreflightLoading] = useState(true);
    const [preflightExamInfo, setPreflightExamInfo] = useState<{
        title: string;
        subject: string;
        timeLimit: number;
        totalQuestions: number;
    } | null>(null);
    const [endsAt, setEndsAt] = useState<string | null>(null);
    const [isOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

    const { isFocusMode, onToggleFocusMode } = useExamFocusMode();

    const answersRef = useRef<Record<string, string>>({});
    const answerMetaRef = useRef<Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>>({});
    const flaggedRef = useRef<Record<string, boolean>>({});
    const questionElapsedMsRef = useRef<Record<string, number>>({});
    const activeQuestionIdRef = useRef<string | null>(null);
    const activeQuestionStartedAtRef = useRef<number | null>(null);
    const isDocumentVisibleRef = useRef(true);
    const tabViolationInFlightRef = useRef(false);
    const originalDocumentTitleRef = useRef('');
    const tabViolationDeadlineMsRef = useRef<number | null>(null);
    const tabViolationTitleIntervalRef = useRef<number | null>(null);
    const tabViolationTimeoutRef = useRef<number | null>(null);
    const tabViolationResetHandlerRef = useRef<() => void>(() => {});
    const timeLeftRef = useRef(0);
    const endsAtMsRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);
    const allowNavigationRef = useRef(false);
    const pendingNavigationPathRef = useRef<string | null>(null);
    const pendingNavigationTypeRef = useRef<'route' | 'history' | null>(null);
    const skipNextPopStateRef = useRef(false);
    const submitInFlightRef = useRef(false);
    const submittedThisSessionRef = useRef(false);

    const draftKey = useMemo(() => (id ? `exam-draft:${id}` : ''), [id]);
    const startedKey = useMemo(() => (id ? `exam-started:${id}` : ''), [id]);
    const shouldWarnOnLeave = Boolean(
        hasReviewedInstructions &&
        attemptId &&
        exam &&
        !loading &&
        !isSubmitting &&
        timeLeft > 0
    );

    useEffect(() => {
        if (!shouldWarnOnLeave) return;

        const handleDocumentClick = (event: MouseEvent) => {
            if (allowNavigationRef.current) return;
            if (event.defaultPrevented) return;

            const target = event.target as HTMLElement | null;
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#')) return;

            let destination: URL;
            try {
                destination = new URL(anchor.href, window.location.origin);
            } catch {
                return;
            }

            if (destination.origin !== window.location.origin) return;

            const nextPath = `${destination.pathname}${destination.search}${destination.hash}`;
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (nextPath === currentPath) return;

            event.preventDefault();
            event.stopPropagation();

            pendingNavigationPathRef.current = nextPath;
            pendingNavigationTypeRef.current = 'route';
            setShowLeaveConfirm(true);
        };

        document.addEventListener('click', handleDocumentClick, true);
        return () => {
            document.removeEventListener('click', handleDocumentClick, true);
        };
    }, [shouldWarnOnLeave]);

    useEffect(() => {
        if (!shouldWarnOnLeave) return;

        const handlePopState = () => {
            if (allowNavigationRef.current) return;
            if (skipNextPopStateRef.current) {
                skipNextPopStateRef.current = false;
                return;
            }

            pendingNavigationPathRef.current = null;
            pendingNavigationTypeRef.current = 'history';
            setShowLeaveConfirm(true);

            skipNextPopStateRef.current = true;
            window.history.go(1);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [shouldWarnOnLeave]);

    const getTimeSpent = useCallback((durationMinutes: number, remaining: number) => {
        const totalSeconds = Math.max(durationMinutes, 0) * 60;
        return Math.max(0, totalSeconds - Math.max(remaining, 0));
    }, []);

    const computeRemainingFromEndsAt = useCallback((endsAtMs: number | null) => {
        if (!endsAtMs || !Number.isFinite(endsAtMs)) return null;
        return Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
    }, []);

    const sanitizeAnswersMap = useCallback((rawAnswers: Record<string, string> = {}, questions: Question[] = []) => {
        const validQuestionIds = new Set((questions || []).map((question) => question.id));
        const safeAnswers: Record<string, string> = {};

        for (const [questionId, selectedChoiceRaw] of Object.entries(rawAnswers || {})) {
            const selectedChoice = String(selectedChoiceRaw || '').trim().toUpperCase();
            if (!validQuestionIds.has(questionId)) continue;
            if (!CHOICE_LABELS.includes(selectedChoice)) continue;
            safeAnswers[questionId] = selectedChoice;
        }

        return safeAnswers;
    }, []);

    const sanitizeAnswerMeta = useCallback((
        rawMeta: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }> = {},
        elapsedMsByQuestionId: Record<string, number> = {},
        questions: Question[] = [],
        safeAnswers: Record<string, string> = {},
        flaggedMap: Record<string, boolean> = {},
    ) => {
        const validQuestionIds = new Set((questions || []).map((question) => question.id));
        const safeMeta: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null; flagged?: boolean }> = {};
        const trackedQuestionIds = new Set<string>([
            ...Object.keys(safeAnswers || {}),
            ...Object.keys(rawMeta || {}),
            ...Object.keys(flaggedMap || {}),
        ]);

        for (const questionId of trackedQuestionIds) {
            if (!validQuestionIds.has(questionId)) continue;

            const selectedChoice = safeAnswers?.[questionId];
            const isAnswered = CHOICE_LABELS.includes(String(selectedChoice || '').trim().toUpperCase());
            const isFlagged = Boolean(flaggedMap?.[questionId]);

            const value = rawMeta?.[questionId] || {};

            const viewedAtRaw = value?.viewedAt;
            const viewedAt = (() => {
                if (typeof viewedAtRaw !== 'string' || !viewedAtRaw.trim()) return null;
                const parsed = new Date(viewedAtRaw);
                if (Number.isNaN(parsed.getTime())) return null;
                return parsed.toISOString();
            })();

            const answeredAtRaw = value?.answeredAt;
            const answeredAt = (() => {
                if (typeof answeredAtRaw !== 'string' || !answeredAtRaw.trim()) return null;
                const parsed = new Date(answeredAtRaw);
                if (Number.isNaN(parsed.getTime())) return null;
                return parsed.toISOString();
            })();

            const elapsedFromMeta = Number(value?.elapsedSeconds);
            const elapsedFromMetaSafe = Number.isFinite(elapsedFromMeta) && elapsedFromMeta >= 0
                ? Math.round(elapsedFromMeta)
                : 0;

            const elapsedFromTracker = Math.max(0, Math.round(Number(elapsedMsByQuestionId?.[questionId] || 0) / 1000));
            const elapsedSeconds = Math.max(elapsedFromMetaSafe, elapsedFromTracker);

            if (!isAnswered && !viewedAt && elapsedSeconds <= 0 && !isFlagged) {
                continue;
            }

            safeMeta[questionId] = {
                viewedAt,
                answeredAt,
                elapsedSeconds,
                ...(isFlagged ? { flagged: true } : {}),
            };
        }

        return safeMeta;
    }, []);

    const sanitizeFlagged = useCallback((rawFlagged: Record<string, unknown> = {}, questions: Question[] = []) => {
        const validQuestionIds = new Set((questions || []).map((question) => question.id));
        const safeFlagged: Record<string, boolean> = {};

        for (const [questionId, value] of Object.entries(rawFlagged || {})) {
            if (!validQuestionIds.has(questionId)) continue;
            if (value === true) safeFlagged[questionId] = true;
        }

        return safeFlagged;
    }, []);

    const flushActiveQuestionTime = useCallback(() => {
        if (!isDocumentVisibleRef.current) return;

        const activeQuestionId = activeQuestionIdRef.current;
        const activeQuestionStartedAt = activeQuestionStartedAtRef.current;
        if (!activeQuestionId || activeQuestionStartedAt === null) return;

        const now = Date.now();
        const deltaMs = Math.max(0, now - activeQuestionStartedAt);
        if (deltaMs > 0) {
            questionElapsedMsRef.current[activeQuestionId] = (questionElapsedMsRef.current[activeQuestionId] || 0) + deltaMs;

            // Persist elapsed timing changes for answered questions even if the choice did not change.
            if (answersRef.current[activeQuestionId]) {
                dirtyRef.current = true;
            }
        }

        activeQuestionStartedAtRef.current = now;
    }, []);

    const getResumeIndex = useCallback((questions: Question[] = [], savedAnswers: Record<string, string> = {}) => {
        if (!questions.length) return 0;

        const firstUnansweredIndex = questions.findIndex((question) => !savedAnswers[question.id]);
        if (firstUnansweredIndex >= 0) return firstUnansweredIndex;

        return Math.max(questions.length - 1, 0);
    }, []);

    const normalizeQuestions = useCallback((rawQuestions: RawQuestionInput[] = []): Question[] => {
        const sorted = rawQuestions
            .map((rawQuestion, index) => {
                const normalizedChoices = Array.isArray(rawQuestion.choices)
                    ? rawQuestion.choices
                    : [rawQuestion.choiceA, rawQuestion.choiceB, rawQuestion.choiceC, rawQuestion.choiceD].filter((choice) => typeof choice === 'string');

                const normalizedSection = typeof rawQuestion.section === 'string'
                    ? rawQuestion.section
                    : rawQuestion.section?.title || null;

                return {
                    id: String(rawQuestion.id || `q-${index + 1}`),
                    orderNo: Number(rawQuestion.orderNo ?? rawQuestion.orderIndex ?? index + 1),
                    text: String(rawQuestion.text ?? rawQuestion.questionText ?? ''),
                    imageUrl: rawQuestion.imageUrl ? String(rawQuestion.imageUrl) : null,
                    choices: normalizedChoices.map((choice) => String(choice ?? '')),
                    section: normalizedSection || 'Main section',
                };
            })
            .filter((question) => question.text.trim().length > 0 && question.choices.length > 0)
            .sort((first, second) => first.orderNo - second.orderNo);
        return sorted.map((question, index) => ({
            ...question,
            orderNo: index + 1,
        }));
    }, []);

    const readDraft = useCallback((): LocalDraft | null => {
        if (!draftKey) return null;
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return null;

            const parsed = JSON.parse(raw) as LocalDraft;
            if (!parsed?.attemptId || typeof parsed.currentIndex !== 'number') return null;

            return parsed;
        } catch {
            return null;
        }
    }, [draftKey]);

    const writeDraft = useCallback((next: LocalDraft) => {
        if (!draftKey) return;
        localStorage.setItem(draftKey, JSON.stringify(next));
    }, [draftKey]);

    const clearDraft = useCallback(() => {
        if (!draftKey) return;
        localStorage.removeItem(draftKey);
    }, [draftKey]);

    const markExamStarted = useCallback(() => {
        if (!startedKey) return;
        localStorage.setItem(startedKey, '1');
    }, [startedKey]);

    const clearExamStarted = useCallback(() => {
        if (!startedKey) return;
        localStorage.removeItem(startedKey);
    }, [startedKey]);

    useEffect(() => {
        if (!startedKey) return;
        const hasStarted = localStorage.getItem(startedKey) === '1';
        if (hasStarted) {
            void Promise.resolve().then(() => setHasReviewedInstructions(true));
        }
    }, [startedKey]);

    const clearTabViolationTimers = useCallback(() => {
        if (tabViolationTitleIntervalRef.current !== null) {
            window.clearInterval(tabViolationTitleIntervalRef.current);
            tabViolationTitleIntervalRef.current = null;
        }

        if (tabViolationTimeoutRef.current !== null) {
            window.clearTimeout(tabViolationTimeoutRef.current);
            tabViolationTimeoutRef.current = null;
        }
    }, []);

    const restoreDocumentTitle = useCallback(() => {
        const fallbackTitle = originalDocumentTitleRef.current || 'Normalite EDGE';
        document.title = fallbackTitle;
    }, []);

    const stopTabViolationCountdown = useCallback(() => {
        clearTabViolationTimers();
        tabViolationDeadlineMsRef.current = null;
        restoreDocumentTitle();
    }, [clearTabViolationTimers, restoreDocumentTitle]);

    const updateTabViolationTitle = useCallback(() => {
        const deadlineMs = tabViolationDeadlineMsRef.current;
        if (!deadlineMs) return;

        const remainingMs = Math.max(0, deadlineMs - Date.now());
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const baseTitle = originalDocumentTitleRef.current || 'Normalite EDGE';

        document.title = `Return in ${remainingSeconds}s | ${baseTitle}`;
    }, []);

    const startTabViolationCountdown = useCallback(() => {
        if (tabViolationInFlightRef.current) return;

        clearTabViolationTimers();

        const safeGraceSeconds = Math.max(1, Math.min(30, Math.round(Number(tabSwitchGraceSeconds || 5))));

        tabViolationDeadlineMsRef.current = Date.now() + safeGraceSeconds * 1000;
        updateTabViolationTitle();

        tabViolationTitleIntervalRef.current = window.setInterval(() => {
            updateTabViolationTitle();
        }, 250);

        tabViolationTimeoutRef.current = window.setTimeout(() => {
            if (document.visibilityState === 'hidden') {
                tabViolationResetHandlerRef.current();
            }
        }, safeGraceSeconds * 1000);
    }, [clearTabViolationTimers, tabSwitchGraceSeconds, updateTabViolationTitle]);

    useEffect(() => {
        if (!originalDocumentTitleRef.current) {
            originalDocumentTitleRef.current = document.title || 'Normalite EDGE';
        }

        return () => {
            stopTabViolationCountdown();
        };
    }, [stopTabViolationCountdown]);

    useEffect(() => {
        const loadPreflightSettings = async () => {
            if (isOffline) {
                setPreflightLoading(false);
                return;
            }
            setPreflightLoading(true);
            try {
                const [settingsResponse, examResponse] = await Promise.all([
                    api.get('/settings/system'),
                    id ? api.get(`/exams/${id}/take`) : Promise.resolve(null),
                ]);
                setPreflightSingleTabEnabled(Boolean(settingsResponse.data?.data?.enforceExamSingleTab));
                setPreflightTabSwitchGraceSeconds(Math.max(1, Math.min(30, Math.round(Number(settingsResponse.data?.data?.tabSwitchGraceSeconds || 5)))));

                // Surface the exam title/subject for the preflight instructions
                // screen; the attempt itself is only created after the user
                // presses "Start Exam and Timer".
                const examPayload = examResponse?.data?.data as ExamTakeResponse | undefined;
                if (examPayload) {
                    setPreflightExamInfo({
                        title: examPayload.title || '',
                        subject: examPayload.subject || '',
                        timeLimit: Math.max(0, Number(examPayload.timeLimit) || 0),
                        totalQuestions: Array.isArray(examPayload.questions) ? examPayload.questions.length : 0,
                    });
                }
            } catch {
                setPreflightSingleTabEnabled(false);
                setPreflightTabSwitchGraceSeconds(5);
            } finally {
                setPreflightLoading(false);
            }
        };

        void loadPreflightSettings();
    }, [id, isOffline]);

    const saveAttempt = useCallback(async (force = false) => {
        if (!attemptId || !exam || isSubmitting) return;

        flushActiveQuestionTime();
        if (!force && !dirtyRef.current) return;

        if (!navigator.onLine) {
            setSaveStatus('pending');
            return;
        }

        try {
            setSaveStatus('saving');
            const safeAnswers = sanitizeAnswersMap(answersRef.current, exam.questions || []);
            const response = await api.patch(`/attempts/${attemptId}/save`, {
                answers: safeAnswers,
                answerMeta: sanitizeAnswerMeta(answerMetaRef.current, questionElapsedMsRef.current, exam.questions || [], safeAnswers, flaggedRef.current),
                currentQuestionIndex: currentIndex,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                remainingSeconds: Math.max(0, timeLeftRef.current),
            });

            const saved = response.data?.data as AttemptStartResponse | undefined;
            if (saved?.endsAt) {
                const parsedEndsAtMs = new Date(saved.endsAt).getTime();
                if (Number.isFinite(parsedEndsAtMs)) {
                    endsAtMsRef.current = parsedEndsAtMs;
                    setEndsAt(saved.endsAt);
                    const recomputedRemaining = computeRemainingFromEndsAt(parsedEndsAtMs);
                    if (typeof recomputedRemaining === 'number') {
                        setTimeLeft(recomputedRemaining);
                        timeLeftRef.current = recomputedRemaining;
                    }
                }
            }

            if (typeof saved?.currentQuestionIndex === 'number') {
                const boundedIndex = Math.min(
                    Math.max(0, saved.currentQuestionIndex),
                    Math.max((exam.questions || []).length - 1, 0),
                );
                setCurrentIndex(boundedIndex);
            }

            dirtyRef.current = false;
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        }
    }, [attemptId, computeRemainingFromEndsAt, currentIndex, exam, flushActiveQuestionTime, getTimeSpent, isSubmitting, sanitizeAnswerMeta, sanitizeAnswersMap]);

    const handleTabViolationReset = useCallback(async () => {
        if (!attemptId || !exam || tabViolationInFlightRef.current) return;

        tabViolationInFlightRef.current = true;
        stopTabViolationCountdown();
        dirtyRef.current = false;
        clearDraft();
        setSaveStatus('idle');

        try {
            const response = await api.post(`/attempts/${attemptId}/tab-violation`);
            const payload = response.data.data as AttemptStartResponse;

            const safeAnswers = sanitizeAnswersMap(payload.answers || {}, exam.questions || []);
            const safeMeta = sanitizeAnswerMeta(payload.answerMeta || {}, {}, exam.questions || [], safeAnswers);

            questionElapsedMsRef.current = {};
            setAnswers(safeAnswers);
            answersRef.current = safeAnswers;
            setAnswerMeta(safeMeta);
            answerMetaRef.current = safeMeta;
            setFlagged({});
            flaggedRef.current = {};

            setCurrentIndex(0);

            const resetTimeLeft = Math.max(0, payload.remainingSeconds ?? exam.timeLimit * 60);
            setTimeLeft(resetTimeLeft);
            timeLeftRef.current = resetTimeLeft;

            // Keep the header ring in sync with the reset countdown.
            if (payload.endsAt) {
                const parsedEndsAtMs = new Date(payload.endsAt).getTime();
                if (Number.isFinite(parsedEndsAtMs)) {
                    endsAtMsRef.current = parsedEndsAtMs;
                }
            }
            setEndsAt(payload.endsAt || new Date(Date.now() + resetTimeLeft * 1000).toISOString());

            toast.error('Tab switch detected. Your attempt was reset and all answers were cleared.');
        } catch {
            toast.error('Tab switch detected, but reset failed. Return to Exams and retry.');
            allowNavigationRef.current = true;
            navigate('/exams');
        } finally {
            tabViolationInFlightRef.current = false;
        }
    }, [attemptId, clearDraft, exam, navigate, sanitizeAnswerMeta, sanitizeAnswersMap, stopTabViolationCountdown]);

    useEffect(() => {
        tabViolationResetHandlerRef.current = () => {
            void handleTabViolationReset();
        };
    }, [handleTabViolationReset]);

    useEffect(() => {
        const fetchAttempt = async () => {
            if (!hasReviewedInstructions) {
                return;
            }

            if (isOffline) {
                setLoading(false);
                return;
            }

            if (!id) {
                setError('Missing exam id.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await api.post('/attempts', { examId: id });
                const payload = response.data.data as AttemptStartResponse;
                setEnforceExamSingleTab(Boolean(payload?.enforceExamSingleTab));
                setTabSwitchGraceSeconds(Math.max(1, Math.min(30, Math.round(Number(payload?.tabSwitchGraceSeconds || preflightTabSwitchGraceSeconds || 5)))));

                if (payload?.status === 'SUBMITTED') {
                    clearExamStarted();
                    allowNavigationRef.current = true;
                    navigate(`/exams/${id}/result?attemptId=${payload.id}`, { replace: true, state: { justSubmitted: false } });
                    return;
                }

                let normalizedQuestions = normalizeQuestions(payload?.exam?.questions || []);

                if (normalizedQuestions.length === 0) {
                    const examTakeResponse = await api.get(`/exams/${id}/take`);
                    const examTakePayload = examTakeResponse.data.data as ExamTakeResponse;
                    normalizedQuestions = normalizeQuestions(examTakePayload.questions || []);
                }

                const normalizedExam: Exam = {
                    ...payload.exam,
                    questions: normalizedQuestions,
                };

                markExamStarted();

                const serverAnswers = sanitizeAnswersMap(payload.answers || {}, normalizedQuestions);
                const serverAnswerMeta = sanitizeAnswerMeta(payload.answerMeta || {}, {}, normalizedQuestions, serverAnswers);
                const parsedEndsAtMs = payload.endsAt ? new Date(payload.endsAt).getTime() : null;
                endsAtMsRef.current = Number.isFinite(parsedEndsAtMs) ? parsedEndsAtMs : null;
                const computedFromEndsAt = computeRemainingFromEndsAt(endsAtMsRef.current);
                const serverTimeLeft = computedFromEndsAt ?? payload.remainingSeconds ?? normalizedExam.timeLimit * 60;
                // TimerHeader needs a concrete ISO deadline. Prefer the server's
                // endsAt; otherwise synthesize one from the server's remaining
                // time so the ring still depletes correctly (no per-tick churn).
                setEndsAt(payload.endsAt || new Date(Date.now() + Math.max(0, serverTimeLeft) * 1000).toISOString());
                const serverCurrentIndex = typeof payload.currentQuestionIndex === 'number'
                    ? Math.min(Math.max(payload.currentQuestionIndex, 0), Math.max(normalizedExam.questions.length - 1, 0))
                    : null;

                setAttemptId(payload.id);
                setExam(normalizedExam);

                const draft = readDraft();
                const sameAttemptDraft = draft && draft.attemptId === payload.id;

                if (sameAttemptDraft) {
                    const safeDraftAnswers = sanitizeAnswersMap(draft.answers || {}, normalizedQuestions);
                    const safeDraftMeta = sanitizeAnswerMeta(
                        draft.answerMeta || {},
                        draft.questionElapsedMs || {},
                        normalizedQuestions,
                        safeDraftAnswers,
                    );
                    const mergedAnswers = {
                        ...serverAnswers,
                        ...safeDraftAnswers,
                    };
                    const mergedAnswerMeta = sanitizeAnswerMeta(
                        {
                            ...serverAnswerMeta,
                            ...safeDraftMeta,
                        },
                        draft.questionElapsedMs || {},
                        normalizedQuestions,
                        mergedAnswers,
                    );

                    questionElapsedMsRef.current = Object.fromEntries(
                        Object.entries(mergedAnswerMeta).map(([questionId, meta]) => [
                            questionId,
                            Math.max(0, Math.round(Number(meta?.elapsedSeconds || 0) * 1000)),
                        ])
                    );

                    setAnswers(mergedAnswers);
                    answersRef.current = mergedAnswers;
                    setAnswerMeta(mergedAnswerMeta);
                    answerMetaRef.current = mergedAnswerMeta;

                    const safeDraftFlagged = sanitizeFlagged(draft.flagged || {}, normalizedQuestions);
                    setFlagged(safeDraftFlagged);
                    flaggedRef.current = safeDraftFlagged;

                    const draftIndex = Math.min(Math.max(draft.currentIndex, 0), Math.max(normalizedExam.questions.length - 1, 0));
                    const resumeFromAnswersIndex = getResumeIndex(normalizedExam.questions, mergedAnswers);
                    const baseIndex = serverCurrentIndex ?? resumeFromAnswersIndex;
                    const safeIndex = Object.keys(safeDraftAnswers || {}).length > 0
                        ? Math.max(baseIndex, Math.max(draftIndex, resumeFromAnswersIndex))
                        : baseIndex;
                    setCurrentIndex(safeIndex);

                    const resolvedTimeLeft = Math.max(0, Math.min(serverTimeLeft, draft.timeLeft));
                    setTimeLeft(resolvedTimeLeft);
                    timeLeftRef.current = resolvedTimeLeft;

                    if (Object.keys(safeDraftAnswers || {}).length > 0 || draft.timeLeft !== serverTimeLeft) {
                        dirtyRef.current = true;
                    }
                } else {
                    questionElapsedMsRef.current = Object.fromEntries(
                        Object.entries(serverAnswerMeta).map(([questionId, meta]) => [
                            questionId,
                            Math.max(0, Math.round(Number(meta?.elapsedSeconds || 0) * 1000)),
                        ])
                    );

                    setAnswers(serverAnswers);
                    answersRef.current = serverAnswers;
                    setAnswerMeta(serverAnswerMeta);
                    answerMetaRef.current = serverAnswerMeta;

                    setFlagged({});
                    flaggedRef.current = {};

                    setCurrentIndex(serverCurrentIndex ?? getResumeIndex(normalizedExam.questions, serverAnswers));

                    const safeTimeLeft = Math.max(0, serverTimeLeft);
                    setTimeLeft(safeTimeLeft);
                    timeLeftRef.current = safeTimeLeft;
                }
            } catch (requestError: unknown) {
                const apiError = requestError as ApiErrorLike;
                const message = apiError?.response?.data?.message || 'Unable to start or resume this exam right now.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchAttempt();
    }, [clearExamStarted, computeRemainingFromEndsAt, getResumeIndex, hasReviewedInstructions, id, isOffline, markExamStarted, navigate, normalizeQuestions, preflightTabSwitchGraceSeconds, readDraft, sanitizeAnswerMeta, sanitizeAnswersMap, sanitizeFlagged]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        answerMetaRef.current = answerMeta;
    }, [answerMeta]);

    useEffect(() => {
        flaggedRef.current = flagged;
    }, [flagged]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (!attemptId || !draftKey || !exam) return;

        flushActiveQuestionTime();

        writeDraft({
            attemptId,
            answers,
            flagged,
            answerMeta,
            questionElapsedMs: questionElapsedMsRef.current,
            currentIndex,
            timeLeft,
            updatedAt: Date.now(),
        });
    }, [attemptId, answerMeta, answers, currentIndex, draftKey, exam, flagged, flushActiveQuestionTime, timeLeft, writeDraft]);

    useEffect(() => {
        if (!exam || loading || isSubmitting) return;

        const timer = setInterval(() => {
            const derivedRemaining = computeRemainingFromEndsAt(endsAtMsRef.current);
            if (typeof derivedRemaining === 'number') {
                setTimeLeft(derivedRemaining);
                return;
            }

            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [computeRemainingFromEndsAt, exam, loading, isSubmitting]);

    useEffect(() => {
        if (!attemptId || !exam || loading) return;

        const autosaveInterval = window.setInterval(() => {
            saveAttempt(false);
        }, 15000);

        return () => window.clearInterval(autosaveInterval);
    }, [attemptId, exam, loading, saveAttempt]);

    useEffect(() => {
        const handleOnline = () => {
            saveAttempt(true);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushActiveQuestionTime();
                isDocumentVisibleRef.current = false;
                activeQuestionStartedAtRef.current = null;

                if (enforceExamSingleTab) {
                    startTabViolationCountdown();
                    return;
                }

                saveAttempt(true);
            } else {
                isDocumentVisibleRef.current = true;
                activeQuestionStartedAtRef.current = Date.now();

                const deadlineMs = tabViolationDeadlineMsRef.current;
                if (enforceExamSingleTab && deadlineMs) {
                    if (Date.now() >= deadlineMs) {
                        void handleTabViolationReset();
                        return;
                    }

                    stopTabViolationCountdown();
                }
            }
        };

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!attemptId || !exam) return;
            writeDraft({
                attemptId,
                answers: answersRef.current,
                flagged: flaggedRef.current,
                answerMeta: answerMetaRef.current,
                questionElapsedMs: questionElapsedMsRef.current,
                currentIndex,
                timeLeft: timeLeftRef.current,
                updatedAt: Date.now(),
            });

            if (!allowNavigationRef.current && shouldWarnOnLeave) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [attemptId, currentIndex, enforceExamSingleTab, exam, flushActiveQuestionTime, handleTabViolationReset, saveAttempt, shouldWarnOnLeave, startTabViolationCountdown, stopTabViolationCountdown, writeDraft]);

    const handleFinish = useCallback(async (autoSubmitted = false) => {
        if (!attemptId || !exam || isSubmitting || submitInFlightRef.current) return;

        submitInFlightRef.current = true;
        flushActiveQuestionTime();

        if (!navigator.onLine && !autoSubmitted) {
            submitInFlightRef.current = false;
            toast.warning('You are offline. Reconnect first to submit. Your progress is saved locally.');
            setSaveStatus('pending');
            return;
        }

        try {
            setIsSubmitting(true);
            const safeAnswers = sanitizeAnswersMap(answersRef.current, exam.questions || []);

            await api.put(`/attempts/${attemptId}`, {
                answers: safeAnswers,
                answerMeta: sanitizeAnswerMeta(answerMetaRef.current, questionElapsedMsRef.current, exam.questions || [], safeAnswers, flaggedRef.current),
                currentQuestionIndex: currentIndex,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                autoSubmitted,
                remainingSeconds: Math.max(0, timeLeftRef.current),
            }, {
                // tz: client's UTC offset in minutes (e.g. -480 for UTC+8). The
                // server uses it to record the streak on the user's local date.
                params: { tz: new Date().getTimezoneOffset() },
            });

            submittedThisSessionRef.current = true;
            clearDraft();
            clearExamStarted();
            allowNavigationRef.current = true;
            refetchStreak();
            navigate(`/exams/${exam.id}/result?attemptId=${attemptId}`, { state: { justSubmitted: submittedThisSessionRef.current } });
        } catch (submitError: unknown) {
            const apiError = submitError as ApiErrorLike;
            const message = apiError?.response?.data?.message || 'Failed to submit exam. Your progress remains saved.';
            toast.error(message);
            setSaveStatus('error');
        } finally {
            setIsSubmitting(false);
            submitInFlightRef.current = false;
        }
    }, [attemptId, clearDraft, clearExamStarted, currentIndex, exam, flushActiveQuestionTime, getTimeSpent, isSubmitting, navigate, refetchStreak, sanitizeAnswerMeta, sanitizeAnswersMap]);

    useEffect(() => {
        if (!exam || loading || isSubmitting) return;
        if (timeLeft > 0) return;

        // Deferred so the state update happens outside the effect body itself.
        void Promise.resolve().then(() => void handleFinish(true));
    }, [exam, handleFinish, isSubmitting, loading, timeLeft]);

    const sectionGroups = useMemo<SectionGroup[]>(() => {
        const buckets = new Map<string, SectionGroup>();
        const questions = exam?.questions || [];

        questions.forEach((question, index) => {
            const sectionName = question.section?.trim() || 'Main section';
            if (!buckets.has(sectionName)) {
                buckets.set(sectionName, {
                    name: sectionName,
                    questionIndexes: [],
                    total: 0,
                    answered: 0,
                    firstIndex: index,
                    lastIndex: index,
                    isComplete: false,
                });
            }

            const bucket = buckets.get(sectionName)!;
            bucket.questionIndexes.push(index);
            bucket.total += 1;
            bucket.lastIndex = index;
            if (answers[question.id]) {
                bucket.answered += 1;
            }
        });

        return Array.from(buckets.values()).map((bucket) => ({
            ...bucket,
            isComplete: bucket.total > 0 && bucket.answered === bucket.total,
        }));
    }, [answers, exam?.questions]);

    const currentSectionIndex = useMemo(() => {
        const index = sectionGroups.findIndex((section) => section.questionIndexes.includes(currentIndex));
        return index >= 0 ? index : 0;
    }, [currentIndex, sectionGroups]);

    const currentSection = sectionGroups[currentSectionIndex] || null;
    const currentSectionQuestionPosition = (currentSection?.questionIndexes || []).indexOf(currentIndex);

    const currentQuestionId = useMemo(() => {
        return exam?.questions?.[currentIndex]?.id || null;
    }, [exam?.questions, currentIndex]);

    useEffect(() => {
        if (!attemptId || !exam || loading || isSubmitting) return;

        dirtyRef.current = true;
        void Promise.resolve().then(() => {
            setSaveStatus((previous) => (previous === 'saving' ? previous : 'pending'));
        });
    }, [attemptId, currentIndex, exam, isSubmitting, loading]);

    useEffect(() => {
        if (!attemptId || !exam || loading || isSubmitting || !currentQuestionId) return;

        flushActiveQuestionTime();
        activeQuestionIdRef.current = currentQuestionId;

        void Promise.resolve().then(() => {
            setAnswerMeta((prev) => {
                if (prev[currentQuestionId]?.viewedAt) {
                    return prev;
                }

                return {
                    ...prev,
                    [currentQuestionId]: {
                        ...prev[currentQuestionId],
                        viewedAt: new Date().toISOString(),
                    },
                };
            });
        });

        if (isDocumentVisibleRef.current) {
            activeQuestionStartedAtRef.current = Date.now();
        }
    }, [attemptId, currentQuestionId, exam, flushActiveQuestionTime, isSubmitting, loading]);

    // --- Data derived for the composed exam layout ---
    const questionIndexById = useMemo(() => {
        const map = new Map<string, number>();
        (exam?.questions || []).forEach((question, index) => map.set(question.id, index));
        return map;
    }, [exam?.questions]);

    const layoutSections = useMemo<SectionTab[]>(() => (
        sectionGroups.map((group) => ({ name: group.name, answered: group.answered, total: group.total }))
    ), [sectionGroups]);

    const layoutQuestions = useMemo<QuestionStatus[]>(() => {
        const questions = exam?.questions || [];
        return questions.map((question) => {
            let status: QuestionStatus['status'] = 'open';
            if (question.id === currentQuestionId) {
                status = 'current';
            } else if (flagged[question.id]) {
                status = 'flagged';
            } else if (answers[question.id]) {
                status = 'answered';
            }
            return {
                id: question.id,
                orderNo: question.orderNo,
                section: question.section?.trim() || 'Main section',
                status,
            };
        });
    }, [answers, currentQuestionId, exam?.questions, flagged]);

    const reviewQuestions = useMemo(() => {
        const questions = exam?.questions || [];
        return questions.map((question) => ({
            id: question.id,
            orderNo: question.orderNo,
            section: question.section?.trim() || 'Main section',
            isAnswered: Boolean(answers[question.id]),
            isFlagged: Boolean(flagged[question.id]),
        }));
    }, [answers, exam?.questions, flagged]);

    const skippedQuestions = useMemo(() => {
        const questions = exam?.questions || [];
        return questions
            .map((q, idx) => ({ q, idx }))
            .filter(({ q }) => !answers[q.id]);
    }, [answers, exam?.questions]);

    const allQuestionsAnswered = useMemo(() => {
        const questions = exam?.questions || [];
        return questions.length > 0 && questions.every((question) => Boolean(answers[question.id]));
    }, [answers, exam?.questions]);

    const answeredCount = useMemo(() => {
        const questions = exam?.questions || [];
        return questions.filter((question) => Boolean(answers[question.id])).length;
    }, [answers, exam?.questions]);

    const unansweredNumbers = useMemo(() => skippedQuestions.map(({ q }) => q.orderNo), [skippedQuestions]);

    const totalQuestionCount = exam?.questions?.length ?? 0;
    const isFirstQuestion = currentIndex <= 0;
    const isLastQuestion = totalQuestionCount > 0 && currentIndex >= totalQuestionCount - 1;

    // --- Handlers shared by the composed components ---
    const handleQuestionClick = useCallback((questionId: string) => {
        const index = questionIndexById.get(questionId);
        if (typeof index === 'number') setCurrentIndex(index);
    }, [questionIndexById]);

    const handleSectionChange = useCallback((sectionName: string) => {
        const section = sectionGroups.find((group) => group.name === sectionName);
        if (section) setCurrentIndex(section.firstIndex);
    }, [sectionGroups]);

    const handleStartExam = useCallback(() => {
        markExamStarted();
        setHasReviewedInstructions(true);
    }, [markExamStarted]);

    const handlePreviousQuestion = useCallback(() => {
        setCurrentIndex((previousIndex) => Math.max(0, previousIndex - 1));
    }, []);

    const handleSubmitClick = useCallback(() => {
        if (!exam || !attemptId) return;

        if (!allQuestionsAnswered) {
            const nextSkippedIndex = skippedQuestions[0]?.idx ?? currentIndex;
            setCurrentIndex(nextSkippedIndex);
            toast.warning('Answer all questions before submitting.');
            return;
        }

        setShowConfirm(true);
    }, [allQuestionsAnswered, attemptId, currentIndex, exam, skippedQuestions]);

    const handleNextQuestion = useCallback(() => {
        if (!exam) return;

        if (!isLastQuestion) {
            setCurrentIndex((previousIndex) => Math.min(exam.questions.length - 1, previousIndex + 1));
            return;
        }

        handleSubmitClick();
    }, [exam, handleSubmitClick, isLastQuestion]);

    const handleOptionSelect = useCallback((optionIndex: number) => {
        if (!exam || !attemptId || !currentQuestionId) return;

        const selectedChoice = CHOICE_LABELS[optionIndex] || 'A';
        const questionId = currentQuestionId;
        setAnswers((prev) => ({
            ...prev,
            [questionId]: selectedChoice,
        }));
        setAnswerMeta((prev) => {
            const previousChoice = answersRef.current[questionId];
            if (previousChoice === selectedChoice && prev[questionId]?.answeredAt) {
                return prev;
            }

            return {
                ...prev,
                [questionId]: {
                    viewedAt: prev[questionId]?.viewedAt || new Date().toISOString(),
                    answeredAt: new Date().toISOString(),
                },
            };
        });
        dirtyRef.current = true;
        setSaveStatus('pending');
    }, [attemptId, currentQuestionId, exam]);

    const handleToggleFlag = useCallback(() => {
        if (!exam || !attemptId || !currentQuestionId) return;

        const questionId = currentQuestionId;
        setFlagged((prev) => {
            const next = { ...prev };
            if (next[questionId]) {
                delete next[questionId];
            } else {
                next[questionId] = true;
            }
            return next;
        });
        dirtyRef.current = true;
        setSaveStatus('pending');
    }, [attemptId, currentQuestionId, exam]);

    const handleTimeUp = useCallback(() => {
        void handleFinish(true);
    }, [handleFinish]);

    const keyboardEnabled = Boolean(
        hasReviewedInstructions &&
        attemptId &&
        exam &&
        !loading &&
        !isSubmitting &&
        !showReview &&
        !showConfirm &&
        totalQuestionCount > 0
    );

    useExamKeyboardShortcuts({
        onNext: handleNextQuestion,
        onPrevious: handlePreviousQuestion,
        onFlag: handleToggleFlag,
        onSelectChoice: handleOptionSelect,
    }, keyboardEnabled);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOffline) {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Offline</p>
                        <h1 className="mt-1 text-lg font-semibold text-slate-900">Exams require an internet connection</h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                            You are currently offline. Reconnect to the internet before starting or resuming an exam.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/exams')}
                            className="w-full sm:w-auto"
                        >
                            Back to Exams
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full sm:w-auto"
                        >
                            <WifiOff size={14} className="mr-1.5" /> Retry Connection
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasReviewedInstructions) {
        return (
            <div className="flex min-h-full flex-col bg-slate-50">
                <ExamInstructions
                    examTitle={preflightExamInfo?.title ?? ''}
                    subject={preflightExamInfo?.subject ?? ''}
                    totalQuestions={preflightExamInfo?.totalQuestions ?? 0}
                    timeLimitMinutes={preflightExamInfo?.timeLimit ?? 0}
                    enforceSingleTab={preflightSingleTabEnabled}
                    tabSwitchGraceSeconds={preflightTabSwitchGraceSeconds}
                    isOnline={isOnline}
                    onStart={handleStartExam}
                    isLoading={preflightLoading}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6 md:p-8" data-testid="take-exam-skeleton">
                <div className="mx-auto max-w-4xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-44" />
                            <Skeleton className="h-3 w-64" />
                        </div>
                        <Skeleton className="h-9 w-28 rounded-lg" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <div className="flex min-h-[28vh] items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <Skeleton className="h-11 w-28 rounded-xl" />
                        <Skeleton className="h-11 w-28 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !exam || !attemptId) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-red-600 font-semibold">{error || 'Unable to load exam attempt.'}</p>
                <Button onClick={() => navigate('/exams')} variant="outline">Back to Exams</Button>
            </div>
        );
    }

    if (!exam.questions || exam.questions.length === 0) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-amber-700 font-semibold">This exam has no available questions yet.</p>
                <Button onClick={() => navigate('/exams')} variant="outline">Back to Exams</Button>
            </div>
        );
    }

    const currentQuestion = exam.questions[currentIndex] || { id: '', orderNo: 0, text: '', choices: [], section: '' };
    const isFlagged = Boolean(flagged[currentQuestion.id]);
    const currentSectionName = currentSection?.name || currentQuestion.section?.trim() || 'Main section';
    const currentSectionAnsweredCount = currentSection?.answered || 0;
    const currentSectionTotal = currentSection?.total || 1;
    // The composed layout expects a concrete (non-null) question id; the page
    // only reaches this render when questions exist, so falling back to '' is
    // a pure type narrowing — an empty id simply never matches a question.
    const layoutCurrentQuestionId = currentQuestionId ?? '';
    const mobileGridQuestions = layoutQuestions.filter((question) => question.section === currentSectionName);

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50">
            {/* Mobile-only section tabs (kept above the scroll container) */}
            <MobileSectionTabs
                sections={layoutSections}
                activeSection={currentSectionName}
                onSectionChange={handleSectionChange}
            />

            <div className="min-h-0 flex-1">
                <ExamLayout
                    sections={layoutSections}
                    questions={layoutQuestions}
                    currentQuestionId={layoutCurrentQuestionId}
                    activeSection={currentSectionName}
                    onSectionChange={handleSectionChange}
                    onQuestionClick={handleQuestionClick}
                    header={
                        <TimerHeader
                            endsAt={endsAt ?? ''}
                            examTitle={exam.title}
                            subject={exam.subject}
                            sectionLabel={`${currentSectionName} (${currentSectionAnsweredCount}/${currentSectionTotal})`}
                            saveStatus={saveStatus}
                            isOnline={isOnline}
                            onTimeUp={handleTimeUp}
                        >
                            <KeyboardShortcutsHelp enabled={keyboardEnabled} />
                            <FocusModeToggle isFocusMode={isFocusMode} onToggleFocusMode={onToggleFocusMode} />
                        </TimerHeader>
                    }
                >
                    {timeLeft > 0 && timeLeft <= 60 && (
                        <div
                            role="alert"
                            className="sticky top-0 z-10 flex shrink-0 items-center justify-center gap-2 border-b border-amber-200 bg-amber-100 px-3 py-2 shadow-sm sm:px-5"
                        >
                            <AlertTriangle size={14} className="shrink-0 text-amber-800" />
                            <p className="text-center text-xs font-semibold text-amber-800 sm:text-sm">
                                Auto-submit in {timeLeft}s
                            </p>
                        </div>
                    )}

                    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-3 sm:p-4 md:p-6">
                        {/* Question & Image - Flex 1 allows it to take available space */}
                        <div data-guide="exam-take-question" className="mb-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-1 sm:mb-4 sm:gap-4 sm:py-2">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                                    <CircleDot size={12} />
                                    {currentSectionName}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                                    Section question {Math.max(currentSectionQuestionPosition + 1, 1)} of {currentSectionTotal}
                                </span>
                            </div>
                            <div className="flex max-h-[36vh] w-full items-center justify-center overflow-y-auto px-1 sm:max-h-[40vh] sm:px-2">
                                <h3 className="text-center text-lg font-semibold leading-tight text-slate-900 sm:text-xl md:text-3xl">
                                    {currentQuestion.text}
                                </h3>
                            </div>

                            {currentQuestion.imageUrl && (
                                <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                                    <div className="inline-flex max-h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                                        <img
                                            src={currentQuestion.imageUrl}
                                            alt="Question attachment"
                                            className="h-full max-h-[26vh] w-auto rounded-lg object-contain sm:max-h-[30vh]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Choices Grid - Fixed relative height */}
                        <div data-guide="exam-take-choices" className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                            {(currentQuestion.choices || []).map((option, idx) => {
                                const optionLabel = CHOICE_LABELS[idx] || 'A';
                                const isSelected = answers[currentQuestion.id] === optionLabel;
                                const hasAnswer = Boolean(answers[currentQuestion.id]);
                                const label = String.fromCharCode(65 + idx);

                                const pastelThemes = [
                                    { bg: 'bg-rose-50', hover: 'hover:bg-rose-100', border: 'border-rose-200', text: 'text-rose-950', iconBg: 'bg-rose-100', iconText: 'text-rose-700', activeRing: 'ring-rose-400' },
                                    { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-950', iconBg: 'bg-blue-100', iconText: 'text-blue-700', activeRing: 'ring-blue-400' },
                                    { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', border: 'border-amber-200', text: 'text-amber-950', iconBg: 'bg-amber-100', iconText: 'text-amber-700', activeRing: 'ring-amber-400' },
                                    { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-950', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700', activeRing: 'ring-emerald-400' },
                                ];
                                const theme = pastelThemes[idx % pastelThemes.length];

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(idx)}
                                        className={`group relative flex min-h-18.5 items-center justify-start rounded-xl border-2 p-3 text-left transition-all duration-150 active:translate-y-0.5 sm:min-h-20 md:min-h-25 md:p-4 ${
                                            isSelected
                                                ? `z-10 scale-[1.01] ring-2 ring-offset-2 ${theme.activeRing} ${theme.bg} ${theme.border}`
                                                : `shadow-sm ${theme.bg} ${theme.border} ${theme.hover}`
                                        } ${hasAnswer && !isSelected ? 'opacity-50 grayscale-40' : 'opacity-100'} ${theme.text}`}
                                    >
                                        <div className={`mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors md:mr-4 md:h-10 md:w-10 md:text-base ${theme.iconBg} ${theme.iconText}`}>
                                            {label}
                                        </div>
                                        <span className="wrap-break-word flex-1 text-[13px] font-semibold leading-snug sm:text-sm md:text-base">
                                            {option}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Flag for review */}
                        <div className="mt-2 flex shrink-0 justify-start sm:mt-3">
                            <button
                                type="button"
                                onClick={handleToggleFlag}
                                aria-pressed={isFlagged}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    isFlagged
                                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                        : 'border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <Flag size={14} fill={isFlagged ? 'currentColor' : 'none'} />
                                {isFlagged ? 'Unflag' : 'Flag for review'}
                            </button>
                        </div>

                        {/* Navigation Footer */}
                        <div data-guide="exam-take-question-nav" className="sticky bottom-0 mt-3 hidden shrink-0 border-t border-slate-200 bg-slate-50/95 pt-3 backdrop-blur supports-backdrop-filter:bg-slate-50/85 sm:mt-4 sm:pt-4 lg:block">
                            <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handlePreviousQuestion}
                                    disabled={isFirstQuestion}
                                    className="h-10 gap-1.5 rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </Button>

                                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                                    {!answers[currentQuestion.id] && (
                                        <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:block">Not answered</span>
                                    )}
                                    {isLastQuestion ? (
                                        <Button
                                            size="lg"
                                            onClick={handleSubmitClick}
                                            disabled={isSubmitting}
                                            className="h-10 gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 sm:h-11 sm:gap-2 sm:px-6 sm:text-sm"
                                        >
                                            Submit Exam <Send size={16} />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="lg"
                                            onClick={handleNextQuestion}
                                            className="h-10 gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 sm:h-11 sm:gap-2 sm:px-6 sm:text-sm"
                                        >
                                            Next <ArrowRight size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ExamLayout>
            </div>

            {/* Mobile pieces: bottom Prev/Flag/Next bar + question-grid bottom sheet */}
            <MobileBottomNav
                onPrev={handlePreviousQuestion}
                onNext={handleNextQuestion}
                hasPrev={!isFirstQuestion}
                hasNext={!isLastQuestion}
                isFlagged={isFlagged}
                onToggleFlag={handleToggleFlag}
            />
            <QuestionGridSheet
                sections={layoutSections}
                activeSection={currentSectionName}
                onSectionChange={handleSectionChange}
                questions={mobileGridQuestions}
                currentQuestionId={layoutCurrentQuestionId}
                onQuestionClick={handleQuestionClick}
            />

            <Dialog
                open={showLeaveConfirm}
                onOpenChange={(open) => {
                    if (!open) {
                        pendingNavigationPathRef.current = null;
                        pendingNavigationTypeRef.current = null;
                    }
                    setShowLeaveConfirm(open);
                }}
            >
                <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
                        <DialogTitle className="text-sm font-semibold text-slate-900">Leave this exam?</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-1">
                            You have an exam in progress. If you leave, your work may be interrupted.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="px-5 pb-5 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                pendingNavigationPathRef.current = null;
                                pendingNavigationTypeRef.current = null;
                                setShowLeaveConfirm(false);
                            }}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg border-slate-200"
                        >
                            Stay on Exam
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                allowNavigationRef.current = true;
                                setShowLeaveConfirm(false);
                                const pendingPath = pendingNavigationPathRef.current;
                                const pendingType = pendingNavigationTypeRef.current;
                                pendingNavigationPathRef.current = null;
                                pendingNavigationTypeRef.current = null;

                                if (pendingType === 'history') {
                                    window.history.back();
                                } else if (pendingPath) {
                                    navigate(pendingPath);
                                }
                            }}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        >
                            Leave Page
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SubmitConfirmDialog
                open={showConfirm}
                totalQuestions={exam.questions.length}
                answeredCount={answeredCount}
                unansweredNumbers={unansweredNumbers}
                onSubmit={() => {
                    setShowConfirm(false);
                    void handleFinish(false);
                }}
                onReview={() => {
                    setShowConfirm(false);
                    setShowReview(true);
                }}
                isSubmitting={isSubmitting}
            />

            {showReview && (
                <ItemReviewScreen
                    questions={reviewQuestions}
                    onQuestionClick={(questionId) => {
                        setShowReview(false);
                        handleQuestionClick(questionId);
                    }}
                    onBackToExam={() => setShowReview(false)}
                    onSubmit={() => {
                        setShowReview(false);
                        void handleFinish(false);
                    }}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
};

export default TakeExamPage;
