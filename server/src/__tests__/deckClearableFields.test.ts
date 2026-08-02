import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeckSchema, updateDeckSchema } from '../validators/deck.validator';

/**
 * `description` and `subject` are optional on a study deck, but the schema used plain
 * `.optional()` — so an emptied field arrived as undefined, Prisma ignored it, and the
 * value was stuck forever once set. Neither could be cleared through the editor.
 *
 * Same three-way contract the exam validator now uses: a string writes, an explicit
 * null clears, and an omitted key leaves the stored value untouched. Schema-only, so
 * no database is needed.
 */

const VALID_QUESTION = {
    questionText: 'What is 2 + 2?',
    choiceA: '2',
    choiceB: '3',
    choiceC: '4',
    choiceD: '5',
    correctChoice: 'C' as const,
};

const VALID_DECK = {
    title: 'LET Review — English Terminology',
    questions: [VALID_QUESTION],
};

for (const field of ['description', 'subject'] as const) {
    describe(`deck validator — ${field}`, () => {
        it('accepts a value on create and preserves it', () => {
            const result = createDeckSchema.parse({ ...VALID_DECK, [field]: 'Some value' });
            assert.equal(result[field], 'Some value');
        });

        it('trims surrounding whitespace', () => {
            const result = createDeckSchema.parse({ ...VALID_DECK, [field]: '   padded   ' });
            assert.equal(result[field], 'padded');
        });

        it('leaves the key absent when it was not sent, so updates do not clobber it', () => {
            const result = updateDeckSchema.parse({ title: 'Renamed' });
            assert.equal(result[field], undefined);
        });

        it('accepts an explicit null so the field can be cleared', () => {
            const result = updateDeckSchema.parse({ [field]: null });
            assert.equal(result[field], null);
        });

        it('accepts an empty string', () => {
            const result = updateDeckSchema.parse({ [field]: '' });
            assert.equal(result[field], '');
        });

        it('rejects a non-string value', () => {
            assert.throws(() => updateDeckSchema.parse({ [field]: 42 }));
        });
    });
}

describe('deck validator — unchanged rules', () => {
    it('still requires a title on create', () => {
        assert.throws(() => createDeckSchema.parse({ ...VALID_DECK, title: '   ' }));
    });

    it('still requires at least one question on create', () => {
        assert.throws(() => createDeckSchema.parse({ ...VALID_DECK, questions: [] }));
    });
});
