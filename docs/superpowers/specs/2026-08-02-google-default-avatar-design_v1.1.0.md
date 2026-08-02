# Google profile picture as the default avatar on Complete Profile

**Version:** v1.1.0
**Date:** 2026-08-02
**Status:** Implemented, independently reviewed
**Supersedes:** `2026-08-02-google-default-avatar-design_v1.0.0.md`

## Changelog

| Version | Date | Change |
|---------|------|--------|
| v1.0.0 | 2026-08-02 | Initial design. Surface the Google-provided avatar as the editable default on the Complete Profile page, for both Google SSO signups and admin-invited users who authenticate with Google. |
| v1.1.0 | 2026-08-02 | Added the upload-authorisation fix without which the avatar could not actually be edited by a new Google signup; hardened the allowlist against embedded credentials and the apex domain; scoped the size rewrite to the URL path; corrected the upload rate-limiter and body-parser mounts. All arising from independent review. |

## Problem

A reviewee signing up with Google lands on `/complete-profile` and sees a generic
`UserRound` placeholder icon with an "Add profile photo" button. They have no
indication that their Google account picture is already available.

The picture is not actually lost. `AuthService.completeProfile` already falls back
to `importRemoteAvatar(identity.pictureUrl)` when the client sends no picture, and
`importRemoteAvatar` already enforces an SSRF allowlist against
`googleusercontent.com`.

The gap is one of visibility: `GET /auth/me` never returns the avatar URL, so the
page cannot render it. The user cannot see the default, cannot knowingly keep it,
and cannot make an informed choice to replace it.

## Goals

- The Google account picture renders as the default avatar on the Complete
  Profile page, for reviewees signing up via Google SSO.
- The same default applies to admin-invited users who authenticate with Google.
- The user can genuinely replace the default with their own upload.
- No new trust surface: a client-supplied avatar URL is never stored without
  passing an allowlist.

## Non-goals

- Refreshing an existing user's avatar when their Google picture changes later.
- A "remove photo" affordance. None exists today.
- Suggesting first/last name from Google for admin-invited users.

## Design

### 1. `server/src/utils/importRemoteAvatar.ts`

Two exported predicates over a shared host check:

- `importRemoteAvatar(url)` — provider import. Requires `https:`, no embedded
  credentials, and a **subdomain** of `googleusercontent.com`.
- `isStorableAvatarUrl(url)` — what a client may persist. Same rules, plus the
  literal upload bucket host `res.cloudinary.com`.

Both mirror the `imgSrc` CSP directive in `app.ts` exactly: `*.googleusercontent.com`
(a CSP wildcard does not match the apex, so neither do we) and the literal bucket
host (so no bucket subdomain either).

Embedded credentials are rejected explicitly. `URL.hostname` strips a
`user:pass@` prefix, so a host check alone would accept
`https://evil.test@lh3.googleusercontent.com/…` and then persist the credentials
when the URL is serialised back out.

The Google size directive `=s<N>-c` is rewritten to `=s256-c` on `url.pathname`
only. Rewriting the serialised URL would miss the directive whenever a query or
fragment follows it, and could mangle a query value that merely resembles one.

### 2. `server/src/services/auth.service.ts`

- `providerAvatar(identity)` helper wrapping the null check.
- `getAuthState`, no-row branch: `suggested.picture` = the provider avatar.
- `getAuthState`, invited branch: `suggested` is now an object while the profile
  is incomplete, carrying `user.profilePicture ?? providerAvatar(identity)`.
  Names stay `null` — an invited user's placeholders are what the form is asking
  them to replace.
- `completeProfile`, invited branch: `profilePicture` falls through to the
  provider avatar when there is neither an upload nor a stored picture.

### 3. Upload authorisation — required for "they can choose to edit it"

`/uploads/image` is guarded by `authenticate`, which demands a `public.users`
row. That row is created only when the Complete Profile form is submitted, so a
brand-new Google signup uploading a replacement received **403 Profile setup
required**. The feature's edit half did not work.

`/uploads/public-profile-image` is switched from `authenticate` to
`requireSupabaseSession` — precisely the middleware written for "authenticated
but has no profile yet". The controller hard-codes the `profile-pics` folder and
the schema has no folder field, so a bare session cannot reach the
question-image bucket. `CompleteProfilePage` calls this endpoint via a new
`uploadProfilePictureBeforeRegistration` in `client/src/lib/upload.ts`.

### 4. Upload middleware mounts

The router mounts at `/api/v1/uploads`; the rate limiter and the raised body
limit were both registered against the singular `/api/v1/upload`. An `app.use`
prefix matches only on segment boundaries, so **neither applied to anything**.
Both corrected to the plural.

The raised upload body limit was additionally registered *after* the global 2 MB
parser. Whichever parser runs first consumes the stream, so it could never take
effect. Moved ahead of the global parser. The real ceiling remains
`uploadImageSchema`; this only decides whether an oversized body gets a clean
400 or a raw parser error surfacing as a 500.

### 5. Client

- `AuthContext.PendingRegistration` gains `picture: string | null`.
- `CompleteProfilePage` splits the single `picture` state into `uploadedPicture`
  (written only by the crop flow) and a derived `displayPicture`. Submit sends
  `uploadedPicture || undefined`.
- `ProfilePage` sends `picture` only when the save actually changed it.

### Why the default is not echoed back on submit

`completeProfileSchema.picture` validated nothing beyond `z.string().url()`.
Echoing the suggested URL back would mean the server storing a client-supplied
URL with no allowlist applied. Sending `undefined` routes the default through
the server-side fallback, which already validates.

## Standards-readiness check (ISO 27001 / SOC 2)

**Addressed in this change.** `completeProfileSchema.picture`,
`updateProfileSchema.picture` and `completeOnboardingSchema.picture` accepted any
syntactically valid URL. A stored avatar renders in admin-facing User
Management, making this a tracking-pixel and stored-content vector — insufficient
validation of user-supplied content rendered to other users (ISO 27001 A.8.26;
SOC 2 CC6.1 / CC8.1). All three now share an allowlisted `avatarUrlSchema`.

**Also addressed.** The upload rate limiter (A.8.6 capacity management, CC6.1)
was inert due to the path mismatch above.

**Known, not addressed.** A `profilePicture` row predating this validation may
hold any URL and is still rendered. A backfill or read-time filter would be
needed to fully close it; flagged rather than silently widened in scope.

## Accepted residual behaviour

If the provider avatar URL is dead, the page shows the placeholder via
`imgError`, but submitting without an upload still persists that URL — the
server cannot know the image failed to load in the browser. The visible result
is identical (downstream renderers have their own fallbacks); only the stored
value differs. Correcting it would require the client to report load failure,
which is not worth a round trip.

## Testing

`server/src/__tests__/profileAvatar.test.ts` (no database; prisma stubbed via
`globalThis.__prisma__` before first import):

- size rewrite, including with a query string and a lookalike query value
- both allowlists: apex rejection, lookalike hosts, bucket subdomain rejection,
  embedded credentials, non-https, malformed
- validator rejection on all three schemas
- all four `getAuthState` paths

`server/src/__tests__/security.test.ts`: the pre-registration upload endpoint
still rejects a missing and a forged token.

Client: no test runner is configured; verified by `tsc -b` and `eslint`.

Result: **47/47 server tests pass**, up from 38/39 — the parser-ordering fix
resolved a pre-existing failure where an oversized upload returned 500 rather
than a 4xx.
