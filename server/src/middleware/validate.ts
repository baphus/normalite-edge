import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * Middleware factory to validate request body/query/params with a Zod schema.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data; // Replace with parsed (and potentially transformed) data
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return ApiResponse.error(res, 400, 'Validation failed', formattedErrors);
            }
            next(error);
        }
    };
};
