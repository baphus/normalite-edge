import * as React from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export interface QuestionStatus {
    id: string;
    orderNo: number;
    section: string;
    status: 'current' | 'answered' | 'open' | 'flagged';
}

export interface SectionTab {
    name: string;
    answered: number;
    total: number;
}

export interface ExamLayoutProps {
    sections: SectionTab[];
    questions: QuestionStatus[];
    currentQuestionId: string;
    activeSection: string;
    onSectionChange: (section: string) => void;
    onQuestionClick: (questionId: string) => void;
    header: React.ReactNode;
    children: React.ReactNode;
}

const QUESTION_STATUS_STYLES: Record<QuestionStatus['status'], string> = {
    current: 'bg-blue-500 text-white',
    answered: 'bg-green-500 text-white',
    open: 'bg-slate-300 text-slate-700',
    flagged: 'bg-amber-500 text-white',
};

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * Returns true when `window.matchMedia` reports the query matches.
 * Falls back to `false` (mobile behaviour) when matchMedia is unavailable,
 * e.g. in jsdom.
 */
function useMediaQuery(query: string): boolean {
    const subscribe = React.useCallback((onStoreChange: () => void) => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return () => {};
        }
        const mediaQueryList = window.matchMedia(query);
        mediaQueryList.addEventListener('change', onStoreChange);
        return () => mediaQueryList.removeEventListener('change', onStoreChange);
    }, [query]);

    const getSnapshot = React.useCallback(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        return window.matchMedia(query).matches;
    }, [query]);

    return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

interface SidebarPanelProps {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: React.UIEventHandler<HTMLDivElement>;
    /** Rendered inside the mobile Sheet, where the close button overlaps the top-right corner. */
    inSheet?: boolean;
    sections: SectionTab[];
    questions: QuestionStatus[];
    currentQuestionId: string;
    activeSection: string;
    onSectionChange: (section: string) => void;
    onQuestionClick: (questionId: string) => void;
}

function SidebarPanel({
    scrollRef,
    onScroll,
    inSheet = false,
    sections,
    questions,
    currentQuestionId,
    activeSection,
    onSectionChange,
    onQuestionClick,
}: SidebarPanelProps) {
    const filteredQuestions = React.useMemo(
        () => questions.filter((question) => question.section === activeSection),
        [questions, activeSection],
    );

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Section tabs */}
            <div
                role="tablist"
                aria-label="Exam sections"
                className={cn(
                    'flex items-center gap-1 overflow-x-auto border-b border-slate-200 pl-3 pr-3',
                    inSheet && 'pr-10',
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

            {/* Question grid */}
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-2">
                    {filteredQuestions.map((question) => {
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
            </div>
        </div>
    );
}

export default function ExamLayout({
    sections,
    questions,
    currentQuestionId,
    activeSection,
    onSectionChange,
    onQuestionClick,
    header,
    children,
}: ExamLayoutProps) {
    const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

    const desktopScrollRef = React.useRef<HTMLDivElement>(null);
    const mobileScrollRef = React.useRef<HTMLDivElement>(null);
    const scrollPosRef = React.useRef(0);

    // Restore the desktop sidebar's scroll position once it becomes visible again.
    React.useLayoutEffect(() => {
        if (isDesktop && sidebarOpen && desktopScrollRef.current) {
            desktopScrollRef.current.scrollTop = scrollPosRef.current;
        }
    }, [isDesktop, sidebarOpen]);

    // The mobile slide-over only applies below the `lg` breakpoint; if the
    // viewport grows to desktop width, the sheet is simply never shown there.
    const isSheetOpen = mobileSheetOpen && !isDesktop;

    const handleGridScroll = (event: React.UIEvent<HTMLDivElement>) => {
        scrollPosRef.current = event.currentTarget.scrollTop;
    };

    const handleToggleSidebar = () => {
        if (isDesktop) {
            scrollPosRef.current = desktopScrollRef.current?.scrollTop ?? scrollPosRef.current;
            setSidebarOpen((open) => !open);
        } else {
            setMobileSheetOpen(true);
        }
    };

    const handleMobileSheetOpenChange = (open: boolean) => {
        if (open) {
            setMobileSheetOpen(true);
            // The sheet's content mounts fresh each time it opens — restore the
            // saved scroll position once the layout is ready.
            const restoreScroll = () => {
                if (mobileScrollRef.current) {
                    mobileScrollRef.current.scrollTop = scrollPosRef.current;
                }
            };
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(restoreScroll);
            } else {
                restoreScroll();
            }
        } else {
            scrollPosRef.current = mobileScrollRef.current?.scrollTop ?? scrollPosRef.current;
            setMobileSheetOpen(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Center pane: toggle + header, then question content */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
                    <button
                        type="button"
                        onClick={handleToggleSidebar}
                        aria-label={
                            isDesktop ? 'Toggle question navigator' : 'Open question navigator'
                        }
                        aria-expanded={isDesktop ? sidebarOpen : isSheetOpen}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">{header}</div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </div>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    'hidden w-[280px] shrink-0 border-l border-slate-200 bg-white lg:block',
                    !sidebarOpen && 'lg:hidden',
                )}
            >
                <SidebarPanel
                    scrollRef={desktopScrollRef}
                    onScroll={handleGridScroll}
                    sections={sections}
                    questions={questions}
                    currentQuestionId={currentQuestionId}
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    onQuestionClick={onQuestionClick}
                />
            </aside>

            {/* Mobile slide-over */}
            <Sheet open={isSheetOpen} onOpenChange={handleMobileSheetOpenChange}>
                <SheetContent
                    side="right"
                    aria-label="Question navigator"
                    className="w-full max-w-[320px] p-0 sm:max-w-sm"
                >
                    <SidebarPanel
                        inSheet
                        scrollRef={mobileScrollRef}
                        onScroll={handleGridScroll}
                        sections={sections}
                        questions={questions}
                        currentQuestionId={currentQuestionId}
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        onQuestionClick={onQuestionClick}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}
