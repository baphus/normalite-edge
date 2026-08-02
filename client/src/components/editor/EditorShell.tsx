import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDirtyGuard } from './useDirtyGuard';
import { cn } from '@/lib/utils';

interface EditorShellProps {
    breadcrumbLabel: string;
    breadcrumbTo: string;
    currentLabel: string;
    title: string;
    description: string;

    isDirty: boolean;
    isSubmitting: boolean;

    onDiscard: () => void;
    onSaveDraft: () => void;
    onPublish: () => void;
    publishLabel: string;
    /** Disables publish and explains why, e.g. unresolved validation blockers. */
    publishBlockedReason?: string | null;

    notice?: React.ReactNode;
    settings: React.ReactNode;
    children: React.ReactNode;
}

export const EditorShell: React.FC<EditorShellProps> = ({
    breadcrumbLabel,
    breadcrumbTo,
    currentLabel,
    title,
    description,
    isDirty,
    isSubmitting,
    onDiscard,
    onSaveDraft,
    onPublish,
    publishLabel,
    publishBlockedReason,
    notice,
    settings,
    children,
}) => {
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

    useDirtyGuard(isDirty);

    const handleDiscardClick = () => {
        if (isDirty) {
            setDiscardConfirmOpen(true);
            return;
        }
        onDiscard();
    };

    return (
        <div className="flex flex-col gap-4 pb-4 font-lexend">
            <header>
                <nav aria-label="Breadcrumb">
                    <ol className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                        <li>
                            <Link
                                to={breadcrumbTo}
                                className="rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                {breadcrumbLabel}
                            </Link>
                        </li>
                        <li aria-hidden="true">
                            <ChevronRight size={11} />
                        </li>
                        <li className="text-primary" aria-current="page">
                            {currentLabel}
                        </li>
                    </ol>
                </nav>
                <h1 className="mt-1.5 text-[18px] font-semibold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
            </header>

            {notice}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2 lg:order-1">{children}</div>
                <div className="lg:col-span-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">{settings}</div>
            </div>

            <div className="sticky bottom-0 z-20 -mx-3 mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:-mx-4 sm:px-4">
                <p
                    className={cn(
                        'mr-auto inline-flex items-center gap-1.5 text-[12px] font-medium',
                        isDirty ? 'text-amber-700' : 'text-slate-400',
                    )}
                    role="status"
                >
                    <span
                        className={cn('h-1.5 w-1.5 rounded-full', isDirty ? 'bg-amber-500' : 'bg-slate-300')}
                        aria-hidden="true"
                    />
                    {isDirty ? 'Unsaved changes' : 'All changes saved'}
                </p>
                <Button
                    variant="ghost"
                    className="h-8 rounded-lg px-3 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    onClick={handleDiscardClick}
                    disabled={isSubmitting}
                >
                    Discard
                </Button>
                <Button
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg border-slate-200 px-3 text-[12px] font-semibold"
                    onClick={onSaveDraft}
                    disabled={isSubmitting}
                >
                    <Save size={13} aria-hidden="true" /> Save draft
                </Button>
                <Button
                    className="h-8 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary/90"
                    onClick={onPublish}
                    disabled={isSubmitting || Boolean(publishBlockedReason)}
                    title={publishBlockedReason || undefined}
                >
                    {isSubmitting ? 'Saving…' : publishLabel}
                </Button>
            </div>

            <ConfirmDialog
                open={discardConfirmOpen}
                onOpenChange={setDiscardConfirmOpen}
                title="Discard unsaved changes?"
                description="Your edits have not been saved. Leaving now will lose them."
                confirmLabel="Discard changes"
                cancelLabel="Keep editing"
                variant="destructive"
                onConfirm={() => {
                    setDiscardConfirmOpen(false);
                    onDiscard();
                }}
            />
        </div>
    );
};

/** One bordered card for the whole settings column — sections divide with a hairline. */
export const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
}) => (
    <section
        aria-label={title}
        className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
        <h2 className="bg-slate-50/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {title}
        </h2>
        {children}
    </section>
);

export const SettingsSection: React.FC<{ label?: string; children: React.ReactNode }> = ({
    label,
    children,
}) => (
    <div className="space-y-3 px-4 py-3">
        {label && (
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</h3>
        )}
        {children}
    </div>
);

/** Sentence-case field label, per the shared visual system. */
export const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({
    htmlFor,
    children,
}) => (
    <label htmlFor={htmlFor} className="block text-[12px] font-medium text-slate-600">
        {children}
    </label>
);

export default EditorShell;
