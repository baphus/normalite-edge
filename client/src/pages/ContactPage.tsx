import React, { useState } from 'react';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import { PageHero } from '@/components/marketing/Primitives';

const SUPPORT_EMAIL = 'support@cnu.edu.ph';

const ContactPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = encodeURIComponent(`Normalite EDGE enquiry from ${name || 'a reviewee'}`);
        const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`);
        // No backend endpoint exists for contact submissions, so we open the
        // visitor's mail client pre-filled rather than pretend to send.
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    };

    const fieldClass =
        'w-full rounded-lg border border-[#e6ddd3] bg-white px-4 py-3 text-[15px] text-[#1A0E0E] outline-none transition-colors placeholder:text-[#a9998f] focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white';

    return (
        <MarketingLayout>
            <PageHero
                eyebrow="Contact"
                title="Get in touch."
                subtitle="Questions about your account, an exam, or the platform? Send us a note and we’ll get back to you."
            />

            <section className="py-16 md:py-20">
                <div className="mx-auto grid max-w-[1000px] gap-12 px-6 md:grid-cols-[1fr_1.2fr] md:px-8">
                    {/* Details */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                                Email
                            </p>
                            <a
                                href={`mailto:${SUPPORT_EMAIL}`}
                                className="mt-1 block text-lg font-medium text-[#1A0E0E] hover:text-primary dark:text-white dark:hover:text-secondary"
                            >
                                {SUPPORT_EMAIL}
                            </a>
                        </div>
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70 dark:text-secondary/70">
                                Address
                            </p>
                            <p className="mt-1 text-[15px] leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                Cebu Normal University
                                <br />
                                Osmeña Blvd, Cebu City
                                <br />
                                6000, Philippines
                            </p>
                        </div>
                        <div className="rounded-xl border border-secondary/50 bg-secondary/10 p-4">
                            <p className="text-sm leading-relaxed text-[#4a3a3a] dark:text-gray-300">
                                For account approval or password issues, include your{' '}
                                <span className="font-medium">@cnu.edu.ph</span> email so we can find your record faster.
                            </p>
                        </div>
                    </div>

                    {/* Form (opens the visitor's mail client) */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium text-[#3a2727] dark:text-gray-200">
                                Your name
                            </label>
                            <input
                                id="c-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={fieldClass}
                                placeholder="Juan Dela Cruz"
                            />
                        </div>
                        <div>
                            <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium text-[#3a2727] dark:text-gray-200">
                                Your email
                            </label>
                            <input
                                id="c-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={fieldClass}
                                placeholder="you@cnu.edu.ph"
                            />
                        </div>
                        <div>
                            <label htmlFor="c-message" className="mb-1.5 block text-sm font-medium text-[#3a2727] dark:text-gray-200">
                                Message
                            </label>
                            <textarea
                                id="c-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                rows={5}
                                className={`${fieldClass} resize-y`}
                                placeholder="How can we help?"
                            />
                        </div>
                        <button
                            type="submit"
                            className="mt-1 self-start rounded-lg bg-primary px-7 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#5a1010]"
                        >
                            Open email to send
                        </button>
                        <p className="text-xs text-[#6B5B5B] dark:text-gray-400">
                            This opens your email app with the message ready to send to {SUPPORT_EMAIL}.
                        </p>
                    </form>
                </div>
            </section>
        </MarketingLayout>
    );
};

export default ContactPage;
