import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowRight,
    Shuffle,
    FlipHorizontal,
    Repeat2,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionPreference } from '@/contexts/MotionContext';
import type { StudyItem } from './types';

interface FlashcardModeProps {
    items: StudyItem[];
    currentIndex: number;
    isFlipped: boolean;
    setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
    flashOrder: number[];
    isShuffled: boolean;
    handleToggleShuffle: () => void;
    handleNext: () => void;
    handlePrev: () => void;
    questionTextClass: string;
    answerTextClass: string;
    rationalizationTextClass: string;
    selfAssessment: Record<number, 'got_it' | 'review'>;
    setSelfAssessment: React.Dispatch<React.SetStateAction<Record<number, 'got_it' | 'review'>>>;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({
    items,
    currentIndex,
    isFlipped,
    setIsFlipped,
    flashOrder,
    isShuffled,
    handleToggleShuffle,
    handleNext,
    handlePrev,
    questionTextClass,
    answerTextClass,
    rationalizationTextClass,
    setSelfAssessment,
}) => {
    const { reducedMotion } = useMotionPreference();
    const [rationaleOpen, setRationaleOpen] = useState(false);
    const currentItem = items[flashOrder[currentIndex] ?? currentIndex];

    // Reset accordion when card changes
    useEffect(() => {
        setRationaleOpen(false);
    }, [currentIndex]);

    // Swipe gesture handling
    const touchStartX = React.useRef<number | null>(null);
    const SWIPE_THRESHOLD = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;

        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

        if (deltaX > 0) {
            // Swipe right
            if (!isFlipped) {
                setIsFlipped(true);
            } else {
                handleNext();
            }
        } else {
            // Swipe left
            handlePrev();
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Card flip */}
            <div
                className="flex min-h-0 w-full flex-1 cursor-pointer select-none flex-col justify-center"
                onClick={() => setIsFlipped(!isFlipped)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
            >
                <div
                    className="relative w-full"
                    style={{ perspective: '1200px' }}
                >
                    <motion.div
                        className="relative grid w-full"
                        style={{ transformStyle: 'preserve-3d' }}
                        initial={false}
                        animate={reducedMotion ? {} : { rotateY: isFlipped ? 180 : 0 }}
                        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
                    >
                        {/* Front */}
                        <motion.div
                            className="col-start-1 row-start-1 flex min-h-[200px] max-h-[45vh] sm:min-h-[280px] sm:max-h-[55vh] flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-amber-200 bg-amber-50 p-3 text-center shadow-sm sm:p-4 md:p-10"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            animate={{ opacity: reducedMotion ? (isFlipped ? 0 : 1) : 1 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
                            aria-hidden={isFlipped}
                        >
                            <div className="absolute top-3 md:top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-600/70 md:text-sm">
                                <Repeat2 size={16} /> Question
                            </div>
                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                                <p className={`${questionTextClass} mb-4 max-w-3xl font-semibold leading-tight text-amber-950 md:mb-6`}>
                                    {currentItem.question}
                                </p>
                                {currentItem.imageUrl && (
                                    <div className="inline-flex min-h-0 flex-shrink rounded-xl border-2 border-amber-200 bg-white p-2">
                                        <img
                                            src={currentItem.imageUrl}
                                            alt={`Flashcard ${currentIndex + 1}`}
                                            className="max-h-[20vh] w-auto rounded-lg object-contain md:max-h-[24vh]"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700/60 md:bottom-5">
                                Space or tap to flip
                            </div>
                        </motion.div>

                        {/* Back */}
                        <motion.div
                            className="col-start-1 row-start-1 flex min-h-[200px] max-h-[45vh] sm:min-h-[280px] sm:max-h-[55vh] flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm sm:p-4 md:p-10"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', rotateY: reducedMotion ? 0 : 180 }}
                            animate={{ opacity: reducedMotion ? (isFlipped ? 1 : 0) : 1 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
                            aria-hidden={!isFlipped}
                        >
                            <div className="absolute top-3 md:top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600/70 md:text-sm">
                                <Repeat2 size={16} /> Answer
                            </div>
                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                                <p className={`${answerTextClass} font-semibold leading-tight text-emerald-900`}>
                                    {currentItem.options[currentItem.answer]}
                                </p>
                            </div>
                            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700/60 md:bottom-5">
                                Tap to flip back
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Collapsible rationalization accordion — visible only after flip */}
            {isFlipped && currentItem.rationalization && (
                <div className="mt-2 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setRationaleOpen((v) => !v);
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        aria-expanded={rationaleOpen}
                    >
                        <span>Explanation</span>
                        <svg
                            className={`h-4 w-4 text-slate-500 transition-transform ${rationaleOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {rationaleOpen && (
                        <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className={`${rationalizationTextClass} leading-relaxed text-slate-700`}>
                                {currentItem.rationalization}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom controls — thumb-reachable */}
            <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-3 sm:mt-3 sm:pt-4">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={currentIndex === 0}
                    className="h-10 rounded-xl border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-11 sm:px-3 md:px-5"
                    aria-label="Previous card"
                >
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                </Button>

                {isFlipped ? (
                    /* Self-assessment buttons after flip */
                    <div className="flex flex-1 gap-2 sm:max-w-[280px]">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelfAssessment((prev) => ({ ...prev, [flashOrder[currentIndex] ?? currentIndex]: 'got_it' }));
                                handleNext();
                            }}
                            className="h-10 flex-1 rounded-xl border-emerald-300 bg-emerald-50 px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:h-11 sm:px-3"
                            aria-label="Got it"
                        >
                            <CheckCircle2 size={16} className="mr-1.5" />
                            Got it
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelfAssessment((prev) => ({ ...prev, [flashOrder[currentIndex] ?? currentIndex]: 'review' }));
                                handleNext();
                            }}
                            className="h-10 flex-1 rounded-xl border-amber-300 bg-amber-50 px-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 sm:h-11 sm:px-3"
                            aria-label="Review again"
                        >
                            <Repeat2 size={16} className="mr-1.5" />
                            Review
                        </Button>
                    </div>
                ) : (
                    /* Flip button before flip */
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFlipped((v) => !v);
                        }}
                        className="h-10 flex-1 rounded-xl border-amber-300 bg-white px-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 sm:h-11 sm:px-3 sm:max-w-[180px]"
                        aria-label="Flip card"
                    >
                        <FlipHorizontal size={16} className="mr-1.5" />
                        <span className="hidden sm:inline">Flip</span>
                        <span className="sm:hidden">Flip</span>
                    </Button>
                )}

                <Button
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="h-10 rounded-xl bg-primary px-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:h-11 sm:px-3 md:px-6"
                    aria-label={currentIndex === items.length - 1 ? 'Finish session' : 'Next card'}
                >
                    {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                </Button>
            </div>

            {/* Shuffle control */}
            <div className="mt-1 flex shrink-0 items-center justify-end gap-2 sm:mt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleShuffle();
                    }}
                    className={`h-8 rounded-lg px-3 text-xs font-semibold ${
                        isShuffled
                            ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-500/90'
                            : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                    }`}
                >
                    <Shuffle size={14} className="mr-1.5" />
                    {isShuffled ? 'Shuffled' : 'Shuffle'}
                </Button>
                <p className="hidden text-xs font-semibold uppercase tracking-wider text-amber-700/80 sm:block">
                    Tap card or press Space to flip
                </p>
            </div>
        </div>
    );
};

export default FlashcardMode;
