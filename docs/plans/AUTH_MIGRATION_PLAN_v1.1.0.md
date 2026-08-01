# Auth Migration Plan — Native Supabase Auth + Google SSO

| Field | Value |
|---|---|
| **Version** | v1.1.0 |
| **Date** | 2026-08-01 |
| **Status** | Draft — awaiting approval |
| **Owner** | baphus |
| **Supersedes** | v1.0.0 |
| **Scope** | Replace custom JWT/bcrypt auth with native Supabase Auth; add Google SSO; enforce `@cnu.edu.ph` |

---

## Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| v1.1.0 | 2026-08-01 | baphus | Added §6.6 **Auth Entry Points** — both "log in with Google" and "sign up with Google" must work for reviewees. **Corrects v1.0.0**, which listed `RegisterPage` for deletion without accounting for the 8 marketing CTAs linking to `/register`. `RegisterPage` is now *rewritten* as a Google-first signup page rather than deleted; `/register` route is retained. Added the `/pending` route removal and marketing-copy updates that v1.0.0 omitted. QA cases F15–F18 added. |
| v1.0.0 | 2026-08-01 | baphus | Initial plan. Captures 14 design decisions from the requirements-grilling session, target architecture, phased implementation, standards-readiness check, and risk register including the H7 risk acceptance. |

> **Versioning rule for this document:** PATCH for typos/clarifications, MINOR for new sections or added scope, MAJOR for a structural rewrite or a reversal of a core decision (e.g. reinstating the BFF). Never overwrite a prior version — create the next versioned file and append to the changelog.

---

## 1. Summary

Normalite EDGE currently runs a hand-rolled authentication system: bcrypt password hashes, self-issued JWTs, custom refresh-token rotation, and an in-memory brute-force lockout. This plan replaces that with **Supabase Auth as the identity provider**, adds **Google SSO as the default sign-in**, and enforces that **all reviewees hold a `@cnu.edu.ph` Google Workspace account**.

The Express API is retained as a resource server. No business logic, authorization rule, or database relation changes.

**The single most important architectural property of this design:**

> `auth.users` membership grants **nothing**. `public.users` is the authorization gate. A Supabase identity with no matching `public.users` row can authenticate and still reach no resource.

This property is what allows the domain restriction to be enforced entirely in code we own and test, with no Supabase Auth Hooks, no `app_metadata` flags, and no dependency on dashboard configuration staying correct.

**Key enabling fact:** the production `users` table currently holds **0 rows**. There is no data migration, no password-hash import, and no dual-auth transition window.

---

## 2. Current State (verified 2026-08-01)

### 2.1 Authentication

| Concern | Implementation |
|---|---|
| Password storage | `bcryptjs`, 12 rounds → `users.password_hash` (`auth.service.ts:176`) |
| Token issuance | Self-signed JWTs, `utils/jwt.ts` — 15m access / 7d refresh |
| Access token (client) | **Memory only** — `client/src/lib/tokenStore.ts` |
| Refresh token | httpOnly + `secure` (prod) + `sameSite: lax` cookie (`auth.controller.ts:26-29`); bcrypt-hashed in `users.refresh_token_hash`; rotation with reuse-detection (`auth.service.ts:336`) |
| CSRF | `X-Requested-With` header requirement (`middleware/csrfProtection.ts`) |
| Brute force | In-memory `Map`, 5 attempts / 15 min (`auth.service.ts:14-55`) |
| Rate limiting | `express-rate-limit` — global 100/15m, auth 10/15m (`app.ts:33,42`) |
| Request auth | `middleware/authenticate.ts` — verifies JWT, then **DB lookup every request** for `id, status, role` (line 33) |
| Domain restriction | `ALLOWED_DOMAIN = 'cnu.edu.ph'` on self-registration only (`auth.service.ts:12,165`); Zod mirrors in `auth.validator.ts:15` and `RegisterPage.tsx:31` |

### 2.2 Data model

- `User.id` — `uuid` with `@default(uuid())`, FK'd from **7 tables**: `exams`, `attempts`, `study_decks`, `deck_sessions`, `conferences`, `audit_logs`, `notifications`.
- `UserStatus` enum — `PENDING | ACTIVE | DISABLED`, defaults to `PENDING`.
- `users.is_external_email` — column exists, **referenced by zero code**.
- Database is **already Supabase Postgres** (`DATABASE_URL` + `DIRECT_URL`, confirmed in `DEPLOYMENT.md:6`). `auth.users` exists and is unused.

### 2.3 Dead / vestigial surface

- `google-auth-library` dependency and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars (`env.ts:38-39`) — wired to nothing.
- `ForgotPasswordPage.tsx` — full UI, **no backend endpoint**.
- `users.is_external_email` — unused.

### 2.4 Deployment

- Client: Vercel (SPA, `vercel.json` catch-all rewrite to `index.html`).
- API: Render (free tier).
- CORS: single `CLIENT_URL` origin, `credentials: true` (`config/cors.ts`).

### 2.5 Security baseline

`SECURITY_AUDIT.md` records **H7 — "Access Token Stored in localStorage"** as a HIGH-severity finding, remediated in commit `9db384b` via remediation item 11 ("Move access token from localStorage to memory-only"). `tokenStore.ts` is that remediation. **This plan reverses it — see §9.1.**

`SECURITY_AUDIT.md:575` also records that **no CSP is configured**. This plan ships CSP as the compensating control.

---

## 3. Target Architecture

```
Browser (Vercel SPA)
  │
  ├── supabase-js ──────────────► Supabase Auth (GoTrue)
  │     • signInWithOAuth(google)      • issues JWT (asymmetric, ES256)
  │     • session in localStorage      • owns passwords, invites, resets
  │     • auto-refresh
  │
  └── axios (Bearer <supabase access token>)
        │
        ▼
   Express API (Render)
     • verifies JWT via JWKS (no shared secret)
     • looks up public.users by id  ◄── THE AUTHORIZATION GATE
     • role + status from DB, per request
     • enforces @cnu.edu.ph on profile creation
     • admin provisioning via Supabase Admin API (service_role, server-only)
        │
        ▼
   Postgres (Supabase)  —  public.users.id == auth.users.id
```

### 3.1 The provider rule (invariant)

| Email domain | Auth method | Roles allowed | Provisioning |
|---|---|---|---|
| `@cnu.edu.ph` | **Google SSO only** | `ADMIN`, `REVIEWER`, `REVIEWEE` | Self-service |
| Anything else | **Password only** | `ADMIN`, `REVIEWER` — **never `REVIEWEE`** | Admin invite only |

Because domain determines provider *exclusively*, no account can ever hold two identities. This eliminates account-linking logic and the associated takeover vector entirely.

**Guards required:**
- Password login must be **refused** for any `@cnu.edu.ph` address (unreachable state, fail loudly).
- Profile creation must **reject** non-`@cnu.edu.ph` emails arriving via Google.
- Admin provisioning must **reject** `REVIEWEE` for any non-`@cnu.edu.ph` email.

---

## 4. Decision Log

Decisions taken during the requirements-grilling session on 2026-08-01. Each records the alternatives considered so a future reader can see what was rejected and why.

| # | Decision | Alternatives rejected | Rationale |
|---|---|---|---|
| D1 | **Express stays** as resource server verifying Supabase JWTs | Client-direct via PostgREST + RLS | Preserves the hardened API from `9db384b`; avoids re-expressing every authorization rule as RLS policy |
| D2 | **Hybrid providers** — Google self-service, admin-provisioned passwords | Google-only; both open to all | Google-only leaves no break-glass path; both-open unions two attack surfaces and creates identity collisions |
| D3 | **Domain enforced in Express**, not via Auth Hook | Supabase "Before User Created" hook; `app_metadata` flag; `hd=` param | `public.users` is already the gate, making the hook redundant. `hd=` is a UI hint, **not a security control** |
| D4 | **`public.users.id` = `auth.users.id`** | `auth_user_id` mapping column; collapse to `profiles` | 0 existing users ⇒ no PK rewrite risk; canonical shape, RLS-ready later |
| D5 | **No `PENDING`** — auto-`ACTIVE` after profile completion | Keep approval queue; auto-provision with nulls | Google Workspace membership verifies real students; approval was a formality |
| D6 | **Role from DB lookup**, not JWT claim | Custom Access Token Hook | `authenticate.ts:33` already queries per request — the claim saves nothing and adds a stale-privilege window |
| D7 | **`REVIEWEE` hard-locked** to `@cnu.edu.ph` | Allow admin override | Reviewees are by definition CNU students with Workspace mailboxes |
| D8 | **All internal users on Google**, including staff | Staff keep passwords | Collapses the password surface to a handful of external accounts |
| D9 | **Delete brute-force lockout** entirely | Rebuild in Postgres; keep in-memory | Surface is now ~5 accounts; `authLimiter` + Supabase limits suffice. Existing `Map` was broken anyway (resets on deploy) |
| D10 | **`supabase-js` + localStorage session** | BFF with httpOnly cookie | Chosen for simplicity. **Re-opens H7 — see §9.1** |
| D11 | **Supabase default lifetimes** — 1h access, session until logout | 15m + inactivity timeout | Accepted; shared-lab exposure logged as accepted risk §9.2 |
| D12 | **Avatars: Google → Cloudinary, first sign-in only** | Hotlink Google CDN; re-sync every login | Re-syncing silently destroys user-uploaded avatars. Cloudinary copy avoids CSP allowlisting and third-party page-view leakage |
| D13 | **`generateLink({type:'invite'})`**, admin delivers out-of-band | `inviteUserByEmail` + SMTP; dashboard invites | No domain ⇒ no verified sender. Volume is a handful/year. Dashboard invites create orphan `auth.users` rows with no app record |
| D14 | **Asymmetric JWT verification via JWKS** | Legacy HS256 shared secret | No high-value symmetric secret in Render env; key rotation without redeploy |

### 4.1 Deferred decisions

| Item | Deferred because | Revisit when |
|---|---|---|
| GCP project inside CNU Workspace org | No admin access yet | Access granted — enables Internal consent screen (removes the External-app risk in §8) and Directory API group checks |
| Custom domain (`app.` / `api.` same registrable domain) | Not procured | Domain acquired — currently unnecessary since no auth cookie exists |
| Vercel `/api/*` proxy rewrite | No longer load-bearing without cookies | Only if CORS friction appears |
| MFA for external password accounts | Out of scope | Before external reviewer count grows |

---

## 5. Database Migration

Single Prisma migration. **Safe because the `users` table is empty** — verify this immediately before running (§7 Phase 0).

```prisma
model User {
  id               String     @id @db.Uuid          // ← @default(uuid()) REMOVED; supplied from auth.users.id
  // passwordHash     String                          ← DROPPED
  // refreshTokenHash String?                         ← DROPPED
  status           UserStatus @default(ACTIVE)      // ← default was PENDING
  isExternalEmail  Boolean    @default(false) @map("is_external_email")  // ← now actually used
  // ...all other fields unchanged
}

enum UserStatus {
  ACTIVE
  DISABLED
  // PENDING ← REMOVED
}
```

**Ordering constraint:** the Postgres enum change requires the `PENDING` default to be dropped before the label is removed. Prisma may need a hand-edited migration (`ALTER TYPE ... RENAME`, create new type, swap column, drop old) rather than the generated one.

**Code that must change with this migration or it fails closed:**

| Location | Issue |
|---|---|
| `requirementsCompat.ts:8,13` | **Both mappers default to `PENDING`.** Leaving them returns a status that no longer exists, and `ProtectedRoute.tsx:17` then routes to a deleted page. **Must default to `ACTIVE`** and the `ApiUserStatus` type must drop `PENDING`. |
| `dashboard.service.ts:426` | Counts `status: 'PENDING'` for an admin widget — remove the count and its dashboard tile |
| `user.validator.ts:12,69` | Zod enums still accept `PENDING`/`APPROVED`/`REJECTED` — reduce to `ACTIVE`/`DISABLED` |
| `AuthContext.tsx:15` | `status` union type drops `'PENDING'` |
| `UserManagementPage.tsx:66,131,1004` | `ApiStatus` type, fallback return, and the `<SelectItem value="PENDING">` option |
| `StudentManagementPage.tsx:457` | Pending-status filter predicate |
| `ProtectedRoute.tsx:17` | `PENDING` redirect branch removed |

---

## 6. Surface Changes

### 6.1 Server — new

| File | Purpose |
|---|---|
| `src/config/supabase.ts` | Admin client (`service_role`). **Server-only — this key must never reach the browser.** |
| `src/utils/supabaseJwt.ts` | JWKS-based verification via `jose`, with key caching |

### 6.2 Server — rewritten

| File | Change |
|---|---|
| `middleware/authenticate.ts` | Verify Supabase JWT via JWKS → resolve `public.users` by `sub` → attach role + status. **Must return a distinct "authenticated, no profile" state — not a bare 401** (see §6.5) |
| `services/auth.service.ts` | Delete `register`, `login`, `refreshAccessToken`, brute-force helpers (lines 14-55). Add `completeProfile`, `recordSessionStart`. Keep `getCurrentUser`, `updateProfile`, `completeOnboarding`, `completeTour`, `sanitizeUser` |
| `services/user.service.ts` | `createUser` → `inviteExternalUser`: validate domain/role pairing → `generateLink({type:'invite'})` → create `public.users` with the **returned UUID** → audit. Remove all bcrypt usage |
| `routes/v1/auth.routes.ts` | **Remove** `POST /register`, `POST /login`, `POST /refresh`. **Add** `POST /complete-profile`, `POST /session-start`. **Keep** `POST /logout` (audit only) |

### 6.3 Client — new / rewritten

| File | Change |
|---|---|
| `lib/supabase.ts` (new) | Browser client, `detectSessionInUrl: true` |
| `contexts/AuthContext.tsx` | Driven by `onAuthStateChange`; remove the `/auth/refresh` bootstrap (`:56`) |
| `lib/axios.ts` | Interceptor attaches the supabase-js session token; remove the refresh-retry branch (`:31-56`) |
| `pages/auth/LoginPage.tsx` | **Google button primary** ("Continue with Google"); staff password form collapsed behind a secondary link |
| `pages/auth/RegisterPage.tsx` | **Rewritten, not deleted** — becomes a Google-first signup page. Route `/register` retained (§6.6) |
| `pages/auth/CompleteProfilePage.tsx` (new) | Academic fields lifted from `RegisterPage.tsx:17-38`, minus email/password/confirmPassword |
| `pages/auth/SetPasswordPage.tsx` (new) | Invite-link landing; `supabase.auth.updateUser({ password })` |
| `pages/UserManagementPage.tsx` | Remove password field; add invite-link display, copy, and regenerate |

### 6.4 Deleted

`server/src/utils/jwt.ts` · brute-force `Map` (`auth.service.ts:14-55`) · `client/src/lib/tokenStore.ts` · `client/src/pages/auth/PendingApprovalPage.tsx` **and its `/pending` route (`App.tsx:80`)** · `google-auth-library` dependency · `GOOGLE_CLIENT_SECRET` env var · `users.password_hash` · `users.refresh_token_hash` · refresh cookie handling in `auth.controller.ts`

> **Changed in v1.1.0:** `RegisterPage.tsx` was listed here in v1.0.0. It is **not** deleted — see §6.6.

### 6.5 The two failure modes that must be designed, not discovered

**(a) First-login redirect loop — highest day-one risk.**
A Google user with a valid JWT but no `public.users` row must **not** receive a bare 401. Today `authenticate.ts:38` throws `'User no longer exists'` → 401 → the axios interceptor redirects to `/login` → Google silently re-authenticates → same state, forever. `GET /auth/me` must distinguish *"valid token, no profile yet"* from *"unauthenticated"*, and the client must route the former to `CompleteProfilePage`. **This affects every new user on their first sign-in.**

**(b) Login audit gap.**
Sign-in happens directly between browser and Supabase; Express never observes it, so `auditService.log()` stops recording `LOGIN`/`LOGOUT`. Supabase's own auth logs are **not** a fallback — free-tier retention is ~1 day, which is unusable as audit evidence. Mitigation: the client calls `POST /auth/session-start` immediately after sign-in and Express writes the `LOGIN` record. Best-effort by nature (a client can skip it) — logged as a limitation in §9.3.

### 6.6 Auth Entry Points — "Log in with Google" *and* "Sign up with Google"

**The mechanic:** `supabase.auth.signInWithOAuth({ provider: 'google' })` is **both** operations. Supabase creates the `auth.users` row if it doesn't exist and signs the user in if it does. There is no separate signup call, and no way — nor any need — to distinguish intent at the button. Reviewees must be able to arrive from either framing and land in the right place.

**Both routes are retained and both are Google-first:**

| Route | Framing | Action |
|---|---|---|
| `/login` | "Continue with Google" — primary button. Staff password form behind a secondary disclosure | `signInWithOAuth({provider:'google'})` |
| `/register` | "Sign up with Google" — primary button, keeps marketing continuity | **Identical call** |

**Intent is resolved *after* the redirect, not before it.** On return, the client calls `GET /auth/me`:

- **No profile row** → `CompleteProfilePage` — this *is* the signup completion
- **Profile exists** → dashboard — this *is* the login

So a returning reviewee who clicks "Sign up with Google" is simply signed in, and a brand-new reviewee who clicks "Log in with Google" is signed up and sent to profile completion. **Both directions are correct behaviour, not edge cases to defend against.**

**Why `/register` must not be deleted** (v1.0.0 got this wrong): **8 call sites** link to it —

`MarketingLayout.tsx:83,129,176` · `LandingPage.tsx:89,344` · `AboutPage.tsx:90` · `FaqPage.tsx:17` · `LoginPage.tsx:90`

Deleting the route breaks every marketing CTA on the site.

**Copy updates required** — current wording describes a flow that will no longer exist ("register with your email, then get admin-approved"):

| File | Current claim | Needs |
|---|---|---|
| `LandingPage.tsx:33,102,340` | "Sign up with your @cnu.edu.ph account… get approved by an admin" | Google framing; **drop the approval claim** (D5) |
| `MarketingLayout.tsx:164` | "@cnu.edu.ph accounts · admin-approved" | Drop "admin-approved" |
| `FaqPage.tsx:11,18` | "register with a valid @cnu.edu.ph email… an administrator approves your account" | Rewrite for Google SSO, no approval |
| `AuthLayout.tsx:6` | "Exclusive to @cnu.edu.ph accounts" | Still accurate — no change |
| `TermsPage.tsx:23` | "your account must be approved by an administrator" | **Contractual language — remove; requires review** (§12) |

**Also:** `/forgot-password` is retained but repurposed to "contact your administrator" (internal users have no password; external resets are admin-generated per D13). `/pending` is removed with `PendingApprovalPage`.

---

## 7. Implementation Phases

Each phase ends at a verifiable checkpoint. Do not start a phase before its predecessor's checkpoint passes.

| Phase | Work | Checkpoint |
|---|---|---|
| **0. Verify** | Confirm `users` row count is 0. Resolve both open items in §8. Confirm production `CLIENT_URL`. | All §8 items answered in writing |
| **1. Supabase config** | Enable Google provider; **disable email signups** (admin-create only); configure redirect allowlist; switch to asymmetric JWT keys | Google sign-in returns a valid JWT from a scratch page |
| **2. Database** | Prisma migration (§5) + all seven compat-layer fixes | `prisma migrate` clean; app builds; no `PENDING` references remain |
| **3. Server auth** | `supabase.ts`, `supabaseJwt.ts`, rewrite `authenticate.ts`, prune `auth.service.ts`, update routes | Existing protected endpoints accept a Supabase JWT and reject a forged one |
| **4. Client auth** | `lib/supabase.ts`, `AuthContext`, `axios`, `LoginPage`, **Google-first `RegisterPage`**, `CompleteProfilePage`; remove `/pending` route; marketing copy updates (§6.6) | End-to-end from **both** `/login` and `/register`: Google sign-in → profile completion → `ACTIVE` → dashboard |
| **5. Avatars** | Google `picture` → `cloudinaryService.uploadImage(..., 'profile-pics')`, **only when `profile_picture IS NULL`** | New user's Google photo appears; an uploaded avatar survives re-login |
| **6. Admin provisioning** | `inviteExternalUser`, invite-link UI, `SetPasswordPage`, regenerate action | External reviewer completes invite → sets password → signs in |
| **7. Cleanup** | All §6.4 deletions; update `seed.ts` to create `auth.users` first and reuse the UUID | No dead references; seed produces working accounts |
| **8. CSP** | Ship the CSP absent per `SECURITY_AUDIT.md:575` | No console violations across all routes |
| **9. QA** | §10 gate | All cases pass; independent review complete |

**Non-atomic operation to handle explicitly (Phase 6):** `generateLink` and the `public.users` insert are two calls. If the insert fails, an orphaned `auth.users` row remains with a live invite link and no app record. Requires a compensating `admin.deleteUser` in the catch path.

---

## 8. Open Items — Resolve Before Phase 1

Both were flagged with explicit uncertainty during design and remain unverified.

| # | Item | Risk if wrong | Confidence |
|---|---|---|---|
| O1 | Does Google's **External** consent screen in "Production" status with only non-sensitive scopes (`openid`, `email`, `profile`) avoid the **100-test-user cap**? | Hard ceiling at 100 users — blocks launch entirely | ~70% that it does |
| O2 | Exact `generateLink` response shape and link parameter format (PKCE code vs. token hash) | Invite callback built against the wrong shape | ~85% |

**O1 is a launch blocker.** If the cap applies, the only remedies are Google's verification process or the deferred GCP-in-CNU-org path (§4.1). Resolve first.

---

## 9. Risk Register

### 9.1 ACCEPTED RISK — H7 regression (requires management sign-off)

| Field | Detail |
|---|---|
| **Risk** | Supabase session (access **and refresh** token) stored in browser `localStorage` |
| **Origin** | `SECURITY_AUDIT.md:356` — H7, HIGH, remediated in `9db384b`; **this plan reverses that remediation** |
| **Escalation** | H7 concerned a 15-minute access token. This exposes a **long-lived refresh token**, converting a 15-minute XSS window into persistent account takeover |
| **Decision** | Accepted (D10) in exchange for materially reduced implementation complexity |
| **Compensating controls** | (1) **CSP shipped** — Phase 8. (2) No `dangerouslySetInnerHTML` or `innerHTML` anywhere in the client — verified 2026-08-01; React's default escaping is intact, so the injection surface is narrow. (3) Supply-chain risk remains the primary residual vector |
| **Action required** | Record formally in the next `SECURITY_AUDIT.md` version. **Do not leave H7 marked "remediated"** — an auditor comparing the document to shipped code will find a silently regressed finding |
| **Review trigger** | Any XSS finding; any third-party script addition; before certification audit |

### 9.2 ACCEPTED RISK — session lifetime

1h access token, session persists until explicit logout, no inactivity timeout (D11). **Shared university lab computers are a real access path**: a student signs in, walks away, and the next person at that terminal inherits the session. Accepted in favour of Supabase defaults. Mitigation available at any time — set an inactivity timeout in the Supabase dashboard, no code change.

### 9.3 Known limitations

| # | Limitation | Impact |
|---|---|---|
| L1 | `POST /auth/session-start` is best-effort — a client can skip it | Login audit trail may be incomplete |
| L2 | Supabase free-tier log retention ~1 day | Supabase cannot serve as system of record for auth events |
| L3 | A cnu.edu.ph Workspace mailbox proves *CNU membership*, not *student status* | Faculty and alumni with live mailboxes can self-provision `REVIEWEE` accounts and reach the exam bank. **Directly caused by removing the approval gate (D5).** Proper fix requires Workspace OU/group checks — blocked on GCP access (§4.1) |
| L4 | No MFA on external password accounts | Highest-privilege accounts have single-factor auth |
| L5 | Orphaned `auth.users` rows accumulate from rejected/abandoned sign-ins | Harmless (grant nothing) but needs periodic cleanup |

---

## 10. QA Gate

Per organisational policy, QA runs until the code meets requirements — not once.

**Process requirement:** review must be performed by an **independent reviewer with no involvement in the implementation**. The agent or person who writes the code must not review it.

### 10.1 Functional

| # | Case | Expected |
|---|---|---|
| F1 | Google sign-in, `@cnu.edu.ph`, first time | Profile completion → `ACTIVE` → dashboard |
| F2 | Google sign-in, `@gmail.com` | Rejected at profile creation; no `public.users` row |
| F3 | Google sign-in, returning user | Straight to dashboard, no profile prompt |
| F4 | **Valid JWT, no profile row** | Routed to profile completion — **no redirect loop** (§6.5a) |
| F5 | Password login, external reviewer | Success |
| F6 | Password login attempt with `@cnu.edu.ph` | **Refused** — unreachable state |
| F7 | Admin creates `REVIEWEE` with external email | **Rejected** |
| F8 | Admin creates `REVIEWER` with external email | Invite link returned |
| F9 | Invite → set password → sign in | Success, `ACTIVE` |
| F10 | Expired invite link | Clear error; regenerate works |
| F11 | First sign-in avatar | Google photo in Cloudinary, `profile_picture` populated |
| F12 | Upload avatar → sign out → sign in | **Uploaded avatar survives** (D12) |
| F13 | Disabled user with a valid token | Blocked on next request |
| F14 | Role change | Effective on next request (D6) |
| F15 | **New** reviewee via `/register` → "Sign up with Google" | Profile completion → `ACTIVE` |
| F16 | **New** reviewee via `/login` → "Continue with Google" | Profile completion → `ACTIVE` — identical outcome to F15 |
| F17 | **Returning** reviewee clicks "Sign up with Google" on `/register` | Signed straight in to dashboard, no profile prompt |
| F18 | All 8 `/register` CTAs (§6.6) | Every one resolves to the Google-first signup page — no 404, no dead link |
| F19 | Marketing copy audit | No surviving claim of email registration or admin approval |

### 10.2 Security

| # | Case | Expected |
|---|---|---|
| S1 | Forged / wrong-key JWT | 401 |
| S2 | Expired JWT | 401 then silent refresh |
| S3 | JWT valid, `public.users` deleted | No resource access |
| S4 | `service_role` key grep across `client/` and built `dist/` | **Zero occurrences** |
| S5 | Direct Supabase signup with external email, then API call | No access (gate holds) |
| S6 | CSP violations across all routes | None |
| S7 | Role escalation via `user_metadata` manipulation | Impossible — role is DB-sourced (D6) |

### 10.3 Regression

Every route under `ProtectedRoute` / `RoleRoute`; exam-taking flow across a token refresh boundary; SSE notifications; upload flows; `server/src/__tests__/security.test.ts` (lines 188, 206 reference the old registration path and need updating).

---

## 11. Standards-Readiness Check

Applied per organisational policy: compliance built in from first draft, not retrofitted at audit time.

### 11.1 Where this design already aligns

| Standard | Control | How this design satisfies it |
|---|---|---|
| ISO 27001 | A.5.16 Identity management | Single canonical identity; domain determines provider exclusively; no account linking |
| ISO 27001 | A.5.17 Authentication information | Admin never learns a user credential (D13); Google owns internal credentials |
| ISO 27001 | A.8.5 Secure authentication | Federated SSO with Workspace-enforced policy; asymmetric JWT verification (D14) |
| ISO 27001 | A.5.15 Access control | Role + status resolved from DB per request (D6); revocation effective immediately |
| SOC 2 | CC6.1 Logical access | `public.users` as single authorization gate; no client-trusted claims |
| SOC 2 | CC6.2 Registration & authorization | Domain-restricted self-registration; admin-only external provisioning with audit records |
| SOC 2 | CC6.3 Access removal | Status change takes effect on next request |
| ISO 9001 | 7.5 Documented information | This versioned plan with changelog and decision log |

### 11.2 Rework required before certification — flagged now

| # | Gap | Standard | Severity | Required action |
|---|---|---|---|---|
| **R1** | H7 regression — session in `localStorage` | ISO 27001 A.8.5; SOC 2 CC6.1 | **High** | Formal risk acceptance signed by management and recorded in `SECURITY_AUDIT.md`. Leaving H7 marked "remediated" while shipping the regression is a documentation-integrity finding in its own right |
| **R2** | No MFA on external password accounts (highest-privilege) | ISO 27001 A.8.5; SOC 2 CC6.1 | **High** | Enable Supabase MFA for password accounts, or migrate external reviewers to a federated provider |
| **R3** | Audit log retention undefined; auth logging best-effort (L1, L2) | ISO 27001 A.8.15; SOC 2 CC7.2 | **High** | Define and enforce a retention period for `audit_logs`; do not depend on Supabase free-tier logs |
| **R4** | No periodic access review | ISO 27001 A.5.18; SOC 2 CC6.2 | Medium | Documented quarterly review of `ADMIN`/`REVIEWER` accounts |
| **R5** | Privacy notice does not disclose Google, Supabase, Cloudinary data flows | DPTM; PDPA | Medium | Update `PrivacyPolicyPage.tsx`; add third-party processor list and transfer basis |
| **R6** | Removing approval means no verification of *student* status (L3) | SOC 2 CC6.2 | Medium | Compensating detective control (periodic roster reconciliation) until Workspace group checks are available |
| **R7** | Break-glass admin credential custody undefined | ISO 27001 A.5.17 | Medium | Document storage, rotation, and use-logging for the break-glass account |
| **R8** | No documented offboarding for graduating students | ISO 27001 A.5.18 | Medium | Define deprovisioning trigger; Workspace mailbox lifecycle is outside our control |
| **R9** | `service_role` key handling not documented | ISO 27001 A.8.24 | Medium | Key custody and rotation procedure |
| **R10** | Session lifetime accepted risk (§9.2) | ISO 27001 A.8.5 | Low | Record acceptance; revisit if lab usage is confirmed |

**R1, R2, and R3 would each require rework if left to audit time.** R1 in particular is cheap to handle now (a signed acceptance record) and expensive later (a regressed finding with no paper trail).

---

## 12. Documentation Plan

Per organisational policy — which documents are derivable from standards, and which may be generated without human approval.

| Document | Governing standard | Auto-generatable? |
|---|---|---|
| This migration plan | ISO 9001 §7.5 (documented information), §8.5.6 (change control) | ✅ Yes — generated; approval requested before implementation |
| ADR: Supabase Auth adoption (`docs/adr/`) | ISO 9001 §7.5 | ✅ Yes — no approval needed |
| `CONTEXT.md` domain-model update | Project convention (`docs/agents/domain.md`) | ✅ Yes — no approval needed |
| QA test plan (§10, extractable) | ISO 9001 §8.6; SOC 2 CC8.1 | ✅ Yes — no approval needed |
| Admin runbook: inviting external reviewers | ISO 9001 §7.5.1; ISO 27001 A.5.16 | ✅ Yes — no approval needed |
| API contract change note (breaking endpoints) | ISO 9001 §8.5.6 | ✅ Yes — no approval needed |
| `SECURITY_AUDIT.md` **v2** with H7 acceptance | ISO 27001 §6.1.3, §8.3 (risk treatment) | ❌ **No — risk acceptance is a management decision** |
| Access Control Policy | ISO 27001 A.5.15 | ⚠️ Draft only — requires approval |
| Privacy notice update (R5) | DPTM; PDPA | ❌ **No — requires legal/DPO review** |
| Terms of Service — remove the admin-approval clause (`TermsPage.tsx:23`) | ISO 9001 §7.5.2; contractual | ❌ **No — contractual language, requires review** |
| Risk register entries (R1–R10) | ISO 27001 §6.1.2 | ⚠️ Draft only — owner and treatment decisions require approval |
| Periodic access review procedure (R4) | ISO 27001 A.5.18 | ⚠️ Draft only — requires approval |

**Summary:** 6 of 11 can be generated and committed without human approval. 5 require human sign-off, of which **2 are hard blockers on management or legal judgement** — the H7 risk acceptance and the privacy notice.

---

## 13. Rollback

Phases 0–2 are reversible by migration rollback. From Phase 3 onward, the custom auth code is deleted, so rollback means reverting the branch. **With 0 users there is no data-loss exposure** — this is the cheapest possible moment to make this change, and that window closes the day real users register.

---

*Prepared 2026-08-01 · Confidence in the overall design: ~85%. Highest confidence in the architecture (D1, D3, D4) and the domain-gate simplification; lowest on the two unverified items in §8, either of which may alter Phase 1.*
