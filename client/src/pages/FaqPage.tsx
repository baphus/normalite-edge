import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { PageHero } from '@/components/marketing/Primitives';

type Faq = { q: string; a: React.ReactNode };

const FAQS: Faq[] = [
    {
        q: 'Who can use Normalite EDGE?',
        a: 'The platform is for reviewees of Cebu Normal University. You register with a valid @cnu.edu.ph email address, and an administrator approves your account before you can sign in.',
    },
    {
        q: 'How do I register?',
        a: (
            <>
                Go to the <Link to="/register" className="font-medium text-primary underline underline-offset-2 dark:text-secondary">register page</Link>,
                sign up with your @cnu.edu.ph email, and choose your program track, campus, year, and section. Your
                account then waits for an administrator to review and activate it.
            </>
        ),
    },
    {
        q: 'Why isn’t my account working right after I sign up?',
        a: 'New accounts are pending until an administrator approves them. This keeps the platform limited to verified CNU reviewees. You’ll be able to log in once your account is activated.',
    },
    {
        q: 'What’s inside a mock exam?',
        a: 'Full-length, timed exams that mirror the LET structure — with sections across General Education, Professional Education, and your area of specialization. Every item includes a written rationale so you understand why an answer is correct.',
    },
    {
        q: 'What happens if I close the tab in the middle of an exam?',
        a: 'Your attempt is auto-saved as you go. You can step away and resume where you left off — nothing is lost when you come back.',
    },
    {
        q: 'Are the study materials specific to my program?',
        a: 'Yes. Materials are organized by program track, so you see decks and resources relevant to what you’re reviewing for rather than a single generic pile.',
    },
    {
        q: 'How do conferences work?',
        a: 'Scheduled video conferences appear on your calendar, and you can join them directly from the platform. Upcoming exam windows and study milestones show up in the same view.',
    },
    {
        q: 'I forgot my password. What do I do?',
        a: (
            <>
                Use the <Link to="/forgot-password" className="font-medium text-primary underline underline-offset-2 dark:text-secondary">forgot-password page</Link> to
                start a reset. If you still can&rsquo;t get in, reach out through the{' '}
                <Link to="/contact" className="font-medium text-primary underline underline-offset-2 dark:text-secondary">contact page</Link>.
            </>
        ),
    },
];

const FaqPage: React.FC = () => (
    <MarketingLayout>
        <PageHero
            eyebrow="Frequently asked"
            title="Questions reviewees usually ask."
            subtitle="Short answers about registration, approval, exams, and getting help. Can’t find yours? Reach us on the contact page."
        />

        <section className="py-16 md:py-20">
            <div className="mx-auto max-w-[820px] px-6 md:px-8">
                <div className="divide-y divide-[#e6ddd3] overflow-hidden rounded-2xl border border-[#e6ddd3] bg-white/60 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                    {FAQS.map((faq, i) => (
                        <details key={i} className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-lexend text-[16px] font-medium text-[#1A0E0E] transition-colors hover:bg-white/60 dark:text-white dark:hover:bg-white/5">
                                <span>{faq.q}</span>
                                <span className="material-symbols-outlined shrink-0 text-primary transition-transform group-open:rotate-45 dark:text-secondary">
                                    add
                                </span>
                            </summary>
                            <div className="px-6 pb-6 text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                {faq.a}
                            </div>
                        </details>
                    ))}
                </div>

                <p className="mt-8 text-center text-sm text-[#6B5B5B] dark:text-gray-400">
                    Still stuck?{' '}
                    <Link to="/contact" className="font-semibold text-primary underline underline-offset-2 dark:text-secondary">
                        Contact us
                    </Link>
                    .
                </p>
            </div>
        </section>
    </MarketingLayout>
);

export default FaqPage;
