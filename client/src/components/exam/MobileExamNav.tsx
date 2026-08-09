import * as React from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Flag, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

/** localStorage key used to remember the exam focus-mode preference. */
const EXAM_FOCUS_MODE_KEY = 'exam-focus-mode';

export interface MobileQuestion {
    id: string;
    orderNo: number;
    status: 'current' | 'answered' | 'open' | 'flagged';
}

export interface MobileSection {
    name: string;
    answered: number;
    total: number;
}

export interface MobileNavProps {
    // Section tabs (mobile)
    sections: MobileSection[];
    activeSection: string;
    onSectionChange: (section: string) => void;

    // Question grid (mobile bottom sheet)
    questions: MobileQuestion[];
    currentQuestionId: string;
    onQuestionClick: (id: string) => void;

    // Navigation (mobile bottom bar)
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;

    // Focus mode (desktop)
    isFocusMode: boolean;
    onToggleFocusMode: () => void;

    // Flag current
    isFlagged: boolean;
    onToggleFlag: () => void;
}

const QUESTION_STATUS_STYLES: Record<MobileQuestion['status'], string> = {
    current: 'bg-blue-500 text-white',
    answered: 'bg-green-500 text-white',
    open: 'bg-slate-300 text-slate-700',
    flagged: 'bg-amber-500 text-white',
};

/**
 * State hook for exam focus mode. Reads the saved preference from
 * `localStorage['exam-focus-mode']` on mount and persists every change, so a
 * reviewee who prefers distraction-free solving gets it back on the next
 * sitting. The parent is free to keep focus mode fully controlled instead and
 * only use the presentational pieces below.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useExamFocusMode(
    initialValue = false,
): Pick<MobileNavProps, 'isFocusMode' | 'onToggleFocusMode'> {
    const [isFocusMode, setIsFocusMode] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const stored = window.localStorage.getItem(EXAM_FOCUS_MODE_KEY);
            return stored === null ? initialValue : stored === 'true';
        } catch {
            return initialValue;
        }
    });

    React.useEffect(() => {
        try {
            window.localStorage.setItem(EXAM_FOCUS_MODE_KEY, String(isFocusMode));
        } catch {
            // localStorage unavailable (private mode, quota) — the preference is simply not remembered.
        }
    }, [isFocusMode]);

    const onToggleFocusMode = React.useCallback(() => {
        setIsFocusMode((current) => !current);
    }, []);

    return { isFocusMode, onToggleFocusMode };
}

export interface MobileSectionTabsProps {
    sections: MobileSection[];
    activeSection: string;
    onSectionChange: (section: string) => void;
    className?: string;
}

/** Mobile-only section tabs, scrollable horizontally. Hidden on desktop. */
export function MobileSectionTabs({
    sections,
    activeSection,
    onSectionChange,
    className,
}: MobileSectionTabsProps) {
    return (
        <div
            role="tablist"
            aria-label="Exam sections"
            className={cn(
                'flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white pl-3 pr-3',
                'lg:hidden',
                className,
            )}
        >
            {sections.map((section) => {
                const isActive = section.name === activeSection;
                return (
                    <button
                        key={section.name}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSectionChange(section.name)}
                        className={cn(
                            'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                            isActive
                                ? 'border-primary text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700',
                        )}
                    >
                        {section.name} ({section.answered}/{section.total})
                    </button>
                );
            })}
        </div>
    );
}

export interface QuestionGridProps {
    questions: MobileQuestion[];
    currentQuestionId: string;
    onQuestionClick: (id: string) => void;
    className?: string;
}

/** Compact 5-column question grid used inside the mobile bottom sheet. */
export function QuestionGrid({
    questions,
    currentQuestionId,
    onQuestionClick,
    className,
}: QuestionGridProps) {
    return (
        <div className={cn('grid grid-cols-5 gap-2', className)}>
            {questions.map((question) => {
                const isCurrent = question.id === currentQuestionId;
                return (
                    <button
                        key={question.id}
                        type="button"
                        onClick={() => onQuestionClick(question.id)}
                        aria-current={isCurrent ? 'true' : undefined}
                        aria-label={`Question ${question.orderNo}, ${question.status}`}
                        title={`Question ${question.orderNo} — ${question.status}`}
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium',
                            QUESTION_STATUS_STYLES[question.status],
                            isCurrent && 'ring-2 ring-blue-500 ring-offset-2',
                        )}
                    >
                        {question.orderNo}
                    </button>
                );
            })}
        </div>
    );
}

export interface QuestionGridSheetProps {
    sections: MobileSection[];
    activeSection: string;
    onSectionChange: (section: string) => void;
    questions: MobileQuestion[];
    currentQuestionId: string;
    onQuestionClick: (id: string) => void;
    /** Close the sheet after a question is selected. */
    closeOnSelect?: boolean;
    className?: string;
}

/**
 * Mobile bottom sheet holding the section tabs and the question grid.
 * Triggered by a floating grid button fixed to the bottom-right on mobile
 * (hidden on desktop). Dismissal affordances (grab handle, overlay tap,
 * Escape, close button) come from the shared `Sheet`.
 */
export function QuestionGridSheet({
    sections,
    activeSection,
    onSectionChange,
    questions,
    currentQuestionId,
    onQuestionClick,
    closeOnSelect = true,
    className,
}: QuestionGridSheetProps) {
    const [open, setOpen] = React.useState(false);

    const answeredCount = questions.filter((q) => q.status === 'answered').length;
    const flaggedCount = questions.filter((q) => q.status === 'flagged').length;

    const handleQuestionClick = (id: string) => {
        if (closeOnSelect) {
            setOpen(false);
        }
        onQuestionClick(id);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label="Open question grid"
                    className={cn(
                        'fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                        'lg:hidden',
                        className,
                    )}
                >
                    <LayoutGrid className="h-5 w-5" />
                </button>
            </SheetTrigger>
            <SheetContent
                side="bottom"
                className="flex max-h-[80dvh] flex-col gap-0 bg-white"
            >
                <SheetHeader className="gap-0 px-4 pt-2">
                    <SheetTitle className="text-sm font-semibold text-slate-900">
                        Questions
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-500">
                        {questions.length} questions · {answeredCount} answered · {flaggedCount}{' '}
                        flagged
                    </SheetDescription>
                </SheetHeader>

                <MobileSectionTabs
                    sections={sections}
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    className="shrink-0"
                />

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <QuestionGrid
                        questions={questions}
                        currentQuestionId={currentQuestionId}
                        onQuestionClick={handleQuestionClick}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

export interface MobileBottomNavProps {
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    isFlagged: boolean;
    onToggleFlag: () => void;
    className?: string;
}

/** Mobile-only fixed bottom bar: Prev | Flag | Next. Hidden on desktop. */
export function MobileBottomNav({
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    isFlagged,
    onToggleFlag,
    className,
}: MobileBottomNavProps) {
    return (
        <nav
            aria-label="Question navigation"
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 items-center gap-2 border-t border-slate-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5',
                'lg:hidden',
                className,
            )}
        >
            <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="flex h-10 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronLeft className="h-4 w-4" />
                Prev
            </button>

            <button
                type="button"
                onClick={onToggleFlag}
                aria-pressed={isFlagged}
                className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors',
                    isFlagged
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
            >
                <Flag className={cn('h-4 w-4', isFlagged && 'fill-amber-500 text-amber-500')} />
                {isFlagged ? 'Flagged' : 'Flag'}
            </button>

            <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="flex h-10 items-center justify-center gap-1 rounded-lg bg-primary text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </button>
        </nav>
    );
}

export interface FocusModeToggleProps {
    isFocusMode: boolean;
    onToggleFocusMode: () => void;
    className?: string;
}

/** Desktop-only header toggle that switches between focus mode and the full layout. */
export function FocusModeToggle({
    isFocusMode,
    onToggleFocusMode,
    className,
}: FocusModeToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggleFocusMode}
            aria-pressed={isFocusMode}
            aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
            title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
            className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isFocusMode && 'bg-slate-100 text-slate-900',
                'hidden lg:inline-flex',
                className,
            )}
        >
            {isFocusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    );
}

/**
 * Conditional UI for the exam screen. Renders the mobile pieces (top section
 * tabs, question-grid bottom sheet, Prev/Flag/Next bar) and the desktop focus
 * toggle, each hidden or shown via responsive classes — it does not own the
 * layout. The parent (ExamLayout or TakeExamPage) places it wherever it needs
 * the pieces, or composes the exported sub-components directly.
 */
export default function MobileExamNav({
    sections,
    activeSection,
    onSectionChange,
    questions,
    currentQuestionId,
    onQuestionClick,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    isFocusMode,
    onToggleFocusMode,
    isFlagged,
    onToggleFlag,
}: MobileNavProps) {
    // Remember the focus-mode preference so the next sitting starts the same way.
    React.useEffect(() => {
        try {
            window.localStorage.setItem(EXAM_FOCUS_MODE_KEY, String(isFocusMode));
        } catch {
            // localStorage unavailable — the preference is simply not remembered.
        }
    }, [isFocusMode]);

    return (
        <>
            <MobileSectionTabs
                sections={sections}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
            />
            <QuestionGridSheet
                sections={sections}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                questions={questions}
                currentQuestionId={currentQuestionId}
                onQuestionClick={onQuestionClick}
            />
            <MobileBottomNav
                onPrev={onPrev}
                onNext={onNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
                isFlagged={isFlagged}
                onToggleFlag={onToggleFlag}
            />
            <FocusModeToggle
                isFocusMode={isFocusMode}
                onToggleFocusMode={onToggleFocusMode}
            />
        </>
    );
}
