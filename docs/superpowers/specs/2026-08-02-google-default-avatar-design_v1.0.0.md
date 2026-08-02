# Google profile picture as the default avatar on Complete Profile

**Version:** v1.0.0
**Date:** 2026-08-02
**Status:** Approved

## Changelog

| Version | Date | Change |
|---------|------|--------|
| v1.0.0 | 2026-08-02 | Initial design. Surface the Google-provided avatar as the editable default on the Complete Profile page, for both Google SSO signups and admin-invited users who authenticate with Google. |

## Problem

A reviewee signing up with Google lands on `/complete-profile` and sees a generic
`UserRound` placeholder icon with an "Add profile photo" button. They have no
indication that their Google account picture is already available.

The picture is not actually lost. `AuthService.completeProfile` already falls back
to `importRemoteAvatar(identity.pictureUrl)` when the client sends no picture
(`server/src/services/auth.service.ts:260-261`), and `importRemoteAvatar` already
enforces an SSRF allowlist against `googleusercontent.com`.

The gap is purely one of visibility: `GET /auth/me` never returns the avatar URL,
so the page cannot render it. The user therefore cannot see the default, cannot
knowingly keep it, and cannot make an informed choice to replace it.

## Goals

- The Google account picture renders as the default avatar on the Complete
  Profile page, for reviewees signing up via Google SSO.
- The same default applies to admin-invited users who authenticate with Google,
  whose branch currently has no avatar fallback at all.
- The user can replace the default with their own upload, using the existing
  crop-and-upload flow.
- No new trust surface: a client-supplied avatar URL is never stored without
  passing an allowlist.

## Non-goals

- Refreshing an existing user's avatar when their Google picture changes later.
- A "remove photo" affordance. None exists today; adding one is separate work.
- Suggesting first/last name from Google for admin-invited users. Their
  placeholder names are precisely what the form asks them to replace.

## Design

### 1. Server — `server/src/utils/importRemoteAvatar.ts`

Add size normalization *after* the existing allowlist check. Google avatar URLs
carry a trailing size directive, typically `=s96-c`. The page renders the avatar
at 96 CSS pixels, so a 96 px source is soft on a 2x display.

Rewrite a trailing `=s<N>-c` to `=s256-c`. If the pattern does not match, return
the URL unchanged. The protocol and host checks run first and are untouched — the
normalization only ever applies to a URL already proven to be Google-hosted.

### 2. Server — `server/src/services/auth.service.ts`

**`getAuthState`, no-row branch** (Google SSO user with no application account):
add `picture` to the `suggested` object:

```ts
picture: identity.pictureUrl ? importRemoteAvatar(identity.pictureUrl) : null
```

**`getAuthState`, invited branch** (`profileComplete === false`): this currently
returns `suggested: null`. Return an object instead so the picture can travel:

```ts
suggested: {
  firstName: null,
  lastName: null,
  picture: user.profilePicture ?? (identity.pictureUrl ? importRemoteAvatar(identity.pictureUrl) : null),
}
```

Names stay `null` — the placeholders (`User` / `Account`) are what the form is
asking the user to replace, so suggesting them would be actively unhelpful.

**`completeProfile`, invited branch**: extend the `profilePicture` assignment to
fall through to the Google avatar when the user neither uploaded a picture nor
already has one stored:

```ts
profilePicture: data.picture
  || existingById.profilePicture
  || (identity.pictureUrl ? importRemoteAvatar(identity.pictureUrl) : null)
```

### 3. Client — `client/src/contexts/AuthContext.tsx`

`PendingRegistration` gains `picture: string | null`, populated in `loadProfile`
from `state.suggested?.picture ?? null`.

### 4. Client — `client/src/pages/auth/CompleteProfilePage.tsx`

`ProfileForm` takes a new `suggestedPicture: string | null` prop, threaded from
`pending.picture`.

Replace the single `picture` state with two values that mean different things:

- `uploadedPicture` — set **only** by the crop-and-upload flow. This is the
  user's own choice.
- `displayPicture = uploadedPicture || suggestedPicture || ''` — what the `<img>`
  renders.

Submit sends `picture: uploadedPicture || undefined`.

The button label reads "Change photo" when a picture is showing and "Add profile
photo" otherwise. The existing `imgError` → `UserRound` fallback stays: a
Google-hosted URL can 404, and the placeholder is the correct response.

### Why the default is not echoed back on submit

`completeProfileSchema.picture` validates nothing beyond `z.string().url()`.
Echoing the Google URL back from the client would mean the server stores a
client-supplied URL with no allowlist applied to it.

Sending `undefined` instead routes the default through the server-side fallback,
which already calls `importRemoteAvatar` and therefore already validates. The
feature adds no new trust surface, and the client stays honest about the
distinction between "the user chose this" and "this is what we suggested".

## Standards-readiness check (ISO 27001 / SOC 2)

One finding, **pre-existing and not introduced by this change**:

`completeProfileSchema.picture` and `updateProfileSchema.picture`
(`server/src/validators/auth.validator.ts:22,43`) accept any syntactically valid
URL. A user can set their stored avatar to an arbitrary external URL, which is
then rendered in admin-facing User Management. That is a tracking-pixel and
stored-content vector, and an assessor would score it as insufficient validation
of user-supplied content rendered to other users (ISO 27001 A.8.26 application
security requirements; SOC 2 CC6.1 / CC8.1).

Remediation is small: constrain both fields to the Cloudinary upload host plus
`googleusercontent.com`, reusing the existing allowlist rather than inventing a
second one. Included in this change so the control is built in rather than
retrofitted.

## Testing

Server (`node:test` via `tsx --test`, the runner already configured):

- `importRemoteAvatar`: `=s96-c` rewrites to `=s256-c`; a URL with no size
  directive passes through unchanged; a non-Google host is still rejected; a
  non-`https:` scheme is still rejected.
- `getAuthState`: surfaces `suggested.picture` for a Google identity with no
  application row, and for an invited row.
- Avatar URL validation: an arbitrary external host is rejected by the profile
  validators.

Client: no test runner is configured. Verified by `tsc -b` and `eslint`.

Review: an independent agent with no memory of the implementation.
