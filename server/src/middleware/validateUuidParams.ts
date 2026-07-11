import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware to validate that specified path parameters are valid UUIDs.
 * Usage: validateUuidParams('id')  or  validateUuidParams('id', 'examId')
 */
export const validateUuidParams = (...paramNames: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        for (const name of paramNames) {
            const value = req.params[name];
            if (value && typeof value === 'string' && !UUID_REGEX.test(value)) {
                throw ApiError.badRequest(`Invalid ${name} format`);
            }
        }
        next();
    };
};
