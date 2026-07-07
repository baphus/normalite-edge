import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocument, { LegalSection } from '@/components/marketing/LegalDocument';

const sections: LegalSection[] = [
    {
        id: 'acceptance',
        heading: 'Acceptance of these terms',
        body: (
            <p>
                By creating an account or using Normalite EDGE (&ldquo;the platform&rdquo;), you agree to these Terms
                &amp; Conditions and to our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please do not
                use the platform.
            </p>
        ),
    },
    {
        id: 'eligibility',
        heading: 'Who may use the platform',
        body: (
            <p>
                The platform is for reviewees of Cebu Normal University. You must register with a valid
                <strong> @cnu.edu.ph</strong> email address, and your account must be approved by an administrator before
                you can sign in. We may decline or revoke access where eligibility cannot be verified.
            </p>
        ),
    },
    {
        id: 'accounts',
        heading: 'Your account and security',
        body: (
            <ul>
                <li>Keep your login credentials confidential; you are responsible for activity under your account.</li>
                <li>Provide accurate registration details and keep them up to date.</li>
                <li>Notify us promptly if you suspect unauthorized use of your account.</li>
            </ul>
        ),
    },
    {
        id: 'acceptable-use',
        heading: 'Acceptable use',
        body: (
            <>
                <p>You agree not to:</p>
                <ul>
                    <li>share your account or let others use it;</li>
                    <li>copy, redistribute, or resell study materials or exam content;</li>
                    <li>attempt to disrupt, probe, or gain unauthorized access to the platform;</li>
                    <li>upload unlawful, harmful, or infringing content.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'content',
        heading: 'Content and intellectual property',
        body: (
            <p>
                Study materials, mock exams, rationalizations, and other content on the platform belong to their
                respective owners and are provided for your personal review only. You may not reproduce or distribute
                them outside the platform without permission.
            </p>
        ),
    },
    {
        id: 'exam-integrity',
        heading: 'Exam and review integrity',
        body: (
            <p>
                Mock exams are practice tools. You agree to use them honestly and not to misrepresent scores or share
                answers in ways that undermine other reviewees&rsquo; preparation.
            </p>
        ),
    },
    {
        id: 'third-party',
        heading: 'Third-party services',
        body: (
            <p>
                The platform may rely on third-party services (for example, video-conferencing and media hosting). Your
                use of those features may also be subject to the providers&rsquo; own terms.
            </p>
        ),
    },
    {
        id: 'availability',
        heading: 'Availability and changes',
        body: (
            <p>
                We aim to keep the platform available but do not guarantee uninterrupted service. We may add, change, or
                remove features, and we may update these terms. Continued use after changes means you accept the updated
                terms.
            </p>
        ),
    },
    {
        id: 'disclaimer',
        heading: 'Disclaimer',
        body: (
            <p>
                The platform is a review aid provided &ldquo;as is.&rdquo; It does <strong>not guarantee any result in
                the Licensure Examination for Teachers</strong> or any other exam. Outcomes depend on many factors
                outside our control.
            </p>
        ),
    },
    {
        id: 'liability',
        heading: 'Limitation of liability',
        body: (
            <p>
                To the fullest extent permitted by law, the platform and its operators are not liable for indirect or
                consequential losses arising from your use of the service. <strong>[LIABILITY CAP / SPECIFIC CARVE-OUTS —
                TBD, subject to legal review]</strong>
            </p>
        ),
    },
    {
        id: 'termination',
        heading: 'Suspension and termination',
        body: (
            <p>
                We may suspend or terminate accounts that breach these terms or that pose a risk to the platform or other
                users. You may stop using the platform at any time.
            </p>
        ),
    },
    {
        id: 'governing-law',
        heading: 'Governing law',
        body: (
            <p>
                These terms are governed by the laws of the <strong>Republic of the Philippines</strong>. Disputes will
                be subject to the appropriate courts of <strong>[VENUE — e.g. Cebu City]</strong>.
            </p>
        ),
    },
    {
        id: 'contact',
        heading: 'Contact us',
        body: (
            <p>
                Questions about these terms? Reach us through the <Link to="/contact">contact page</Link>.
            </p>
        ),
    },
];

const TermsPage: React.FC = () => (
    <LegalDocument
        title="Terms & Conditions"
        lastUpdated="7 July 2026"
        intro={
            <p>
                These terms set out the rules for using Normalite EDGE — who can use it, what you can expect, and what we
                ask of you in return. Please read them alongside our <Link to="/privacy">Privacy Policy</Link>.
            </p>
        }
        sections={sections}
    />
);

export default TermsPage;
