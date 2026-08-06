import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';

/**
 * Retake logic lives behind the `startAttempt` seam in attempt.service.ts.
 * These tests pin down the retake policy:
 *
 *   - `allowMultipleAttempts` (system setting) gates the single-submission rule
 *   - `exam.maxAttempts` caps total attempts (default 3 when retakes are on)
 *   - `exam.cooldownMinutes` delays the next attempt after a submission
 *
 * No database is touched. `db.ts` consults `globalThis.__prisma__` exactly
 * once, at module scope, so the mock must be installed *before* the service
 * module loads. Static imports are hoisted, so the service is pulled in with
 * `require` after the mock is in place.
 */

const EXAM_ID = 'exam-1';
const USER_ID = 'user-1';

const QUESTIONS = [
    {
        id: 'question-1',
        orderNo: 1,
        questionText: 'What is 2 + 2?',
        imageUrl: null,
        choiceA: '1',
        choiceB: '2',
        choiceC: '3',
        choiceD: '4',
        correctChoice: 'D',
        section: { id: 'section-1', title: 'Arithmetic' },
    },
];

function baseExam(overrides: Record<string, any> = {}) {
    return {
        id: EXAM_ID,
        title: 'Retake Policy Exam',
        subject: 'Mathematics',
        timeLimitMinutes: 30,
        status: 'LIVE',
        scheduleStart: null,
        scheduleEnd: null,
        maxAttempts: null,
        cooldownMinutes: 0,
        createdBy: 'admin-1',
        questions: QUESTIONS,
        ...overrides,
    };
}

function makeAttempt(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? `attempt-${overrides.attemptNo ?? 1}`,
        examId: EXAM_ID,
        userId: USER_ID,
        attemptNo: overrides.attemptNo ?? 1,
        status: overrides.status ?? 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 30 * 60_000),
        submittedAt: overrides.submittedAt ?? null,
        lastSavedAt: new Date(),
        lastActivityAt: new Date(),
        currentQuestionIndex: 0,
        remainingSeconds: 1800,
        submissionType: 'MANUAL',
        timeSpentSeconds: 0,
        score: 0,
        percentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        exam: baseExam(),
        answers: [],
        ...overrides,
    };
}

function makeState(overrides: Record<string, any> = {}) {
    return {
        allowMultipleAttempts: true,
        exam: baseExam(),
        submittedAttempt: null as any,
        inProgressAttempt: null as any,
        latestAttempt: null as any,
        created: [] as any[],
        ...overrides,
    };
}

let state = makeState();

function resetState(overrides: Record<string, any> = {}) {
    state = makeState(overrides);
}

function createMockPrisma() {
    const tx = {
        $executeRaw: async () => 1,
        attempt: {
            findFirst: async (args: any) => {
                const where = args?.where ?? {};
                if (where.status === 'SUBMITTED') return state.submittedAttempt;
                if (where.status === 'IN_PROGRESS') return state.inProgressAttempt;
                return state.latestAttempt;
            },
            create: async (args: any) => {
                const created = makeAttempt({
                    ...args.data,
                    exam: baseExam(),
                    answers: [],
                });
                state.created.push(created);
                return created;
            },
        },
    };

    return {
        $queryRaw: async () => [{
            allow_multiple_attempts: state.allowMultipleAttempts,
            enforce_exam_single_tab: false,
            tab_switch_grace_seconds: 5,
        }],
        $executeRaw: async () => 1,
        exam: {
            updateMany: async () => ({ count: 0 }),
            findUnique: async () => state.exam,
        },
        $transaction: async (fn: any) => fn(tx),
    };
}

// Install the test double before the service module evaluates.
globalThis.__prisma__ = createMockPrisma() as unknown as PrismaClient;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { attemptService } = require('../services/attempt.service');

describe('startAttempt retake policy', () => {
    it('allows a retake when allowMultipleAttempts is enabled', async () => {
        resetState({
            allowMultipleAttempts: true,
            submittedAttempt: { id: 'submitted-1' },
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 2, 'retake should be the next attempt number');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(state.created.length, 1);
        assert.equal(state.created[0].attemptNo, 2);
    });

    it('blocks a retake when allowMultipleAttempts is disabled', async () => {
        resetState({
            allowMultipleAttempts: false,
            submittedAttempt: { id: 'submitted-1' },
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'You can only submit this mock exam once');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no attempt should be created');
    });

    it('still allows a first attempt when retakes are disabled', async () => {
        resetState({ allowMultipleAttempts: false });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 1);
        assert.equal(state.created.length, 1);
    });

    it('respects exam.maxAttempts', async () => {
        resetState({
            allowMultipleAttempts: true,
            submittedAttempt: { id: 'submitted-2' },
            latestAttempt: makeAttempt({
                attemptNo: 2,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
            exam: baseExam({ maxAttempts: 2 }),
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'Maximum attempts reached (2)');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no attempt should be created');
    });

    it('respects the cooldown between attempts', async () => {
        resetState({
            allowMultipleAttempts: true,
            submittedAttempt: { id: 'submitted-1' },
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 5 * 60_000),
            }),
            exam: baseExam({ cooldownMinutes: 10 }),
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'Please wait 5 minute(s) before starting a new attempt');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no attempt should be created');
    });

    it('allows a retake once the cooldown has expired', async () => {
        resetState({
            allowMultipleAttempts: true,
            submittedAttempt: { id: 'submitted-1' },
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 20 * 60_000),
            }),
            exam: baseExam({ cooldownMinutes: 10 }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 2, 'retake should be allowed after the cooldown has elapsed');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(state.created.length, 1);
        assert.equal(state.created[0].attemptNo, 2);
    });

    it('resumes an IN_PROGRESS attempt when retakes are disabled', async () => {
        resetState({
            allowMultipleAttempts: false,
            inProgressAttempt: makeAttempt({
                attemptNo: 1,
                status: 'IN_PROGRESS',
            }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 1, 'should resume the existing in-progress attempt');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(state.created.length, 0, 'no new attempt should be created');
    });
});
