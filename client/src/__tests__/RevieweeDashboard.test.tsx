import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
            <RevieweeDashboard stats={{ ...stats, ...overrides }} />
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
        return Promise.resolve({ data: { data: [] } });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { data: null } });
});

describe('RevieweeDashboard', () => {
    it('renders stat tiles from the provided stats', async () => {
        renderDashboard();

        // Flush the self-fetching sections' effects so no act warnings remain.
        await screen.findByText('No question available today.');

        // All four tile labels come from the provided stats.
        expect(screen.getByText('Total decks')).toBeInTheDocument();
        expect(screen.getByText('Exams taken')).toBeInTheDocument();
        expect(screen.getByText('Avg score')).toBeInTheDocument();
        expect(screen.getByText('Streak')).toBeInTheDocument();

        // Tile values are scoped to the tile grid because the calendar widget
        // renders day numbers that would otherwise collide with them.
        const tiles = within(screen.getByTestId('reviewee-stat-tiles'));
        expect(tiles.getByText('12')).toBeInTheDocument();
        expect(tiles.getByText('3')).toBeInTheDocument();
        expect(tiles.getByText('68%')).toBeInTheDocument();
        expect(tiles.getByText('0')).toBeInTheDocument();
        // Hero + tile both render the average.
        expect(screen.getAllByText('68%').length).toBeGreaterThan(0);
    });

    it('renders every dashboard section component', async () => {
        renderDashboard();

        // ExamReadinessHero
        expect(screen.getByText('Exam readiness')).toBeInTheDocument();
        // StatTiles
        expect(screen.getByText('Total decks')).toBeInTheDocument();
        // StudyProgressStrip (fetch-driven)
        expect(await screen.findByText('Study progress')).toBeInTheDocument();
        // DailyChallenge
        expect(await screen.findByText('Daily challenge')).toBeInTheDocument();
        // SubjectPerformance
        expect(screen.getByText('Subject performance')).toBeInTheDocument();
        // RecentAttempts
        expect(screen.getByText('Recent mock attempts')).toBeInTheDocument();
    });

    it('shows the empty state when there are no attempts', async () => {
        renderDashboard({ recentAttempts: [], overallAverage: 0, totalExamsTaken: 0 });

        expect(await screen.findByText('No attempts yet')).toBeInTheDocument();
        expect(screen.getByText('No mocks yet')).toBeInTheDocument();
    });
});
