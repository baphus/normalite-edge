import { Request, Response, NextFunction } from 'express';
import { verifySupabaseAccessToken, SupabaseIdentity, isGoogleIdentity } from '../utils/supabaseJwt';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { isInternalEmail } from '../config/env';
import prisma from '../config/db';

export interface AppUser {
    userId: string;
    role: string;
    status: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            /**
             * Verified Supabase identity. Present whenever a valid access token
             * was supplied — even if this person has no application account.
             */
            supabaseUser?: SupabaseIdentity;
            /**
             * The application user. Present only when a `public.users` row
             * exists for the Supabase identity. This — not `supabaseUser` — is
             * what authorizes access to anything.
             */
            user?: AppUser;
        }
    }
}

const readBearerToken = (req: Request): string => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
        throw ApiError.unauthorized('Access token required');
    }

    return token;
};

/**
 * Verify the Supabase access token and attach the identity — nothing more.
 *
 * Used by the small set of endpoints that must be reachable by someone who is
 * authenticated but has no profile yet: reading their own auth state, and
 * completing registration.
 */
export const requireSupabaseSession = catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
        req.supabaseUser = await verifySupabaseAccessToken(readBearerToken(req));
        next();
    }
);

/**
 * For the handful of actions a user must be able to take *while* registering.
 *
 * `requireSupabaseSession` is too weak on its own: it touches no database, so
 * any Google account on the internet satisfies it — the `@cnu.edu.ph` rule is
 * deliberately enforced here rather than in Supabase config, and a disabled
 * account still holds a perfectly valid session. `authenticate` is too strong:
 * it demands the `public.users` row that registration has not created yet.
 *
 * This sits between them. An existing account passes on the same terms as
 * `authenticate`. An identity with no account passes only if it could actually
 * go on to create one — the same eligibility `completeProfile` enforces.
 */
export const requireRegistrationSession = catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
        const identity = await verifySupabaseAccessToken(readBearerToken(req));
        req.supabaseUser = identity;

        const user = await prisma.user.findUnique({
            where: { id: identity.id },
            select: { id: true, status: true, role: true, email: true },
        });

        if (user) {
            if (user.status === 'DISABLED') {
                throw ApiError.forbidden('Account is disabled');
            }

            req.user = {
                userId: user.id,
                role: user.role,
                status: user.status as string,
                email: user.email,
            };

            return next();
        }

        if (!isInternalEmail(identity.email) || !isGoogleIdentity(identity)) {
            throw ApiError.forbidden('Profile setup required');
        }

        next();
    }
);

/**
 * Full authentication: a verified Supabase identity **and** a matching
 * application account that is not disabled.
 *
 * `public.users` is the authorization gate. A Supabase identity with no row
 * here reaches nothing, which is what lets the `@cnu.edu.ph` restriction be
 * enforced entirely at profile-creation time rather than in Supabase config.
 *
 * Role and status are read from the database on every request rather than from
 * token claims, so a role change or a disable takes effect on the next request
 * instead of waiting for the token to refresh.
 */
export const authenticate = catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
        const identity = await verifySupabaseAccessToken(readBearerToken(req));
        req.supabaseUser = identity;

        const user = await prisma.user.findUnique({
            where: { id: identity.id },
            select: { id: true, status: true, role: true, email: true },
        });

        if (!user) {
            // Authenticated with Supabase, but not registered with this app.
            // Deliberately 403 and not 401: a 401 would trigger the client's
            // token-refresh interceptor, which would refresh successfully
            // (the Supabase session is valid), retry, fail again, and bounce
            // the user to /login — where Google would silently re-authenticate
            // them straight back into the same state. See GET /auth/me, which
            // reports this condition as a normal 200 response.
            throw ApiError.forbidden('Profile setup required');
        }

        if (user.status === 'DISABLED') {
            throw ApiError.forbidden('Account is disabled');
        }

        req.user = {
            userId: user.id,
            role: user.role,
            status: user.status as string,
            email: user.email,
        };

        next();
    }
);
