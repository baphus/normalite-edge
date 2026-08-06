import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TakeExamPage from '@/pages/TakeExamPage';
import { StreakProvider } from '@/contexts/StreakContext';
import { MotionProvider } from '@/providers/MotionProvider';

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
    },
}));

vi.mock('@/lib/axios', () => ({ default: apiMock }));

const attemptPayload = {
    id: 'attempt-1',
    status: 'IN_PROGRESS',
    enforceExamSingleTab: false,
    tabSwitchGraceSeconds: 5,
    endsAt: null,
    remainingSeconds: 3600,
    currentQuestionIndex: 0,
    exam: {
        id: 'exam-1',
        title: 'Mock Exam',
        subject: 'Biology',
        timeLimit: 60,
        totalItems: 2,
        questions: [
            { id: 'q1', orderNo: 1, text: 'What is 2+2?', choices: ['3', '4', '5', '6'], section: 'Section A' },
            { id: 'q2', orderNo: 2, text: 'What is water made of?', choices: ['H2O', 'CO2', 'NaCl', 'O2'], section: 'Section A' },
        ],
    },
    answers: {},
    answerMeta: {},
};

const renderPage = (initialEntry = '/exams/exam-1/take') => {
    return render(
        <MotionProvider>
            <StreakProvider>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <Routes>
                        <Route path="/exams/:id/take" element={<TakeExamPage />} />
                    </Routes>
                </MemoryRouter>
            </StreakProvider>
        </MotionProvider>
    );
};

const setNavigatorOnline = (online: boolean) => {
    // jsdom's `navigator.onLine` is a read-only prototype getter, so replace
    // the global navigator object with one carrying a plain `onLine` value.
    vi.stubGlobal('navigator', { ...window.navigator, onLine: online });
};

beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.put.mockReset();
    apiMock.patch.mockReset();
    apiMock.get.mockResolvedValue({ data: { data: {} } });
    setNavigatorOnline(true);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('TakeExamPage', () => {
    it('shows offline message when navigator.onLine is false', () => {
        setNavigatorOnline(false);

        renderPage();

        expect(screen.getByText(/Exams require an internet connection/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to exams/i })).toBeInTheDocument();
        // Offline guard must skip fetching an attempt entirely.
        expect(apiMock.post).not.toHaveBeenCalled();
    });

    it('renders answer sheet on mobile viewport', async () => {
        window.innerWidth = 375;
        apiMock.post.mockResolvedValue({ data: { data: attemptPayload } });

        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /start exam and timer/i }));

        // Attempt loads and the first question appears.
        expect(await screen.findByText('What is 2+2?')).toBeInTheDocument();

        // The mobile "Questions" button opens the answer-sheet navigator.
        fireEvent.click(screen.getByRole('button', { name: /questions/i }));
        expect(await screen.findByText('Section Navigator')).toBeInTheDocument();
    });
});
