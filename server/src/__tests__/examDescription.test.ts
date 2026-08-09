import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createExamSchema, updateExamSchema } from '../validators/exam.validator';

/**
 * Exam `description` existed on the Prisma model and was returned by reads, but was
 * rejected by the validators and never written — so the editor's description field
 * was silently discarded on every save.
 *
 * The three-way distinction is the part worth pinning down: a string writes, an
 * explicit null clears, and an omitted key must leave the stored value untouched.
 * Only the schema is exercised here — it is pure, so this needs no database.
 */

const VALID_QUESTION = {
    text: 'What is 2 + 2?',
    choices: ['2', '3', '4', '5'] as [string, string, string, string],
    correctAnswer: 'C' as const,
    section: 'Main section',
};

const VALID_EXAM = {
    title: 'LET 2024 Comprehensive Mock',
    subject: 'General Education',
    timeLimit: 120,
    feedbackMode: 'IMMEDIATE' as const,
    questions: [VALID_QUESTION],
};

describe('exam validator — description', () => {
    it('accepts a description on create and preserves it', () => {
        const result = createExamSchema.parse({ ...VALID_EXAM, description: 'Covers Gen Ed.' });
        assert.equal(result.description, 'Covers Gen Ed.');
    });

    it('trims surrounding whitespace', () => {
        const result = createExamSchema.parse({ ...VALID_EXAM, description: '   padded   ' });
        assert.equal(result.description, 'padded');
    });

    it('leaves the key absent when it was not sent, so updates do not clobber it', () => {
        const result = updateExamSchema.parse({ title: 'Renamed' });
        assert.equal('description' in result && result.description !== undefined, false);
    });

    it('accepts an explicit null so the field can be cleared', () => {
        const result = updateExamSchema.parse({ description: null });
        assert.equal(result.description, null);
    });

    it('accepts an empty string', () => {
        const result = updateExamSchema.parse({ description: '' });
        assert.equal(result.description, '');
    });

    it('rejects a non-string description', () => {
        assert.throws(() => updateExamSchema.parse({ description: 42 }));
    });

    it('still requires title and subject on create', () => {
        assert.throws(() => createExamSchema.parse({ ...VALID_EXAM, title: '   ' }));
    });
});

describe('exam validator - zero-question shell', () => {
    it('accepts an exam without a questions key, yielding undefined questions', () => {
        const result = createExamSchema.parse({ title: 'Shell', subject: 'Gen Ed', timeLimit: 60, feedbackMode: 'IMMEDIATE' });
        assert.equal(result.questions, undefined);
    });

    it('accepts an explicit empty questions array', () => {
        const result = createExamSchema.parse({ title: 'Shell', subject: 'Gen Ed', timeLimit: 60, feedbackMode: 'IMMEDIATE', questions: [] });
        assert.deepEqual(result.questions, []);
    });
});

describe('exam validator - schedule', () => {
    it('rejects a close time at or before the opening time', () => {
        assert.throws(() => createExamSchema.parse({
            ...VALID_EXAM,
            scheduledDate: '2026-08-05T09:00:00.000Z',
            deadline: '2026-08-05T09:00:00.000Z',
        }));
    });

    it('accepts an opening time before the closing time', () => {
        const result = createExamSchema.parse({
            ...VALID_EXAM,
            scheduledDate: '2026-08-05T09:00:00.000Z',
            deadline: '2026-08-05T10:00:00.000Z',
        });
        assert.equal(result.scheduledDate, '2026-08-05T09:00:00.000Z');
    });
});
