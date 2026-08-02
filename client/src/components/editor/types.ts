/**
 * The exam editor and the study-material editor were built separately and ended
 * up storing the same object under different key names (text/question,
 * correctOption/correctIndex, rationale/explanation). This is the single shape
 * both now use; `section` is exam-only and simply left undefined for decks.
 */
export interface EditableQuestion {
    id: string;
    text: string;
    options: string[];
    correctOption: number;
    rationale: string;
    imageUrl?: string;
    section?: string;
}

export type QuestionIssueField = 'text' | 'options' | 'correctOption';

export interface QuestionIssue {
    field: QuestionIssueField;
    message: string;
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Same rules the submit handlers used to enforce via a chain of toasts, lifted
 * here so a question can report its own readiness while it is being edited.
 */
export function getQuestionIssues(question: EditableQuestion): QuestionIssue[] {
    const issues: QuestionIssue[] = [];

    if (!question.text.trim()) {
        issues.push({ field: 'text', message: 'Missing question text' });
    }

    const emptyOptions = question.options
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => !option.trim());

    if (emptyOptions.length > 0) {
        issues.push({
            field: 'options',
            message: `Missing option ${emptyOptions.map(({ index }) => OPTION_LETTERS[index] ?? index + 1).join(', ')}`,
        });
    }

    if (
        question.correctOption < 0
        || question.correctOption >= question.options.length
        || !question.options[question.correctOption]?.trim()
    ) {
        issues.push({ field: 'correctOption', message: 'No correct answer set' });
    }

    return issues;
}

export function isQuestionComplete(question: EditableQuestion): boolean {
    return getQuestionIssues(question).length === 0;
}

/**
 * A row the user started and abandoned — no text, no options, no rationale, no image.
 * Both editors have always dropped these silently at submit rather than rejecting the
 * save, so they must not count as validation blockers either.
 */
export function isQuestionBlank(question: EditableQuestion): boolean {
    return (
        !question.text.trim()
        && !question.rationale.trim()
        && !question.imageUrl?.trim()
        && question.options.every((option) => !option.trim())
    );
}

/** Questions that carry content but are not yet publishable. */
export function getIncompleteQuestions(questions: EditableQuestion[]): EditableQuestion[] {
    return questions.filter((question) => !isQuestionBlank(question) && !isQuestionComplete(question));
}

export function createEmptyQuestion(id: string, section?: string): EditableQuestion {
    return {
        id,
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        rationale: '',
        imageUrl: '',
        ...(section === undefined ? {} : { section }),
    };
}
