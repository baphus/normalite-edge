import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { Eyebrow, PageHero } from '@/components/marketing/Primitives';

const VALUES = [
    {
        title: 'CNU-only, on purpose',
        body: 'Access is limited to @cnu.edu.ph accounts that an administrator approves. The review room stays a community of Normalites, not a public forum.',
    },
    {
        title: 'Practice that mirrors the exam',
        body: 'Timed mocks, real rationalizations, and program-track materials are built to resemble the pressure and structure of the actual LET.',
    },
    {
        title: 'Progress you can see',
        body: 'Score analytics and a shared calendar turn a vague “I should study more” into a clear picture of what to review next.',
    },
];

const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <MarketingLayout>
            <PageHero
                eyebrow="About the platform"
                title="Built for Normalites, by their own review community."
                subtitle="Normalite EDGE — Everyday Digital Guide to Excellence — is a Licensure Examination for Teachers review platform made for the reviewees of Cebu Normal University."
            />

            <section className="py-16 md:py-20">
                <div className="mx-auto grid max-w-[900px] gap-6 px-6 md:px-8">
                    <h2 className="font-serif text-2xl font-semibold text-[#1A0E0E] md:text-3xl dark:text-white">
                        Why we built it
                    </h2>
                    <p className="text-[16px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                        Reviewing for the LET usually means juggling scattered handouts, group chats, and a stack of
                        printed practice tests. Normalite EDGE pulls that into one place: study materials matched to your
                        program track, full-length mock exams with rationalizations, a calendar for conferences and
                        deadlines, and analytics that show where your next study hour will do the most good.
                    </p>
                    <p className="text-[16px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                        Because it&rsquo;s tied to CNU accounts and gated by admin approval, reviewers and administrators
                        can see who&rsquo;s in the room, share the right materials with the right tracks, and keep the
                        experience focused on the people it was made for.
                    </p>
                </div>
            </section>

            <section className="border-y border-[#e6ddd3] bg-white/50 py-16 md:py-20 dark:border-white/10 dark:bg-white/5">
                <div className="mx-auto max-w-[1100px] px-6 md:px-8">
                    <Eyebrow>What we stand on</Eyebrow>
                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        {VALUES.map((v) => (
                            <div
                                key={v.title}
                                className="rounded-2xl border border-[#e6ddd3] bg-[#F7F4EE] p-6 dark:border-white/10 dark:bg-[#230f0f]"
                            >
                                <h3 className="font-serif text-lg font-semibold text-[#1A0E0E] dark:text-white">
                                    {v.title}
                                </h3>
                                <p className="mt-3 text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                    {v.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 md:py-20">
                <div className="mx-auto max-w-[900px] px-6 md:px-8">
                    <div className="rounded-2xl border border-secondary/50 bg-secondary/10 p-5">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6a10] dark:text-secondary">
                            Placeholder
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                            Details about the team and the platform&rsquo;s official affiliation with Cebu Normal
                            University will be added here once confirmed.
                        </p>
                    </div>

                    <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-primary p-8 text-white md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="font-serif text-2xl font-semibold">Ready to start reviewing?</h2>
                            <p className="mt-1 text-white/85">Register with your CNU email and get approved.</p>
                        </div>
                        <button
                            onClick={() => navigate('/register')}
                            className="shrink-0 rounded-lg bg-secondary px-7 py-3 font-semibold text-[#1A0E0E] transition-all hover:-translate-y-0.5 hover:bg-[#ffca4d]"
                        >
                            Create your account
                        </button>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
};

export default AboutPage;
