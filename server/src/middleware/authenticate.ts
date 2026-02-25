import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

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
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch {
        throw ApiError.unauthorized('Invalid or expired access token');
    }
};
