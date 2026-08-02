import { parseCsvRecords } from '@/lib/parseCsvRecords';
import { readUploadedText } from '@/lib/readUploadedText';
import { OPTION_LETTERS, type EditableQuestion } from '@/components/editor/types';

/**
 * CSV/JSON question import, previously duplicated between the exam editor and the
 * study-material editor. Pure functions — the caller owns all user messaging so the
 * two pages can keep their own wording.
 */

export class QuestionImportError extends Error {}

const stripByteOrderMark = (value: string) => (value.charCodeAt(0) === 0xfeff ? value.slice(1) : value);

const normalizeImportKey = (key: string) =>
    stripByteOrderMark(key).replace(/[\s_-]+/g, '').toLowerCase();

const toNormalizedRecord = (record: Record<string, any>) =>
    Object.entries(record).reduce<Record<string, any>>((accumulator, [key, value]) => {
        accumulator[normalizeImportKey(key)] = value;
        return accumulator;
    }, {});

const pickImportValue = (record: Record<string, any>, aliases: string[]) => {
    const normalizedRecord = toNormalizedRecord(record);
    for (const alias of aliases) {
        const value = normalizedRecord[normalizeImportKey(alias)];
        if (value !== undefined && value !== null && String(value).trim().length > 0) {
            return value;
        }
    }
    return undefined;
};

/** Accepts a letter (A–D), a 1-based or 0-based index, or the answer text itself. */
export function normalizeCorrectOption(correctAnswer: unknown, choices: string[] = []): number {
    const normalized = String(correctAnswer ?? '').trim();

    const letterIndex = OPTION_LETTERS.indexOf(normalized.toUpperCase());
    if (letterIndex >= 0) return letterIndex;

    const numeric = Number(normalized);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 4) return numeric - 1;
    if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 3) return numeric;

    if (normalized) {
        const matchedChoiceIndex = choices.findIndex(
            (choice) => choice.trim().toLowerCase() === normalized.toLowerCase(),
        );
        if (matchedChoiceIndex >= 0) return matchedChoiceIndex;
    }

    return 0;
}

export function mapImportedRecords(
    records: Array<Record<string, any>>,
    options?: { section?: string; idPrefix?: string },
): EditableQuestion[] {
    const idPrefix = options?.idPrefix ?? `import-${Date.now()}`;

    return records
        .map((record, index) => {
            const text = String(
                pickImportValue(record, ['questionText', 'question', 'text', 'prompt', 'front']) ?? '',
            ).trim();
            if (!text) return null;

            // The deck importer additionally accepted a single `options` column,
            // either a JSON array or a pipe-delimited string. Preserved here.
            const optionsValue = pickImportValue(record, ['options']);
            const rawChoices = Array.isArray(optionsValue)
                ? optionsValue
                : typeof optionsValue === 'string' && optionsValue.includes('|')
                    ? optionsValue.split('|')
                    : [
                        pickImportValue(record, ['choiceA', 'optionA', 'option1', 'a']) ?? '',
                        pickImportValue(record, ['choiceB', 'optionB', 'option2', 'b']) ?? '',
                        pickImportValue(record, ['choiceC', 'optionC', 'option3', 'c']) ?? '',
                        pickImportValue(record, ['choiceD', 'optionD', 'option4', 'd']) ?? '',
                    ];

            const choices = [0, 1, 2, 3].map((choiceIndex) =>
                String(rawChoices[choiceIndex] ?? '').trim(),
            );

            const correctAnswerValue =
                pickImportValue(record, [
                    'correctAnswer',
                    'correct_answer',
                    'correctOption',
                    'correct_choice',
                    'correct_answer_index',
                    'answer',
                ]) ?? 'A';

            const question: EditableQuestion = {
                id: `${idPrefix}-${index}`,
                text,
                imageUrl: '',
                options: choices,
                correctOption: normalizeCorrectOption(correctAnswerValue, choices),
                rationale: String(
                    pickImportValue(record, ['rationalization', 'explanation', 'rationale']) ?? '',
                ).trim(),
            };

            return options?.section === undefined ? question : { ...question, section: options.section };
        })
        .filter((question): question is EditableQuestion => question !== null);
}

/**
 * Reads a CSV or JSON file and maps it to editable questions.
 * Throws QuestionImportError with a user-presentable message on every failure path.
 */
export async function parseQuestionFile(
    file: File,
    options?: { section?: string; idPrefix?: string },
): Promise<EditableQuestion[]> {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
        throw new QuestionImportError('Unsupported file type. Please upload a CSV or JSON file.');
    }

    let content: string;
    try {
        content = await readUploadedText(file);
    } catch {
        throw new QuestionImportError('Could not read that file. Please try again.');
    }

    let rows: Array<Record<string, any>>;

    if (lowerName.endsWith('.json')) {
        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new QuestionImportError('That JSON file could not be parsed. Check the template and try again.');
        }
        rows = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.questions)
                ? parsed.questions
                : Array.isArray(parsed?.items)
                    ? parsed.items
                    : [parsed];
    } else {
        rows = parseCsvRecords(content);
        if (rows.length === 0) {
            throw new QuestionImportError('That CSV file has no data rows.');
        }
    }

    if (rows.length === 0) {
        throw new QuestionImportError('No valid question rows found in the import file.');
    }

    const questions = mapImportedRecords(rows, options);
    if (questions.length === 0) {
        throw new QuestionImportError('No valid questions were parsed from the import file.');
    }

    return questions;
}

export function downloadQuestionTemplate(format: 'csv' | 'json', fileBaseName: string): void {
    const csvTemplate = [
        'questionText,choiceA,choiceB,choiceC,choiceD,correctAnswer,rationalization',
        'What is 2 + 2?,2,3,4,5,C,4 is the correct sum',
    ].join('\n');

    const jsonTemplate = JSON.stringify(
        [
            {
                questionText: 'What is 2 + 2?',
                choiceA: '2',
                choiceB: '3',
                choiceC: '4',
                choiceD: '5',
                correctAnswer: 'C',
                rationalization: '4 is the correct sum',
            },
        ],
        null,
        2,
    );

    const content = format === 'csv' ? csvTemplate : jsonTemplate;
    const type = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
    const fileName = `${fileBaseName}.${format}`;

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
