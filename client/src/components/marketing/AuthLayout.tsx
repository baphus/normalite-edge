import React from 'react';
import { Link } from 'react-router-dom';
import { BubbleMark } from '@/components/marketing/Primitives';

const TRUST_POINTS = [
    'Exclusive to @cnu.edu.ph accounts',
    'Access activated by an administrator',
    'Timed mock exams with rationalizations',
];

/**
 * Split-screen shell for the auth pages: a maroon brand panel (with the
 * answer-sheet motif) beside a paper form panel. The brand panel is hidden on
 * small screens, where a compact wordmark appears above the form instead.
 */
const AuthLayout: React.FC<{
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer: React.ReactNode;
    wide?: boolean;
}> = ({ title, subtitle, children, footer, wide }) => (
    <div className="flex min-h-screen bg-[#F7F4EE] font-lexend text-[#1A0E0E]">
        {/* Brand panel */}
        <aside className="answer-grid-invert relative hidden w-[44%] max-w-[560px] flex-col justify-between bg-primary p-12 text-white lg:flex">
            <Link to="/" className="flex items-center gap-3">
                <div className="h-11 w-11 overflow-hidden rounded-sm bg-white/10">
                    <img
                        src="/NormaliteEdgeLogo.png"
                        alt="Normalite EDGE logo"
                        className="h-full w-auto max-w-none object-cover object-left"
                    />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="font-serif text-xl font-semibold tracking-tight">Normalite EDGE</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-secondary/90">
                        Digital Guide to Excellence
                    </span>
                </div>
            </Link>

            <div className="max-w-sm">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                    LET Review · Cebu Normal University
                </p>
                <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.1]">
                    Prepare for the LET, one mock at a time.
                </h2>
                <ul className="mt-8 flex flex-col gap-3.5">
                    {TRUST_POINTS.map((point) => (
                        <li key={point} className="flex items-start gap-3 text-[15px] text-white/90">
                            <BubbleMark className="border-white/30" />
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="font-mono text-[11px] tracking-wide text-white/70">
                © 2026 Cebu Normal University · Normalite EDGE
            </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 md:px-12">
            <div className={`w-full ${wide ? 'max-w-[560px]' : 'max-w-[420px]'}`}>
                {/* Mobile wordmark (brand panel is hidden below lg) */}
                <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
                    <div className="h-9 w-9 overflow-hidden rounded-sm">
                        <img
                            src="/NormaliteEdgeLogo.png"
                            alt="Normalite EDGE logo"
                            className="h-full w-auto max-w-none object-cover object-left"
                        />
                    </div>
                    <span className="font-serif text-lg font-semibold text-primary">Normalite EDGE</span>
                </Link>

                <div className="mb-8">
                    <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#1A0E0E] md:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#6B5B5B]">{subtitle}</p>
                </div>

                {children}

                <div className="mt-8 border-t border-[#e6ddd3] pt-6 text-center text-sm text-[#6B5B5B]">
                    {footer}
                </div>
            </div>
        </main>
    </div>
);

export default AuthLayout;
