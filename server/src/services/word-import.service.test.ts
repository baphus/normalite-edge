import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionTemplateFromParagraphs, WordParagraph } from './word-import.service';

const buildValidParagraphs = (): WordParagraph[] => [
    { style: 'Heading1', text: '# General Education' },
    { style: 'Normal', text: '1. What is 2 + 2?' },
    { style: 'Normal', text: 'A) 2' },
    { style: 'Normal', text: 'B) 3' },
    { style: 'Normal', text: 'C) 4' },
    { style: 'Normal', text: 'D) 5' },
    { style: 'Normal', text: 'Answer: C' },
    { style: 'Normal', text: 'Rationalization: 4 is the correct sum.' },
    { style: 'Normal', text: '2. Which planet is known as the Red Planet?' },
    { style: 'Normal', text: 'A) Venus' },
    { style: 'Normal', text: 'B) Mars' },
    { style: 'Normal', text: 'C) Jupiter' },
    { style: 'Normal', text: 'D) Mercury' },
    { style: 'Normal', text: 'Answer: B' },
    { style: 'Normal', text: 'Rationalization: Mars appears red due to iron oxide.' },
];

test('parses a valid template file', () => {
    const result = parseQuestionTemplateFromParagraphs(buildValidParagraphs());

    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0], 'General Education');
    assert.equal(result.questions.length, 2);
    assert.equal(result.questions[0].questionNumber, 1);
    assert.equal(result.questions[0].correctAnswer, 'C');
    assert.equal(result.questions[1].correctAnswer, 'B');
});

test('fails when answer is missing', () => {
    const invalid = buildValidParagraphs().filter((line) => line.text !== 'Answer: C');

    assert.throws(
        () => parseQuestionTemplateFromParagraphs(invalid),
        /Validation failed at Question 1: Missing Answer/
    );
});

test('fails when rationalization is missing', () => {
    const invalid = buildValidParagraphs().filter((line) => line.text !== 'Rationalization: 4 is the correct sum.');

    assert.throws(
        () => parseQuestionTemplateFromParagraphs(invalid),
        /Validation failed at Question 1: Missing Rationalization/
    );
});

test('fails when answer does not match any provided choice', () => {
    const invalid = buildValidParagraphs().filter((line) => line.text !== 'C) 4');

    assert.throws(
        () => parseQuestionTemplateFromParagraphs(invalid),
        /Validation failed at Question 1: Answer not found in choices/
    );
});

test('ignores image tag lines in parsing', () => {
    const paragraphs: WordParagraph[] = [
        { style: 'Heading1', text: '# General Education' },
        { style: 'Normal', text: '1. Identify the triangle type.' },
        { style: 'Normal', text: 'Image: geometry.png' },
        { style: 'Normal', text: 'A) Equilateral' },
        { style: 'Normal', text: 'B) Isosceles' },
        { style: 'Normal', text: 'Answer: B' },
        { style: 'Normal', text: 'Rationalization: Two sides are equal.' },
    ];

    const result = parseQuestionTemplateFromParagraphs(paragraphs);

    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].questionText, 'Identify the triangle type.');
});
