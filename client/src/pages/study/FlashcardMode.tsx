import React from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowRight,
    Shuffle,
    FlipHorizontal,
    Repeat2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionPreference } from '@/contexts/MotionContext';
import type { StudyItem } from './types';

interface FlashcardModeProps {
    items: StudyItem[];
    currentIndex: number;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
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
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({
    items,
    currentIndex,
    setCurrentIndex,
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
}) => {
    const { reducedMotion } = useMotionPreference();
    const currentItem = items[flashOrder[currentIndex] ?? currentIndex];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Card flip */}
            <div
                className="flex min-h-0 w-full flex-1 cursor-pointer select-none flex-col justify-center"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div
                    className="relative h-[50vh] min-h-[320px] w-full sm:min-h-[380px] md:h-[52vh]"
                    style={{ perspective: '1200px' }}
                >
                    <motion.div
                        className="relative h-full w-full"
                        style={{ transformStyle: 'preserve-3d' }}
                        initial={false}
                        animate={reducedMotion ? {} : { rotateY: isFlipped ? 180 : 0 }}
                        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
                    >
                        {/* Front */}
                        <motion.div
                            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-amber-200 bg-amber-50 p-4 text-center shadow-sm md:p-10"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            animate={{ opacity: reducedMotion ? (isFlipped ? 0 : 1) : 1 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
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
                            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-4 border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm md:p-10"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', rotateY: reducedMotion ? 0 : 180 }}
                            animate={{ opacity: reducedMotion ? (isFlipped ? 1 : 0) : 1 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0 }}
                        >
                            <div className="absolute top-3 md:top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-600/70 md:text-sm">
                                <Repeat2 size={16} /> Answer
                            </div>
                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                                <p className={`${answerTextClass} mb-4 shrink-0 font-semibold leading-tight text-emerald-900 md:mb-6`}>
                                    {currentItem.options[currentItem.answer]}
                                </p>
                                <div className="w-full max-w-2xl rounded-xl border-2 border-emerald-100 bg-white/50 p-4 md:p-5">
                                    <p className={`${rationalizationTextClass} font-semibold leading-relaxed text-emerald-700/80`}>
                                        {currentItem.rationalization}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute bottom-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700/60 md:bottom-5">
                                Tap to flip back
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Card dots / position — wrapped, never scrolls horizontally */}
            <div className="mt-3 flex min-h-7 items-center justify-center gap-1.5 px-1 flex-wrap">
                {items.length <= 24 && items.map((_, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                                setIsFlipped(false);
                            }}
                            className={`h-2.5 rounded-full transition-all ${isActive ? 'w-6 bg-slate-900' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
                            aria-label={`Go to card ${idx + 1}`}
                        />
                    );
                })}
            </div>

            {/* Bottom controls — thumb-reachable */}
            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-4">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={currentIndex === 0}
                    className="h-11 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:px-5"
                >
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped((v) => !v);
                    }}
                    className="h-11 flex-1 rounded-xl border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 sm:max-w-[180px]"
                    aria-label="Flip card"
                >
                    <FlipHorizontal size={16} className="mr-1.5" />
                    <span className="hidden sm:inline">Flip</span>
                    <span className="sm:hidden">Flip</span>
                </Button>

                <Button
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="h-11 rounded-xl bg-primary px-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:px-6"
                >
                    {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                </Button>
            </div>

            {/* Shuffle control */}
            <div className="mt-2 flex shrink-0 items-center justify-end gap-2">
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
