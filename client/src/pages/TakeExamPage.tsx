import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Timer,
    ArrowLeft,
    ArrowRight,
    Send,
    School,
    BookOpen,
    Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';

interface Question {
    id: string;
    orderNo: number;
    text: string;
    imageUrl?: string | null;
    choices: string[];
    section?: string | null;
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
    remainingSeconds: number | null;
    lastSavedAt?: string | null;
    exam: Exam;
    answers: Record<string, string>;
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
    currentIndex: number;
    timeLeft: number;
    updatedAt: number;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

const SECTION_CONFIG: Record<string, { color: string, icon: React.ElementType, banner: string }> = {
    'Professional Education': {
        color: 'text-amber-700',
        icon: School,
        banner: 'bg-amber-50 border-amber-100 text-amber-700'
    },
    'General Education': {
        color: 'text-blue-700',
        icon: BookOpen,
        banner: 'bg-blue-50 border-blue-100 text-blue-700'
    },
    'Major Subject': {
        color: 'text-purple-700',
        icon: Brain,
        banner: 'bg-purple-50 border-purple-100 text-purple-700'
    }
};

const TakeExamPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [exam, setExam] = useState<Exam | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'pending' | 'error'>('idle');

    const answersRef = useRef<Record<string, string>>({});
    const timeLeftRef = useRef(0);
    const dirtyRef = useRef(false);

    const draftKey = useMemo(() => (id ? `exam-draft:${id}` : ''), [id]);

    const getTimeSpent = useCallback((durationMinutes: number, remaining: number) => {
        const totalSeconds = Math.max(durationMinutes, 0) * 60;
        return Math.max(0, totalSeconds - Math.max(remaining, 0));
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

    const normalizeQuestions = useCallback((rawQuestions: any[] = []): Question[] => {
        return rawQuestions
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
                    section: normalizedSection,
                };
            })
            .filter((question) => question.text.trim().length > 0 && question.choices.length > 0)
            .sort((first, second) => first.orderNo - second.orderNo);
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

    const saveAttempt = useCallback(async (force = false) => {
        if (!attemptId || !exam || isSubmitting) return;
        if (!force && !dirtyRef.current) return;

        if (!navigator.onLine) {
            setSaveStatus('pending');
            return;
        }

        try {
            setSaveStatus('saving');
            const safeAnswers = sanitizeAnswersMap(answersRef.current, exam.questions || []);
            await api.patch(`/attempts/${attemptId}/save`, {
                answers: safeAnswers,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                remainingSeconds: Math.max(0, timeLeftRef.current),
            });
            dirtyRef.current = false;
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        }
    }, [attemptId, exam, getTimeSpent, isSubmitting, sanitizeAnswersMap]);

    useEffect(() => {
        const fetchAttempt = async () => {
            if (!id) {
                setError('Missing exam id.');
                setLoading(false);
                return;
            }

            try {
                setError(null);
                const response = await api.post('/attempts', { examId: id });
                const payload = response.data.data as AttemptStartResponse;

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
                const serverTimeLeft = payload.remainingSeconds ?? normalizedExam.timeLimit * 60;

                setAttemptId(payload.id);
                setExam(normalizedExam);

                const draft = readDraft();
                const sameAttemptDraft = draft && draft.attemptId === payload.id;

                if (sameAttemptDraft) {
                    const safeDraftAnswers = sanitizeAnswersMap(draft.answers || {}, normalizedQuestions);
                    const mergedAnswers = {
                        ...serverAnswers,
                        ...safeDraftAnswers,
                    };

                    setAnswers(mergedAnswers);
                    answersRef.current = mergedAnswers;

                    const safeIndex = Math.min(Math.max(draft.currentIndex, 0), Math.max(normalizedExam.questions.length - 1, 0));
                    setCurrentIndex(safeIndex);

                    const resolvedTimeLeft = Math.max(0, Math.min(serverTimeLeft, draft.timeLeft));
                    setTimeLeft(resolvedTimeLeft);
                    timeLeftRef.current = resolvedTimeLeft;

                    if (Object.keys(safeDraftAnswers || {}).length > 0 || draft.timeLeft !== serverTimeLeft) {
                        dirtyRef.current = true;
                    }
                } else {
                    setAnswers(serverAnswers);
                    answersRef.current = serverAnswers;

                    setCurrentIndex(0);

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
    }, [id, normalizeQuestions, readDraft, sanitizeAnswersMap]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (!attemptId || !draftKey || !exam) return;

        writeDraft({
            attemptId,
            answers,
            currentIndex,
            timeLeft,
            updatedAt: Date.now(),
        });
    }, [attemptId, answers, currentIndex, draftKey, exam, timeLeft, writeDraft]);

    useEffect(() => {
        if (!exam || loading || isSubmitting) return;

        if (timeLeft <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [exam, loading, isSubmitting, timeLeft]);

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
                saveAttempt(true);
            }
        };

        const handleBeforeUnload = () => {
            if (!attemptId || !exam) return;
            writeDraft({
                attemptId,
                answers: answersRef.current,
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
    }, [attemptId, currentIndex, exam, saveAttempt, writeDraft]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleFinish = useCallback(async (autoSubmitted = false) => {
        if (!attemptId || !exam || isSubmitting) return;

        if (!navigator.onLine && !autoSubmitted) {
            window.alert('You are offline. Reconnect first to submit. Your progress is saved locally.');
            setSaveStatus('pending');
            return;
        }

        try {
            setIsSubmitting(true);
            const safeAnswers = sanitizeAnswersMap(answersRef.current, exam.questions || []);

            await api.put(`/attempts/${attemptId}`, {
                answers: safeAnswers,
                timeSpent: getTimeSpent(exam.timeLimit, timeLeftRef.current),
                autoSubmitted,
                remainingSeconds: Math.max(0, timeLeftRef.current),
            });

            clearDraft();
            navigate(`/exams/${exam.id}/result?attemptId=${attemptId}`);
        } catch (submitError: any) {
            const message = submitError?.response?.data?.message || 'Failed to submit exam. Your progress remains saved.';
            window.alert(message);
            setSaveStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, clearDraft, exam, getTimeSpent, isSubmitting, navigate, sanitizeAnswersMap]);

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

        for (const question of questions) {
            const sectionName = question.section?.trim() || 'General Section';
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
    const section = SECTION_CONFIG[exam.subject] || SECTION_CONFIG['Professional Education'];
    const SectionIcon = section.icon;
    const sectionLabel = currentQuestion.section?.trim() || exam.subject || 'Exam';

    const handleOptionSelect = (optionIndex: number) => {
        const selectedChoice = CHOICE_LABELS[optionIndex] || 'A';
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: selectedChoice,
        }));
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

    return (
        <div className="flex flex-col h-screen -m-6 md:-m-8 md:p-0 overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{exam.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 bg-primary/5">
                            Standard Mode
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className={isOffline ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-emerald-700 border-emerald-200 bg-emerald-50'}>
                        {isOffline ? 'Offline' : 'Online'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {saveLabel}
                    </Badge>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                        <Timer size={20} className="text-gray-400" />
                        <span className="font-mono font-black text-primary text-xl">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Question Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                Question {currentIndex + 1} of {exam.questions.length}
                            </span>
                            <Progress value={((currentIndex + 1) / exam.questions.length) * 100} className="w-32 h-2" />
                        </div>

                        <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden rounded-3xl">
                            <div className={`px-8 py-4 flex items-center gap-3 border-b ${section.banner}`}>
                                <SectionIcon size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">{sectionLabel}</span>
                            </div>
                            <CardContent className="p-8 md:p-12">
                                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 leading-relaxed mb-10">
                                    {currentQuestion.text}
                                </h3>

                                {currentQuestion.imageUrl && (
                                    <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50/30 p-3">
                                        <img
                                            src={currentQuestion.imageUrl}
                                            alt="Question attachment"
                                            className="max-h-80 w-auto max-w-full rounded-xl border border-gray-100 object-contain bg-white"
                                        />
                                    </div>
                                )}

                                <div className="grid gap-4">
                                    {(currentQuestion.choices || []).map((option, idx) => {
                                        const optionLabel = CHOICE_LABELS[idx] || 'A';
                                        const isSelected = answers[currentQuestion.id] === optionLabel;
                                        const label = String.fromCharCode(65 + idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`group flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                                    : 'border-gray-100 bg-white hover:border-primary/20 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
                                                    }`}>
                                                    {label}
                                                </div>
                                                <span className={`text-base font-medium ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                                                    {option}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-100">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentIndex === 0}
                                        className="h-12 px-6 rounded-xl font-bold text-gray-500 gap-2"
                                    >
                                        <ArrowLeft size={18} /> Previous
                                    </Button>

                                    {currentIndex === exam.questions.length - 1 ? (
                                        <Button
                                            onClick={() => handleFinish(false)}
                                            disabled={isSubmitting}
                                            className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/25 gap-2"
                                        >
                                            Submit Exam <Send size={18} />
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setCurrentIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                            className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/25 gap-2"
                                        >
                                            Next Question <ArrowRight size={18} />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Right Sidebar - Navigator */}
                <aside className="w-80 border-l border-gray-100 bg-white flex-col shrink-0 hidden lg:flex">
                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-900 uppercase tracking-wider text-xs">Question Navigator</h3>
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-bold">
                                    {answeredCount} / {exam.questions.length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {exam.questions.map((_, idx) => {
                                    const isCurrent = currentIndex === idx;
                                    const isAnswered = Boolean(answers[exam.questions[idx].id]);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-10 rounded-xl text-xs font-black transition-all duration-200 ${isCurrent
                                                ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-4 ring-primary/10 scale-110 z-10'
                                                : isAnswered
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Section Indicator</h4>
                                <div className="space-y-2">
                                    {sectionProgress.map((sectionItem) => (
                                        <div key={sectionItem.name} className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-gray-600 truncate pr-2">{sectionItem.name}</span>
                                            <Badge variant="outline" className="text-[10px] font-bold">
                                                {sectionItem.answered}/{sectionItem.total}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Legend</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-primary" /> Current
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200" /> Answered
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                    <div className="w-3 h-3 rounded-full bg-gray-50 border border-gray-100" /> Unanswered
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 mt-auto">
                            <Button
                                onClick={() => handleFinish(false)}
                                disabled={isSubmitting}
                                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                Submit Final Exam
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TakeExamPage;
