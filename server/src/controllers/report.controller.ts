import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { reportService } from '../services/report.service';
import { resolveProgramTrack } from '../utils/requirementsCompat';

const parseDate = (value?: string) => (value ? new Date(value) : undefined);

export const reportController = {
    getExamPerformance: catchAsync(async (req: Request, res: Response) => {
        const { examId, program, program_track, startDate, endDate } = req.query;

        const report = await reportService.getExamPerformance({
            examId: examId as string | undefined,
            program: resolveProgramTrack({
                program: program as string,
                program_track: program_track as string,
            }),
            startDate: parseDate(startDate as string | undefined),
            endDate: parseDate(endDate as string | undefined),
        });

        ApiResponse.success(res, report);
    }),

    exportExamPerformance: catchAsync(async (req: Request, res: Response) => {
        const { format = 'csv', examId, program, program_track, startDate, endDate } = req.query;

        const programTrack = resolveProgramTrack({
            program: program as string,
            program_track: program_track as string,
        });

        const report = await reportService.getExamPerformance({
            examId: examId as string | undefined,
            program: programTrack,
            startDate: parseDate(startDate as string | undefined),
            endDate: parseDate(endDate as string | undefined),
        });

        if (format === 'csv') {
            const csv = reportService.toCsv(report.items as any);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="exam-performance-report.csv"');
            return res.status(200).send(csv);
        }

        if (format === 'pdf') {
            const pdfBuffer = await reportService.toPdf(report.items as any, {
                examId: examId as string | undefined,
                program: programTrack,
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="exam-performance-report.pdf"');
            return res.status(200).send(pdfBuffer);
        }

        throw ApiError.badRequest('Unsupported export format. Use csv or pdf');
    }),
};
