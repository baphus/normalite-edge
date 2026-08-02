import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { importRemoteAvatar, isStorableAvatarUrl } from '../utils/importRemoteAvatar';
import { completeProfileSchema, updateProfileSchema } from '../validators/auth.validator';
import type { SupabaseIdentity } from '../utils/supabaseJwt';

/**
 * Covers the avatar a Google user arrives with: how we normalise it, which
 * hosts we will store one from, and whether the profile form is actually told
 * about it.
 */

const GOOGLE_AVATAR = 'https://lh3.googleusercontent.com/a/ACg8ocKexample=s96-c';
const CLOUDINARY_AVATAR = 'https://res.cloudinary.com/demo/image/upload/v1/profile-pics/x.jpg';

describe('importRemoteAvatar', () => {
    it('upgrades the Google size directive so the avatar is crisp at 2x', () => {
        assert.equal(
            importRemoteAvatar(GOOGLE_AVATAR),
            'https://lh3.googleusercontent.com/a/ACg8ocKexample=s256-c'
        );
    });

    it('leaves a URL with no size directive untouched', () => {
        const url = 'https://lh3.googleusercontent.com/a/ACg8ocKexample';
        assert.equal(importRemoteAvatar(url), url);
    });

    it('rejects a host outside the provider allowlist', () => {
        assert.equal(importRemoteAvatar('https://ui-avatars.com/api/?name=A'), null);
    });

    it('rejects a lookalike host that merely ends in the allowed name', () => {
        assert.equal(importRemoteAvatar('https://evilgoogleusercontent.com/a/x=s96-c'), null);
    });

    it('rejects plaintext http', () => {
        assert.equal(importRemoteAvatar('http://lh3.googleusercontent.com/a/x=s96-c'), null);
    });

    it('returns null rather than throwing on a malformed URL', () => {
        assert.equal(importRemoteAvatar('not a url'), null);
    });
});

describe('isStorableAvatarUrl', () => {
    it('accepts our own upload bucket', () => {
        assert.equal(isStorableAvatarUrl(CLOUDINARY_AVATAR), true);
    });

    it('accepts a provider-hosted avatar', () => {
        assert.equal(isStorableAvatarUrl(GOOGLE_AVATAR), true);
    });

    it('rejects an arbitrary external host', () => {
        assert.equal(isStorableAvatarUrl('https://ui-avatars.com/api/?name=A'), false);
    });

    it('rejects a lookalike of the upload bucket', () => {
        assert.equal(isStorableAvatarUrl('https://res.cloudinary.com.evil.test/x.jpg'), false);
    });

    it('rejects plaintext http', () => {
        assert.equal(isStorableAvatarUrl('http://res.cloudinary.com/demo/x.jpg'), false);
    });
});

describe('profile validators reject an unstorable avatar', () => {
    const validProfile = {
        firstName: 'Ada',
        lastName: 'Lovelace',
        middleInitial: 'B',
        track_id: '11111111-1111-4111-8111-111111111111',
        campus_id: '22222222-2222-4222-8222-222222222222',
        yearLevel: '1st Year',
        section: 'A',
        studentId: '2025-12345',
        contactNumber: '09171234567',
    };

    it('accepts an uploaded picture', () => {
        const result = completeProfileSchema.safeParse({
            ...validProfile,
            picture: CLOUDINARY_AVATAR,
        });
        assert.equal(result.success, true);
    });

    it('accepts no picture at all', () => {
        assert.equal(completeProfileSchema.safeParse(validProfile).success, true);
    });

    it('rejects a picture pointing at an arbitrary external host', () => {
        const result = completeProfileSchema.safeParse({
            ...validProfile,
            picture: 'https://tracker.test/pixel.gif',
        });
        assert.equal(result.success, false);
    });

    it('rejects the same on profile update', () => {
        const result = updateProfileSchema.safeParse({ picture: 'https://tracker.test/pixel.gif' });
        assert.equal(result.success, false);
    });
});

describe('getAuthState surfaces the provider avatar', () => {
    // `config/db` reuses `globalThis.__prisma__` when present, so seeding it
    // before the service is first imported swaps in a stub without a database.
    let userRow: Record<string, unknown> | null = null;
    let authService: typeof import('../services/auth.service').authService;

    before(async () => {
        (globalThis as unknown as { __prisma__: unknown }).__prisma__ = {
            user: { findUnique: async () => userRow },
        };
        ({ authService } = await import('../services/auth.service'));
    });

    const identity = (overrides: Partial<SupabaseIdentity> = {}): SupabaseIdentity => ({
        id: '33333333-3333-4333-8333-333333333333',
        email: 'ada@cnu.edu.ph',
        provider: 'google',
        providers: ['google'],
        fullName: 'Ada Lovelace',
        pictureUrl: GOOGLE_AVATAR,
        ...overrides,
    });

    it('suggests the Google picture to a brand-new signup', async () => {
        userRow = null;

        const state = await authService.getAuthState(identity());

        assert.equal(state.profileComplete, false);
        assert.equal(state.eligible, true);
        assert.equal(state.suggested?.picture, 'https://lh3.googleusercontent.com/a/ACg8ocKexample=s256-c');
    });

    it('suggests nothing when the provider supplied no picture', async () => {
        userRow = null;

        const state = await authService.getAuthState(identity({ pictureUrl: null }));

        assert.equal(state.suggested?.picture, null);
    });

    it('falls back to the Google picture for an invited user who has none', async () => {
        userRow = {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'ada@cnu.edu.ph',
            status: 'ACTIVE',
            role: 'REVIEWEE',
            createdByAdmin: true,
            firstName: 'User',
            lastName: 'Account',
            profilePicture: null,
        };

        const state = await authService.getAuthState(identity());

        assert.equal(state.profileComplete, false);
        assert.equal(state.suggested?.picture, 'https://lh3.googleusercontent.com/a/ACg8ocKexample=s256-c');
        // The placeholders are what the form is asking them to replace.
        assert.equal(state.suggested?.firstName, null);
        assert.equal(state.suggested?.lastName, null);
    });

    it('prefers a picture the invited user already has', async () => {
        userRow = {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'ada@cnu.edu.ph',
            status: 'ACTIVE',
            role: 'REVIEWEE',
            createdByAdmin: true,
            firstName: 'User',
            lastName: 'Account',
            profilePicture: CLOUDINARY_AVATAR,
        };

        const state = await authService.getAuthState(identity());

        assert.equal(state.suggested?.picture, CLOUDINARY_AVATAR);
    });
});
