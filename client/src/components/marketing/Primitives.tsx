import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared visual primitives for the public marketing site.
 * The recurring device is the OMR answer-sheet bubble — a shaded oval that
 * every LET reviewee recognises from the optical answer sheet.
 */

/** Small mono eyebrow label prefixed with a shaded answer bubble. */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => (
    <span
        className={cn(
            'inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-primary dark:text-secondary',
            className,
        )}
    >
        <span className="inline-block size-2 rounded-full bg-secondary ring-2 ring-primary/40 dark:ring-secondary/40" />
        {children}
    </span>
);

/** A filled answer bubble used as a list marker. */
export const BubbleMark: React.FC<{ className?: string }> = ({ className }) => (
    <span
        aria-hidden
        className={cn(
            'mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-primary/30 dark:border-secondary/40',
            className,
        )}
    >
        <span className="size-2 rounded-full bg-secondary" />
    </span>
);

/** Consistent header band for interior marketing pages. */
export const PageHero: React.FC<{
    eyebrow: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
}> = ({ eyebrow, title, subtitle }) => (
    <section className="answer-grid border-b border-[#e6ddd3] dark:border-white/10">
        <div className="mx-auto max-w-[900px] px-6 py-16 md:px-8 md:py-20">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-[#1A0E0E] md:text-5xl dark:text-white">
                {title}
            </h1>
            {subtitle && (
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                    {subtitle}
                </p>
            )}
        </div>
    </section>
);

/** A list of points, each marked with a shaded bubble. */
export const BubbleList: React.FC<{ items: React.ReactNode[]; className?: string }> = ({
    items,
    className,
}) => (
    <ul className={cn('flex flex-col gap-3', className)}>
        {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                <BubbleMark />
                <span>{item}</span>
            </li>
        ))}
    </ul>
);
