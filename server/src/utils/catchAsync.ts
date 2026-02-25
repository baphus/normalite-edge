import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to catch errors and pass them to the error handler.
 */
export const catchAsync = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};
