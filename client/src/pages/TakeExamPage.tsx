import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Timer,
    ArrowLeft,
    ArrowRight,
    Send,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { toast } from 'sonner';

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
    answerMeta?: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>;
    questionElapsedMs?: Record<string, number>;
    currentIndex: number;
    timeLeft: number;
    updatedAt: number;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

const TakeExamPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<Exam | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [answerMeta, setAnswerMeta] = useState<Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'pending' | 'error'>('idle');
    const [showConfirm, setShowConfirm] = useState(false);
    const [enforceExamSingleTab, setEnforceExamSingleTab] = useState(false);
    const [hasReviewedInstructions, setHasReviewedInstructions] = useState(false);
    const [preflightSingleTabEnabled, setPreflightSingleTabEnabled] = useState(false);
    const [tabSwitchGraceSeconds, setTabSwitchGraceSeconds] = useState(5);
    const [preflightTabSwitchGraceSeconds, setPreflightTabSwitchGraceSeconds] = useState(5);
    const [preflightLoading, setPreflightLoading] = useState(true);

    const answersRef = useRef<Record<string, string>>({});
    const answerMetaRef = useRef<Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>>({});
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

    const draftKey = useMemo(() => (id ? `exam-draft:${id}` : ''), [id]);

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
    ) => {
        const validQuestionIds = new Set((questions || []).map((question) => question.id));
        const safeMeta: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }> = {};
        const trackedQuestionIds = new Set<string>([
            ...Object.keys(safeAnswers || {}),
            ...Object.keys(rawMeta || {}),
        ]);

        for (const questionId of trackedQuestionIds) {
            if (!validQuestionIds.has(questionId)) continue;

            const selectedChoice = safeAnswers?.[questionId];
            const isAnswered = CHOICE_LABELS.includes(String(selectedChoice || '').trim().toUpperCase());

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

            if (!isAnswered && !viewedAt && elapsedSeconds <= 0) {
                continue;
            }

            safeMeta[questionId] = {
                viewedAt,
                answeredAt,
                elapsedSeconds,
            };
        }

        return safeMeta;
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

    const normalizeQuestions = useCallback((rawQuestions: any[] = []): Question[] => {
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
                    choices: normalizedChoices.map((choice: string) => String(choice ?? '')),
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
            setPreflightLoading(true);
            try {
                const response = await api.get('/settings/system');
                setPreflightSingleTabEnabled(Boolean(response.data?.data?.enforceExamSingleTab));
                setPreflightTabSwitchGraceSeconds(Math.max(1, Math.min(30, Math.round(Number(response.data?.data?.tabSwitchGraceSeconds || 5)))));
            } catch {
                setPreflightSingleTabEnabled(false);
                setPreflightTabSwitchGraceSeconds(5);
            } finally {
                setPreflightLoading(false);
            }
        };

        void loadPreflightSettings();
    }, []);

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
                answerMeta: sanitizeAnswerMeta(answerMetaRef.current, questionElapsedMsRef.current, exam.questions || [], safeAnswers),
                currentQuestionIndex: currentIndex,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                remainingSeconds: Math.max(0, timeLeftRef.current),
            });

            const saved = response.data?.data as AttemptStartResponse | undefined;
            if (saved?.endsAt) {
                const parsedEndsAtMs = new Date(saved.endsAt).getTime();
                if (Number.isFinite(parsedEndsAtMs)) {
                    endsAtMsRef.current = parsedEndsAtMs;
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

            setCurrentIndex(0);

            const resetTimeLeft = Math.max(0, payload.remainingSeconds ?? exam.timeLimit * 60);
            setTimeLeft(resetTimeLeft);
            timeLeftRef.current = resetTimeLeft;

            toast.error('Tab switch detected. Your attempt was reset and all answers were cleared.');
        } catch {
            toast.error('Tab switch detected, but reset failed. Return to Exams and retry.');
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
                    navigate(`/exams/${id}/result?attemptId=${payload.id}`, { replace: true });
                    return;
                }

                let normalizedQuestions = normalizeQuestions((payload as any)?.exam?.questions || []);

                if (normalizedQuestions.length === 0) {
                    const examTakeResponse = await api.get(`/exams/${id}/take`);
                    const examTakePayload = examTakeResponse.data.data as ExamTakeResponse;
                    normalizedQuestions = normalizeQuestions(examTakePayload.questions || []);
                }

                const normalizedExam: Exam = {
                    ...payload.exam,
                    questions: normalizedQuestions,
                };

                const serverAnswers = sanitizeAnswersMap(payload.answers || {}, normalizedQuestions);
                const serverAnswerMeta = sanitizeAnswerMeta(payload.answerMeta || {}, {}, normalizedQuestions, serverAnswers);
                const parsedEndsAtMs = payload.endsAt ? new Date(payload.endsAt).getTime() : null;
                endsAtMsRef.current = Number.isFinite(parsedEndsAtMs) ? parsedEndsAtMs : null;
                const computedFromEndsAt = computeRemainingFromEndsAt(endsAtMsRef.current);
                const serverTimeLeft = computedFromEndsAt ?? payload.remainingSeconds ?? normalizedExam.timeLimit * 60;
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

                    setCurrentIndex(serverCurrentIndex ?? getResumeIndex(normalizedExam.questions, serverAnswers));

                    const safeTimeLeft = Math.max(0, serverTimeLeft);
                    setTimeLeft(safeTimeLeft);
                    timeLeftRef.current = safeTimeLeft;
                }
            } catch (requestError: any) {
                const message = requestError?.response?.data?.message || 'Unable to start or resume this exam right now.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchAttempt();
    }, [computeRemainingFromEndsAt, getResumeIndex, hasReviewedInstructions, id, navigate, normalizeQuestions, preflightTabSwitchGraceSeconds, readDraft, sanitizeAnswerMeta, sanitizeAnswersMap]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        answerMetaRef.current = answerMeta;
    }, [answerMeta]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (!attemptId || !draftKey || !exam) return;

        flushActiveQuestionTime();

        writeDraft({
            attemptId,
            answers,
            answerMeta,
            questionElapsedMs: questionElapsedMsRef.current,
            currentIndex,
            timeLeft,
            updatedAt: Date.now(),
        });
    }, [attemptId, answerMeta, answers, currentIndex, draftKey, exam, flushActiveQuestionTime, timeLeft, writeDraft]);

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

        const handleBeforeUnload = () => {
            if (!attemptId || !exam) return;
            writeDraft({
                attemptId,
                answers: answersRef.current,
                answerMeta: answerMetaRef.current,
                questionElapsedMs: questionElapsedMsRef.current,
                currentIndex,
                timeLeft: timeLeftRef.current,
                updatedAt: Date.now(),
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [attemptId, currentIndex, enforceExamSingleTab, exam, flushActiveQuestionTime, handleTabViolationReset, saveAttempt, startTabViolationCountdown, stopTabViolationCountdown, writeDraft]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleFinish = useCallback(async (autoSubmitted = false) => {
        if (!attemptId || !exam || isSubmitting) return;

        flushActiveQuestionTime();

        if (!navigator.onLine && !autoSubmitted) {
            toast.warning('You are offline. Reconnect first to submit. Your progress is saved locally.');
            setSaveStatus('pending');
            return;
        }

        try {
            setIsSubmitting(true);
            const safeAnswers = sanitizeAnswersMap(answersRef.current, exam.questions || []);

            await api.put(`/attempts/${attemptId}`, {
                answers: safeAnswers,
                answerMeta: sanitizeAnswerMeta(answerMetaRef.current, questionElapsedMsRef.current, exam.questions || [], safeAnswers),
                currentQuestionIndex: currentIndex,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                autoSubmitted,
                remainingSeconds: Math.max(0, timeLeftRef.current),
            });

            clearDraft();
            navigate(`/exams/${exam.id}/result?attemptId=${attemptId}`);
        } catch (submitError: any) {
            const message = submitError?.response?.data?.message || 'Failed to submit exam. Your progress remains saved.';
            toast.error(message);
            setSaveStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, clearDraft, currentIndex, exam, flushActiveQuestionTime, getTimeSpent, isSubmitting, navigate, sanitizeAnswerMeta, sanitizeAnswersMap]);

    useEffect(() => {
        if (!exam || loading || isSubmitting) return;
        if (timeLeft > 0) return;

        const submitAuto = async () => {
            await handleFinish(true);
        };

        submitAuto();
    }, [exam, handleFinish, isSubmitting, loading, timeLeft]);

    const sectionProgress = useMemo(() => {
        const buckets = new Map<string, { name: string; total: number; answered: number }>();
        const questions = exam?.questions || [];

        const effectiveSectionNames = Array.from(new Set(
            questions
                .map((question) => question.section?.trim() || '')
                .filter(Boolean)
        ));

        if (effectiveSectionNames.length <= 1) {
            return [];
        }

        for (const question of questions) {
            const sectionName = question.section?.trim() || '';
            if (!sectionName) {
                continue;
            }
            if (!buckets.has(sectionName)) {
                buckets.set(sectionName, {
                    name: sectionName,
                    total: 0,
                    answered: 0,
                });
            }

            const bucket = buckets.get(sectionName)!;
            bucket.total += 1;
            if (answers[question.id]) {
                bucket.answered += 1;
            }
        }

        return Array.from(buckets.values());
    }, [answers, exam?.questions]);

    const questionNumberById = useMemo(() => {
        return new Map((exam?.questions || []).map((question, index) => [question.id, index + 1]));
    }, [exam?.questions]);

    const currentQuestionId = useMemo(() => {
        return exam?.questions?.[currentIndex]?.id || null;
    }, [exam?.questions, currentIndex]);

    useEffect(() => {
        if (!attemptId || !exam || loading || isSubmitting) return;

        dirtyRef.current = true;
        setSaveStatus((previous) => (previous === 'saving' ? previous : 'pending'));
    }, [attemptId, currentIndex, exam, isSubmitting, loading]);

    useEffect(() => {
        if (!attemptId || !exam || loading || isSubmitting || !currentQuestionId) return;

        flushActiveQuestionTime();
        activeQuestionIdRef.current = currentQuestionId;

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

        if (isDocumentVisibleRef.current) {
            activeQuestionStartedAtRef.current = Date.now();
        }
    }, [attemptId, currentQuestionId, exam, flushActiveQuestionTime, isSubmitting, loading]);

    if (!hasReviewedInstructions) {
        return (
            <div className="p-6 md:p-8">
                <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Exam Instructions</p>
                        <h1 className="text-2xl font-black text-gray-900 mt-1">Are You Ready to Start?</h1>
                        <p className="text-sm text-gray-500 font-medium mt-2">
                            Read these reminders before continuing. Your timer starts once you click <strong>Start Exam</strong>.
                        </p>
                    </div>

                    <div className="p-6 space-y-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <p className="text-sm font-semibold text-gray-800">1. Make sure your internet connection is stable.</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <p className="text-sm font-semibold text-gray-800">2. Do not close or refresh this page while taking the exam.</p>
                        </div>
                        <div className={`rounded-xl border px-4 py-3 ${preflightSingleTabEnabled ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className={preflightSingleTabEnabled ? 'text-red-600 mt-0.5' : 'text-amber-600 mt-0.5'} />
                                <div>
                                    <p className={`text-sm font-black ${preflightSingleTabEnabled ? 'text-red-700' : 'text-amber-700'}`}>
                                        Tab-Switch Policy
                                    </p>
                                    {preflightLoading ? (
                                        <p className="text-xs font-medium text-gray-500 mt-1">Checking policy...</p>
                                    ) : preflightSingleTabEnabled ? (
                                        <p className="text-sm font-semibold text-red-700 mt-1">
                                            Switching to another browser tab gives you {preflightTabSwitchGraceSeconds}s to return, then the exam resets to the beginning and voids all your answers.
                                        </p>
                                    ) : (
                                        <p className="text-sm font-semibold text-amber-700 mt-1">
                                            If this policy is enabled by admins, switching to another browser tab only gives a short countdown before resetting your exam and clearing all answers.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60">
                        <Button variant="outline" onClick={() => navigate('/exams')}>
                            Back to Exams
                        </Button>
                        <Button onClick={() => setHasReviewedInstructions(true)}>
                            Start Exam
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="p-6 text-sm text-gray-500">Loading exam attempt...</div>;
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

    const currentQuestionNo = questionNumberById.get(currentQuestion.id) || currentIndex + 1;

    const skippedQuestions = exam.questions
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => !answers[q.id]);

    const handleSubmitClick = () => {
        setShowConfirm(true);
    };

    const handleOptionSelect = (optionIndex: number) => {
        const selectedChoice = CHOICE_LABELS[optionIndex] || 'A';
        const questionId = currentQuestion.id;
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
    };

    const answeredCount = Object.keys(answers).length;
    const isOffline = !navigator.onLine;
    const saveLabel = saveStatus === 'saving'
        ? 'Saving...'
        : saveStatus === 'saved'
            ? 'Saved'
            : saveStatus === 'pending'
                ? 'Pending sync'
                : saveStatus === 'error'
                    ? 'Save failed'
                    : 'Idle';

    const currentSection = currentQuestion.section?.trim() || '';

    return (
        <div className="fixed inset-y-0 right-0 left-54.5 z-50 flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <header data-guide="exam-take-header" className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 truncate leading-tight">{exam.title}</h2>
                        <p className="text-xs text-gray-400 font-medium">{exam.subject}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${isOffline ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-emerald-700 border-emerald-200 bg-emerald-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {isOffline ? 'Offline' : 'Online'}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 hidden sm:block">{saveLabel}</span>
                    <div data-guide="exam-take-timer" className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg">
                        <Timer size={13} className="opacity-70" />
                        <span className="font-mono font-bold text-sm tracking-tight">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Question Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Progress bar row */}
                        <div data-guide="exam-take-progress" className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-400 shrink-0">
                                {currentQuestionNo} / {exam.questions.length}
                            </span>
                            <Progress value={((currentIndex + 1) / exam.questions.length) * 100} className="flex-1 h-1.5" />
                            <span className="text-xs font-semibold text-gray-400 shrink-0">
                                {answeredCount} answered
                            </span>
                        </div>

                        <Card data-guide="exam-take-question" className="border border-gray-200 shadow-sm overflow-hidden rounded-xl bg-white">
                            <CardContent className="p-5">
                                <p className="text-sm md:text-base font-medium text-gray-900 leading-relaxed mb-5">
                                    {currentQuestion.text}
                                </p>

                                {currentQuestion.imageUrl && (
                                    <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                                        <img
                                            src={currentQuestion.imageUrl}
                                            alt="Question attachment"
                                            className="max-h-52 w-auto max-w-full rounded-md border border-gray-100 object-contain bg-white"
                                        />
                                    </div>
                                )}

                                <div data-guide="exam-take-choices" className="grid gap-2">
                                    {(currentQuestion.choices || []).map((option, idx) => {
                                        const optionLabel = CHOICE_LABELS[idx] || 'A';
                                        const isSelected = answers[currentQuestion.id] === optionLabel;
                                        const label = String.fromCharCode(65 + idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                                                    isSelected
                                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                                        : 'border-gray-200 bg-white hover:border-primary/30 hover:bg-gray-50/80'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
                                                }`}>
                                                    {label}
                                                </div>
                                                <span className={`text-sm leading-snug ${
                                                    isSelected ? 'text-gray-900 font-semibold' : 'text-gray-600 font-medium'
                                                }`}>
                                                    {option}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div data-guide="exam-take-question-nav" className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentIndex === 0}
                                        className="h-8 px-3 text-xs font-semibold text-gray-500 gap-1.5 rounded-lg"
                                    >
                                        <ArrowLeft size={13} /> Previous
                                    </Button>

                                    <div className="flex items-center gap-2">
                                        {!answers[currentQuestion.id] && (
                                            <span className="text-[10px] text-gray-400 font-medium">Not answered</span>
                                        )}
                                        {currentIndex === exam.questions.length - 1 ? (
                                            <Button
                                                size="sm"
                                                onClick={handleSubmitClick}
                                                disabled={isSubmitting}
                                                className="h-8 px-4 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5"
                                            >
                                                Submit Exam <Send size={12} />
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => setCurrentIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                                className="h-8 px-4 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5"
                                            >
                                                Next <ArrowRight size={12} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Right Sidebar - Navigator */}
                <aside data-guide="exam-take-navigator" className="w-64 border-l border-gray-200 bg-white flex-col shrink-0 hidden lg:flex">
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">Navigator</span>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {answeredCount}/{exam.questions.length}
                            </span>
                        </div>
                        <div className="mt-1.5">
                            <Progress value={(answeredCount / exam.questions.length) * 100} className="h-1" />
                        </div>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto space-y-5">
                        <div className="grid grid-cols-6 gap-1.5">
                            {exam.questions.map((_, idx) => {
                                const isCurrent = currentIndex === idx;
                                const isAnswered = Boolean(answers[exam.questions[idx].id]);
                                const questionNo = questionNumberById.get(exam.questions[idx].id) || idx + 1;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        title={`Question ${questionNo}`}
                                        className={`h-8 rounded-md text-[11px] font-bold transition-all duration-150 ${
                                            isCurrent
                                                ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                                                : isAnswered
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                                        }`}
                                    >
                                        {questionNo}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />Current</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" />Done</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-200 inline-block" />Skip</span>
                        </div>

                        {sectionProgress.length > 0 && (
                            <div className="pt-3 border-t border-gray-100 space-y-1.5">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] block mb-2">By Section</span>
                                {sectionProgress.map((sectionItem) => {
                                    const isActive = sectionItem.name === currentSection;
                                    return (
                                        <div key={sectionItem.name} className={`rounded-lg px-2.5 py-2 transition-colors ${isActive ? 'bg-primary/5 border border-primary/15' : 'border border-transparent'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                                    <span className={`text-[11px] font-semibold truncate ${isActive ? 'text-primary' : 'text-gray-600'}`}>{sectionItem.name}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold shrink-0 ml-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>{sectionItem.answered}/{sectionItem.total}</span>
                                            </div>
                                            <Progress value={(sectionItem.answered / sectionItem.total) * 100} className="h-1" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <Button
                            data-guide="exam-take-submit-btn"
                            onClick={handleSubmitClick}
                            disabled={isSubmitting}
                            size="sm"
                            className="w-full h-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-xs shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <Send size={12} />
                            Submit Exam
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Submit Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
                        <DialogTitle className="text-sm font-bold text-gray-900">Submit Exam?</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 mt-1">
                            {answeredCount} of {exam.questions.length} questions answered.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-3">
                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
                                <p className="text-lg font-black text-emerald-700">{answeredCount}</p>
                                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Answered</p>
                            </div>
                            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-center">
                                <p className="text-lg font-black text-amber-700">{skippedQuestions.length}</p>
                                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Skipped</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
                                <p className="text-lg font-black text-gray-700">{exam.questions.length}</p>
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                            </div>
                        </div>

                        {skippedQuestions.length > 0 && (
                            <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5">
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide mb-2">Unanswered Questions</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {skippedQuestions.map(({ idx }) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setShowConfirm(false);
                                                setCurrentIndex(idx);
                                            }}
                                            className="w-7 h-7 rounded-md bg-white border border-amber-200 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                                        >
                                            {questionNumberById.get(exam.questions[idx].id) || idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-amber-600 mt-2 font-medium">Click a number to go back to that question.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-5 pb-5 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg border-gray-200"
                        >
                            Go Back
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => { setShowConfirm(false); handleFinish(false); }}
                            disabled={isSubmitting}
                            className="flex-1 h-8 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white gap-1.5"
                        >
                            <Send size={11} /> Confirm Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TakeExamPage;
