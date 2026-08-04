import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionEmpty } from '@/components/manage/CollectionState';
import { cn } from '@/lib/utils';

interface DeckQuestion {
    id: string;
    orderNo?: number;
    questionText: string;
    imageUrl?: string | null;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
    explanation?: string | null;
}

interface MaterialQuestionsTabProps {
    questions: DeckQuestion[];
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;

const choicesOf = (question: DeckQuestion) =>
    CHOICE_KEYS.map((key) => ({
        key,
        value: question[`choice${key}` as 'choiceA' | 'choiceB' | 'choiceC' | 'choiceD'],
    })).filter((choice) => Boolean(choice.value));

export const MaterialQuestionsTab: React.FC<MaterialQuestionsTabProps> = ({ questions }) => {
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // Derive unique categories from the question set.
    // Material questions don't have sections, so we group by question index ranges
    // or fall back to showing all without filters.
    const hasCategories = questions.some((q) => q.rationalization || q.explanation);

    // For materials without explicit sections, we just show all questions.
    // If a future API adds categories to deck questions, this can be extended.
    const categories = useMemo(() => {
        if (!hasCategories) return [];
        return ['ALL'];
    }, [hasCategories]);

    const visible = questions;

    if (questions.length === 0) {
        return (
            <section className="flex flex-col gap-3">
                <h2 className="sr-only">Material questions</h2>
                <CollectionEmpty
                    filtersActive={false}
                    emptyTitle="No questions yet"
                    emptyDescription="This material does not have any questions attached to it."
                />
            </section>
        );
    }

    return (
        <section className="flex flex-col gap-3">
            <h2 className="sr-only">Material questions</h2>

            <ol className="flex flex-col gap-3">
                {visible.map((question, index) => {
                    const correct = (question.correctChoice || '').toUpperCase();

                    return (
                        <li
                            key={question.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                            <p className="text-[11px] text-slate-500">
                                <span className="font-semibold uppercase tracking-[0.06em]">
                                    Question {index + 1}
                                </span>
                            </p>
                            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-900">
                                {question.questionText || 'No question text available.'}
                            </p>

                            {question.imageUrl && (
                                <img
                                    src={question.imageUrl}
                                    alt={`Illustration for question ${index + 1}`}
                                    className="mt-3 w-full max-w-lg rounded-lg border border-slate-200"
                                />
                            )}

                            <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                {choicesOf(question).map((choice) => {
                                    const isCorrect = choice.key === correct;
                                    return (
                                        <li
                                            key={`${question.id}-${choice.key}`}
                                            className={cn(
                                                'flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px]',
                                                isCorrect
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                                    : 'border-slate-200 bg-white text-slate-700',
                                            )}
                                        >
                                            <span className="font-semibold text-slate-400">
                                                {choice.key}.
                                            </span>
                                            <span className="min-w-0 flex-1">{choice.value}</span>
                                            {isCorrect && (
                                                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                                    <Check size={12} aria-hidden="true" />
                                                    Correct
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>

                            {(question.rationalization || question.explanation) && (
                                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                                    {question.rationalization && (
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                                Rationalisation
                                            </p>
                                            <p className="text-[13px] leading-relaxed text-slate-600">
                                                {question.rationalization}
                                            </p>
                                        </div>
                                    )}
                                    {question.explanation && question.explanation !== question.rationalization && (
                                        <div className={cn('space-y-1.5', question.rationalization && 'mt-2.5')}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                                Explanation
                                            </p>
                                            <p className="text-[13px] leading-relaxed text-slate-600">
                                                {question.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default MaterialQuestionsTab;
