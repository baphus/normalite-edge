import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocument, { LegalSection } from '@/components/marketing/LegalDocument';

const sections: LegalSection[] = [
    {
        id: 'scope',
        heading: 'Scope of this policy',
        body: (
            <p>
                This Privacy Policy explains how Normalite EDGE (&ldquo;the platform&rdquo;) collects, uses, stores, and
                protects your personal data when you register for and use the service. It is designed to align with the
                Philippine <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, its Implementing Rules and
                Regulations, and the issuances of the National Privacy Commission (NPC).
            </p>
        ),
    },
    {
        id: 'controller',
        heading: 'Who is responsible for your data',
        body: (
            <>
                <p>
                    The personal information controller for the platform is <strong>[LEGAL ENTITY NAME — e.g. Cebu Normal
                    University]</strong>. Questions about your data or this policy can be directed to our Data Protection
                    Officer:
                </p>
                <ul>
                    <li>Data Protection Officer: <strong>[DPO NAME — TBD]</strong></li>
                    <li>Email: <strong>[privacy@cnu.edu.ph — TBD]</strong></li>
                    <li>Address: Osmeña Blvd, Cebu City, 6000, Philippines</li>
                </ul>
            </>
        ),
    },
    {
        id: 'data-we-collect',
        heading: 'Information we collect',
        body: (
            <>
                <p>We collect only what the platform needs to operate:</p>
                <ul>
                    <li><strong>Account details</strong> you provide at registration: first name, middle initial, last name, suffix (optional), program track, campus, year level, section, and your @cnu.edu.ph email address.</li>
                    <li><strong>Profile data</strong>, such as a profile photo, if you choose to upload one.</li>
                    <li><strong>Learning activity</strong>: exam attempts, answers, scores, materials you view, and conferences you join.</li>
                    <li><strong>Technical data</strong>: log information such as device, browser, and approximate access times, used for security and troubleshooting.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'lawful-basis',
        heading: 'Our lawful basis for processing',
        body: (
            <>
                <p>Under the Data Privacy Act, we rely on one or more of the following bases:</p>
                <ul>
                    <li><strong>Consent</strong> — you agree to this policy when you create an account.</li>
                    <li><strong>Contract</strong> — processing needed to provide the review services you sign up for.</li>
                    <li><strong>Legitimate interests</strong> — keeping the platform secure and improving it, balanced against your rights.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'how-we-use',
        heading: 'How we use your information',
        body: (
            <ul>
                <li>To create and administer your account and verify eligibility (CNU email + admin approval).</li>
                <li>To deliver mock exams, study materials, conferences, and score analytics.</li>
                <li>To communicate with you about your account, approvals, and platform updates.</li>
                <li>To maintain security, prevent misuse, and comply with legal obligations.</li>
            </ul>
        ),
    },
    {
        id: 'sharing',
        heading: 'When we share information',
        body: (
            <>
                <p>We do not sell your personal data. We share it only:</p>
                <ul>
                    <li>With <strong>reviewers and administrators</strong> of the platform, to manage your review and track progress.</li>
                    <li>With <strong>service providers</strong> that operate parts of the platform under confidentiality obligations (for example, image hosting and video-conferencing providers).</li>
                    <li>When <strong>required by law</strong> or a lawful order of a competent authority.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'retention',
        heading: 'How long we keep it',
        body: (
            <p>
                We keep your personal data only as long as your account is active or as needed to provide the service,
                and thereafter only as required for legitimate or legal purposes. Retention periods will be documented
                in an internal retention schedule <strong>[RETENTION PERIODS — TBD]</strong>, after which data is
                securely deleted or anonymized.
            </p>
        ),
    },
    {
        id: 'security',
        heading: 'How we protect it',
        body: (
            <p>
                We apply organizational, physical, and technical safeguards appropriate to the risk, including access
                controls, role-based permissions, encryption of data in transit, and activity logging. These measures
                are maintained in line with recognized information-security practices (e.g. ISO/IEC 27001 control
                objectives). No system is perfectly secure, but we work to protect your data and to review our controls
                regularly.
            </p>
        ),
    },
    {
        id: 'your-rights',
        heading: 'Your rights',
        body: (
            <>
                <p>As a data subject under the Data Privacy Act, you have the right to:</p>
                <ul>
                    <li>be <strong>informed</strong> about how your data is processed;</li>
                    <li><strong>access</strong> your personal data;</li>
                    <li><strong>correct</strong> inaccurate or outdated data;</li>
                    <li>object to processing, or request <strong>erasure or blocking</strong> in the circumstances allowed by law;</li>
                    <li><strong>data portability</strong> for data you provided;</li>
                    <li>be <strong>indemnified</strong> for damages from unlawful processing; and</li>
                    <li>lodge a <strong>complaint with the National Privacy Commission</strong>.</li>
                </ul>
                <p>To exercise these rights, contact our Data Protection Officer using the details above.</p>
            </>
        ),
    },
    {
        id: 'breach',
        heading: 'Data breach notification',
        body: (
            <p>
                If a personal data breach occurs that is likely to put your rights and freedoms at risk, we will notify
                the National Privacy Commission and affected data subjects within the timelines required by law
                (generally within <strong>72 hours</strong> of knowledge of the breach), and describe the measures taken
                to address it.
            </p>
        ),
    },
    {
        id: 'cookies',
        heading: 'Cookies and analytics',
        body: (
            <p>
                The platform uses cookies or similar technologies necessary to keep you signed in and to remember your
                preferences. If we introduce analytics or non-essential cookies, we will update this section and, where
                required, ask for your consent. <strong>[ANALYTICS PROVIDERS — TBD]</strong>
            </p>
        ),
    },
    {
        id: 'children',
        heading: 'Age of users',
        body: (
            <p>
                The platform is intended for CNU reviewees. If we learn that we have collected data from someone not
                permitted to use the service, we will delete it. <strong>[MINIMUM-AGE POSITION — TBD]</strong>
            </p>
        ),
    },
    {
        id: 'changes',
        heading: 'Changes to this policy',
        body: (
            <p>
                We may update this policy as the platform evolves or as the law requires. We will revise the
                &ldquo;last updated&rdquo; date above and, for material changes, provide a clearer notice.
            </p>
        ),
    },
    {
        id: 'contact',
        heading: 'Contact us',
        body: (
            <p>
                For any privacy question or to exercise your rights, reach our Data Protection Officer at the details in
                section 02, or use the <Link to="/contact">contact page</Link>.
            </p>
        ),
    },
];

const PrivacyPolicyPage: React.FC = () => (
    <LegalDocument
        title="Privacy Policy"
        lastUpdated="7 July 2026"
        intro={
            <p>
                Your privacy matters. This policy describes what personal data Normalite EDGE collects, why, and the
                choices and rights you have — written to line up with the Philippine Data Privacy Act of 2012.
            </p>
        }
        sections={sections}
    />
);

export default PrivacyPolicyPage;
