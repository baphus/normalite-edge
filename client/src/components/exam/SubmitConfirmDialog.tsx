import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

export interface SubmitConfirmDialogProps {
    open: boolean;
    totalQuestions: number;
    answeredCount: number;
    unansweredNumbers: number[]; // question order numbers that are unanswered
    onSubmit: () => void;
    onReview: () => void;
    isSubmitting: boolean;
}

/**
 * Minimal submit-confirmation dialog shown before an exam is finalised.
 * Deliberately non-dismissable by design — the only exits are "Review Answers"
 * or "Submit Exam" (outside clicks and Escape are suppressed).
 */
export function SubmitConfirmDialog({
    open,
    totalQuestions,
    answeredCount,
    unansweredNumbers,
    onSubmit,
    onReview,
    isSubmitting,
}: SubmitConfirmDialogProps) {
    const unansweredCount = unansweredNumbers.length;

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent
                role="alertdialog"
                className="max-w-md"
                onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
            >
                <DialogTitle>Submit Exam?</DialogTitle>

                {/* Accessible description — restates the summary for screen readers. */}
                <VisuallyHidden.Root asChild>
                    <DialogDescription>
                        You have answered {answeredCount}/{totalQuestions} questions.{' '}
                        {unansweredCount} questions are unanswered.
                        {unansweredCount > 0 && ` Unanswered: ${unansweredNumbers.join(', ')}.`}
                    </DialogDescription>
                </VisuallyHidden.Root>

                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">
                        You have answered {answeredCount}/{totalQuestions} questions.{' '}
                        {unansweredCount} questions are unanswered.
                    </p>
                    {unansweredCount > 0 && (
                        <p className="text-xs font-medium text-slate-500">
                            Unanswered: {unansweredNumbers.join(', ')}
                        </p>
                    )}
                </div>

                <div className="flex flex-row gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onReview}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg text-xs font-semibold"
                    >
                        Review Answers
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/90"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {isSubmitting ? 'Submitting…' : 'Submit Exam'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default SubmitConfirmDialog;
