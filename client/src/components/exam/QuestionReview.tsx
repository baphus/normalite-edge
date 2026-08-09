import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReviewQuestion {
    id: string;
    orderNo: number;
    section: string;
    questionText: string;
    imageUrl?: string | null;
    choices: string[];
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    rationalization?: string | null;
}

export interface SectionInfo {
    name: string;
    total: number;
    correct: number;
}

export interface QuestionReviewProps {
    questions: ReviewQuestion[];
    sections: SectionInfo[];
}

type QuestionFilter = 'all' | 'correct' | 'incorrect';
type QuestionStatus = 'correct' | 'incorrect' | 'skipped';

const FILTER_OPTIONS: ReadonlyArray<{ value: QuestionFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'correct', label: 'Correct' },
    { value: 'incorrect', label: 'Incorrect' },
];

/**
 * Dot chip recipe per status. Colour is never the only signal (WCAG 1.4.1):
 * every dot also carries the question number and an aria-label naming the
 * status, and the detail card repeats the status as a text badge.
 */
const DOT_CLASSES: Record<QuestionStatus, string> = {
    correct: 'bg-green-100 text-green-700 border-green-200',
    incorrect: 'bg-red-100 text-red-700 border-red-200',
    skipped: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_BADGE_CLASSES: Record<QuestionStatus, string> = {
    correct: 'bg-green-50 text-green-700 border-green-200',
    incorrect: 'bg-red-50 text-red-700 border-red-200',
    skipped: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
    correct: 'Correct',
    incorrect: 'Incorrect',
    skipped: 'Skipped',
};

const getStatus = (question: ReviewQuestion): QuestionStatus => {
    if (question.isCorrect) return 'correct';
    if (question.userAnswer) return 'incorrect';
    return 'skipped';
};

/**
 * Answers arrive as a choice letter (A/B/C/D), a 1-based index (1/2/3/4), or
 * the raw option text. Accept all three so exports in any of those shapes keep
 * matching their choice row.
 */
const isChoiceSelected = (index: number, choice: string, answer: string | null): boolean => {
    if (!answer) return false;
    const letter = String.fromCharCode(65 + index);
    return answer === letter || answer === String(index + 1) || answer === choice;
};

/**
 * Per-question review for the exam results page: section tabs with correct/total
 * counts, a compact colour-coded dot grid that jumps to a question, All /
 * Correct / Incorrect filters, and expandable cards showing the question, image,
 * choices, the user's answer, the correct answer, and the rationalization.
 *
 * The review surface stays neutral white — the green/red chips are limited to
 * the status dots and badges, never the cards themselves.
 */
export const QuestionReview: React.FC<QuestionReviewProps> = ({ questions, sections }) => {
    const [activeSection, setActiveSection] = useState<string>(() => sections[0]?.name ?? '');
    const [filter, setFilter] = useState<QuestionFilter>('all');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
    const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Derived fallback: if the stored tab disappears from the sections prop,
    // treat the first section as active without mutating state in an effect.
    const effectiveSection = sections.some((section) => section.name === activeSection)
        ? activeSection
        : (sections[0]?.name ?? '');

    const sectionQuestions = useMemo(
        () => questions.filter((question) => question.section === effectiveSection),
        [questions, effectiveSection],
    );

    // The filter reduces the review list below; the dot grid keeps the whole
    // section visible so any question stays reachable.
    const filteredQuestions = useMemo(() => {
        if (filter === 'correct') return sectionQuestions.filter((question) => question.isCorrect);
        if (filter === 'incorrect') return sectionQuestions.filter((question) => !question.isCorrect);
        return sectionQuestions;
    }, [sectionQuestions, filter]);

    useEffect(() => {
        if (pendingScrollId === null) return;
        const frame = requestAnimationFrame(() => {
            questionRefs.current[pendingScrollId]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            setPendingScrollId(null);
        });
        return () => cancelAnimationFrame(frame);
    }, [pendingScrollId, filteredQuestions]);

    const handleDotClick = (question: ReviewQuestion) => {
        // If the target card is hidden by the active filter, widen to All first
        // so the card exists before we scroll to it on the next paint.
        if (!filteredQuestions.some((candidate) => candidate.id === question.id)) {
            setFilter('all');
            setPendingScrollId(question.id);
            return;
        }
        questionRefs.current[question.id]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    };

    const toggleCollapsed = (questionId: string) => {
        setCollapsed((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
    };

    return (
        <section aria-label="Question review" className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-[13px] font-semibold text-slate-900">Question review</h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
                Review each question, your answer, and the rationalization.
            </p>

            {/* Section tabs */}
            <div
                role="tablist"
                aria-label="Exam sections"
                className="mt-4 flex items-center overflow-x-auto border-b border-slate-200"
            >
                {sections.map((section) => {
                    const isActive = section.name === effectiveSection;
                    return (
                        <button
                            key={section.name}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveSection(section.name)}
                            className={cn(
                                'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
                                isActive
                                    ? 'border-primary text-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-700',
                            )}
                        >
                            {section.name} ({section.correct}/{section.total})
                        </button>
                    );
                })}
            </div>

            {/* Filter buttons */}
            <div
                role="group"
                aria-label="Filter questions"
                className="mt-4 flex flex-wrap items-center gap-2"
            >
                {FILTER_OPTIONS.map((option) => {
                    const isActive = option.value === filter;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setFilter(option.value)}
                            className={cn(
                                'rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                isActive
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {/* Compact question grid — one dot per question in the active section */}
            <div
                aria-label="Questions in this section"
                className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-10"
            >
                {sectionQuestions.map((question) => {
                    const status = getStatus(question);
                    return (
                        <button
                            key={question.id}
                            type="button"
                            data-testid="question-grid-dot"
                            onClick={() => handleDotClick(question)}
                            aria-label={`Question ${question.orderNo}: ${STATUS_LABELS[status]}. Jump to review.`}
                            className={cn(
                                'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-[11px] font-medium transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                DOT_CLASSES[status],
                            )}
                        >
                            {question.orderNo}
                        </button>
                    );
                })}
            </div>

            {/* Full question review */}
            {filteredQuestions.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-[12px] text-slate-500">
                    {sectionQuestions.length === 0
                        ? 'No questions in this section.'
                        : 'No questions match this filter.'}
                </p>
            ) : (
                <div className="mt-4 flex flex-col gap-3">
                    {filteredQuestions.map((question) => {
                        const status = getStatus(question);
                        const isCollapsed = Boolean(collapsed[question.id]);
                        return (
                            <article
                                key={question.id}
                                data-testid="question-card"
                                ref={(element) => {
                                    questionRefs.current[question.id] = element as HTMLDivElement | null;
                                }}
                                className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-4"
                            >
                                <button
                                    type="button"
                                    data-testid="question-toggle"
                                    aria-expanded={!isCollapsed}
                                    onClick={() => toggleCollapsed(question.id)}
                                    className="flex w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-900">
                                        Question {question.orderNo}
                                    </span>
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-md border px-1.5 py-0.5 text-[12px] font-medium',
                                            STATUS_BADGE_CLASSES[status],
                                        )}
                                    >
                                        {STATUS_LABELS[status]}
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={cn(
                                            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                                            !isCollapsed && 'rotate-180',
                                        )}
                                    />
                                </button>

                                {!isCollapsed && (
                                    <div className="mt-3">
                                        <p className="text-[13px] leading-relaxed text-slate-800">
                                            {question.questionText}
                                        </p>

                                        {question.imageUrl && (
                                            <img
                                                src={question.imageUrl}
                                                alt={`Attachment for question ${question.orderNo}`}
                                                className="mt-3 max-h-52 w-auto max-w-full rounded border border-slate-200 object-contain"
                                            />
                                        )}

                                        <ul className="mt-3 flex flex-col gap-2">
                                            {question.choices.map((choice, index) => {
                                                const letter = String.fromCharCode(65 + index);
                                                const isUserAnswer = isChoiceSelected(
                                                    index,
                                                    choice,
                                                    question.userAnswer,
                                                );
                                                const isCorrectAnswer = isChoiceSelected(
                                                    index,
                                                    choice,
                                                    question.correctAnswer,
                                                );
                                                return (
                                                    <li
                                                        key={`${question.id}-${letter}`}
                                                        data-testid="answer-choice"
                                                        className={cn(
                                                            'flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] leading-snug',
                                                            isUserAnswer || isCorrectAnswer
                                                                ? 'border-green-200 bg-green-50 text-slate-800'
                                                                : 'border-slate-200 bg-white text-slate-600',
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={cn(
                                                                'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[12px] font-semibold',
                                                                isCorrectAnswer
                                                                    ? 'bg-green-600 text-white'
                                                                    : isUserAnswer
                                                                      ? 'bg-green-100 text-green-700'
                                                                      : 'bg-slate-100 text-slate-500',
                                                            )}
                                                        >
                                                            {letter}
                                                        </span>
                                                        <span className="min-w-0 flex-1">{choice}</span>
                                                        {isCorrectAnswer && (
                                                            <Check
                                                                aria-label="Correct answer"
                                                                className="h-4 w-4 shrink-0 text-green-600"
                                                            />
                                                        )}
                                                        {isUserAnswer && !isCorrectAnswer && (
                                                            <span className="shrink-0 text-[12px] font-medium text-green-700">
                                                                Your answer
                                                            </span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {question.rationalization && (
                                            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                                                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                                    Rationalization
                                                </p>
                                                <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
                                                    {question.rationalization}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default QuestionReview;
