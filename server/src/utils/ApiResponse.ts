import { Response } from 'express';

/**
 * Standardized API response helper.
 * All API responses go through this for consistency.
 */
export class ApiResponse {
    static success<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static created<T>(res: Response, data: T, message = 'Created successfully') {
        return res.status(201).json({
            success: true,
            message,
            data,
        });
    }

    static paginated<T>(
        res: Response,
        data: T[],
        meta: { total: number; page: number; limit: number },
        message = 'Success'
    ) {
        return res.status(200).json({
            success: true,
            message,
            data,
            meta: {
                ...meta,
                totalPages: Math.ceil(meta.total / meta.limit),
            },
        });
    }

    static error(res: Response, statusCode: number, message: string, errors?: unknown) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(errors && { errors }),
        });
    }
}
