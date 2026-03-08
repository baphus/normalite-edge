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

const pageGuideMap: Array<{ matcher: RegExp; build: () => PageGuide }> = [
    {
        matcher: /^\/dashboard$/,
        build: () => ({
            id: 'guide-dashboard',
            title: 'Dashboard walkthrough',
            steps: [
                {
                    title: 'Main navigation',
                    description: 'This is your main route switcher. Start here to jump between Dashboard, Study, and Exams.',
                    selectors: ['[data-guide="sidebar-nav"]', '[data-guide-nav="/dashboard"]'],
                },
                {
                    title: 'Daily challenge',
                    description: 'Use this card to quickly start your recommended challenge for today.',
                    selectors: ['[data-guide="dashboard-daily-challenge"]'],
                },
                {
                    title: 'Learning activity panels',
                    description: 'Track recent attempts and continue where you left off from this main panel area.',
                    selectors: ['[data-guide="dashboard-primary-panel"]', '[data-guide="dashboard-side-panel"]'],
                },
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
                    title: 'Study navigation',
                    description: 'Open Study from the sidebar whenever you need to browse decks or continue sessions.',
                    selectors: ['[data-guide-nav="/study"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Study search',
                    description: 'Type keywords here to find a specific deck or topic quickly.',
                    selectors: ['[data-guide="study-search"]'],
                },
                {
                    title: 'Filters and results',
                    description: 'Use these filters to narrow materials, then pick a card from the results to open or resume.',
                    selectors: ['[data-guide="study-filters"]', '[data-guide="study-results"]'],
                },
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
                    title: 'Material overview',
                    description: 'Read the title and overview first so you know what this deck covers.',
                    selectors: ['[data-guide="material-header"]'],
                },
                {
                    title: 'Start studying',
                    description: 'Use this button to begin or continue your study session for this material.',
                    selectors: ['[data-guide="material-start-btn"]'],
                },
                {
                    title: 'Deck metadata and questions',
                    description: 'Check deck details and scan the question list before you begin.',
                    selectors: ['[data-guide="material-meta"]', '[data-guide="material-question-list"]'],
                },
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
                    title: 'Session header',
                    description: 'Use this header to confirm where you are and leave the session if needed.',
                    selectors: ['[data-guide="session-header"]'],
                },
                {
                    title: 'Progress tracking',
                    description: 'This progress bar shows how far you are in the current session.',
                    selectors: ['[data-guide="session-progress"]'],
                },
                {
                    title: 'Question and answers',
                    description: 'Read the current question here and choose your answer option below.',
                    selectors: ['[data-guide="session-question-card"]', '[data-guide="session-answer-options"]'],
                },
                {
                    title: 'Move through cards',
                    description: 'Use previous/next controls to navigate, and note keyboard shortcuts for faster review.',
                    selectors: ['[data-guide="session-nav-controls"]', '[data-guide="session-keyboard-hint"]'],
                },
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
                    title: 'Exams navigation',
                    description: 'Open Exams from the sidebar to find available tests and attempt history.',
                    selectors: ['[data-guide-nav="/exams"]', '[data-guide="sidebar-nav"]'],
                },
                {
                    title: 'Find the right exam',
                    description: 'Use search and filters to quickly locate exams by title, status, or category.',
                    selectors: ['[data-guide="exams-search"]', '[data-guide="exams-filters"]'],
                },
                {
                    title: 'Exam actions',
                    description: 'Use action buttons on each exam card to view details, continue attempts, or start.',
                    selectors: ['[data-guide="exam-card-actions"]', '[data-guide^="exams-section-"]', '[data-guide="exams-results"]'],
                },
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
                    title: 'Exam preview header',
                    description: 'Confirm the exam title and context here before starting.',
                    selectors: ['[data-guide="exam-preview-header"]'],
                },
                {
                    title: 'Exam details and requirements',
                    description: 'Review metadata and guidance so you know the rules and expectations.',
                    selectors: ['[data-guide="exam-preview-metadata"]', '[data-guide="exam-preview-social-proof"]'],
                },
                {
                    title: 'Start action',
                    description: 'Use this action area to begin your attempt once you are ready.',
                    selectors: ['[data-guide="exam-preview-actions"]', '[data-guide="exam-preview-start-btn"]'],
                },
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
                    title: 'Exam control bar',
                    description: 'Monitor time and progress from the top while taking the exam.',
                    selectors: ['[data-guide="exam-take-header"]', '[data-guide="exam-take-timer"]', '[data-guide="exam-take-progress"]'],
                },
                {
                    title: 'Question workspace',
                    description: 'Read each question and select an answer choice in this main panel.',
                    selectors: ['[data-guide="exam-take-question"]', '[data-guide="exam-take-choices"]'],
                },
                {
                    title: 'Question navigation',
                    description: 'Move between questions here, or jump directly using the question navigator.',
                    selectors: ['[data-guide="exam-take-question-nav"]', '[data-guide="exam-take-navigator"]'],
                },
                {
                    title: 'Submit attempt',
                    description: 'Use this submit button only after checking unanswered items in the navigator.',
                    selectors: ['[data-guide="exam-take-submit-btn"]'],
                },
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
                    title: 'Result header and attempts',
                    description: 'Use this header to switch attempts and compare your performance history.',
                    selectors: ['[data-guide="exam-result-header"]', '[data-guide="exam-result-attempt-selector"]'],
                },
                {
                    title: 'Score snapshot',
                    description: 'Read this score hero for your quick summary: score, correct/incorrect, and pacing.',
                    selectors: ['[data-guide="exam-result-score-hero"]'],
                },
                {
                    title: 'Performance analysis',
                    description: 'Use section and question breakdowns to identify weak areas and specific mistakes.',
                    selectors: ['[data-guide="exam-result-section-breakdown"]', '[data-guide="exam-result-question-snapshot"]'],
                },
                {
                    title: 'Next step actions',
                    description: 'Use Review Answers for detailed feedback, or Retake when you are ready to retry.',
                    selectors: ['[data-guide="exam-result-actions"]', '[data-guide="exam-result-summary"]', '[data-guide="exam-result-answer-breakdown"]'],
                },
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
                    title: 'Review header and attempt picker',
                    description: 'Use the attempt selector to compare how your answers changed across tries.',
                    selectors: ['[data-guide="exam-review-header"]', '[data-guide="exam-review-attempt-selector"]'],
                },
                {
                    title: 'Filter reviewed questions',
                    description: 'Use these filters to focus on wrong answers, skipped items, or a specific section.',
                    selectors: ['[data-guide="exam-review-filters"]'],
                },
                {
                    title: 'Detailed answer analysis',
                    description: 'Inspect each question card to review your choice, the correct answer, and explanation.',
                    selectors: ['[data-guide="exam-review-list"]'],
                },
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
                    title: 'Schedule workspace',
                    description: 'Plan your week from this view to avoid conflicts and missed deadlines.',
                    selectors: ['[data-guide="page-content"]'],
                },
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
                    selectors: ['[data-guide="page-content"]'],
                },
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
                    selectors: ['[data-guide="page-content"]'],
                },
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
                    selectors: ['[data-guide="page-content"]'],
                },
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
                    selectors: ['[data-guide="page-content"]'],
                },
            ],
        }),
    },
];

export const resolvePageGuide = (pathname: string, role: GuideRole): PageGuide | null => {
    if (role !== 'REVIEWEE') {
        return null;
    }

    const item = pageGuideMap.find((entry) => entry.matcher.test(pathname));
    return item ? item.build() : null;
};
