import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionEmpty, CollectionError } from '@/components/manage/CollectionState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ExamQuestion } from './types';

export interface QuestionWithSection {
    question: ExamQuestion;
    globalQuestionNo: number;
    sectionTitle: string;
}

interface ExamQuestionsTabProps {
    questions: QuestionWithSection[];
    /** `'ALL'` first, then each section title in exam order. */
    sections: string[];
    state: 'loading' | 'error' | 'ready';
    error?: string | null;
    onRetry?: () => void;
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;

const choicesOf = (question: ExamQuestion) =>
    CHOICE_KEYS.map((key) => ({
        key,
        value: question[`choice${key}` as 'choiceA' | 'choiceB' | 'choiceC' | 'choiceD'],
    })).filter((choice) => Boolean(choice.value));

export const ExamQuestionsTab: React.FC<ExamQuestionsTabProps> = ({
    questions,
    sections,
    state,
    error,
    onRetry,
}) => {
    const [selectedSection, setSelectedSection] = useState('ALL');

    // Derived rather than synchronised in an effect: if the exam's sections change
    // underneath a stale selection, the filter simply reads as "All sections".
    const activeSection = sections.includes(selectedSection) ? selectedSection : 'ALL';
    const visible =
        activeSection === 'ALL'
            ? questions
            : questions.filter((entry) => entry.sectionTitle === activeSection);

    if (state === 'error') {
        return <CollectionError message={error || 'Could not load questions'} onRetry={onRetry} />;
    }

    if (state === 'loading') {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
                <span className="sr-only" role="status">Loading questions…</span>
            </div>
        );
    }

    return (
        <section className="flex flex-col gap-3">
            <h2 className="sr-only">Exam questions</h2>

            {sections.length > 1 && (
                <div role="group" aria-label="Filter by section" className="flex flex-wrap gap-1.5">
                    {sections.map((section) => {
                        const isActive = activeSection === section;
                        return (
                            <Button
                                key={section}
                                type="button"
                                variant="outline"
                                aria-pressed={isActive}
                                onClick={() => setSelectedSection(section)}
                                className={cn(
                                    'h-8 rounded-lg px-3 text-[12px] font-semibold',
                                    isActive
                                        ? 'border-primary bg-primary text-white hover:bg-primary/90 hover:text-white'
                                        : 'border-slate-200 bg-white text-slate-600',
                                )}
                            >
                                {section === 'ALL' ? 'All sections' : section}
                            </Button>
                        );
                    })}
                </div>
            )}

            {visible.length === 0 ? (
                <CollectionEmpty
                    filtersActive={activeSection !== 'ALL'}
                    onClearFilters={() => setSelectedSection('ALL')}
                    emptyTitle="No questions yet"
                    emptyDescription="This exam does not have any questions attached to it."
                />
            ) : (
                <ol className="flex flex-col gap-3">
                    {visible.map(({ question, globalQuestionNo, sectionTitle }) => {
                        const correct = (question.correctChoice || '').toUpperCase();

                        return (
                            <li
                                key={question.id}
                                className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                    Question {globalQuestionNo}
                                    <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                                    {sectionTitle}
                                </p>
                                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-900">
                                    {question.questionText || 'No question text available.'}
                                </p>

                                {question.imageUrl && (
                                    <img
                                        src={question.imageUrl}
                                        alt={`Illustration for question ${globalQuestionNo}`}
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
                                                {/*
                                                 * The correct answer is marked by an icon and text, not
                                                 * by the green fill alone (WCAG 1.4.1).
                                                 */}
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

                                {question.rationalization && (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                            Rationalisation
                                        </p>
                                        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                                            {question.rationalization}
                                        </p>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};

export default ExamQuestionsTab;
