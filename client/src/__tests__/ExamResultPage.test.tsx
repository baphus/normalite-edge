import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ExamResultPage from '@/pages/ExamResultPage';
import { MotionProvider } from '@/providers/MotionProvider';
import { StreakProvider } from '@/contexts/StreakContext';

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
    },
}));

vi.mock('@/lib/axios', () => ({ default: apiMock }));

const resultPayload = {
    id: 'att1',
    examId: 'exam-1',
    attemptNo: 1,
    submittedAt: '2026-08-05T10:00:00.000Z',
    timeSpentSeconds: 600,
    percentage: 85,
    exam: { id: 'exam-1', title: 'Mock Exam' },
    stats: { totalQuestions: 10, correct: 5, incorrect: 3, skipped: 2, answered: 8, accuracy: 85 },
    sections: [
        { name: 'Professional Education', total: 5, correct: 3, answered: 4, incorrect: 1, skipped: 1, score: 60 },
        { name: 'General Education', total: 5, correct: 2, answered: 4, incorrect: 2, skipped: 1, score: 40 },
    ],
    questionDetails: [],
};

const renderPage = (initialEntry = '/exams/exam-1/result?attemptId=att1') => {
    return render(
        <MotionProvider>
            <StreakProvider>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <Routes>
                        <Route path="/exams/:id/result" element={<ExamResultPage />} />
                    </Routes>
                </MemoryRouter>
            </StreakProvider>
        </MotionProvider>
    );
};

beforeEach(() => {
    apiMock.get.mockReset();
});

describe('ExamResultPage', () => {
    it('renders skeleton loading state', () => {
        // Both the attempt list and the result fetch stay pending, so the
        // page must remain in its skeleton state.
        apiMock.get.mockImplementation(() => new Promise(() => {}));

        renderPage();

        expect(screen.getByTestId('exam-result-skeleton')).toBeInTheDocument();
    });

    it('renders scores when data loads', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/attempts') {
                return Promise.resolve({
                    data: {
                        data: [
                            { id: 'att1', status: 'SUBMITTED', submittedAt: '2026-08-05T10:00:00.000Z', attemptNo: 1 },
                        ],
                    },
                });
            }
            if (url === '/attempts/att1/result') {
                return Promise.resolve({ data: { data: resultPayload } });
            }
            return Promise.reject(new Error(`Unexpected url: ${url}`));
        });

        renderPage();

        expect(await screen.findByText('5 correct out of 10 questions')).toBeInTheDocument();
    });
});
