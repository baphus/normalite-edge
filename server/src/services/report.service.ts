import PDFDocument from 'pdfkit';
import prisma from '../config/db';

interface ReportRow {
    examId: string;
    examTitle: string;
    subject: string;
    attemptsCount: number;
    averageScore: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export class ReportService {
    async getExamPerformance(params: {
        examId?: string;
        program?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const where: any = {
            status: { not: 'IN_PROGRESS' },
        };

        if (params.examId) where.examId = params.examId;
        if (params.program) {
            where.OR = [
                { user: { programTrack: params.program } },
                { exam: { programTrack: params.program } },
            ];
        }
        if (params.startDate || params.endDate) {
            where.submittedAt = {};
            if (params.startDate) where.submittedAt.gte = params.startDate;
            if (params.endDate) where.submittedAt.lte = params.endDate;
        }

        const attempts = await prisma.attempt.findMany({
            where,
            include: {
                exam: {
                    select: {
                        id: true,
                        title: true,
                        subject: true,
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });

        const grouped = new Map<string, ReportRow>();

        for (const attempt of attempts) {
            const key = attempt.exam.id;
            const current = grouped.get(key) || {
                examId: attempt.exam.id,
                examTitle: attempt.exam.title,
                subject: attempt.exam.subject || 'General',
                attemptsCount: 0,
                averageScore: 0,
                passRate: 0,
                highestScore: 0,
                lowestScore: 100,
            };

            const score = Number(attempt.percentage || 0);
            current.attemptsCount += 1;
            current.averageScore += score;
            current.highestScore = Math.max(current.highestScore, score);
            current.lowestScore = Math.min(current.lowestScore, score);
            current.passRate += score >= 75 ? 1 : 0;

            grouped.set(key, current);
        }

        const items = Array.from(grouped.values()).map((row) => ({
            ...row,
            averageScore: row.attemptsCount > 0 ? round(row.averageScore / row.attemptsCount) : 0,
            passRate: row.attemptsCount > 0 ? round((row.passRate / row.attemptsCount) * 100) : 0,
            highestScore: round(row.highestScore),
            lowestScore: row.lowestScore === 100 && row.attemptsCount === 0 ? 0 : round(row.lowestScore),
        }));

        return {
            generatedAt: new Date().toISOString(),
            items,
        };
    }

    toCsv(items: ReportRow[]) {
        const headers = [
            'exam_id',
            'exam_title',
            'subject',
            'attempts_count',
            'average_score',
            'pass_rate',
            'highest_score',
            'lowest_score',
        ];

        const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

        const rows = items.map((item) => [
            escape(item.examId),
            escape(item.examTitle),
            escape(item.subject),
            escape(item.attemptsCount),
            escape(item.averageScore),
            escape(item.passRate),
            escape(item.highestScore),
            escape(item.lowestScore),
        ].join(','));

        return [headers.join(','), ...rows].join('\n');
    }

    async toPdf(items: ReportRow[], filters: { examId?: string; program?: string; startDate?: string; endDate?: string }) {
        return new Promise<Buffer>((resolve) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            doc.fontSize(16).text('Normalite EDGE - Exam Performance Report');
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
            doc.text(`Exam ID Filter: ${filters.examId || 'All'}`);
            doc.text(`Program Filter: ${filters.program || 'All'}`);
            doc.text(`Date Range: ${filters.startDate || 'Any'} - ${filters.endDate || 'Any'}`);
            doc.moveDown(1);

            if (items.length === 0) {
                doc.fontSize(11).text('No report rows found for selected filters.');
                doc.end();
                return;
            }

            for (const item of items) {
                doc.fontSize(11).text(`${item.examTitle} (${item.subject})`, { underline: true });
                doc.fontSize(10).text(`Attempts: ${item.attemptsCount}`);
                doc.text(`Average Score: ${item.averageScore}%`);
                doc.text(`Pass Rate: ${item.passRate}%`);
                doc.text(`Highest Score: ${item.highestScore}%`);
                doc.text(`Lowest Score: ${item.lowestScore}%`);
                doc.moveDown(0.8);
            }

            doc.end();
        });
    }
}

export const reportService = new ReportService();
