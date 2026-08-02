# Google profile picture as the default avatar on Complete Profile

**Version:** v1.3.0
**Date:** 2026-08-02
**Status:** Implemented, independently reviewed three times
**Supersedes:** `2026-08-02-google-default-avatar-design_v1.2.0.md`

## Changelog

| Version | Date | Change |
|---------|------|--------|
| v1.0.0 | 2026-08-02 | Initial design. Surface the Google-provided avatar as the editable default on the Complete Profile page, for Google SSO signups and admin-invited users. |
| v1.1.0 | 2026-08-02 | Added the upload-authorisation fix without which the avatar could not be edited at all; hardened the allowlist; corrected the upload rate-limiter and body-parser mounts. From first independent review. |
| v1.2.0 | 2026-08-02 | Replaced `requireSupabaseSession` on the upload route with a new `requireRegistrationSession` that enforces eligibility — the v1.1.0 fix had opened the route to any Google account and to disabled accounts. Moved the rate limiter into the router and keyed it per identity, closing a `//uploads` path bypass and a shared-IP lockout. Rejected explicit ports. From second independent review. |
| v1.3.0 | 2026-08-02 | Scoped the storable-avatar check to our own Cloudinary cloud; removed the dead 5 MB upload body mount; mapped oversized bodies to 413 instead of 500; tightened `isInternalEmail`, now an authorisation predicate; capped avatar URL length. From third independent review. |

## Problem

A reviewee signing up with Google lands on `/complete-profile` and sees a generic
placeholder icon. Their Google account picture is available but invisible: the
server already falls back to it at account creation, but `GET /auth/me` never
returned it, so the page could not render it and the user could not knowingly
keep or replace it.

## Goals

- The Google account picture renders as the default avatar on the Complete
  Profile page, for reviewees signing up via Google SSO.
- The same default applies to admin-invited users who authenticate with Google.
- The user can genuinely replace the default with their own upload.
- No new trust surface, and no new authorisation surface.

## Non-goals

- Refreshing an existing user's avatar when their Google picture changes later.
- A "remove photo" affordance. None exists today.
- Suggesting first/last name from Google for admin-invited users.

## Design

### 1. `server/src/utils/importRemoteAvatar.ts`

- `importRemoteAvatar(url)` — provider import. Requires `https:`, no embedded
  credentials, no explicit port, and a **subdomain** of `googleusercontent.com`.
- `isStorableAvatarUrl(url)` — what a client may persist. Same rules, plus a URL
  under **our own** Cloudinary cloud.

Both match the `imgSrc` CSP directive in `app.ts`: `*.googleusercontent.com` (a
CSP wildcard does not match the apex, so neither do we), the bucket host with no
subdomains, and default port only (a CSP host-source without a port matches only
the scheme default). A URL we would refuse to render is a URL we refuse to
store.

The bucket host `res.cloudinary.com` is shared by every Cloudinary customer, the
account being the first path segment — so the check requires
`/<CLOUDINARY_CLOUD_NAME>/`. Matching the host alone accepted
`res.cloudinary.com/<somebody-elses-cloud>/tracker.gif`, exactly the remote
content this function exists to keep out. With no cloud name configured no
upload can succeed anyway, so it falls back to the host check.

Embedded credentials are rejected explicitly: `URL.hostname` strips a
`user:pass@` prefix, so a host check alone would accept
`https://evil.test@lh3.googleusercontent.com/…` and persist the credentials on
serialisation.

The size directive `=s<N>-c` is rewritten to `=s256-c` on `url.pathname` only.
Rewriting the serialised URL missed any avatar carrying a query string and could
mangle a query value that merely resembled the directive.

### 2. `server/src/services/auth.service.ts`

`getAuthState` returns `suggested.picture` for a new signup (the provider
avatar) and for an incomplete invited row (`user.profilePicture ??` the provider
avatar). Names stay `null` for invited users — the placeholders are what the
form is asking them to replace. `completeProfile`'s invited branch gains the
same provider fallback the new-signup branch already had.

### 3. Upload authorisation

`/uploads/image` is guarded by `authenticate`, which requires a `public.users`
row — created only when the Complete Profile form is submitted. A new Google
signup replacing the suggested picture therefore received **403**. The edit half
of the feature did not work.

The first attempted fix swapped the route to `requireSupabaseSession`, which was
wrong: that middleware does no database work at all, so it admitted **any**
Google account on the internet (the `@cnu.edu.ph` rule is enforced in this
codebase, not in Supabase config), any non-Google provider, and any DISABLED
account — a hole in the disabled-account gate and free image hosting on the
org's bucket.

`requireRegistrationSession` (`middleware/authenticate.ts`) sits between the
two. An existing account passes on exactly `authenticate`'s terms, including the
DISABLED check. An identity with no account passes only if it could actually go
on to create one — the same eligibility `completeProfile` enforces. Nothing
weaker.

`isInternalEmail` is part of that predicate, so it was tightened from a bare
`endsWith('@cnu.edu.ph')` — which also accepted `attacker@evil.com @cnu.edu.ph`
— to a well-formedness check plus an exact domain match.

`/uploads/public-profile-image` uses it. The controller hard-codes the
`profile-pics` folder and the schema has no folder field, so a session alone
cannot reach the question-image bucket.

### 4. Upload rate limiting

The limiter now lives **on the router**, not on an `app.use` path prefix.

A prefix mount is matched against the raw URL, which Express does not normalise:
`/api/v1//uploads/image` reaches the router but misses an `/api/v1/uploads`
mount, so one extra slash skipped the limiter entirely. Router-level middleware
applies however the path is spelled.

It is keyed **by identity, not IP**, and placed after the auth middleware so the
identity is known. IP keying meant an unauthenticated request that never got
past the guard still burned budget, letting anyone disable uploads for everyone
behind the same NAT — for a campus deployment, everyone.

Limits: 10/hour for the pre-registration avatar route (one avatar is all anyone
needs), 100/hour for `/uploads/image` (exam authoring uploads one image per
call, and the previous 20/hour would have broken it the moment the limiter
became live).

### 5. Upload body limit

The separate 5 MB mount for `/api/v1/uploads` is **removed**. It was dead
(registered against the singular `/api/v1/upload`, and behind the global parser,
which consumes the stream first) and pointless either way: `uploadImageSchema`
caps a payload at 2,000,000 characters, which already fits inside 2 MB.
Reinstating it would only have raised how much an unauthenticated caller can
make the server buffer.

`errorHandler` now maps body-parser's `entity.too.large` to **413**. It
previously fell through to the generic branch and was reported as a 500 — an
internal fault, logged with a stack, for what is squarely a client error.

### 6. Client

- `AuthContext.PendingRegistration` gains `picture: string | null`.
- `CompleteProfilePage` splits `picture` into `uploadedPicture` (written only by
  the crop flow) and a derived `displayPicture`; submit sends
  `uploadedPicture || undefined`, so the suggestion is never echoed back.
- `lib/upload.ts` gains `uploadProfilePictureBeforeRegistration`; the existing
  helper is unchanged for its five current callers.
- `ProfilePage` sends `picture` only when the save actually changed it.

## Standards-readiness check (ISO 27001 / SOC 2)

**Addressed.** The three `picture` fields accepted any URL; a stored avatar
renders in admin-facing User Management, making it a tracking-pixel and
stored-content vector — insufficient validation of user-supplied content
rendered to other users (A.8.26; CC6.1 / CC8.1). All three now share an
allowlisted `avatarUrlSchema`.

**Addressed.** The upload rate limiter was inert due to the path mismatch, and
once made live was bypassable and IP-keyed (A.8.6 capacity management; CC6.1).

**Addressed.** The disabled-account gate is enforced on the new route.

**Known, not addressed.** A `profilePicture` row predating this validation may
hold any URL and is still rendered; closing it needs a backfill or a read-time
filter. Both allowlisted hosts can serve arbitrary third-party content
(`lh3.googleusercontent.com/d/<id>` for Drive shares), so host allowlisting
alone does not fully close the beacon vector — a deliberate tradeoff, since the
predicates mirror the CSP. Rate limiters use the in-memory store, so the ceiling
is per-instance; pre-existing pattern.

## Accepted residual behaviour

An eligible `@cnu.edu.ph` Google user with no account can upload one avatar
before registering. That is inherent to the feature, bounded at 10/hour per
identity.

If the provider avatar URL is dead, the page shows the placeholder but
submitting still persists that URL — the server cannot know the image failed to
load in the browser. The visible result is identical.

## Testing

**65/65 server tests pass**, none skipped.

- `__tests__/profileAvatar.test.ts` — size rewrite (query string, lookalike
  query value, default vs explicit port); both allowlists (apex, lookalike
  hosts, bucket subdomains, a foreign Cloudinary cloud, embedded credentials,
  explicit port, non-https, malformed); validator rejection on all three
  schemas; all four `getAuthState` paths. Prisma stubbed via
  `globalThis.__prisma__`; no database needed.
- `__tests__/registrationSession.test.ts` — the authorisation gate: eligible
  identity with no account, external domain, non-Google provider, active
  account, disabled account, invited external account, five malformed lookalike
  addresses, missing token. In its own file so its module stubbing is
  process-isolated.
- `__tests__/security.test.ts` — the pre-registration upload endpoint rejects
  missing and forged tokens; an oversized body returns 413.

Client: no test runner is configured; verified by `tsc -b` (clean) and `eslint`
(5 errors, all pre-existing at untouched lines).
