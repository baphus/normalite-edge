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
