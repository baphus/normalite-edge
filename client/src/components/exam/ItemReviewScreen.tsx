import { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Flag, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ReviewQuestionItem {
    id: string;
    orderNo: number;
    section: string;
    isAnswered: boolean;
    isFlagged: boolean;
}

export interface ItemReviewScreenProps {
    questions: ReviewQuestionItem[];
    onQuestionClick: (questionId: string) => void;
    onBackToExam: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

type QuestionReviewStatus = 'answered' | 'skipped' | 'flagged';

interface ReviewSectionGroup {
    name: string;
    items: ReviewQuestionItem[];
}

/**
 * Cell recipe per status. Status is conveyed by icon AND colour (WCAG 1.4.1),
 * and the button's `aria-label` repeats the status so it never relies on
 * colour alone.
 */
const STATUS_META: Record<QuestionReviewStatus, { label: string; className: string }> = {
    answered: { label: 'answered', className: 'border-green-200 bg-green-50 text-green-700' },
    skipped: { label: 'skipped', className: 'border-slate-200 bg-slate-50 text-slate-400' },
    flagged: { label: 'flagged', className: 'border-amber-200 bg-amber-50 text-amber-600' },
};

/** Flag wins over answered/skipped so a flagged question is always identifiable. */
function getReviewStatus(question: ReviewQuestionItem): QuestionReviewStatus {
    if (question.isFlagged) return 'flagged';
    if (question.isAnswered) return 'answered';
    return 'skipped';
}

function QuestionStatusIcon({ status }: { status: QuestionReviewStatus }) {
    const className = 'h-5 w-5';
    switch (status) {
        case 'answered':
            return <CheckCircle2 aria-hidden="true" className={className} />;
        case 'flagged':
            return <Flag aria-hidden="true" className={className} />;
        default:
            return <Circle aria-hidden="true" className={className} />;
    }
}

interface StatChipProps {
    label: string;
    count: number;
    className: string;
}

function StatChip({ label, count, className }: StatChipProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold tabular-nums',
                className,
            )}
        >
            {`${count} ${label}`}
        </span>
    );
}

/**
 * Full-screen review surface shown before submitting an exam. Lists every
 * question grouped by section with a status icon per question; clicking a
 * question jumps back to it. Replaces the old submit-confirmation dialog.
 */
export function ItemReviewScreen({
    questions,
    onQuestionClick,
    onBackToExam,
    onSubmit,
    isSubmitting,
}: ItemReviewScreenProps) {
    const sectionGroups = useMemo<ReviewSectionGroup[]>(() => {
        const buckets = new Map<string, ReviewSectionGroup>();

        for (const item of questions) {
            const sectionName = item.section.trim() || 'Main section';
            const bucket = buckets.get(sectionName);
            if (bucket) {
                bucket.items.push(item);
            } else {
                buckets.set(sectionName, { name: sectionName, items: [item] });
            }
        }

        return Array.from(buckets.values());
    }, [questions]);

    const summary = useMemo(() => {
        const answered = questions.filter((item) => item.isAnswered).length;
        const flagged = questions.filter((item) => item.isFlagged).length;
        return {
            answered,
            skipped: Math.max(0, questions.length - answered),
            flagged,
            total: questions.length,
        };
    }, [questions]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-50">
            {/* Header: title + summary stats */}
            <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold text-slate-900">Review your answers</h1>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                            Click any question to jump back and review it before submitting.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Answer summary">
                        <StatChip
                            label="Answered"
                            count={summary.answered}
                            className="border-green-200 bg-green-50 text-green-700"
                        />
                        <StatChip
                            label="Skipped"
                            count={summary.skipped}
                            className="border-slate-200 bg-slate-50 text-slate-500"
                        />
                        <StatChip
                            label="Flagged"
                            count={summary.flagged}
                            className="border-amber-200 bg-amber-50 text-amber-600"
                        />
                        <StatChip
                            label="Total"
                            count={summary.total}
                            className="border-slate-200 bg-slate-100 text-slate-600"
                        />
                    </div>
                </div>
            </header>

            {/* Scrollable question grid grouped by section */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    {sectionGroups.map((group) => (
                        <section key={group.name} aria-label={group.name}>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {group.name} ({group.items.length})
                            </h2>
                            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
                                {group.items.map((item) => {
                                    const status = getReviewStatus(item);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onQuestionClick(item.id)}
                                            aria-label={`Question ${item.orderNo}, ${STATUS_META[status].label}`}
                                            title={`Question ${item.orderNo} — ${STATUS_META[status].label}`}
                                            className={cn(
                                                'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border transition-colors',
                                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                                                STATUS_META[status].className,
                                            )}
                                        >
                                            <QuestionStatusIcon status={status} />
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {sectionGroups.length === 0 && (
                        <p className="text-xs font-medium text-slate-500">No questions to review.</p>
                    )}
                </div>
            </div>

            {/* Fixed bottom bar: Back (secondary) + Submit (primary) */}
            <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBackToExam}
                        disabled={isSubmitting}
                        className="rounded-lg text-xs font-semibold"
                    >
                        <ArrowLeft aria-hidden="true" />
                        Back to Exam
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/90"
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Exam'}
                        <Send aria-hidden="true" />
                    </Button>
                </div>
            </footer>
        </div>
    );
}

export default ItemReviewScreen;
