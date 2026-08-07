import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/providers/MotionProvider';
import { StreakProvider } from '@/contexts/StreakContext';
import RevieweeDashboard from '@/pages/dashboards/RevieweeDashboard';
import api from '@/lib/axios';
import type { RevieweeStats } from '@/components/dashboard/reviewee/types';

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'user-1',
            name: 'Test Learner',
            email: 'learner@cnu.edu.ph',
            role: 'REVIEWEE' as const,
        },
    }),
}));

const stats: RevieweeStats = {
    overallAverage: 68,
    totalMaterials: 12,
    totalExamsAvailable: 8,
    totalExamsTaken: 3,
    questionsAnswered: 1234,
    averagesBySubject: [
        { subject: 'General Education', average: 70 },
        { subject: 'Mathematics', average: 60 },
    ],
    recentAttempts: [
        {
            id: 'a1',
            score: 21,
            percentage: 70,
            status: 'SUBMITTED',
            submittedAt: '2026-08-01T10:00:00Z',
            submissionType: 'MANUAL',
            exam: {
                id: 'e1',
                title: 'LET General Education Mock 1',
                subject: 'General Education',
                timeLimitMinutes: 60,
            },
        },
        {
            id: 'a2',
            score: 15,
            percentage: 50,
            status: 'IN_PROGRESS',
            submittedAt: null,
            submissionType: 'AUTO',
            exam: {
                id: 'e2',
                title: 'Mathematics Mock 2',
                subject: 'Mathematics',
                timeLimitMinutes: 45,
            },
        },
    ],
    upcomingSessions: [],
    upcomingExams: [],
};

const renderDashboard = (overrides?: Partial<RevieweeStats>) =>
    render(
        <MemoryRouter>
            <MotionProvider>
                <StreakProvider>
                    <RevieweeDashboard stats={{ ...stats, ...overrides }} />
                </StreakProvider>
            </MotionProvider>
        </MemoryRouter>,
    );

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();

    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/dashboard/daily-question') {
            return Promise.resolve({ data: { data: null } });
        }
        if (url === '/dashboard/stats') {
            return Promise.resolve({ data: { data: { averagesBySubject: stats.averagesBySubject } } });
        }
        if (url === '/streak') {
            return Promise.resolve({ data: { data: { currentStreak: 0, longestStreak: 0, activeDays: [], lastActiveDate: null } } });
        }
        return Promise.resolve({ data: { data: [] } });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { data: null } });
});

describe('RevieweeDashboard', () => {
    it('renders stat tiles from the provided stats', async () => {
        renderDashboard();

        // Flush the self-fetching sections' effects so no act warnings remain.
        await screen.findByText('No question available today.');

        // All three tile labels come from the provided stats.
        expect(screen.getByText('Total decks')).toBeInTheDocument();
        expect(screen.getByText('Exams taken')).toBeInTheDocument();
        expect(screen.getByText('Avg score')).toBeInTheDocument();

        // Tile values are scoped to the tile grid because the calendar widget
        // renders day numbers that would otherwise collide with them.
        const tiles = within(screen.getByTestId('reviewee-stat-tiles'));
        expect(tiles.getByText('12')).toBeInTheDocument();
        expect(tiles.getByText('3')).toBeInTheDocument();
        expect(tiles.getByText('68%')).toBeInTheDocument();
        // Streak is now rendered by StreakWidget outside the stat-tiles grid.
        expect(screen.getByText('Streak')).toBeInTheDocument();
        // Hero + tile both render the average.
        expect(screen.getAllByText('68%').length).toBeGreaterThan(0);
    });

    it('renders every dashboard section component', async () => {
        renderDashboard();

        // ExamReadinessHero
        expect(screen.getByText('Exam readiness')).toBeInTheDocument();
        // StatTiles
        expect(screen.getByText('Total decks')).toBeInTheDocument();
        // DailyChallenge
        expect(await screen.findByText('Daily challenge')).toBeInTheDocument();
        // RecentAttempts
        expect(screen.getByText('Recent mock attempts')).toBeInTheDocument();
    });

    it('shows the empty state when there are no attempts', async () => {
        renderDashboard({ recentAttempts: [], overallAverage: 0, totalExamsTaken: 0 });

        expect(await screen.findByText('No attempts yet')).toBeInTheDocument();
        expect(screen.getByText('No mocks yet')).toBeInTheDocument();
    });

    it('renders the questions-answered pill with a thousands-separated count', async () => {
        renderDashboard();

        await screen.findByText('No question available today.');

        // 1234 should render as "1,234 answered"
        expect(screen.getByText('1,234 answered')).toBeInTheDocument();
    });

    it('shows 0 answered for a new user with no data', async () => {
        renderDashboard({ questionsAnswered: 0 });

        await screen.findByText('No question available today.');

        expect(screen.getByText('0 answered')).toBeInTheDocument();
    });

    it('hides the questions-answered pill when stats is null', () => {
        render(
            <MemoryRouter>
                <MotionProvider>
                    <StreakProvider>
                        <RevieweeDashboard stats={null} />
                    </StreakProvider>
                </MotionProvider>
            </MemoryRouter>,
        );

        expect(screen.queryByText(/answered/)).not.toBeInTheDocument();
    });
});
