import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lightbulb, XCircle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { StatusPill } from '@/components/manage/StatusPill';
import type { ChoiceKey, DailyAnswerResult, DailyQuestion } from './types';

const DAILY_ANSWER_STORAGE_KEY = 'reviewee-dashboard-daily-answer';
const CHOICES: ChoiceKey[] = ['A', 'B', 'C', 'D'];

interface DailyAnswerCache {
    date: string;
    userId: string;
    questionId: string;
    result: DailyAnswerResult;
}

/**
 * The daily challenge widget. Owns its own data flow: fetches today's
 * question, submits the answer, and rehydrates an already-answered question
 * from localStorage so a reload keeps the result.
 */
interface DailyChallengeProps {
    onAnswered?: () => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onAnswered }) => {
    const { user } = useAuth();
    const todayKey = new Date().toISOString().slice(0, 10);

    const [question, setQuestion] = useState<DailyQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(null);
    const [result, setResult] = useState<DailyAnswerResult | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await api.get('/dashboard/daily-question');
                if (cancelled) return;
                const dailyQuestion = (response.data?.data as DailyQuestion | null) ?? null;
                setQuestion(dailyQuestion);
                setSelectedChoice(null);
                setResult(null);

                if (!dailyQuestion || !user?.id) return;

                const cached = localStorage.getItem(DAILY_ANSWER_STORAGE_KEY);
                if (!cached) return;

                try {
                    const parsed = JSON.parse(cached) as DailyAnswerCache;
                    const isMatch =
                        parsed?.date === todayKey &&
                        parsed?.userId === user.id &&
                        parsed?.questionId === dailyQuestion.questionId &&
                        parsed?.result;

                    if (isMatch) {
                        setResult(parsed.result);
                        setSelectedChoice(parsed.result.selectedChoice);
                    }
                } catch {
                    localStorage.removeItem(DAILY_ANSWER_STORAGE_KEY);
                }
            } catch {
                if (!cancelled) {
                    setQuestion(null);
                    setError('Failed to load the daily question. Please try again.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [todayKey, user?.id]);

    const handleSubmit = async () => {
        if (!question || !selectedChoice) {
            setError('Please select an answer before submitting.');
            return;
        }
        try {
            setSubmitting(true);
            setError('');
            const response = await api.post('/dashboard/daily-question/answer', {
                questionId: question.questionId,
                selectedChoice,
            }, {
                // tz: client's UTC offset in minutes (e.g. -480 for UTC+8). The server
                // uses it to record the streak on the user's local calendar date.
                params: { tz: new Date().getTimezoneOffset() },
            });
            const answerResult = (response.data?.data as DailyAnswerResult | null) ?? null;
            if (!answerResult) return;
            setResult(answerResult);

            // Notify parent so streak data refetches (triggers celebration if streak gained)
            onAnswered?.();

            if (user?.id) {
                const payload: DailyAnswerCache = {
                    date: todayKey,
                    userId: user.id,
                    questionId: question.questionId,
                    result: answerResult,
                };
                localStorage.setItem(DAILY_ANSWER_STORAGE_KEY, JSON.stringify(payload));
            }
        } catch {
            setError('Unable to submit your answer right now. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Card id="daily-challenge" data-guide="dashboard-daily-challenge">
                <CardContent className="flex items-center gap-3.5 border-l-4 border-primary p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                        <Zap size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/80">
                                Daily challenge
                            </p>
                            {result && (
                                <StatusPill
                                    tone={result.isCorrect ? 'success' : 'closed'}
                                    label={result.isCorrect ? 'Correct' : 'Incorrect'}
                                />
                            )}
                        </div>
                        {loading ? (
                            <p className="mt-0.5 text-sm text-slate-400">Loading today&rsquo;s question…</p>
                        ) : question ? (
                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                {question.questionText}
                            </p>
                        ) : (
                            <p className="mt-0.5 text-sm text-slate-400">No question available today.</p>
                        )}
                    </div>
                    {question && (
                        <Button
                            size="sm"
                            variant={result ? 'outline' : 'default'}
                            onClick={() => {
                                setModalOpen(true);
                                setError('');
                            }}
                            disabled={loading}
                        >
                            {result ? 'View result' : 'Answer now'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={modalOpen}
                onOpenChange={(open) => {
                    if (!submitting) setModalOpen(open);
                }}
            >
                <DialogContent className="gap-0 overflow-hidden rounded-xl p-0 font-lexend sm:max-w-lg">
                    <DialogHeader className="border-b border-slate-200 px-5 pb-4 pt-5">
                        <div className="flex items-center gap-2.5">
                            <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
                                <Zap size={14} />
                            </div>
                            <DialogTitle className="text-[18px] font-semibold tracking-tight text-slate-900">
                                Daily Challenge
                            </DialogTitle>
                            <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </DialogHeader>

                    {question && (
                        <div className="space-y-3.5 px-5 py-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-sm font-semibold leading-relaxed text-slate-900">
                                    {question.questionText}
                                </p>
                            </div>

                            {result && (
                                <div
                                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${
                                        result.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                                    }`}
                                >
                                    {result.isCorrect ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                    )}
                                    <p className={`text-xs font-semibold ${result.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {result.isCorrect
                                            ? 'Correct! Great job.'
                                            : `Not quite. The correct answer was ${result.correctChoice}.`}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {CHOICES.map((choiceKey) => {
                                    const isSelected = selectedChoice === choiceKey;
                                    const isCorrectChoice = result?.correctChoice === choiceKey;
                                    const isWrongSelection =
                                        result?.selectedChoice === choiceKey && !result.isCorrect;
                                    const isAnswered = !!result;

                                    let cardClass = 'border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5 cursor-pointer';
                                    let letterClass = 'bg-slate-100 text-slate-600';
                                    let textClass = 'text-slate-700 font-medium';

                                    if (isAnswered) {
                                        if (isCorrectChoice) {
                                            cardClass = 'border-emerald-300 bg-emerald-50 cursor-default';
                                            letterClass = 'bg-emerald-600 text-white';
                                            textClass = 'text-emerald-800 font-semibold';
                                        } else if (isWrongSelection) {
                                            cardClass = 'border-red-300 bg-red-50 cursor-default';
                                            letterClass = 'bg-red-500 text-white';
                                            textClass = 'text-red-700 font-medium';
                                        } else {
                                            cardClass = 'border-slate-100 bg-slate-50 opacity-50 cursor-default';
                                            letterClass = 'bg-slate-200 text-slate-500';
                                            textClass = 'text-slate-400';
                                        }
                                    } else if (isSelected) {
                                        cardClass = 'border-primary bg-primary/5 cursor-pointer ring-1 ring-primary/20';
                                        letterClass = 'bg-primary text-white';
                                        textClass = 'text-primary font-semibold';
                                    }

                                    return (
                                        <button
                                            key={choiceKey}
                                            type="button"
                                            className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${cardClass}`}
                                            onClick={() => {
                                                if (!isAnswered && !submitting) {
                                                    setSelectedChoice(choiceKey);
                                                    setError('');
                                                }
                                            }}
                                        >
                                            <span
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold transition-colors ${letterClass}`}
                                            >
                                                {choiceKey}
                                            </span>
                                            <span className={`flex-1 text-xs leading-relaxed ${textClass}`}>
                                                {question.choices[choiceKey]}
                                            </span>
                                            {isAnswered && isCorrectChoice && (
                                                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                                            )}
                                            {isAnswered && isWrongSelection && (
                                                <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {result && (
                                <div className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <div>
                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                            Rationalization
                                        </p>
                                        <p className="text-xs leading-relaxed text-slate-700">
                                            {result.rationalization || 'No rationalization provided for this question.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && <p className="text-xs font-medium text-red-600">{error}</p>}

                            {!result && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !selectedChoice}
                                    className="h-10 w-full text-sm font-semibold"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Submitting…
                                        </span>
                                    ) : (
                                        'Submit answer'
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DailyChallenge;
