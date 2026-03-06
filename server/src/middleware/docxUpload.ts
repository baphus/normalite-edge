import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const mime = String(file.mimetype || '').toLowerCase();

        const isDocxExtension = extension === '.docx';
        const isDocxMime = mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (!isDocxExtension || (!isDocxMime && mime.length > 0 && mime !== 'application/octet-stream' && mime !== 'application/zip')) {
            cb(ApiError.badRequest('Only .docx files are allowed'));
            return;
        }

        cb(null, true);
    },
});

export const parseDocxUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                next(ApiError.badRequest('File size exceeds 10MB limit'));
                return;
            }

            next(ApiError.badRequest(error.message));
            return;
        }

        if (error) {
            next(error as Error);
            return;
        }

        if (!req.file) {
            next(ApiError.badRequest('A .docx file is required'));
            return;
        }

        next();
    });
};
