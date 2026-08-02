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

        // P2021 (missing table) and P2022 (missing column) mean the database
        // is behind the generated Prisma Client — a migration that shipped
        // with the build has not been applied. Every request touching the
        // affected model fails until it is, so this is called out explicitly
        // rather than being logged as one more anonymous 500.
        if (prismaError.code === 'P2021' || prismaError.code === 'P2022') {
            const missing = prismaError.meta?.column || prismaError.meta?.table || 'unknown';
            logger.error(
                `DATABASE SCHEMA OUT OF DATE (${prismaError.code}): ${missing} is missing. ` +
                'The deployed Prisma Client expects it. Run `npx prisma migrate deploy` ' +
                'against this environment.',
                err
            );

            // Deliberately generic to the caller: schema details are not the
            // client's business, and this is not something they can fix.
            return res.status(503).json({
                success: false,
                message: 'The service is temporarily unavailable. Please try again shortly.',
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

    // body-parser rejects an oversized body with this. Without a case here it
    // falls through to the branch below and is reported as a 500 — an internal
    // fault, logged with a stack, for what is squarely a client error.
    if ((err as { type?: string }).type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Request payload is too large',
        });
    }

    // Unknown errors
    logger.error('Unhandled error:', err);

    return res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
};
