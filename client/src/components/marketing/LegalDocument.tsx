import React from 'react';
import MarketingLayout from '@/components/marketing/MarketingLayout';

export type LegalSection = { id: string; heading: string; body: React.ReactNode };

/**
 * Shared shell for legal documents (Privacy Policy, Terms). Renders a visible
 * "draft — pending legal review" banner, a table of contents, and the body.
 * The draft banner is intentional: these documents must be reviewed by counsel
 * before the banner is removed and they are treated as binding.
 */
const LegalDocument: React.FC<{
    title: string;
    lastUpdated: string;
    intro: React.ReactNode;
    sections: LegalSection[];
}> = ({ title, lastUpdated, intro, sections }) => (
    <MarketingLayout>
        <div className="mx-auto max-w-[820px] px-6 py-14 md:px-8 md:py-20">
            {/* Draft banner */}
            <div className="mb-10 flex items-start gap-3 rounded-xl border border-secondary/60 bg-secondary/10 p-4">
                <span className="material-symbols-outlined mt-0.5 text-[20px] text-[#8a6a10] dark:text-secondary">gavel</span>
                <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6a10] dark:text-secondary">
                        Draft — pending legal review
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                        This document is a working draft prepared for internal review. It is <strong>not legal
                        advice</strong> and is not yet binding. Bracketed items marked <code className="rounded bg-black/5 px-1 font-mono text-[12px] dark:bg-white/10">[LIKE THIS]</code> need
                        confirmation before publication.
                    </p>
                </div>
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                Last updated: {lastUpdated}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#1A0E0E] md:text-5xl dark:text-white">
                {title}
            </h1>
            <div className="mt-5 text-[16px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">{intro}</div>

            {/* Table of contents */}
            <nav className="mt-10 rounded-2xl border border-[#e6ddd3] bg-white/60 p-6 dark:border-white/10 dark:bg-white/5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                    On this page
                </p>
                <ol className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {sections.map((s, i) => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                className="flex items-baseline gap-2 text-[15px] text-[#3a2727] hover:text-primary dark:text-gray-300 dark:hover:text-secondary"
                            >
                                <span className="font-mono text-[11px] text-primary/60 dark:text-secondary/60">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {s.heading}
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            {/* Sections */}
            <div className="mt-12 flex flex-col gap-10">
                {sections.map((s, i) => (
                    <section key={s.id} id={s.id} className="scroll-mt-24">
                        <h2 className="flex items-baseline gap-3 font-serif text-2xl font-semibold text-[#1A0E0E] dark:text-white">
                            <span className="font-mono text-sm text-primary/60 dark:text-secondary/60">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            {s.heading}
                        </h2>
                        <div className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-secondary [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#1A0E0E] dark:[&_strong]:text-white">
                            {s.body}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    </MarketingLayout>
);

export default LegalDocument;
