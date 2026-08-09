import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ScoreHero from '@/components/exam/ScoreHero';
import SectionBreakdown, { type SectionData } from '@/components/exam/SectionBreakdown';
import QuestionReview, { type ReviewQuestion, type SectionInfo } from '@/components/exam/QuestionReview';
import WhatNextCTAs, { type SectionTier } from '@/components/exam/WhatNextCTAs';
import { getScoreTrend, getTierLabel, type ScoreTrendPoint } from '@/lib/examTheme';
import api from '@/lib/axios';
import { useStreakContext } from '@/contexts/StreakContext';

// ScoreHero fires the confetti overlay internally (tiered by score). The page
// only holds the gates up long enough for the celebration to play, then drops
// them so a later attempt switch can never re-trigger it.
const CONFETTI_HOLD_MS = 4500;

interface AttemptOption {
    id: string;
    attemptNo?: number;
    submittedAt?: string | null;
    percentage?: number | null;
}

interface AttemptListItem extends AttemptOption {
    status?: string;
}

interface ResultStats {
    totalQuestions: number;
    correct: number;
    incorrect: number;
    skipped: number;
    answered: number;
    accuracy: number;
}

interface ResultSection {
    sectionId?: string | null;
    name: string;
    total: number;
    correct: number;
    answered: number;
    incorrect: number;
    skipped: number;
    score: number;
}

interface ResultQuestionDetail {
    id: string;
    orderNo: number;
    section: string;
    questionText: string;
    imageUrl?: string | null;
    choices?: string[];
    userChoice: string | null;
    correctChoice: string | null;
    isCorrect: boolean;
    rationalization?: string | null;
}

interface ExamResultPayload {
    id: string;
    examId: string;
    attemptNo?: number;
    submittedAt?: string | null;
    timeSpentSeconds?: number | null;
    percentage?: number | null;
    exam?: {
        id?: string;
        title?: string;
    };
    stats: ResultStats;
    sections?: ResultSection[];
    questionDetails?: ResultQuestionDetail[];
}

// Internal page shape for a review row, built from either the dedicated review
// payload or a fallback from the result payload's `questionDetails`.
interface ReviewQuestionRow {
    id: string;
    orderNo: number;
    text: string;
    imageUrl?: string | null;
    options: string[];
    userAnswer: string | null;
    correctAnswer: string;
    section: string;
    rationalization: string;
    elapsedSeconds: number | null;
}

interface ReviewQuestionApi {
    id: string;
    orderNo?: number | string | null;
    questionText?: string | null;
    imageUrl?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    section?: string | { title?: string | null } | null;
    rationalization?: string | null;
}

interface ReviewPayload {
    answers?: Record<string, string>;
    answerMeta?: Record<string, { elapsedSeconds?: number | null }>;
    timeSpentSeconds?: number | null;
    exam?: {
        questions?: ReviewQuestionApi[];
    };
}

interface ApiErrorLike {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

const ExamResultPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { refetchStreak } = useStreakContext();
    // Confetti should only fire when arriving straight from a submission,
    // not when revisiting a finished exam's result (ExamsPage, dropdown switches, etc.).
    const justSubmittedRef = useRef(
        Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted)
    );
    // Stable "fresh submission" flag for the whole visit — gates ScoreHero's
    // confetti so revisits stay quiet.
    const [justSubmitted, setJustSubmitted] = useState(
        () => Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted)
    );
    const [showConfetti, setShowConfetti] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(searchParams.get('attemptId'));
    const [submittedAttempts, setSubmittedAttempts] = useState<AttemptOption[]>([]);
    const [result, setResult] = useState<ExamResultPayload | null>(null);
    const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestionRow[]>([]);
    const [previousAttempt, setPreviousAttempt] = useState<{
        attemptNo: number;
        score: number;
        percentage: number;
        submittedAt: string | null;
    } | null>(null);
    const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);

    useEffect(() => {
        const loadAttemptOptions = async () => {
            if (!id) {
                setError('Missing exam id.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const attemptsResponse = await api.get('/attempts', {
                    params: {
                        examId: id,
                        page: 1,
                        limit: 200,
                    },
                });

                const attempts = (attemptsResponse.data.data || []) as AttemptListItem[];
                const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED') as AttemptOption[];

                if (submitted.length === 0) {
                    throw new Error('No submitted result found for this exam yet.');
                }

                setSubmittedAttempts(submitted);

                const queryAttemptId = searchParams.get('attemptId');
                const selected = queryAttemptId && submitted.some((attempt) => attempt.id === queryAttemptId)
                    ? queryAttemptId
                    : submitted[0].id;

                setAttemptId(selected);
                setSearchParams({ attemptId: selected }, { replace: true });
            } catch (requestError: unknown) {
                const apiError = requestError as ApiErrorLike;
                const message = apiError?.response?.data?.message || apiError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        loadAttemptOptions();
    }, [id, searchParams, setSearchParams]);

    useEffect(() => {
        if (id) {
            api.get(`/attempts/previous?examId=${id}&currentAttemptId=${attemptId || ''}`)
                .then((res) => setPreviousAttempt(res.data.data))
                .catch(() => {});
        }
    }, [id, attemptId]);

    useEffect(() => {
        api.get('/settings/system')
            .then((res) => setAllowMultipleAttempts(Boolean(res.data?.data?.allowMultipleAttempts)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchResult = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);
                const resultResponse = await api.get(`/attempts/${attemptId}/result`);
                setResult(resultResponse.data.data);
                if (justSubmittedRef.current) {
                    justSubmittedRef.current = false;
                    setShowConfetti(true);
                    refetchStreak();
                }
            } catch (requestError: unknown) {
                const apiError = requestError as ApiErrorLike;
                const message = apiError?.response?.data?.message || apiError?.message || 'Failed to load exam result.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [attemptId, refetchStreak]);

    // Drop the confetti gates a moment after they fire, so a later attempt
    // switch can never flip the tier gates and re-trigger a celebration.
    useEffect(() => {
        if (!showConfetti) return;
        const resetTimer = window.setTimeout(() => {
            setShowConfetti(false);
            setJustSubmitted(false);
        }, CONFETTI_HOLD_MS);
        return () => window.clearTimeout(resetTimer);
    }, [showConfetti]);

    // Review data is supplementary to the result payload (it adds per-question
    // elapsed timing). A failure here must never take down the whole page.
    useEffect(() => {
        const fetchReview = async () => {
            if (!attemptId) return;

            try {
                setLoading(true);
                setError(null);

                const reviewResponse = await api.get(`/attempts/${attemptId}`);
                const review = reviewResponse.data.data as ReviewPayload;
                const answerMap = (review.answers || {}) as Record<string, string>;
                const answerMeta = (review.answerMeta || {}) as Record<string, { elapsedSeconds?: number | null }>;

                const sortedQuestions = (review.exam?.questions || [])
                    .slice()
                    .sort((first, second) => Number(first.orderNo ?? 0) - Number(second.orderNo ?? 0));

                const parsedQuestions: ReviewQuestionRow[] = sortedQuestions.map((question, index) => {
                    const rawSection = question.section;
                    const sectionName = typeof rawSection === 'string'
                        ? rawSection
                        : rawSection?.title || '';
                    const metadata = answerMeta[question.id] || {};

                    return {
                        id: question.id,
                        orderNo: index + 1,
                        text: question.questionText || '',
                        imageUrl: question.imageUrl || null,
                        options: [question.choiceA, question.choiceB, question.choiceC, question.choiceD].map((choice) => String(choice || '')),
                        userAnswer: answerMap[question.id] || null,
                        correctAnswer: question.correctChoice || '',
                        section: sectionName.trim() || 'Main section',
                        rationalization: question.rationalization || 'No explanation provided.',
                        elapsedSeconds: typeof metadata.elapsedSeconds === 'number' ? metadata.elapsedSeconds : null,
                    };
                });

                setReviewQuestions(parsedQuestions);
            } catch {
                // Review data is best-effort; keep whatever the result payload offers.
            } finally {
                setLoading(false);
            }
        };

        fetchReview();
    }, [attemptId]);

    const selectedAttemptMeta = useMemo(
        () => submittedAttempts.find((attempt) => attempt.id === attemptId) || null,
        [submittedAttempts, attemptId]
    );

    const handleAttemptChange = (nextAttemptId: string) => {
        setAttemptId(nextAttemptId);
        setSearchParams({ attemptId: nextAttemptId }, { replace: true });
    };

    // ── ScoreHero props ────────────────────────────────────────────────────────
    const score = result?.percentage ?? result?.stats?.accuracy ?? 0;
    const correct = result?.stats?.correct ?? 0;
    const total = result?.stats?.totalQuestions ?? 0;
    const attemptNo = selectedAttemptMeta?.attemptNo ?? result?.attemptNo ?? 1;
    const totalAttempts = submittedAttempts.length;

    const passed = useMemo(() => {
        const tier = getTierLabel(score);
        return tier !== null && tier !== 'Needs Work';
    }, [score]);

    // Sparkline data from the attempt history (oldest first, left-to-right).
    const trend = useMemo<ScoreTrendPoint[]>(() => {
        const oldestFirst = [...submittedAttempts].sort(
            (first, second) =>
                new Date(first.submittedAt ?? 0).getTime() - new Date(second.submittedAt ?? 0).getTime()
        );
        return getScoreTrend(oldestFirst);
    }, [submittedAttempts]);

    // ── Question data pipeline ─────────────────────────────────────────────────

    // Normalized question details from the result payload. Used as a fallback
    // for the question review when the dedicated review payload is unavailable.
    const questionDetails = useMemo<ResultQuestionDetail[]>(() => {
        const asNumber = (value: unknown) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : 0;
        };

        const normalized = (result?.questionDetails || [])
            .slice()
            .sort((first, second) => asNumber(first.orderNo) - asNumber(second.orderNo))
            .map((question, index) => ({
                ...question,
                orderNo: index + 1,
                section: String(question.section || '').trim() || 'Main section',
            }));

        const effectiveSections = Array.from(new Set(normalized.map((question) => question.section).filter(Boolean)));
        return effectiveSections.length <= 1
            ? normalized.map((question) => ({ ...question, section: '' }))
            : normalized;
    }, [result?.questionDetails]);

    const fallbackReviewQuestions = useMemo<ReviewQuestionRow[]>(() => {
        return questionDetails.map((question) => ({
            id: question.id,
            orderNo: question.orderNo,
            text: question.questionText || '',
            imageUrl: question.imageUrl || null,
            options: (question.choices || []).map((choice) => String(choice || '')),
            userAnswer: question.userChoice,
            correctAnswer: question.correctChoice || '',
            section: question.section || 'Main section',
            rationalization: question.rationalization || 'No explanation provided.',
            elapsedSeconds: null,
        }));
    }, [questionDetails]);

    const questions = reviewQuestions.length > 0 ? reviewQuestions : fallbackReviewQuestions;

    // Per-section aggregation (includes per-question timing from the review payload).
    const sectionReviewGroups = useMemo(() => {
        const groups = new Map<string, {
            name: string;
            total: number;
            correct: number;
            incorrect: number;
            skipped: number;
            elapsedSeconds: number;
        }>();

        for (const question of questions) {
            const sectionName = question.section || 'Main section';
            if (!groups.has(sectionName)) {
                groups.set(sectionName, {
                    name: sectionName,
                    total: 0,
                    correct: 0,
                    incorrect: 0,
                    skipped: 0,
                    elapsedSeconds: 0,
                });
            }

            const group = groups.get(sectionName)!;
            const isCorrect = question.userAnswer === question.correctAnswer;
            const isSkipped = !question.userAnswer;
            group.total += 1;
            group.correct += isCorrect ? 1 : 0;
            group.incorrect += !isCorrect && !isSkipped ? 1 : 0;
            group.skipped += isSkipped ? 1 : 0;
            group.elapsedSeconds += Math.max(0, Number(question.elapsedSeconds || 0));
        }

        return Array.from(groups.values());
    }, [questions]);

    // ── SectionBreakdown props ─────────────────────────────────────────────────
    const sectionData = useMemo<SectionData[]>(() => {
        if (questions.length > 0) {
            return sectionReviewGroups.map((group) => ({
                name: group.name,
                total: group.total,
                correct: group.correct,
                elapsedSeconds: group.elapsedSeconds,
            }));
        }

        return (result?.sections || [])
            .filter((section) => section?.name)
            .map((section) => ({
                name: String(section.name || '').trim(),
                total: section.total,
                correct: section.correct,
                elapsedSeconds: 0,
            }));
    }, [questions.length, sectionReviewGroups, result?.sections]);

    // ── QuestionReview props ───────────────────────────────────────────────────
    const reviewItems = useMemo<ReviewQuestion[]>(() =>
        questions.map((question) => ({
            id: question.id,
            orderNo: question.orderNo,
            section: question.section,
            questionText: question.text,
            imageUrl: question.imageUrl,
            choices: question.options,
            userAnswer: question.userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect: question.userAnswer === question.correctAnswer,
            rationalization: question.rationalization,
        })),
        [questions]
    );

    const reviewSections = useMemo<SectionInfo[]>(() =>
        sectionData.map((section) => ({
            name: section.name,
            total: section.total,
            correct: section.correct,
        })),
        [sectionData]
    );

    // ── WhatNextCTAs props ─────────────────────────────────────────────────────
    const sectionTiers = useMemo<SectionTier[]>(() =>
        sectionData.map((section) => {
            const percentage = section.total > 0 ? (section.correct / section.total) * 100 : 0;
            return {
                name: section.name,
                tier: getTierLabel(percentage) ?? 'Needs Work',
                percentage,
            };
        }),
        [sectionData]
    );

    // Max attempts is a page-level constant matching the server default; when
    // multiple attempts are disabled the retake card is simply always disabled.
    const maxAttempts = allowMultipleAttempts ? 3 : 1;

    const handleRetake = () => navigate(`/exams/${id}/take`);

    // The per-attempt PDF report export is out of scope for this assembly —
    // see the WhatNextCTAs props contract.
    // TODO(T8): wire the actual PDF export here.
    const handleDownloadReport = () => {};

    const resultDate = result?.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A';

    if (loading) {
        return (
            <div className="flex flex-col gap-5 pb-10 max-w-6xl" data-testid="exam-result-skeleton">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-3 w-56" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-44 rounded-lg" />
                </div>
                {/* Score hero: banner + sparkline */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <Skeleton className="h-36 w-full rounded-xl lg:col-span-8" />
                    <Skeleton className="h-36 w-full rounded-xl lg:col-span-4" />
                </div>
                {/* Section breakdown */}
                <Skeleton className="h-44 w-full rounded-xl" />
                {/* Question review */}
                <Skeleton className="h-96 w-full rounded-xl" />
                {/* What's next CTAs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-red-600 font-semibold">{error || 'Unable to load result.'}</p>
                <Button variant="outline" onClick={() => navigate('/exams')}>Back to Exams</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 pb-10 max-w-6xl">
            {previousAttempt && allowMultipleAttempts && (
                <Card className="border-slate-200 shadow-sm rounded-xl p-4 mb-3">
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-2">Previous Attempt</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>Attempt {previousAttempt.attemptNo}</span>
                        <span className="font-semibold">{Number(previousAttempt.percentage || 0).toFixed(1)}%</span>
                        <span>{previousAttempt.submittedAt ? new Date(previousAttempt.submittedAt).toLocaleDateString() : '—'}</span>
                    </div>
                </Card>
            )}

            {/* Header */}
            <header data-guide="exam-result-header" className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/exams')} className="h-8 w-8 rounded-lg shrink-0">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-slate-900 truncate">{result.exam?.title || 'Exam Result'}</h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Submitted {resultDate}
                            {selectedAttemptMeta?.attemptNo ? ` · Attempt ${selectedAttemptMeta.attemptNo}` : ''}
                        </p>
                    </div>
                </div>
                {submittedAttempts.length > 1 && (
                    <Select value={attemptId || undefined} onValueChange={handleAttemptChange}>
                        <SelectTrigger data-guide="exam-result-attempt-selector" className="h-8 text-xs font-semibold rounded-lg border-slate-200 w-44">
                            <SelectValue placeholder="Select attempt" />
                        </SelectTrigger>
                        <SelectContent>
                            {submittedAttempts.map((attempt, index) => (
                                <SelectItem key={attempt.id} value={attempt.id} className="text-xs">
                                    Attempt {attempt.attemptNo || submittedAttempts.length - index} · {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '—'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </header>

            {/* Score hero: pass/fail banner, score, sparkline, tiered confetti */}
            <div data-guide="exam-result-score-hero">
                <ScoreHero
                    score={score}
                    correct={correct}
                    total={total}
                    attemptNo={attemptNo}
                    totalAttempts={totalAttempts}
                    trend={trend}
                    justSubmitted={justSubmitted}
                    showConfetti={showConfetti}
                />
            </div>

            {/* Section breakdown: tiered bars per section */}
            <div data-guide="exam-result-section-breakdown">
                <SectionBreakdown sections={sectionData} />
            </div>

            {/* Question review: tabbed, filterable per-question review */}
            <div data-guide="exam-result-question-review">
                <QuestionReview questions={reviewItems} sections={reviewSections} />
            </div>

            {/* What's next: context-dependent CTAs */}
            <div data-guide="exam-result-actions">
                <WhatNextCTAs
                    passed={passed}
                    score={score}
                    attemptNo={attemptNo}
                    maxAttempts={maxAttempts}
                    sections={sectionTiers}
                    onDownload={handleDownloadReport}
                    onRetake={handleRetake}
                />
            </div>
        </div>
    );
};

export default ExamResultPage;
