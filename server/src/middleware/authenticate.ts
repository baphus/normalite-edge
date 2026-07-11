import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/db';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload & { status?: string };
        }
    }
}

/**
 * Middleware to verify JWT access token from Authorization header.
 * Attaches decoded user payload to req.user.
 * Also checks that the user still exists and is not disabled/rejected.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, status: true, role: true },
        });

        if (!user) {
            throw ApiError.unauthorized('User no longer exists');
        }

        // Block disabled, rejected, or pending users
        const blockedStatuses = ['DISABLED', 'REJECTED', 'SUSPENDED'];
        if (blockedStatuses.includes(user.status as string)) {
            throw ApiError.unauthorized('Account is disabled or suspended');
        }

        req.user = { ...decoded, status: user.status as string };
        next();
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw ApiError.unauthorized('Invalid or expired access token');
    }
};
