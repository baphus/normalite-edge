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

interface PdfFilters {
    examId?: string;
    program?: string;
    startDate?: string;
    endDate?: string;
}

const round = (value: number) => Math.round(value * 100) / 100;
const PASSING_SCORE = 75;

const formatDateTime = (value?: Date | string | null) => {
    if (!value) return 'N/A';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
};

const enumLabel = (value?: string | null) => {
    if (!value) return 'N/A';
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

export class ReportService {
    private async getVisibleStudentCountForExam(examId: string) {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: {
                id: true,
                programTrack: true,
                trackLinks: {
                    select: {
                        track: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
        });

        if (!exam) return 0;

        const baseWhere: any = {
            role: 'REVIEWEE',
            status: 'ACTIVE',
        };

        const trackIds = exam.trackLinks.map((link) => link.track.id);
        const trackNames = exam.trackLinks.map((link) => link.track.name).filter(Boolean);
        const trackCodes = exam.trackLinks.map((link) => link.track.code).filter(Boolean) as string[];

        if (trackIds.length > 0) {
            return prisma.user.count({
                where: {
                    ...baseWhere,
                    OR: [
                        { trackId: { in: trackIds } },
                        ...trackNames.map((name) => ({ programTrack: { equals: name, mode: 'insensitive' as const } })),
                        ...trackCodes.map((code) => ({ programTrack: { equals: code, mode: 'insensitive' as const } })),
                    ],
                },
            });
        }

        if (exam.programTrack?.trim()) {
            return prisma.user.count({
                where: {
                    ...baseWhere,
                    programTrack: {
                        equals: exam.programTrack.trim(),
                        mode: 'insensitive',
                    },
                },
            });
        }

        return prisma.user.count({ where: baseWhere });
    }

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

        const submittedStudentCount = new Set(attempts.map((attempt) => attempt.userId)).size;
        const totalVisibleStudents = params.examId
            ? await this.getVisibleStudentCountForExam(params.examId)
            : submittedStudentCount;

        return {
            generatedAt: new Date().toISOString(),
            items,
            summary: {
                submittedStudentCount,
                totalVisibleStudents,
            },
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

    async toPdf(items: ReportRow[], filters: PdfFilters) {
        return new Promise<Buffer>((resolve) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks: Buffer[] = [];

            const ensureSpace = (minimumHeight = 40) => {
                if (doc.y + minimumHeight > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                }
            };

            const sectionTitle = (title: string) => {
                ensureSpace(28);
                doc.moveDown(0.4);
                doc.fontSize(12).font('Helvetica-Bold').text(title);
                doc.moveDown(0.2);
                doc.font('Helvetica');
            };

            const kv = (label: string, value: string | number | boolean) => {
                ensureSpace(18);
                doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
                doc.font('Helvetica').text(String(value));
            };

            const renderExamDetails = async (examId: string) => {
                const exam = await prisma.exam.findUnique({
                    where: { id: examId },
                    include: {
                        creator: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        sections: {
                            orderBy: { orderNo: 'asc' },
                            include: {
                                questions: {
                                    orderBy: { orderNo: 'asc' },
                                },
                            },
                        },
                        questions: {
                            orderBy: [{ sectionId: 'asc' }, { orderNo: 'asc' }],
                        },
                        trackLinks: {
                            include: {
                                track: {
                                    select: {
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                        attempts: {
                            where: {
                                ...(filters.startDate || filters.endDate
                                    ? {
                                        submittedAt: {
                                            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                                            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                                        },
                                    }
                                    : {}),
                            },
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        programTrack: true,
                                    },
                                },
                            },
                            orderBy: { startedAt: 'desc' },
                        },
                    },
                });

                if (!exam) {
                    sectionTitle('Exam Details');
                    doc.fontSize(10).text('Exam details not found for this export.');
                    return;
                }

                sectionTitle('Exam Details');
                kv('Exam ID', exam.id);
                kv('Title', exam.title);
                kv('Description', exam.description || 'N/A');
                kv('Subject', exam.subject || 'N/A');
                kv('Category', enumLabel(exam.category));
                kv('Status', enumLabel(exam.status));
                kv('Program Track (Legacy)', exam.programTrack || 'N/A');
                kv('Created By', `${exam.creator.firstName} ${exam.creator.lastName}`.trim() || exam.creator.email || 'N/A');
                kv('Creator Email', exam.creator.email || 'N/A');
                kv('Created At', formatDateTime(exam.createdAt));
                kv('Updated At', formatDateTime(exam.updatedAt));
                kv('Time Limit (Minutes)', exam.timeLimitMinutes);
                kv('Max Attempts', exam.maxAttempts ?? 'N/A');
                kv('Cooldown (Minutes)', exam.cooldownMinutes);
                kv('Feedback Mode', enumLabel(exam.feedbackMode));
                kv('Schedule Start', formatDateTime(exam.scheduleStart));
                kv('Schedule End', formatDateTime(exam.scheduleEnd));
                kv('Close on Deadline', exam.closeOnDeadline ? 'Yes' : 'No');
                kv('Total Sections', exam.sections.length);
                kv('Total Questions', exam.questions.length);

                sectionTitle('Target Tracks');
                if (exam.trackLinks.length === 0) {
                    doc.fontSize(10).text('No explicit track mapping (visible by program_track rules).');
                } else {
                    exam.trackLinks.forEach((link, index) => {
                        ensureSpace(16);
                        const trackLabel = link.track.code
                            ? `${link.track.name} (${link.track.code})`
                            : link.track.name;
                        doc.fontSize(10).text(`${index + 1}. ${trackLabel}`);
                    });
                }

                sectionTitle('Sections');
                if (exam.sections.length === 0) {
                    doc.fontSize(10).text('No sections found.');
                } else {
                    exam.sections.forEach((section) => {
                        ensureSpace(44);
                        doc.fontSize(10).font('Helvetica-Bold').text(`Section ${section.orderNo}: ${section.title}`);
                        doc.font('Helvetica').fontSize(10).text(`Instructions: ${section.instructions || 'N/A'}`);
                        doc.text(`Section Time (Minutes): ${section.sectionTimeMinutes ?? 'N/A'}`);
                        doc.text(`Questions in Section: ${section.questions.length}`);
                        doc.moveDown(0.2);
                    });
                }

                sectionTitle('Questions');
                if (exam.questions.length === 0) {
                    doc.fontSize(10).text('No questions found.');
                } else {
                    exam.questions.forEach((question) => {
                        ensureSpace(120);
                        doc.fontSize(10).font('Helvetica-Bold').text(
                            `Q${question.orderNo} • Section ${exam.sections.find((section) => section.id === question.sectionId)?.orderNo ?? '-'} • Points: ${question.points}`
                        );
                        doc.font('Helvetica').fontSize(10).text(`Question: ${question.questionText}`);
                        doc.text(`A. ${question.choiceA}`);
                        doc.text(`B. ${question.choiceB}`);
                        doc.text(`C. ${question.choiceC}`);
                        doc.text(`D. ${question.choiceD}`);
                        doc.text(`Correct Choice: ${question.correctChoice}`);
                        doc.text(`Rationalization: ${question.rationalization || 'N/A'}`);
                        doc.text(`Image URL: ${question.imageUrl || 'N/A'}`);
                        doc.moveDown(0.35);
                    });
                }

                sectionTitle('Attempt Details');
                if (exam.attempts.length === 0) {
                    doc.fontSize(10).text('No attempts found for selected filters.');
                } else {
                    exam.attempts.forEach((attempt, index) => {
                        ensureSpace(76);
                        const studentName = `${attempt.user.firstName} ${attempt.user.lastName}`.trim() || attempt.user.email || 'Unknown';
                        const percentage = Number(attempt.percentage || 0);
                        const passState = percentage >= PASSING_SCORE ? 'Passed' : 'Below Target';

                        doc.fontSize(10).font('Helvetica-Bold').text(`Attempt ${index + 1}`);
                        doc.font('Helvetica').fontSize(10).text(`Attempt ID: ${attempt.id}`);
                        doc.text(`Student: ${studentName}`);
                        doc.text(`Student Email: ${attempt.user.email}`);
                        doc.text(`Student Program Track: ${attempt.user.programTrack || 'N/A'}`);
                        doc.text(`Attempt No: ${attempt.attemptNo}`);
                        doc.text(`Status: ${enumLabel(attempt.status)}`);
                        doc.text(`Submission Type: ${enumLabel(attempt.submissionType)}`);
                        doc.text(`Started At: ${formatDateTime(attempt.startedAt)}`);
                        doc.text(`Submitted At: ${formatDateTime(attempt.submittedAt)}`);
                        doc.text(`Last Saved At: ${formatDateTime(attempt.lastSavedAt)}`);
                        doc.text(`Time Spent (Seconds): ${attempt.timeSpentSeconds}`);
                        doc.text(`Remaining Seconds: ${attempt.remainingSeconds ?? 'N/A'}`);
                        doc.text(`Raw Score: ${attempt.score}`);
                        doc.text(`Percentage: ${round(percentage)}% (${passState})`);
                        doc.moveDown(0.35);
                    });
                }
            };

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            doc.fontSize(16).font('Helvetica-Bold').text('Normalite EDGE - Exam Performance Report');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`);
            doc.text(`Exam ID Filter: ${filters.examId || 'All'}`);
            doc.text(`Program Filter: ${filters.program || 'All'}`);
            doc.text(`Date Range: ${filters.startDate || 'Any'} - ${filters.endDate || 'Any'}`);
            doc.moveDown(1);

            const finalizeDocument = async () => {
                if (items.length === 0) {
                    doc.fontSize(11).text('No report rows found for selected filters.');
                    doc.end();
                    return;
                }

                sectionTitle('Performance Summary');
                for (const item of items) {
                    ensureSpace(68);
                    doc.fontSize(11).font('Helvetica-Bold').text(`${item.examTitle} (${item.subject})`, { underline: true });
                    doc.font('Helvetica').fontSize(10).text(`Attempts: ${item.attemptsCount}`);
                    doc.text(`Average Score: ${item.averageScore}%`);
                    doc.text(`Pass Rate: ${item.passRate}%`);
                    doc.text(`Highest Score: ${item.highestScore}%`);
                    doc.text(`Lowest Score: ${item.lowestScore}%`);
                    doc.moveDown(0.6);
                }

                if (filters.examId) {
                    await renderExamDetails(filters.examId);
                }

                doc.end();
            };

            finalizeDocument().catch(() => {
                doc.end();
            });
        });
    }
}

export const reportService = new ReportService();
