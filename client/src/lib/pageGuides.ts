export type GuideRole = 'ADMIN' | 'REVIEWER' | 'REVIEWEE';

export type PageGuideStep = {
    title: string;
    description: string;
    selectors: string[];
};

export type PageGuide = {
    id: string;
    title: string;
    steps: PageGuideStep[];
};

const baseSteps: PageGuideStep[] = [
    {
        title: 'Primary navigation',
        description: 'Use the left sidebar to jump between sections without losing context.',
        selectors: ['[data-guide="sidebar-nav"]'],
    },
    {
        title: 'Your current workspace',
        description: 'This main area updates by page and contains the core content and actions.',
        selectors: ['[data-guide="page-content"]'],
    },
    {
        title: 'Your profile shortcut',
        description: 'Open your profile quickly from here to update your photo and details.',
        selectors: ['[data-guide="profile-entry"]'],
    },
];

const pageGuideMap: Array<{ matcher: RegExp; build: (role: GuideRole) => PageGuide }> = [
    {
        matcher: /^\/dashboard$/,
        build: (role) => ({
            id: 'guide-dashboard',
            title: 'Dashboard walkthrough',
            steps: [
                {
                    title: 'Dashboard access',
                    description: 'Start from Dashboard to see high-level metrics and quick actions.',
                    selectors: ['[data-guide-nav="/dashboard"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Overview cards',
                    description: role === 'REVIEWER'
                        ? 'Track your created exams, decks, student attempts, and upcoming conferences here.'
                        : role === 'REVIEWEE'
                            ? 'Track your study progress, exam readiness, and today\'s key tasks from this panel.'
                            : 'This area surfaces your most important stats for fast decision-making.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/study$/,
        build: () => ({
            id: 'guide-study-hub',
            title: 'Study hub walkthrough',
            steps: [
                {
                    title: 'Study hub access',
                    description: 'Start here to browse study materials and continue learning sessions.',
                    selectors: ['[data-guide-nav="/study"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Learning workspace',
                    description: 'Use this page to pick materials, resume sessions, and stay organized.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/study\/[^/]+\/view$/,
        build: () => ({
            id: 'guide-study-material-view',
            title: 'Material view walkthrough',
            steps: [
                {
                    title: 'Material details',
                    description: 'Review this material content carefully before starting a session.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'Next action',
                    description: 'Use available actions here to start or continue your study flow.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/study\/[^/]+$/,
        build: () => ({
            id: 'guide-study-session',
            title: 'Study session walkthrough',
            steps: [
                {
                    title: 'Active session',
                    description: 'This page is your active study mode for focused learning.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'Session controls',
                    description: 'Use the controls on this page to navigate and track your progress.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/materials(\/.*)?$/,
        build: () => ({
            id: 'guide-materials',
            title: 'Materials walkthrough',
            steps: [
                {
                    title: 'Open this section',
                    description: 'Materials is where you create and maintain study deck content.',
                    selectors: ['[data-guide-nav="/materials"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Content area',
                    description: 'Use filters, search, and content cards in this area to stay organized.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/exams$/,
        build: () => ({
            id: 'guide-exams-list',
            title: 'Exams list walkthrough',
            steps: [
                {
                    title: 'Exams access',
                    description: 'Open this section to view your assigned and available exams.',
                    selectors: ['[data-guide-nav="/exams"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Exam list panel',
                    description: 'Use this page to start, continue, and monitor exam attempts.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/exams\/[^/]+\/view$/,
        build: () => ({
            id: 'guide-exam-view',
            title: 'Exam preview walkthrough',
            steps: [
                {
                    title: 'Exam overview',
                    description: 'Review exam details and readiness notes before taking the exam.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'Start guidance',
                    description: 'Use available actions to begin when you are prepared.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/exams\/[^/]+\/take$/,
        build: () => ({
            id: 'guide-exam-take',
            title: 'Exam taking walkthrough',
            steps: [
                {
                    title: 'Focused exam mode',
                    description: 'This is your active exam environment. Stay focused and answer carefully.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'Navigation and submit',
                    description: 'Use question navigation and submit controls to complete your attempt.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/exams\/[^/]+\/result$/,
        build: () => ({
            id: 'guide-exam-result',
            title: 'Exam result walkthrough',
            steps: [
                {
                    title: 'Result summary',
                    description: 'Review your score and high-level performance insights here.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'What to improve next',
                    description: 'Use your results to identify weak areas for your next study session.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/exams\/[^/]+\/review$/,
        build: () => ({
            id: 'guide-exam-review',
            title: 'Exam review walkthrough',
            steps: [
                {
                    title: 'Answer review',
                    description: 'Inspect each question here to understand mistakes and corrections.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                {
                    title: 'Learning feedback',
                    description: 'Use rationales and feedback to improve future performance.',
                    selectors: ['[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/manage-exams(\/.*)?$/,
        build: () => ({
            id: 'guide-manage-exams',
            title: 'Exam workspace walkthrough',
            steps: [
                {
                    title: 'Open exams',
                    description: 'Use this to manage your exam lifecycle from draft to published.',
                    selectors: ['[data-guide-nav="/manage-exams"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Exam panel',
                    description: 'This panel is your working area for exam actions, status, and progress.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/students(\/.*)?$/,
        build: () => ({
            id: 'guide-students',
            title: 'Students walkthrough',
            steps: [
                {
                    title: 'Students section',
                    description: 'Access student management here to monitor progress and intervention needs.',
                    selectors: ['[data-guide-nav="/students"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Student records area',
                    description: 'Use this area to inspect learner data and make support decisions.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/calendar$/,
        build: () => ({
            id: 'guide-calendar',
            title: 'Calendar walkthrough',
            steps: [
                {
                    title: 'Calendar access',
                    description: 'Open calendar to coordinate events, exams, and conference schedules.',
                    selectors: ['[data-guide-nav="/calendar"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Schedule view',
                    description: 'Plan ahead from this panel to prevent conflicts and missed deadlines.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/conferences$/,
        build: () => ({
            id: 'guide-conferences',
            title: 'Conferences walkthrough',
            steps: [
                {
                    title: 'Conferences section',
                    description: 'Use this area to schedule and run support sessions.',
                    selectors: ['[data-guide-nav="/conferences"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Session panel',
                    description: 'Review upcoming meetings and conference details in this panel.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/notifications$/,
        build: () => ({
            id: 'guide-notifications',
            title: 'Notifications walkthrough',
            steps: [
                {
                    title: 'Notifications access',
                    description: 'Open this section to monitor updates and announcements.',
                    selectors: ['[data-guide-nav="/notifications"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Notification feed',
                    description: 'Prioritize unread items from this feed to stay current.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/settings$/,
        build: () => ({
            id: 'guide-settings',
            title: 'Settings walkthrough',
            steps: [
                {
                    title: 'Settings access',
                    description: 'Settings lets you tune preferences and account behavior.',
                    selectors: ['[data-guide-nav="/settings"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Configuration panel',
                    description: 'Use this panel to update defaults, preferences, and controls.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(2),
            ],
        }),
    },
    {
        matcher: /^\/profile$/,
        build: () => ({
            id: 'guide-profile',
            title: 'Profile walkthrough',
            steps: [
                {
                    title: 'Profile shortcut',
                    description: 'This is the fastest way to open your profile from any page.',
                    selectors: ['[data-guide="profile-entry"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Profile details area',
                    description: 'Keep your profile photo and details accurate for better collaboration.',
                    selectors: ['[data-guide="page-content"] h1', '[data-guide="page-content"]'],
                },
                ...baseSteps.slice(0, 2),
            ],
        }),
    },
];

export const resolvePageGuide = (pathname: string, role: GuideRole): PageGuide | null => {
    const item = pageGuideMap.find((entry) => entry.matcher.test(pathname));
    return item ? item.build(role) : null;
};
