import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * Must be registered last in the middleware chain.
 */
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Handle known ApiErrors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Handle Prisma known errors
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as any;
        if (prismaError.code === 'P2002') {
            // Do NOT expose field names — use a generic message
            return res.status(409).json({
                success: false,
                message: 'A record with this value already exists',
            });
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: 'Record not found',
            });
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }

    // Unknown errors
    logger.error('Unhandled error:', err);

    return res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
};
