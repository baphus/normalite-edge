import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/lib/axios';
import RevieweeMaterialViewPage from '@/pages/RevieweeMaterialViewPage';

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
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

const MOCK_DECK = {
    id: 'deck-1',
    title: 'Gen Ed Set A',
    description: 'Core concepts for the LET.',
    category: 'General Education',
    visibility: 'PUBLISHED',
    createdAt: '2026-07-01T00:00:00Z',
    tracks: [{ id: 'track-1', name: 'BSED' }],
    creator: { id: 'admin-1', name: 'Admin User' },
    questions: [
        {
            id: 'q-1',
            orderNo: 1,
            questionText: 'What is 2 + 2?',
            choiceA: '3',
            choiceB: '4',
            choiceC: '5',
            choiceD: '6',
            correctChoice: 'B',
            rationalization: 'Basic arithmetic.',
        },
    ],
};

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={['/study/deck-1/view']}>
            <Routes>
                <Route path="/study/:id/view" element={<RevieweeMaterialViewPage />} />
            </Routes>
        </MemoryRouter>,
    );

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: { data: MOCK_DECK } });
});

describe('RevieweeMaterialViewPage', () => {
    it('shows a loading skeleton while the deck is being fetched', async () => {
        let resolveFetch: (value: unknown) => void = () => undefined;
        vi.mocked(api.get).mockImplementationOnce(
            () => new Promise((resolve) => { resolveFetch = resolve; }),
        );

        renderPage();

        expect(screen.getByRole('status')).toHaveTextContent('Loading material…');
        resolveFetch({ data: { data: MOCK_DECK } });
        await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    });

    it('renders the material header and facts from a loaded deck', async () => {
        renderPage();

        const heading = await screen.findByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('Gen Ed Set A');
        expect(screen.getByText('1 card')).toBeInTheDocument();
        expect(screen.getByText('Core concepts for the LET.')).toBeInTheDocument();
    });

    it('shows an empty state when the deck has no questions', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: { ...MOCK_DECK, questions: [] } },
        });

        renderPage();

        expect(await screen.findByText('No questions yet')).toBeInTheDocument();
        const studyButton = screen.getByRole('button', { name: /study/i });
        expect(studyButton).toBeDisabled();
    });

    it('renders a question with its correct answer and rationalization', async () => {
        renderPage();

        expect(await screen.findByText('What is 2 + 2?')).toBeInTheDocument();
        expect(screen.getByText('B. 4')).toBeInTheDocument();
        expect(screen.getByText('Basic arithmetic.')).toBeInTheDocument();
    });

    it('shows an error state with retry when the fetch fails', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(new Error('network down'));

        renderPage();

        expect(await screen.findByText('Unable to load material details right now.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

        vi.mocked(api.get).mockResolvedValue({ data: { data: MOCK_DECK } });
        screen.getByRole('button', { name: /retry/i }).click();
        expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Gen Ed Set A');
    });
});
