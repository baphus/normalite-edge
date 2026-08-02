import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { SupabaseIdentity } from '../utils/supabaseJwt';

/**
 * `requireRegistrationSession` is the authorization boundary that lets someone
 * upload an avatar *while* registering. It has to be looser than `authenticate`
 * (no `public.users` row exists yet) without becoming a bare token check —
 * a bare token check would admit any Google account on the internet, because
 * the institutional-domain rule is enforced in this codebase rather than in
 * Supabase config.
 *
 * Lives in its own file so the module stubbing below cannot affect, or be
 * affected by, another suite: the test runner gives each file its own process.
 */

let identity: SupabaseIdentity;
let userRow: Record<string, unknown> | null = null;
let requireRegistrationSession: (req: Request, res: Response, next: (err?: unknown) => void) => void;

const GOOGLE_IDENTITY: SupabaseIdentity = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'ada@cnu.edu.ph',
    provider: 'google',
    providers: ['google'],
    fullName: 'Ada Lovelace',
    pictureUrl: null,
};

/** Drive the middleware and report whatever it passed to `next`. */
const run = (headers: Record<string, string> = { authorization: 'Bearer valid' }) =>
    new Promise<{ error?: { statusCode?: number; message?: string }; req: Request }>((resolve) => {
        const req = { headers } as unknown as Request;
        requireRegistrationSession(req, {} as Response, (error?: unknown) =>
            resolve({ error: error as { statusCode?: number; message?: string }, req })
        );
    });

before(async () => {
    (globalThis as unknown as { __prisma__: unknown }).__prisma__ = {
        user: { findUnique: async () => userRow },
    };

    // Swap the token verifier for one that returns whatever `identity` holds,
    // before the middleware module is first loaded.
    const jwtPath = require.resolve('../utils/supabaseJwt');
    const actual = require(jwtPath);
    require.cache[jwtPath] = {
        ...(require.cache[jwtPath] as NodeModule),
        exports: { ...actual, verifySupabaseAccessToken: async () => identity },
    } as NodeModule;

    ({ requireRegistrationSession } = await import('../middleware/authenticate'));
});

describe('requireRegistrationSession', () => {
    it('admits an eligible identity that has no account yet', async () => {
        identity = GOOGLE_IDENTITY;
        userRow = null;

        const { error, req } = await run();

        assert.equal(error, undefined);
        assert.equal(req.supabaseUser?.email, 'ada@cnu.edu.ph');
        // No application account, so nothing is authorized beyond registering.
        assert.equal(req.user, undefined);
    });

    it('refuses an account from outside the institution', async () => {
        identity = { ...GOOGLE_IDENTITY, email: 'attacker@gmail.com' };
        userRow = null;

        const { error } = await run();

        assert.equal(error?.statusCode, 403);
    });

    it('refuses an institutional address that did not use Google', async () => {
        identity = { ...GOOGLE_IDENTITY, provider: 'email', providers: ['email'] };
        userRow = null;

        const { error } = await run();

        assert.equal(error?.statusCode, 403);
    });

    it('admits an existing active account and attaches it', async () => {
        identity = GOOGLE_IDENTITY;
        userRow = {
            id: GOOGLE_IDENTITY.id,
            email: 'ada@cnu.edu.ph',
            status: 'ACTIVE',
            role: 'REVIEWEE',
        };

        const { error, req } = await run();

        assert.equal(error, undefined);
        assert.equal(req.user?.userId, GOOGLE_IDENTITY.id);
    });

    it('refuses a disabled account despite a valid session', async () => {
        identity = GOOGLE_IDENTITY;
        userRow = {
            id: GOOGLE_IDENTITY.id,
            email: 'ada@cnu.edu.ph',
            status: 'DISABLED',
            role: 'REVIEWEE',
        };

        const { error } = await run();

        assert.equal(error?.statusCode, 403);
        assert.match(String(error?.message), /disabled/i);
    });

    it('admits an invited account on an external address, which an admin created', async () => {
        identity = { ...GOOGLE_IDENTITY, email: 'guest@example.org' };
        userRow = {
            id: GOOGLE_IDENTITY.id,
            email: 'guest@example.org',
            status: 'ACTIVE',
            role: 'REVIEWER',
        };

        const { error } = await run();

        assert.equal(error, undefined);
    });

    it('refuses a request with no bearer token', async () => {
        identity = GOOGLE_IDENTITY;
        userRow = null;

        const { error } = await run({});

        assert.equal(error?.statusCode, 401);
    });
});
