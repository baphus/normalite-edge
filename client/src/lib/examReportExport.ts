import type jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import { formatDateTime, formatDurationSeconds, formatPercent } from '@/lib/formatters';
import type { AttemptSummary, ProgramPerformance, ScoreBand } from '@/lib/examAnalytics';
import {
    EXPORT_COLUMNS,
    type AttemptItem,
    type ExamDetails,
    type ExamQuestion,
    type ExportColumnKey,
    type ExportScope,
    type StudentScoreRow,
} from '@/components/exam-view/types';

/**
 * PDF and Excel generation for the exam results report.
 *
 * Deliberately free of React: it takes finished data and produces a file. Both
 * entry points import their heavy dependency dynamically, so a manager who never
 * exports never downloads jsPDF or exceljs. jsPDF's autoTable plugin is bundled
 * statically here instead — it is a thin helper and never pulls jsPDF in itself.
 */

/**
 * `--primary: 358 61% 30%` in index.css, i.e. #7B1E21. Previously these reports
 * were stamped with #800000 — a different, brighter red that the design system
 * classes as a bug rather than a variant. These artefacts leave the building
 * with the university's name on them, so they carry the real brand colour.
 */
const BRAND_RGB: [number, number, number] = [123, 30, 33];
const BRAND_ARGB = 'FF7B1E21';
const SLATE_700_RGB: [number, number, number] = [51, 65, 85];
const SLATE_200_RGB: [number, number, number] = [226, 232, 240];
const INK_RGB: [number, number, number] = [24, 24, 27];
const MUTED_RGB: [number, number, number] = [82, 82, 91];
const WATERMARK_RGB: [number, number, number] = [232, 222, 222];
const ZEBRA_RGB: [number, number, number] = [248, 250, 252];

export interface QuestionAppendixRow {
    globalQuestionNo: number;
    sectionTitle: string;
    questionText: string;
    choices: string;
    correctChoice: string;
    rationalization: string;
}

export interface ExamReportInput {
    exam: ExamDetails | null;
    questionCount: number;
    /** Deadline already resolved against the analytics schedule end. */
    deadline?: string | null;
    summary: AttemptSummary;
    distribution: ScoreBand[];
    topPrograms: ProgramPerformance[];
    questionRows: QuestionAppendixRow[];
    rows: StudentScoreRow[];
    columnKeys: ExportColumnKey[];
    scope: ExportScope;
}

const PDF_COLUMN_WIDTHS: Record<ExportColumnKey, number> = {
    rowNo: 10,
    studentName: 28,
    studentEmail: 35,
    program: 28,
    campus: 24,
    yearLevel: 18,
    section: 18,
    attemptNo: 16,
    status: 18,
    rawScore: 18,
    percentage: 18,
    timeSpent: 20,
    startedAt: 26,
    submittedAt: 26,
};

const CENTRED_COLUMNS: ReadonlyArray<ExportColumnKey> = [
    'rowNo',
    'attemptNo',
    'status',
];

/** Numeric-looking columns read best right-aligned; the head row stays centred. */
const RIGHT_ALIGNED_COLUMNS: ReadonlyArray<ExportColumnKey> = [
    'rawScore',
    'percentage',
    'timeSpent',
];

// GState comes from the dynamically imported jspdf module, which must stay
// lazy — only a type import lives at the top of this file. exportReportToPdf
// resolves it at runtime and stashes the constructor here for the sync render.
type GStateConstructor = new (parameters: { opacity?: number }) => unknown;
let watermarkGState: GStateConstructor | null = null;

/** Internal: lets headless verification / callers inject GState without changing the public export path. */
export function setWatermarkGState(gstate: GStateConstructor | null): void {
    watermarkGState = gstate;
}

/**
 * Flattens attempts into display-formatted export rows. The on-screen table
 * renders from the raw attempts instead, so that its column sorting compares
 * numbers and dates rather than formatted strings.
 */
export function toStudentScoreRows(
    attempts: AttemptItem[],
    questionCount: number,
): StudentScoreRow[] {
    return attempts.map((attempt, index) => {
        const submitted = attempt.status === 'SUBMITTED';

        return {
            id: attempt.id,
            rowNo: index + 1,
            studentName: attempt.user?.name?.trim() || 'Unknown user',
            studentEmail: attempt.user?.email?.trim() || 'No email',
            program: attempt.user?.programTrack?.trim() || 'N/A',
            campus: attempt.user?.campus?.trim() || 'N/A',
            yearLevel: attempt.user?.yearLevel?.trim() || 'N/A',
            section: attempt.user?.section?.trim() || 'N/A',
            attemptNo: attempt.attemptNo || 1,
            status: submitted ? 'Submitted' : 'In progress',
            rawScore: submitted ? `${Number(attempt.score || 0)}/${questionCount}` : '-',
            percentage: submitted ? formatPercent(attempt.percentage, '-') : '-',
            timeSpent: formatDurationSeconds(attempt.timeSpentSeconds, '-'),
            startedAt: formatDateTime(attempt.startedAt, '-'),
            submittedAt: submitted ? formatDateTime(attempt.submittedAt, '-') : '-',
        };
    });
}

export function toQuestionAppendixRows(
    entries: Array<{ question: ExamQuestion; globalQuestionNo: number; sectionTitle: string }>,
): QuestionAppendixRow[] {
    return entries.map(({ question, globalQuestionNo, sectionTitle }) => ({
        globalQuestionNo,
        sectionTitle,
        questionText: question.questionText || 'Untitled question',
        choices: (['A', 'B', 'C', 'D'] as const)
            .map((key) => `${key}. ${question[`choice${key}`] || 'N/A'}`)
            .join('\n'),
        correctChoice: question.correctChoice || 'N/A',
        rationalization: question.rationalization || 'N/A',
    }));
}

export function safeExamFilename(title?: string): string {
    return (
        (title || 'exam')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'exam'
    );
}

function activeColumns(columnKeys: ExportColumnKey[]) {
    return EXPORT_COLUMNS.filter((column) => columnKeys.includes(column.key));
}

function describeTracks(exam: ExamDetails | null): string {
    const fromTracks = exam?.tracks
        ?.map((track) => track.name || track.code)
        .filter(Boolean)
        .join(', ');
    return fromTracks || exam?.program_track || 'All / N/A';
}

function describeCreator(exam: ExamDetails | null): string {
    return (
        exam?.creator?.name
        || `${exam?.creator?.firstName || ''} ${exam?.creator?.lastName || ''}`.trim()
        || 'N/A'
    );
}

/** Triggers a browser download and always releases the object URL. */
function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Deferred: revoking synchronously after click() can cancel the download in
    // some browsers before it has read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Excel ────────────────────────────────────────────────────────────────────

function excelColumnName(index: number): string {
    let column = '';
    let current = index + 1;

    while (current > 0) {
        const remainder = (current - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        current = Math.floor((current - 1) / 26);
    }

    return column;
}

async function buildWorkbookBlob(
    headers: string[],
    rows: Array<Array<string | number | null | undefined>>,
): Promise<Blob> {
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ('default' in ExcelJSModule ? ExcelJSModule.default : ExcelJSModule) as typeof ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Scores', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    workbook.creator = 'Normalite Edge';
    workbook.created = new Date();

    worksheet.columns = headers.map((header, columnIndex) => ({
        header,
        key: `column-${columnIndex}`,
        width: Math.min(
            Math.max(header.length, ...rows.map((row) => String(row[columnIndex] ?? '').length), 10) + 2,
            36,
        ),
        style: { numFmt: '@' },
    }));
    worksheet.addRows(rows.map((row) => row.map((value) => value ?? '')));

    worksheet.autoFilter = {
        from: 'A1',
        to: `${excelColumnName(headers.length - 1)}${Math.max(rows.length + 1, 1)}`,
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ARGB } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

export async function exportScoresToXlsx(input: ExamReportInput): Promise<void> {
    const columns = activeColumns(input.columnKeys);
    if (input.rows.length === 0 || columns.length === 0) return;

    const blob = await buildWorkbookBlob(
        columns.map((column) => column.label),
        input.rows.map((row) => columns.map((column) => row[column.key])),
    );

    saveBlob(blob, `${safeExamFilename(input.exam?.title)}-student-scores.xlsx`);
}

// ── PDF ──────────────────────────────────────────────────────────────────────

function addSectionTitle(doc: jsPDF, title: string, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RGB);
    doc.text(title, 12, y);
    doc.setDrawColor(...SLATE_200_RGB);
    doc.setLineWidth(0.35);
    doc.line(12, y + 2.5, doc.internal.pageSize.getWidth() - 12, y + 2.5);
}

/**
 * Translucent brand watermark, centred on the page. Uses a real ExtGState so it
 * is genuinely faint (8% opacity) rather than a solid tint. Falls back to the
 * legacy solid colour if GState could not be resolved from the jspdf module.
 */
function drawWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...WATERMARK_RGB);
    if (watermarkGState) {
        doc.saveGraphicsState();
        doc.setGState(new watermarkGState({ opacity: 0.8 }));
        doc.text('CEBU NORMAL UNIVERSITY', pageWidth / 2, pageHeight / 2, {
            align: 'center',
            angle: 32,
        });
        doc.restoreGraphicsState();
    } else {
        doc.text('CEBU NORMAL UNIVERSITY', pageWidth / 2, pageHeight / 2, {
            align: 'center',
            angle: 32,
        });
    }
}

/** Running header for continuation pages: exam title left, product line right. */
function drawRunningHeader(doc: jsPDF, pageWidth: number, examTitle: string) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_RGB);
    doc.text(examTitle, 12, 6, { maxWidth: pageWidth / 2 - 16 });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED_RGB);
    doc.text('Normalite Edge · Exam Performance Report', pageWidth - 12, 6, {
        align: 'right',
    });
    doc.setDrawColor(...SLATE_200_RGB);
    doc.setLineWidth(0.2);
    doc.line(12, 8.5, pageWidth - 12, 8.5);
}

function addFooter(doc: jsPDF, generatedAt: string) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setDrawColor(...SLATE_200_RGB);
        doc.setLineWidth(0.3);
        doc.line(12, pageHeight - 10.5, pageWidth - 12, pageHeight - 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated ${generatedAt}`, 12, pageHeight - 8);
        doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - 12, pageHeight - 8, {
            align: 'right',
        });
    }
}

function nextY(doc: jsPDF, fallbackY: number, requiredHeight = 18): number {
    const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = Math.max(lastTable?.finalY ? lastTable.finalY + 9 : fallbackY, fallbackY);

    if (y + requiredHeight > pageHeight - 16) {
        doc.addPage();
        y = 18;
    }

    return y;
}

/**
 * Renders the complete report onto an existing jsPDF instance. jsPDF and its
 * autoTable plugin must already be loaded — exportReportToPdf takes care of
 * that. Keeping the render synchronous lets a headless script build a doc and
 * read it back via `doc.output('blob')` for visual verification.
 */
export function renderExamReportToPdf(doc: jsPDF, input: ExamReportInput): void {
    const { exam, summary, distribution, topPrograms, questionRows, rows, scope } = input;
    const columns = activeColumns(input.columnKeys);
    const examTitle = exam?.title || 'Untitled Exam';
    const generatedAt = formatDateTime(new Date().toISOString());
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const durationMinutes = Number(exam?.timeLimit || exam?.duration || 0);

    // The 14 source widths sum to 303mm, but the score table only has 297 - 16
    // (8mm side margins each side) of usable width. Scale the selected columns
    // so the table always fits; rounding to a tenth of a millimetre can
    // overshoot by a fraction, so trim the surplus cyclically afterwards.
    const usableWidth = pageWidth - 16;
    const sumWidths = columns.reduce((sum, column) => sum + PDF_COLUMN_WIDTHS[column.key], 0);
    const scale = sumWidths > usableWidth ? usableWidth / sumWidths : 1;
    const selectedWidths = columns.map((column) =>
        Math.min(55, Math.round(PDF_COLUMN_WIDTHS[column.key] * scale * 10) / 10),
    );
    let widthSurplus = selectedWidths.reduce((sum, width) => sum + width, 0) - usableWidth;
    for (let i = 0; widthSurplus > 0; i = (i + 1) % selectedWidths.length) {
        selectedWidths[i] = Math.round((selectedWidths[i] - 0.1) * 10) / 10;
        widthSurplus -= 0.1;
    }

    const columnStyles = columns.reduce<
        Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right' }>
    >((styles, column, index) => {
        styles[index] = {
            cellWidth: selectedWidths[index],
            halign: RIGHT_ALIGNED_COLUMNS.includes(column.key)
                ? 'right'
                : CENTRED_COLUMNS.includes(column.key)
                    ? 'center'
                    : 'left',
        };
        return styles;
    }, {});

    // Shared autoTable wrapper: a consistent margin plus a page hook that paints
    // the translucent watermark once per page and, from page 2 on, the running
    // header in the top margin zone. autoTable's willDrawPage hook fires before
    // any content is painted on each page, so the watermark stays behind it.
    //
    // Note: `data.pageNumber` is the plugin's per-table counter (it resets to 1
    // for every table), not the document page. Always read the real page from
    // the doc; jumping pages here is what made tables yank back to page 1.
    const watermarkPages = new Set<number>();
    function tableOptions(doc: jsPDF, extraOptions: UserOptions): UserOptions {
        return {
            ...extraOptions,
            margin: { top: 14, left: 8, right: 8 },
            willDrawPage: () => {
                const pageNum = doc.getCurrentPageInfo().pageNumber;
                if (!watermarkPages.has(pageNum)) {
                    watermarkPages.add(pageNum);
                    drawWatermark(doc, pageWidth, pageHeight);
                }
                if (pageNum > 1) {
                    drawRunningHeader(doc, pageWidth, examTitle);
                }
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(...INK_RGB);
            },
        };
    }

    doc.setFillColor(...BRAND_RGB);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text('Cebu Normal University', 12, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Normalite Edge Exam Performance Report', 12, 16);
    doc.text(
        `Scope: ${scope === 'FILTERED' ? 'Filtered student score rows' : 'All student score rows'}`,
        pageWidth - 12,
        9,
        { align: 'right' },
    );
    doc.text(`Generated: ${generatedAt}`, pageWidth - 12, 16, { align: 'right' });

    doc.setTextColor(...INK_RGB);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(examTitle, 12, 36, { maxWidth: pageWidth - 24 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text(exam?.description || 'No description provided.', 12, 42, { maxWidth: pageWidth - 24 });

    autoTable(doc, tableOptions(doc, {
        startY: 49,
        body: [
            ['Status', exam?.status || 'UNKNOWN', 'Category', exam?.category || 'N/A', 'Applicable Track(s)', describeTracks(exam)],
            ['Questions', String(input.questionCount), 'Duration', durationMinutes > 0 ? `${durationMinutes} minutes` : 'N/A', 'Deadline / Schedule End', formatDateTime(input.deadline)],
            ['Created By', describeCreator(exam)],
        ],
        theme: 'grid',
        styles: { fontSize: 6.8, cellPadding: 1.6, lineColor: SLATE_200_RGB, lineWidth: 0.15 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: BRAND_RGB, cellWidth: 32 },
            2: { fontStyle: 'bold', textColor: BRAND_RGB, cellWidth: 34 },
            4: { fontStyle: 'bold', textColor: BRAND_RGB, cellWidth: 38 },
        },
    }));

    const summaryY = nextY(doc, 72, 24);
    addSectionTitle(doc, 'Performance Summary', summaryY);
    autoTable(doc, tableOptions(doc, {
        startY: summaryY + 6,
        head: [['Total Attempts', 'Submitted', 'In Progress', 'Unique Students', 'Average Score', 'Highest Score', 'Lowest Score']],
        body: [[
            summary.total,
            summary.submitted,
            summary.inProgress,
            summary.uniqueStudents,
            formatPercent(summary.averageScore, 'No submissions'),
            formatPercent(summary.highestScore, 'No submissions'),
            formatPercent(summary.lowestScore, 'No submissions'),
        ]],
        theme: 'grid',
        headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 7.2, halign: 'center' },
        bodyStyles: { fontSize: 8.5, fontStyle: 'bold', halign: 'center', textColor: INK_RGB },
        styles: { cellPadding: 1.9, lineColor: SLATE_200_RGB, lineWidth: 0.15 },
    }));

    const distributionY = nextY(doc, 98, 30);
    addSectionTitle(doc, 'Score Distribution and Program Performance', distributionY);
    autoTable(doc, tableOptions(doc, {
        startY: distributionY + 6,
        head: [['Score Band', ...distribution.map((band) => `${band.label}%`)]],
        body: [['Students', ...distribution.map((band) => band.count)]],
        theme: 'grid',
        headStyles: { fillColor: SLATE_700_RGB, textColor: [255, 255, 255], fontSize: 6.8, halign: 'center' },
        bodyStyles: { fontSize: 7.5, halign: 'center' },
        styles: { cellPadding: 1.6, lineColor: SLATE_200_RGB, lineWidth: 0.15 },
    }));

    autoTable(doc, tableOptions(doc, {
        startY: nextY(doc, distributionY + 24, 20),
        head: [['Program', 'Submitted Attempts', 'Average Score']],
        body: topPrograms.length > 0
            ? topPrograms.map((program) => [program.program, program.count, formatPercent(program.averageScore)])
            : [['No program data available', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 6.8 },
        styles: { fontSize: 6.8, cellPadding: 1.6, lineColor: SLATE_200_RGB, lineWidth: 0.15 },
    }));

    const scoreRowsY = nextY(doc, 140, 40);
    addSectionTitle(doc, `Student Score Rows (${rows.length})`, scoreRowsY);
    autoTable(doc, tableOptions(doc, {
        startY: scoreRowsY + 6,
        head: [columns.map((column) => column.label)],
        body: rows.length > 0
            ? rows.map((row) => columns.map((column) => String(row[column.key] ?? '')))
            : [columns.map(() => '-')],
        theme: 'striped',
        rowPageBreak: 'avoid',
        headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 6.4, halign: 'center' },
        styles: { fontSize: 5.5, cellPadding: 1.15, overflow: 'linebreak', valign: 'middle', lineColor: SLATE_200_RGB, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: ZEBRA_RGB },
        columnStyles,
    }));

    if (questionRows.length > 0) {
        const questionsY = nextY(doc, 160, 48);
        addSectionTitle(doc, `Exam Question Appendix (${questionRows.length})`, questionsY);
        autoTable(doc, tableOptions(doc, {
            startY: questionsY + 6,
            head: [['No.', 'Section', 'Question', 'Choices', 'Correct Answer', 'Rationalization']],
            body: questionRows.map((row) => [
                row.globalQuestionNo,
                row.sectionTitle,
                row.questionText,
                row.choices,
                row.correctChoice,
                row.rationalization,
            ]),
            theme: 'grid',
            headStyles: { fillColor: SLATE_700_RGB, textColor: [255, 255, 255], fontSize: 6.5 },
            styles: { fontSize: 5.5, cellPadding: 1.2, overflow: 'linebreak', valign: 'top', lineColor: SLATE_200_RGB, lineWidth: 0.1 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 9.9 },
                1: { cellWidth: 29.7 },
                2: { cellWidth: 77.2 },
                3: { cellWidth: 69.3 },
                4: { halign: 'center', cellWidth: 23.7 },
                5: { cellWidth: 71.2 },
            },
        }));
    }

    addFooter(doc, generatedAt);
}

export async function exportReportToPdf(input: ExamReportInput): Promise<void> {
    const jsPdfModule = await import('jspdf');
    const JsPDF = jsPdfModule.default;
    const GState = jsPdfModule.GState
        ?? (jsPdfModule.default && (jsPdfModule.default as unknown as { GState?: GStateConstructor }).GState)
        ?? null;
    setWatermarkGState(GState ?? null);

    const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    renderExamReportToPdf(doc, input);
    doc.save(`${safeExamFilename(input.exam?.title)}-complete-report.pdf`);
}
