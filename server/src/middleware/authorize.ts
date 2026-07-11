import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Role } from '@prisma/client';

/**
 * Middleware factory for role-based access control.
 * Usage: authorize('ADMIN', 'REVIEWER')
 */
export const authorize = (...allowedRoles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            throw ApiError.unauthorized('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            throw ApiError.forbidden('You do not have permission to perform this action');
        }

        next();
    };
};
