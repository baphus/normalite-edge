import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * CSRF protection via custom header check.
 *
 * Browsers enforce that cross-origin requests cannot set custom headers
 * without a CORS preflight. By requiring a custom header (X-Requested-With),
 * we ensure the request came from our own frontend (which is CORS-allowed)
 * rather than a malicious third-party page.
 *
 * This protects cookie-based endpoints (like /auth/refresh) from CSRF attacks.
 */
export const requireCsrfHeader = (req: Request, _res: Response, next: NextFunction) => {
    const csrfHeader = req.headers['x-requested-with'];

    if (!csrfHeader || csrfHeader !== 'XMLHttpRequest') {
        throw ApiError.forbidden('Missing or invalid CSRF header');
    }

    next();
};
