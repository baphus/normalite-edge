import * as React from 'react';
import { AlertTriangle, CheckCircle2, Keyboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ExamInstructionsProps {
    examTitle: string;
    subject: string;
    totalQuestions: number;
    timeLimitMinutes: number;
    enforceSingleTab: boolean;
    tabSwitchGraceSeconds: number;
    isOnline: boolean;
    onStart: () => void;
    isLoading: boolean;
}

export interface KeyboardShortcutsHelpProps {
    /** When false the shortcut key handlers are paused, e.g. while the item
     *  review screen or the submit dialog is open. */
    enabled: boolean;
}

export interface ExamKeyboardShortcutsActions {
    onNext: () => void;
    onPrevious: () => void;
    onFlag: () => void;
    onSelectChoice: (choiceIndex: number) => void;
}

const SECTION_HEADING =
    'text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500';

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-700">
        {children}
    </kbd>
);

/** Compact keys/action table shared by the instructions screen and the help popover. */
function ShortcutTable() {
    return (
        <table className="w-full border-collapse text-left">
            <caption className="sr-only">Keyboard shortcuts</caption>
            <thead>
                <tr className="border-b border-slate-200">
                    <th
                        scope="col"
                        className="pb-1.5 pr-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400"
                    >
                        Keys
                    </th>
                    <th
                        scope="col"
                        className="pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400"
                    >
                        Action
                    </th>
                </tr>
            </thead>
            <tbody className="text-[12px]">
                <tr>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top">
                        <span className="inline-flex items-center gap-1">
                            <Kbd>Alt+N</Kbd>
                            <span className="text-slate-400">or</span>
                            <Kbd>→</Kbd>
                        </span>
                    </td>
                    <td className="py-1.5 align-top font-medium text-slate-600">Next question</td>
                </tr>
                <tr>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top">
                        <span className="inline-flex items-center gap-1">
                            <Kbd>Alt+P</Kbd>
                            <span className="text-slate-400">or</span>
                            <Kbd>←</Kbd>
                        </span>
                    </td>
                    <td className="py-1.5 align-top font-medium text-slate-600">Previous question</td>
                </tr>
                <tr>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top">
                        <Kbd>Alt+F</Kbd>
                    </td>
                    <td className="py-1.5 align-top font-medium text-slate-600">Flag for review</td>
                </tr>
                <tr>
                    <td className="whitespace-nowrap py-1.5 pr-3 align-top">
                        <span className="inline-flex items-center gap-1">
                            <Kbd>1</Kbd>
                            <Kbd>2</Kbd>
                            <Kbd>3</Kbd>
                            <Kbd>4</Kbd>
                        </span>
                    </td>
                    <td className="py-1.5 align-top font-medium text-slate-600">
                        Select A, B, C, or D
                    </td>
                </tr>
            </tbody>
        </table>
    );
}

const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const { tagName, isContentEditable } = target;
    return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        isContentEditable
    );
};

/**
 * Wires the exam keyboard shortcuts: Alt+N or Right Arrow = next, Alt+P or
 * Left Arrow = previous, Alt+F = flag, 1/2/3/4 = select A/B/C/D.
 *
 * Handlers are only attached while `enabled` is true, so the parent can pause
 * shortcuts while the item review screen or the submit dialog is open.
 * Shortcuts never fire while typing in an input, textarea, select, or
 * content-editable element.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useExamKeyboardShortcuts(
    actions: ExamKeyboardShortcutsActions,
    enabled: boolean,
): void {
    // Keep the latest actions in a ref so the keydown listener subscribes once
    // and never closes over a stale handler object.
    const actionsRef = React.useRef(actions);

    React.useEffect(() => {
        actionsRef.current = actions;
    }, [actions]);

    React.useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) return;
            if (isTypingTarget(event.target)) return;

            const key = event.key;
            const alt = event.altKey;

            if ((alt && key.toLowerCase() === 'n') || key === 'ArrowRight') {
                event.preventDefault();
                actionsRef.current.onNext();
                return;
            }

            if ((alt && key.toLowerCase() === 'p') || key === 'ArrowLeft') {
                event.preventDefault();
                actionsRef.current.onPrevious();
                return;
            }

            if (alt && key.toLowerCase() === 'f') {
                event.preventDefault();
                actionsRef.current.onFlag();
                return;
            }

            if (!alt && /^[1-4]$/.test(key)) {
                actionsRef.current.onSelectChoice(Number(key) - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled]);
}

/**
 * Keyboard help trigger for the exam header. Opens a popover listing every
 * shortcut in a compact table. While `enabled` is false the popover notes that
 * shortcuts are paused (item review screen / submit dialog).
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ enabled }) => (
    <Popover>
        <PopoverTrigger asChild>
            <button
                type="button"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <Keyboard className="h-4 w-4" />
            </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-72">
            <p className="text-xs font-semibold text-slate-900">Keyboard shortcuts</p>
            {!enabled && (
                <p className="mt-1 text-[12px] font-medium leading-snug text-slate-500">
                    Shortcuts are paused while the review screen or submit dialog is open.
                </p>
            )}
            <div className="mt-2">
                <ShortcutTable />
            </div>
        </PopoverContent>
    </Popover>
);

/**
 * Preflight instructions gate shown full-screen before the exam starts.
 * Condensed, scannable summary of the rules, the keyboard shortcuts, and the
 * single-tab policy. The timer only starts once the user presses
 * "Start Exam and Timer" — the parent hides this screen and mounts the exam.
 */
export const ExamInstructions: React.FC<ExamInstructionsProps> = ({
    examTitle,
    subject,
    totalQuestions,
    timeLimitMinutes,
    enforceSingleTab,
    tabSwitchGraceSeconds,
    isOnline,
    onStart,
    isLoading,
}) => {
    const beforeYouBeginItems = [
        'The timer starts only after you press Start Exam and Timer.',
        'Move between sections and review or change answers anytime before submitting.',
        'Once started, the timer keeps running even if you leave this page.',
        'Do not refresh, close, or switch away from this page during the exam.',
    ];

    const canStart = isOnline && !isLoading;

    return (
        <div className="p-6 md:p-8">
            <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Exam Instructions
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {examTitle}
                    </h1>
                    <p className="mt-2 text-[13px] font-medium text-slate-500">
                        {subject} · {totalQuestions} questions · {timeLimitMinutes} minutes
                    </p>
                </div>

                {!isOnline && (
                    <div
                        role="alert"
                        className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-700"
                    >
                        You're offline. Reconnect to the internet before starting the exam.
                    </div>
                )}

                <div className="space-y-6 p-6">
                    <section aria-labelledby="instructions-before-you-begin">
                        <h2 id="instructions-before-you-begin" className={SECTION_HEADING}>
                            Before You Begin
                        </h2>
                        <ul className="mt-2.5 space-y-2">
                            {beforeYouBeginItems.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
                                >
                                    <CheckCircle2
                                        size={14}
                                        className="mt-0.5 shrink-0 text-emerald-500"
                                        aria-hidden="true"
                                    />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="instructions-shortcuts">
                        <h2 id="instructions-shortcuts" className={SECTION_HEADING}>
                            Keyboard Shortcuts
                        </h2>
                        <div className="mt-2.5 rounded-lg border border-slate-200 p-3">
                            <ShortcutTable />
                        </div>
                    </section>

                    <section aria-labelledby="instructions-rules">
                        <h2 id="instructions-rules" className={SECTION_HEADING}>
                            Rules
                        </h2>
                        <ul className="mt-2.5 space-y-2">
                            <li className="flex items-start gap-2.5">
                                <AlertTriangle
                                    size={14}
                                    className={cn(
                                        'mt-0.5 shrink-0',
                                        enforceSingleTab ? 'text-red-600' : 'text-amber-600',
                                    )}
                                    aria-hidden="true"
                                />
                                <p
                                    className={cn(
                                        'text-[13px] font-medium',
                                        enforceSingleTab ? 'text-red-700' : 'text-amber-700',
                                    )}
                                >
                                    {enforceSingleTab ? (
                                        <>
                                            Tab-switch policy: if you switch to another browser
                                            tab, you have <strong>{tabSwitchGraceSeconds}s</strong>{' '}
                                            to return before the exam resets and all answers are
                                            cleared.
                                        </>
                                    ) : (
                                        <>
                                            Tab-switch policy: if enabled by your administrator,
                                            switching to another browser tab starts a short
                                            countdown before the exam resets and clears all
                                            answers.
                                        </>
                                    )}
                                </p>
                            </li>
                            <li className="flex items-start gap-2.5 text-[13px] font-medium text-slate-700">
                                <CheckCircle2
                                    size={14}
                                    className="mt-0.5 shrink-0 text-emerald-500"
                                    aria-hidden="true"
                                />
                                Your answers are saved automatically. Keep a stable internet
                                connection throughout the exam.
                            </li>
                        </ul>
                    </section>
                </div>

                <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                        type="button"
                        size="lg"
                        onClick={onStart}
                        disabled={!canStart}
                        className="h-11 w-full rounded-xl px-8 text-sm font-semibold sm:w-auto"
                    >
                        {isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Start Exam and Timer
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExamInstructions;
