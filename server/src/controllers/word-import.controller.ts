import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { wordImportService } from '../services/word-import.service';

export const wordImportController = {
    importExamFromWord: catchAsync(async (req: Request, res: Response) => {
        const file = req.file!;

        const result = await wordImportService.importExamFromWord({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            createdBy: req.user!.userId,
            title: req.body?.title,
        });

        ApiResponse.created(res, {
            examId: result.exam.id,
            title: result.exam.title,
            summary: result.summary,
        }, 'Word file imported to mock exam successfully');
    }),

    importDeckFromWord: catchAsync(async (req: Request, res: Response) => {
        const file = req.file!;

        const result = await wordImportService.importDeckFromWord({
            fileBuffer: file.buffer,
            originalName: file.originalname,
            createdBy: req.user!.userId,
            title: req.body?.title,
        });

        ApiResponse.created(res, {
            deckId: result.deck.id,
            title: result.deck.title,
            summary: result.summary,
        }, 'Word file imported to study material successfully');
    }),

    downloadWordTemplate: catchAsync(async (_req: Request, res: Response) => {
        const buffer = await wordImportService.generateTemplateDocxBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="question-import-template.docx"');
        res.status(200).send(buffer);
    }),
};
