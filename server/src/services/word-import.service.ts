import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { ApiError } from '../utils/ApiError';
import { examService } from './exam.service';
import { deckService } from './deck.service';

type ParagraphStyle = 'Heading1' | 'Normal';

export type WordParagraph = {
    text: string;
    style: ParagraphStyle;
};

export type ParsedWordQuestion = {
    questionNumber: number;
    sectionName: string;
    questionText: string;
    choices: Array<{ key: 'A' | 'B' | 'C' | 'D'; text: string }>;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    rationalization: string;
};

export type ParsedWordImport = {
    sections: string[];
    questions: ParsedWordQuestion[];
};

const QUESTION_REGEX = /^\d+\.\s+/;
const CHOICE_REGEX = /^([A-D])[\)\.:]\s+(.+)$/;
const ANSWER_REGEX = /^Answer:\s*([A-D])\s*$/i;
const RATIONALIZATION_REGEX = /^Rationalization:\s*(.*)$/i;

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
};

const flattenText = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(flattenText).join('');
    if (!node || typeof node !== 'object') return '';

    const record = node as Record<string, unknown>;

    if (typeof record['#text'] === 'string') {
        return record['#text'] as string;
    }

    let text = '';

    for (const [key, value] of Object.entries(record)) {
        if (key === 'w:t') {
            text += flattenText(value);
            continue;
        }

        if (key === 'w:tab') {
            text += '\t';
            continue;
        }

        if (key === 'w:br' || key === 'w:cr') {
            text += '\n';
            continue;
        }

        text += flattenText(value);
    }

    return text;
};

const getParagraphStyle = (paragraphNode: Record<string, unknown>): ParagraphStyle => {
    const pPr = asArray(paragraphNode['w:pPr'])[0] as Record<string, unknown> | undefined;
    if (!pPr) return 'Normal';

    const pStyle = asArray(pPr['w:pStyle'])[0] as Record<string, unknown> | undefined;
    const styleValue = String(pStyle?.['w:val'] || '').trim();

    return styleValue === 'Heading1' ? 'Heading1' : 'Normal';
};

const stripQuestionPrefix = (line: string): { number: number; text: string } => {
    const match = line.match(/^(\d+)\.\s+(.+)$/);

    if (!match) {
        throw ApiError.badRequest('Malformed question line. Expected format: "1. Question text"');
    }

    return {
        number: Number(match[1]),
        text: match[2].trim(),
    };
};

type WorkingQuestion = {
    questionNumber: number;
    sectionName: string;
    questionLines: string[];
    choices: Array<{ key: 'A' | 'B' | 'C' | 'D'; text: string }>;
    answer?: 'A' | 'B' | 'C' | 'D';
    rationalizationLines: string[];
    rationalizationStarted: boolean;
};

const validateParsedQuestion = (question: WorkingQuestion) => {
    const context = `Validation failed at Question ${question.questionNumber}:`;

    if (question.questionLines.join(' ').trim().length === 0) {
        throw ApiError.badRequest(`${context} Empty question text`);
    }

    if (question.choices.length < 2) {
        throw ApiError.badRequest(`${context} Fewer than 2 choices`);
    }

    if (!question.answer) {
        throw ApiError.badRequest(`${context} Missing Answer`);
    }

    const answerExists = question.choices.some((choice) => choice.key === question.answer);
    if (!answerExists) {
        throw ApiError.badRequest(`${context} Answer not found in choices`);
    }

    if (question.rationalizationLines.join('\n').trim().length === 0) {
        throw ApiError.badRequest(`${context} Missing Rationalization`);
    }
};

export const parseQuestionTemplateFromParagraphs = (
    paragraphs: WordParagraph[]
): ParsedWordImport => {
    const sections: string[] = [];
    const questions: ParsedWordQuestion[] = [];

    let currentSection = '';
    let workingQuestion: WorkingQuestion | null = null;

    const finalizeQuestion = () => {
        if (!workingQuestion) return;

        validateParsedQuestion(workingQuestion);

        questions.push({
            questionNumber: workingQuestion.questionNumber,
            sectionName: workingQuestion.sectionName || 'General Section',
            questionText: workingQuestion.questionLines.join(' ').trim(),
            choices: workingQuestion.choices,
            correctAnswer: workingQuestion.answer!,
            rationalization: workingQuestion.rationalizationLines.join('\n').trim(),
        });

        workingQuestion = null;
    };

    for (const paragraph of paragraphs) {
        const rawLines = paragraph.text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (paragraph.style === 'Heading1') {
            finalizeQuestion();
            const headingText = rawLines.join(' ').replace(/^#\s*/, '').trim();
            if (!headingText) continue;
            currentSection = headingText;
            sections.push(headingText);
            continue;
        }

        for (const line of rawLines) {
            if (QUESTION_REGEX.test(line)) {
                finalizeQuestion();

                const { number, text } = stripQuestionPrefix(line);
                workingQuestion = {
                    questionNumber: number,
                    sectionName: currentSection || 'General Section',
                    questionLines: [text],
                    choices: [],
                    rationalizationLines: [],
                    rationalizationStarted: false,
                };
                continue;
            }

            if (!workingQuestion) {
                continue;
            }

            if (/^Image:\s+/i.test(line)) {
                continue;
            }

            const choiceMatch = line.match(CHOICE_REGEX);
            if (choiceMatch) {
                const key = choiceMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
                const text = choiceMatch[2].trim();
                const existingChoiceIndex = workingQuestion.choices.findIndex((choice) => choice.key === key);
                if (existingChoiceIndex >= 0) {
                    workingQuestion.choices[existingChoiceIndex] = { key, text };
                } else {
                    workingQuestion.choices.push({ key, text });
                }
                continue;
            }

            const answerMatch = line.match(ANSWER_REGEX);
            if (answerMatch) {
                workingQuestion.answer = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
                continue;
            }

            const rationalizationMatch = line.match(RATIONALIZATION_REGEX);
            if (rationalizationMatch) {
                workingQuestion.rationalizationStarted = true;
                const firstRationalizationLine = rationalizationMatch[1].trim();
                if (firstRationalizationLine) {
                    workingQuestion.rationalizationLines.push(firstRationalizationLine);
                }
                continue;
            }

            if (workingQuestion.rationalizationStarted) {
                workingQuestion.rationalizationLines.push(line);
                continue;
            }

            if (!workingQuestion.answer && workingQuestion.choices.length === 0) {
                workingQuestion.questionLines.push(line);
            }
        }
    }

    finalizeQuestion();

    if (questions.length === 0) {
        throw ApiError.badRequest('No questions found. Ensure the document follows the template format.');
    }

    const uniqueSections = Array.from(new Set(sections));

    return {
        sections: uniqueSections.length > 0 ? uniqueSections : ['General Section'],
        questions,
    };
};

const parseParagraphsFromDocumentXml = (documentXml: string): WordParagraph[] => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseTagValue: false,
        trimValues: false,
    });

    const parsed = parser.parse(documentXml) as Record<string, any>;
    const body = parsed?.['w:document']?.['w:body'];

    if (!body) {
        throw ApiError.badRequest('Malformed Word file: missing document body');
    }

    const paragraphNodes = asArray(body['w:p']) as Record<string, unknown>[];

    return paragraphNodes.map((paragraphNode) => ({
        text: flattenText(paragraphNode).replace(/\u00A0/g, ' ').trim(),
        style: getParagraphStyle(paragraphNode),
    }));
};

export const parseWordImportBuffer = async (fileBuffer: Buffer) => {
    let zip: JSZip;

    try {
        zip = await JSZip.loadAsync(fileBuffer);
    } catch {
        throw ApiError.badRequest('Invalid .docx file. Unable to read Word document archive.');
    }

    const documentEntry = zip.file('word/document.xml');
    if (!documentEntry) {
        throw ApiError.badRequest('Malformed .docx file: word/document.xml not found');
    }

    const documentXml = await documentEntry.async('text');

    const paragraphs = parseParagraphsFromDocumentXml(documentXml);
    return {
        parsed: parseQuestionTemplateFromParagraphs(paragraphs),
    };
};

const sanitizeTitleFromFilename = (filename: string, fallback: string) => {
    const fileBaseName = filename.replace(/\.docx$/i, '').trim();
    if (!fileBaseName) return fallback;
    return fileBaseName;
};

export const wordImportService = {
    async importExamFromWord(options: {
        fileBuffer: Buffer;
        originalName: string;
        createdBy: string;
        title?: string;
    }) {
        const { parsed } = await parseWordImportBuffer(options.fileBuffer);

        const exam = await examService.createExam({
            title: options.title?.trim() || `${sanitizeTitleFromFilename(options.originalName, 'Imported')} - Mock Exam`,
            subject: parsed.sections[0] || 'General Education',
            timeLimit: 60,
            isPublished: false,
            sections: parsed.sections,
            questions: parsed.questions.map((question) => ({
                text: question.questionText,
                choices: ['A', 'B', 'C', 'D'].map((key) => question.choices.find((choice) => choice.key === key)?.text || ''),
                correctAnswer: question.correctAnswer,
                explanation: question.rationalization,
                section: question.sectionName,
            })),
            createdBy: options.createdBy,
        });

        return {
            exam,
            summary: {
                sectionsCreated: parsed.sections.length,
                questionsImported: parsed.questions.length,
                errors: [] as Array<{ questionNumber: number; message: string }>,
            },
        };
    },

    async importDeckFromWord(options: {
        fileBuffer: Buffer;
        originalName: string;
        createdBy: string;
        title?: string;
    }) {
        const { parsed } = await parseWordImportBuffer(options.fileBuffer);

        const deck = await deckService.createDeck({
            title: options.title?.trim() || `${sanitizeTitleFromFilename(options.originalName, 'Imported')} - Study Material`,
            subject: parsed.sections[0] || 'General Education',
            visibility: 'DRAFT',
            questions: parsed.questions.map((question, index) => {
                const choiceLookup = new Map(question.choices.map((choice) => [choice.key, choice.text]));

                return {
                    orderNo: index + 1,
                    questionText: question.questionText,
                    choiceA: choiceLookup.get('A') || '',
                    choiceB: choiceLookup.get('B') || '',
                    choiceC: choiceLookup.get('C') || '',
                    choiceD: choiceLookup.get('D') || '',
                    correctChoice: question.correctAnswer,
                    rationalization: question.rationalization,
                };
            }),
            createdBy: options.createdBy,
        });

        return {
            deck,
            summary: {
                sectionsCreated: parsed.sections.length,
                questionsImported: parsed.questions.length,
                errors: [] as Array<{ questionNumber: number; message: string }>,
            },
        };
    },

    async generateTemplateDocxBuffer() {
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            text: 'Question Import Template',
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({ text: '' }),
                        new Paragraph({
                            children: [new TextRun({ text: 'Formatting Rules', bold: true })],
                            heading: HeadingLevel.HEADING_1,
                        }),
                        new Paragraph({ text: '1) Use Heading 1 for each section title.' }),
                        new Paragraph({ text: '2) Start each question with a number and period. Example: 1. What is 2 + 2?' }),
                        new Paragraph({ text: '3) Put each choice on its own line as A) / B) / C) / D).' }),
                        new Paragraph({ text: '4) Add answer using: Answer: A (or B/C/D).' }),
                        new Paragraph({ text: '5) Add rationalization using: Rationalization: <text>.' }),
                        new Paragraph({ text: '6) Edit the sample text directly in this document and replace it with your own questions.' }),
                        new Paragraph({ text: '' }),
                        new Paragraph({
                            children: [new TextRun({ text: 'Sample Content', bold: true })],
                            heading: HeadingLevel.HEADING_1,
                        }),
                        new Paragraph({ text: '# General Education', heading: HeadingLevel.HEADING_1 }),
                        new Paragraph({ text: '1. What is 2 + 2?' }),
                        new Paragraph({ text: 'A) 2' }),
                        new Paragraph({ text: 'B) 3' }),
                        new Paragraph({ text: 'C) 4' }),
                        new Paragraph({ text: 'D) 5' }),
                        new Paragraph({ text: 'Answer: C' }),
                        new Paragraph({ text: 'Rationalization: 4 is the correct sum.' }),
                        new Paragraph({ text: '' }),
                        new Paragraph({ text: '2. Which planet is known as the Red Planet?' }),
                        new Paragraph({ text: 'A) Venus' }),
                        new Paragraph({ text: 'B) Mars' }),
                        new Paragraph({ text: 'C) Jupiter' }),
                        new Paragraph({ text: 'D) Mercury' }),
                        new Paragraph({ text: 'Answer: B' }),
                        new Paragraph({ text: 'Rationalization: Mars appears red due to iron oxide on its surface.' }),
                    ],
                },
            ],
        });

        return Packer.toBuffer(doc);
    },
};
