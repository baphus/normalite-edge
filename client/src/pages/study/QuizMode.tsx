import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OPTION_LABELS } from './types';
import type { StudyItem } from './types';

interface QuizModeProps {
    items: StudyItem[];
    currentIndex: number;
    userAnswers: Record<number, number>;
    setUserAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    handleNext: () => void;
    handlePrev: () => void;
    questionTextClass: string;
}

const QuizMode: React.FC<QuizModeProps> = ({
    items,
    currentIndex,
    userAnswers,
    setUserAnswers,
    handleNext,
    handlePrev,
    questionTextClass,
}) => {
    const currentItem = items[currentIndex];
    const hasSelected = userAnswers[currentIndex] !== undefined;
    const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
    const isConfirmed = confirmed[currentIndex] === true;
    const feedbackRef = useRef<HTMLDivElement>(null);

    // Handle A-D keyboard selection and Enter/Space for Check and Continue
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // A-D selection
            const labelIdx = OPTION_LABELS.indexOf(e.key.toUpperCase());
            if (labelIdx >= 0 && labelIdx < currentItem.options.length && !isConfirmed && !hasSelected) {
                setUserAnswers(prev => ({ ...prev, [currentIndex]: labelIdx }));
                return;
            }

            if (e.key === 'Enter' || e.code === 'Space') {
                if (!isConfirmed && hasSelected) {
                    e.preventDefault();
                    setConfirmed(prev => ({ ...prev, [currentIndex]: true }));
                } else if (isConfirmed) {
                    e.preventDefault();
                    handleNext();
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isConfirmed, hasSelected, currentIndex, handleNext, currentItem.options.length, setUserAnswers]);

    // Move focus to feedback panel when confirmed
    useEffect(() => {
        if (isConfirmed && feedbackRef.current) {
            feedbackRef.current.focus();
        }
    }, [isConfirmed]);

    const handleCheck = () => {
        setConfirmed(prev => ({ ...prev, [currentIndex]: true }));
    };

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col">
            {/* Scrollable question area */}
            <div
                data-guide="session-question-card"
                className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto py-4"
            >
                <div className="flex w-full flex-col items-center justify-center px-4">
                    <span className="mb-3 inline-flex h-7 shrink-0 items-center rounded-full bg-slate-100 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {currentIndex + 1} / {items.length}
                    </span>
                    <h3 className={`${questionTextClass} text-center font-semibold leading-tight text-slate-900`}>
                        {currentItem.question}
                    </h3>
                </div>

                {currentItem.imageUrl && (
                    <div className="flex w-full items-center justify-center px-4">
                        <div className="inline-flex max-h-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                            <img
                                src={currentItem.imageUrl}
                                alt="Question attachment"
                                className="max-h-[22vh] w-auto rounded-lg object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Pinned bottom area — options + Check/Continue */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-3 pb-[env(safe-area-inset-bottom)] pt-3 sm:px-5">
                {/* Options grid — single column on mobile, 2-col at ≥640px */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    {currentItem.options.length === 0 && (
                        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:col-span-2">
                            This question has no answer choices yet. Please update the deck item in deck management.
                        </div>
                    )}
                    {currentItem.options.map((opt, idx) => {
                        const isSelected = userAnswers[currentIndex] === idx;
                        const isCorrect = idx === currentItem.answer;
                        const isWrongSelection = isConfirmed && isSelected && !isCorrect;

                        return (
                            <button
                                key={idx}
                                disabled={isConfirmed}
                                onClick={() => {
                                    if (isConfirmed) return;
                                    setUserAnswers(prev => ({ ...prev, [currentIndex]: idx }));
                                }}
                                className={`group relative flex min-h-[48px] items-center justify-start rounded-lg border-2 p-3 text-left transition-all duration-150 ${
                                    isSelected && !isConfirmed
                                        ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2'
                                        : isConfirmed && isCorrect
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                            : isWrongSelection
                                                ? 'border-red-500 bg-red-50 text-red-900'
                                                : isConfirmed && !isCorrect
                                                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    isSelected && !isConfirmed
                                        ? 'bg-white text-slate-900'
                                        : isConfirmed && isCorrect
                                            ? 'bg-emerald-500 text-white'
                                            : isWrongSelection
                                                ? 'bg-red-500 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {OPTION_LABELS[idx]}
                                </span>
                                <span className="flex-1 break-words text-sm font-medium leading-snug">
                                    {opt}
                                </span>
                                {isConfirmed && isCorrect && <CheckCircle2 size={18} className="ml-2 shrink-0 text-emerald-500" />}
                                {isWrongSelection && <XCircle size={18} className="ml-2 shrink-0 text-red-500" />}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom row — Previous / Check or Continue */}
                <div className="mt-3 flex items-center justify-between gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} /> Previous
                    </Button>

                    {!isConfirmed ? (
                        <Button
                            size="sm"
                            onClick={handleCheck}
                            disabled={!hasSelected}
                            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                        >
                            Check
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleNext}
                            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                        >
                            {currentIndex === items.length - 1 ? 'Finish' : 'Continue'} <ArrowRight size={16} />
                        </Button>
                    )}
                </div>

                {/* Feedback banner — appears after Check, replaces the gap above the nav row */}
                {isConfirmed && (
                    <div
                        ref={feedbackRef}
                        tabIndex={-1}
                        aria-live="polite"
                        className="mt-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    >
                        <p className={`text-sm font-medium leading-relaxed text-blue-900`}>
                            {currentItem.rationalization}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizMode;
