import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';

/**
 * Retake logic lives behind the `startAttempt` seam in attempt.service.ts.
 * These tests pin down the retake policy:
 *
 *   - No global `allowMultipleAttempts` switch gates retakes
 *   - No `exam.maxAttempts` cap limits total attempts
 *   - No `exam.cooldownMinutes` delays the next attempt
 *   - No retakes before the deadline (or with no deadline) — one shot only
 *   - Retakes are unlimited after the deadline when `allowRetakes` is true
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
        allowRetakes: false,
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
        exam: baseExam(),
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
    it('blocks a retake before the deadline even when allowRetakes is enabled', async () => {
        resetState({
            exam: baseExam({
                scheduleEnd: new Date(Date.now() + 60_000),
                allowRetakes: true,
            }),
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'You have already submitted this exam');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no retake should be created before the deadline');
    });

    it('blocks a retake when no deadline is set even when allowRetakes is enabled', async () => {
        resetState({
            exam: baseExam({ allowRetakes: true }),
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'You have already submitted this exam');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no retake should be created without a deadline');
    });

    it('does not cap the number of retakes', async () => {
        resetState({
            exam: baseExam({
                scheduleEnd: new Date(Date.now() - 60_000),
                allowRetakes: true,
            }),
            latestAttempt: makeAttempt({
                attemptNo: 5,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 6, 'retakes should continue without an attempt cap');
        assert.equal(state.created.length, 1);
        assert.equal(state.created[0].attemptNo, 6);
    });

    it('allows a retake immediately after a submission (no cooldown)', async () => {
        resetState({
            exam: baseExam({
                scheduleEnd: new Date(Date.now() - 60_000),
                allowRetakes: true,
            }),
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(),
            }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 2, 'a retake should be allowed with no waiting period');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(state.created.length, 1);
        assert.equal(state.created[0].attemptNo, 2);
    });

    it('allows a retake after the deadline when allowRetakes is enabled', async () => {
        resetState({
            exam: baseExam({
                scheduleEnd: new Date(Date.now() - 60_000),
                allowRetakes: true,
            }),
            latestAttempt: makeAttempt({
                attemptNo: 1,
                status: 'SUBMITTED',
                submittedAt: new Date(Date.now() - 3_600_000),
            }),
        });

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 2, 'a retake should be allowed after the deadline when allowRetakes is true');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(state.created.length, 1);
        assert.equal(state.created[0].attemptNo, 2);
        assert.ok(
            new Date(result.endsAt).getTime() > Date.now(),
            'a post-deadline retake should get the full time limit, not the already-passed deadline',
        );
        assert.ok(result.remainingSeconds > 0, 'a post-deadline retake should not start already expired');
    });

    it('blocks starting an attempt after the deadline when allowRetakes is disabled', async () => {
        resetState({
            exam: baseExam({
                scheduleEnd: new Date(Date.now() - 60_000),
                allowRetakes: false,
            }),
        });

        await assert.rejects(
            attemptService.startAttempt(USER_ID, EXAM_ID),
            (err: any) => {
                assert.equal(err?.statusCode, 403);
                assert.equal(err?.message, 'This exam has closed');
                return true;
            },
        );
        assert.equal(state.created.length, 0, 'no attempt should be created');
    });

    it('allows a first attempt', async () => {
        resetState();

        const result = await attemptService.startAttempt(USER_ID, EXAM_ID);

        assert.equal(result.attemptNo, 1);
        assert.equal(state.created.length, 1);
    });

    it('resumes an existing IN_PROGRESS attempt', async () => {
        resetState({
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
