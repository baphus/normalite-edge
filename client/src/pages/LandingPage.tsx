import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { Eyebrow, BubbleList } from '@/components/marketing/Primitives';

/** An answer-sheet row: the shaded choice marks the step you're on. */
const AnswerRow: React.FC<{ marked: number }> = ({ marked }) => (
    <div className="flex items-center gap-2" aria-hidden>
        {['A', 'B', 'C', 'D'].map((letter, i) => (
            <span
                key={letter}
                className={`inline-flex size-6 items-center justify-center rounded-full border font-mono text-[10px] transition-colors ${
                    i === marked
                        ? 'border-primary bg-secondary text-[#1A0E0E]'
                        : 'border-primary/25 text-primary/40 dark:border-secondary/25 dark:text-secondary/40'
                }`}
            >
                {letter}
            </span>
        ))}
    </div>
);

const InitialsAvatar: React.FC<{ initials: string }> = ({ initials }) => (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary ring-1 ring-primary/20 dark:bg-secondary/15 dark:text-secondary dark:ring-secondary/25">
        {initials}
    </div>
);

const STEPS = [
    {
        title: 'Register with your CNU email',
        body: 'Sign up with your @cnu.edu.ph account and pick the program track you’re reviewing for.',
    },
    {
        title: 'Get approved by an admin',
        body: 'An administrator reviews and activates your account — there are no public sign-ups, so the room stays CNU-only.',
    },
    {
        title: 'Start reviewing',
        body: 'Open your track materials, sit timed mock exams, and watch your scores sharpen week by week.',
    },
];

const TESTIMONIALS = [
    {
        initials: 'MS',
        name: 'Maria Santos',
        track: 'BSED – English',
        stars: 5,
        quote: 'The timed mocks made the real exam feel familiar. By test day the format wasn’t the thing I had to worry about — only the content.',
    },
    {
        initials: 'JD',
        name: 'Juan Dela Cruz',
        track: 'BSED – Mathematics',
        stars: 5,
        quote: 'I got through most of the Gen Ed decks on my commute. Having the rationale under each item is what actually made it stick.',
    },
    {
        initials: 'AR',
        name: 'Anna Reyes',
        track: 'BEED – Generalist',
        stars: 4,
        quote: 'The score breakdown showed me Prof Ed was my weak spot. I put my next two weeks there instead of guessing where to start.',
    },
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <MarketingLayout>
            {/* Hero */}
            <section className="answer-grid relative overflow-hidden border-b border-[#e6ddd3] dark:border-white/10">
                <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex flex-col gap-7">
                        <Eyebrow>LET Review · Cebu Normal University</Eyebrow>
                        <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-[#1A0E0E] md:text-6xl dark:text-white">
                            Prepare for the <span className="marked-answer text-[#1A0E0E]">LET</span> the way you&rsquo;ll actually sit it.
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                            Normalite EDGE gives CNU reviewees full-length mock exams with rationalizations,
                            program-track study materials, and one calendar for every conference and deadline &mdash;
                            with your progress auto-saved as you go.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => navigate('/register')}
                                className="rounded-lg bg-primary px-7 py-3.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#5a1010]"
                            >
                                Create your account
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="rounded-lg border border-primary/25 bg-white/60 px-7 py-3.5 font-semibold text-primary transition-colors hover:border-primary/50 dark:border-secondary/30 dark:bg-white/5 dark:text-secondary"
                            >
                                Log in
                            </button>
                        </div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                            For @cnu.edu.ph accounts · Self-register, then get admin-approved
                        </p>
                    </div>

                    {/* Product frame with overlapping answer-sheet card */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-2xl border border-[#e6ddd3] bg-white shadow-2xl shadow-primary/10 dark:border-white/10 dark:bg-[#1a0a0a]">
                            <div className="flex items-center gap-1.5 border-b border-[#eee3d8] px-4 py-3 dark:border-white/10">
                                <span className="size-2.5 rounded-full bg-[#e5c0c0]" />
                                <span className="size-2.5 rounded-full bg-[#eddab0]" />
                                <span className="size-2.5 rounded-full bg-[#cfe0cf]" />
                                <span className="ml-3 font-mono text-[10px] tracking-wide text-gray-400">
                                    normalite-edge · mock exam
                                </span>
                            </div>
                            <img
                                src="https://res.cloudinary.com/dll6it35i/image/upload/v1773030327/Screenshot_2026-03-09_at_12-24-14_Normalite_EDGE_cgc5ry.png"
                                alt="A timed Normalite EDGE mock exam in progress"
                                className="aspect-[4/3] w-full object-cover object-top"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-4 hidden w-56 rounded-xl border border-[#e6ddd3] bg-[#F7F4EE] p-4 shadow-xl sm:block dark:border-white/10 dark:bg-[#230f0f]">
                            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary/70 dark:text-secondary/70">
                                Item 24 · Prof Ed
                            </p>
                            <div className="mt-3">
                                <AnswerRow marked={2} />
                            </div>
                            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#3a2727] dark:text-gray-300">
                                <span className="material-symbols-outlined text-[16px] text-primary dark:text-secondary">
                                    check_circle
                                </span>
                                Rationale shown after you answer
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-b border-[#e6ddd3] py-20 md:py-28 dark:border-white/10">
                <div className="mx-auto max-w-[1200px] px-6 md:px-8">
                    <div className="mb-14 max-w-2xl">
                        <Eyebrow>How it works</Eyebrow>
                        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-[#1A0E0E] md:text-4xl dark:text-white">
                            Three steps from sign-up to your first mock exam.
                        </h2>
                    </div>
                    <ol className="grid gap-6 md:grid-cols-3">
                        {STEPS.map((step, i) => (
                            <li
                                key={step.title}
                                className="relative flex flex-col gap-4 rounded-2xl border border-[#e6ddd3] bg-white/60 p-7 dark:border-white/10 dark:bg-white/5"
                            >
                                <span className="flex size-12 items-center justify-center rounded-full border-2 border-primary/25 font-mono text-lg font-semibold text-primary dark:border-secondary/30 dark:text-secondary">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="font-serif text-xl font-semibold text-[#1A0E0E] dark:text-white">
                                    {step.title}
                                </h3>
                                <p className="text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                    {step.body}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 md:py-28">
                <div className="mx-auto max-w-[1200px] px-6 md:px-8">
                    <div className="mb-16 max-w-2xl">
                        <Eyebrow>What you get</Eyebrow>
                        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-[#1A0E0E] md:text-4xl dark:text-white">
                            Everything a Normalite needs to walk in ready.
                        </h2>
                    </div>

                    <div className="flex flex-col gap-20 md:gap-28">
                        {/* Feature 1 */}
                        <div className="grid items-center gap-10 lg:grid-cols-2">
                            <div className="flex flex-col gap-5">
                                <Eyebrow>Timed mock exams</Eyebrow>
                                <h3 className="font-serif text-2xl font-semibold text-[#1A0E0E] md:text-3xl dark:text-white">
                                    Practice under the same clock.
                                </h3>
                                <p className="text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                    Full-length mocks, timed like the real thing. Every item carries a written rationale,
                                    so you learn <em>why</em> an answer is right &mdash; not just which one. Step away
                                    anytime; your attempt is saved and waiting when you return.
                                </p>
                                <BubbleList
                                    items={[
                                        'Autosave and resume on any attempt',
                                        'A written rationale for every item',
                                        'Gen Ed, Prof Ed, and majorship coverage',
                                    ]}
                                />
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-[#e6ddd3] shadow-xl shadow-primary/5 dark:border-white/10">
                                <img
                                    src="https://res.cloudinary.com/dll6it35i/image/upload/v1773030327/Screenshot_2026-03-09_at_12-24-14_Normalite_EDGE_cgc5ry.png"
                                    alt="Mock exam interface"
                                    className="aspect-video w-full object-cover object-top"
                                />
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="grid items-center gap-10 lg:grid-cols-2">
                            <div className="overflow-hidden rounded-2xl border border-[#e6ddd3] shadow-xl shadow-primary/5 lg:order-last dark:border-white/10">
                                <img
                                    src="https://res.cloudinary.com/dll6it35i/image/upload/v1773030328/Screenshot_2026-03-09_at_12-14-48_Normalite_EDGE_qn3aji.png"
                                    alt="Review calendar"
                                    className="aspect-video w-full object-cover object-top"
                                />
                            </div>
                            <div className="flex flex-col gap-5">
                                <Eyebrow>One calendar</Eyebrow>
                                <h3 className="font-serif text-2xl font-semibold text-[#1A0E0E] md:text-3xl dark:text-white">
                                    Nothing slips past you.
                                </h3>
                                <p className="text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                    Mock-exam windows, Zoom conferences, and study milestones sit side by side in one
                                    view. Plan your week around what&rsquo;s actually coming up.
                                </p>
                                <BubbleList
                                    items={[
                                        'Conferences and exam windows in one place',
                                        'Deadlines you can see coming',
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="grid items-center gap-10 lg:grid-cols-2">
                            <div className="flex flex-col gap-5">
                                <Eyebrow>Materials, conferences &amp; results</Eyebrow>
                                <h3 className="font-serif text-2xl font-semibold text-[#1A0E0E] md:text-3xl dark:text-white">
                                    Know where your next hour should go.
                                </h3>
                                <p className="text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                    Study materials matched to your program track, conferences you can join in a click,
                                    and score analytics that point to exactly where to spend your next study hour.
                                </p>
                                <BubbleList
                                    items={[
                                        'Track-specific study decks',
                                        'Join conferences without leaving the app',
                                        'Score breakdowns by subject area',
                                    ]}
                                />
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-[#e6ddd3] shadow-xl shadow-primary/5 dark:border-white/10">
                                <img
                                    src="https://res.cloudinary.com/dll6it35i/image/upload/v1773030568/3_collge_pupz05.png"
                                    alt="Study materials and results"
                                    className="aspect-video w-full object-cover object-top"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="stories" className="border-y border-[#e6ddd3] bg-white/50 py-20 md:py-24 dark:border-white/10 dark:bg-white/5">
                <div className="mx-auto max-w-[1200px] px-6 md:px-8">
                    <div className="mb-8 max-w-2xl">
                        <Eyebrow>Reviewee stories</Eyebrow>
                        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-[#1A0E0E] md:text-4xl dark:text-white">
                            What a review week can look like.
                        </h2>
                    </div>

                    {/* Placeholder disclaimer — required: these are not real reviewees */}
                    <div className="mb-10 flex items-start gap-3 rounded-xl border border-secondary/50 bg-secondary/10 p-4">
                        <span className="material-symbols-outlined mt-0.5 text-[20px] text-[#8a6a10] dark:text-secondary">info</span>
                        <div>
                            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6a10] dark:text-secondary">
                                Sample content
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                These quotes are <strong>illustrative placeholders, not real reviewees</strong>. We&rsquo;ll
                                replace them with genuine stories once reviewees choose to share them.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {TESTIMONIALS.map((t) => (
                            <figure
                                key={t.name}
                                className="flex flex-col justify-between rounded-2xl border border-[#e6ddd3] bg-[#F7F4EE] p-6 dark:border-white/10 dark:bg-[#230f0f]"
                            >
                                <div>
                                    <div className="mb-4 flex gap-0.5 text-secondary" aria-label={`${t.stars} out of 5`}>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className="material-symbols-outlined text-[18px]"
                                                style={{
                                                    fontVariationSettings: `'FILL' ${i < t.stars ? 1 : 0}`,
                                                }}
                                            >
                                                star
                                            </span>
                                        ))}
                                    </div>
                                    <blockquote className="text-[15px] italic leading-relaxed text-[#3a2727] dark:text-gray-200">
                                        &ldquo;{t.quote}&rdquo;
                                    </blockquote>
                                </div>
                                <figcaption className="mt-6 flex items-center gap-3">
                                    <InitialsAvatar initials={t.initials} />
                                    <div>
                                        <p className="text-sm font-semibold text-[#1A0E0E] dark:text-white">{t.name}</p>
                                        <p className="font-mono text-[11px] tracking-wide text-primary/80 dark:text-secondary/80">
                                            {t.track} · sample
                                        </p>
                                    </div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-primary py-16 md:py-20">
                <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-6 text-center">
                    <Eyebrow className="text-secondary dark:text-secondary">Ready when you are</Eyebrow>
                    <h2 className="font-serif text-3xl font-semibold text-white md:text-4xl">
                        Your CNU account is your way in.
                    </h2>
                    <p className="max-w-xl text-lg leading-relaxed text-white/85">
                        Register with your @cnu.edu.ph email, get approved by an admin, and start your LET review
                        this week.
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="mt-2 rounded-lg bg-secondary px-8 py-3.5 font-semibold text-[#1A0E0E] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#ffca4d]"
                    >
                        Create your account
                    </button>
                </div>
            </section>
        </MarketingLayout>
    );
};

export default LandingPage;
