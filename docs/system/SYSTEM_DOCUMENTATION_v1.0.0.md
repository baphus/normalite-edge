# Normalite EDGE — System Documentation (Technical Baseline)

**Version:** 1.0.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas (independent developer)
**Prepared for:** Cebu Normal University
**Status:** Baseline — reverse-engineered from the codebase at commit `0b641be` (2026-08-03)

## Changelog

- v1.0.0 (2026-08-04): Initial technical baseline, reverse-engineered directly from source. Supersedes the architecture sections of `PROJECT_SUMMARY_v1.1.1.md`, which described the pre-Supabase authentication model and a set of security gaps that have since been closed.

---

## 1. Purpose of this document

This is the **technical baseline** for Normalite EDGE — the document a future maintainer reads first. It records what the system *is*, as evidenced by the source code, not what it was planned to be. Every factual claim here was verified against a file in the repository; the file path is cited so any reader can re-verify it.

Three companion documents complete the set:

| Document | Answers |
|---|---|
| This document | How is the system built? |
| `PROJECT_SUMMARY_v2.0.0.md` | What can the system do? |
| `docs/manuals/USER_MANUAL_*.md` | How does each role use it? |

---

## 2. System overview

Normalite EDGE is a web-based Licensure Examination for Teachers (LET) review and mock-examination platform built for Cebu Normal University. It replaces reliance on a generic LMS with a purpose-built system the university owns and controls.

The system supports three roles and one core loop:

```
                       ┌──────────────────────────────────────┐
                       │  REVIEWEE (student) core loop         │
                       │                                       │
                       │   Study Hub ──► Mock Exam ──► Results │
                       │       ▲                          │    │
                       │       └──────────────────────────┘    │
                       └──────────────────────────────────────┘
                                        ▲
                    authors content     │      manages accounts,
                    and reviews         │      campuses, programs,
                    performance         │      system policy
                          ┌─────────────┴─────────────┐
                     REVIEWER                       ADMIN
```

---

## 3. Architecture

### 3.1 Deployment topology

```
   Browser (student / reviewer / admin)
        │
        │  1. Sign in with Google (@cnu.edu.ph)
        ├───────────────────────────────► Supabase Auth
        │                                 (issues JWT access + refresh tokens)
        │  2. API calls, Bearer <JWT>
        ▼
   Vercel ──────── HTTPS ────────► Render
   (React SPA,                    (Express API, /api/v1)
    static build)                       │
                                        │  Prisma (PostgreSQL wire protocol)
                                        ▼
                                  Supabase PostgreSQL
                                  (application data)

   Cloudinary ◄──── signed image uploads (profile pictures, question images)
```

**Key architectural property:** the API server **never issues tokens**. Supabase Auth owns the credential lifecycle; the Express API only *verifies* tokens and owns the application account behind them. This is stated explicitly in [auth.routes.ts](../../server/src/routes/v1/auth.routes.ts) and enforced in [authenticate.ts](../../server/src/middleware/authenticate.ts).

### 3.2 Technology stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React + TypeScript | React 19.2.8, TS 5.9.3 |
| Build tool | Vite | 7.3.6 |
| Styling | Tailwind CSS | 4.3.2 |
| UI primitives | Radix UI + `class-variance-authority` | various |
| Forms & validation | React Hook Form + Zod | 7.71.2 / 4.4.3 |
| Routing | React Router | 7.11.0 |
| HTTP client | Axios | 1.19.0 |
| Backend framework | Node.js + Express + TypeScript | Express 5.2.1, TS 7.0.2 |
| ORM | Prisma | 6.19.2 |
| Database | PostgreSQL (Supabase) | — |
| Authentication | Supabase Auth (Google OAuth + password for external accounts) | `@supabase/supabase-js` 2.111.0 |
| Token verification | `jose` (JWKS) | 6.2.6 |
| Security middleware | `helmet`, `express-rate-limit` | 7.1.0 / 8.6.1 |
| File/image storage | Cloudinary | — |
| Export generation | ExcelJS (client), PDFKit + jsPDF | 3.4.0 / 0.19.1 / 4.2.1 |
| Hosting | Vercel (frontend), Render (backend) | — |

Sources: [client/package.json](../../client/package.json), [server/package.json](../../server/package.json).

### 3.3 Codebase scale

Measured at commit `0b641be`:

| Metric | Count |
|---|---|
| Frontend TypeScript/TSX lines | 34,030 |
| Frontend files | 128 |
| Backend TypeScript lines | 10,371 |
| Backend files | 91 |
| **Total application code** | **~44,400 lines** |
| Page modules (`client/src/pages`) | 49 (3 are dashboard widgets / error boundaries, not routable screens) |
| API route modules | 17 |
| Controllers | 16 |
| Services | 19 |
| Zod validator modules | 12 |
| Database models | 19 |
| Database enums | 10 |
| Prisma migrations applied | 28 |
| REST endpoints | 79 |
| Backend test files | 6 |

---

## 4. Authentication and authorization

This is the most important section for any future maintainer, because the model is unusual and deliberately so.

### 4.1 Two-layer identity

The system separates **identity** (who you are) from **authorization** (what you may do):

| Layer | Owned by | Represents |
|---|---|---|
| Supabase identity | Supabase Auth (`auth.users`) | A verified Google or password credential |
| Application account | This system (`public.users`) | A provisioned CNU account with a role and status |

A valid Supabase session **grants access to nothing on its own**. Any Google account on the internet can obtain one. Authorization requires a matching `public.users` row. This is why the `@cnu.edu.ph` restriction is enforced in application code rather than in Supabase configuration — see the comment block in [authenticate.ts](../../server/src/middleware/authenticate.ts).

### 4.2 The three authentication middlewares

Defined in [server/src/middleware/authenticate.ts](../../server/src/middleware/authenticate.ts):

| Middleware | Requires | Used for |
|---|---|---|
| `requireSupabaseSession` | Valid Supabase JWT only. Touches no database. | `GET /auth/me`, `POST /auth/complete-profile` — reachable before a profile exists |
| `requireRegistrationSession` | Valid JWT **and** either an existing non-disabled account, or an identity eligible to create one (`@cnu.edu.ph` + Google) | Actions taken *during* registration |
| `authenticate` | Valid JWT **and** a `public.users` row that is not `DISABLED` | Everything else |

**Role and status are read from the database on every request**, not from token claims. A role change or an account disable therefore takes effect on the *next request* rather than waiting for the token to refresh. This is a deliberate security property worth preserving.

Role enforcement layers on top via [authorize.ts](../../server/src/middleware/authorize.ts).

### 4.3 Account recovery — by design, there is no self-service password reset

This is not a gap; it is a design decision that removes an entire class of infrastructure. Documented in [ForgotPasswordPage.tsx](../../client/src/pages/auth/ForgotPasswordPage.tsx):

- **`@cnu.edu.ph` users have no password in this system.** They sign in with Google. A forgotten password is a Google account problem, recovered through Google or CNU IT.
- **External reviewers/partners** (the small minority who do hold a password) are recovered by an Admin generating a fresh set-password link via `POST /api/v1/users/:id/access-link`. The link is handed to the user through whatever channel the Admin already uses.

**Consequence:** the system requires **no transactional email provider and no verified sending domain**. This closes the "no email delivery" limitation recorded in `PROJECT_SUMMARY_v1.1.1.md` — not by adding an email provider, but by removing the need for one.

### 4.4 Registration flow

```
  Student clicks "Sign in with Google"
        │
        ▼
  Supabase OAuth ──► AuthCallbackPage ──► GET /auth/me
        │                                     │
        │                          no profile │  profile exists
        │                                     ▼
        └──────────────► CompleteProfilePage  Dashboard
                              │
                              │ POST /auth/complete-profile
                              │ (role-specific field validation)
                              ▼
                         Account provisioned, status ACTIVE
```

Registration is restricted to `@cnu.edu.ph` Google accounts — surfaced in the UI at [RegisterPage.tsx](../../client/src/pages/auth/RegisterPage.tsx) and enforced server-side by `isInternalEmail()` in [config/env.ts](../../server/src/config/env.ts).

**Note for the user manuals:** `UserStatus` is now only `ACTIVE` or `DISABLED`. The `PENDING` status and the manual admin-approval step described in `GETTING_STARTED_GUIDE_v1.0.0.md` **no longer exist**. Google's own verification of the `@cnu.edu.ph` account replaced them.

---

## 5. Security controls

All verified present in [server/src/app.ts](../../server/src/app.ts) unless noted.

| Control | Implementation | Detail |
|---|---|---|
| Security headers | `helmet` with explicit Content Security Policy | `defaultSrc 'self'`; `objectSrc 'none'`; `frameAncestors 'none'`; image/connect sources allow-listed to Cloudinary and Google avatars only |
| `X-Powered-By` removal | `helmet` | Verified by test in [security.test.ts](../../server/src/__tests__/security.test.ts) |
| Global rate limiting | `express-rate-limit` | 100 requests / 15 min |
| Auth endpoint rate limiting | `express-rate-limit` | 10 attempts / 15 min |
| Upload rate limiting | Per-identity limiter on the uploads router | [upload.routes.ts](../../server/src/routes/v1/upload.routes.ts) — mounted on the router itself, deliberately, so `//uploads/…` cannot bypass a prefix match |
| **NAT-safe rate-limit keying** | `rateLimitKey()` in `app.ts` | Authenticated requests key on the Supabase user ID decoded from the JWT payload; anonymous traffic falls back to IP. Prevents one campus computer lab behind a shared NAT from exhausting a single IP bucket. |
| Proxy trust | `app.set('trust proxy', 1)` | Correct client IP behind Render's reverse proxy |
| CSRF protection | [csrfProtection.ts](../../server/src/middleware/csrfProtection.ts) | — |
| Input validation | Zod schemas via [validate.ts](../../server/src/middleware/validate.ts) | 12 validator modules |
| UUID path-parameter validation | Global `router.param` guard in [routes/v1/index.ts](../../server/src/routes/v1/index.ts) | Rejects malformed `id`, `sessionId`, `examId`, `attemptId`, `deckId` before any handler runs |
| Request body size cap | Single body limit, uploads included | `uploadImageSchema` caps payloads at 2,000,000 characters |
| Audit logging | `AuditLog` model + [audit.service.ts](../../server/src/services/audit.service.ts) | Records actor, actor role, action, entity type, entity ID, summary, metadata |
| Token verification | JWKS signature verification via `jose` | [utils/supabaseJwt.ts](../../server/src/utils/supabaseJwt.ts) |

**Closed since `PROJECT_SUMMARY_v1.1.1.md`:** that document flagged "no rate limiting on authentication endpoints" and "no helmet-equivalent security headers middleware" as audit risks. Both are now implemented and covered by automated tests. See §9 for what remains open.

---

## 6. Data model

19 models, 10 enums, in [server/prisma/schema.prisma](../../server/prisma/schema.prisma) (454 lines).

### 6.1 Entity groups

```
IDENTITY & ORG                 CONTENT                      ACTIVITY
─────────────                  ───────                      ────────
Campus                         Exam                          Attempt
Track (program)                 └─ ExamSection                └─ AttemptAnswer
User                               └─ ExamQuestion
Category                        ExamTrack (visibility)       DeckSession
                                                              └─ DeckSessionItem
SYSTEM                          StudyDeck
──────                           ├─ StudyDeckTrack (visibility)
SystemSetting                    └─ StudyDeckQuestion
AuditLog
Notification                    Conference
```

### 6.2 Enumerations

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `REVIEWER`, `REVIEWEE` |
| `UserStatus` | `ACTIVE`, `DISABLED` |
| `Visibility` | `DRAFT`, `PUBLISHED` |
| `ExamStatus` | Draft / Live / Archived / Closed lifecycle |
| `AttemptStatus` | In-progress / submitted states |
| `SubmissionType` | Manual vs automatic submission |
| `FeedbackMode` | Immediate vs after-submission answer feedback |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, … |
| `DeckSessionMode` | View / flashcard / quiz |
| `DeckSessionStatus` | Session lifecycle |

### 6.3 Content scoping

Content visibility is scoped by **program track** through explicit join tables (`ExamTrack`, `StudyDeckTrack`) rather than a single foreign key — one exam or deck can be visible to several programs. Reviewee-side filtering is centralised in [revieweeVisibility.ts](../../server/src/services/revieweeVisibility.ts); that file is the single place to look when a student reports "I can't see an exam I should be able to see."

### 6.4 System-wide policy

`SystemSetting` is a **single-row table** (`id Int @id @default(1)`) holding three institution-wide exam-integrity policies:

| Field | Default | Effect |
|---|---|---|
| `allowMultipleAttempts` | `false` | Whether students may re-attempt exams |
| `enforceExamSingleTab` | `false` | Whether tab-switching during an exam is penalised |
| `tabSwitchGraceSeconds` | `5` | Grace period before a tab switch counts as a violation |

---

## 7. API surface

Base URL: `/api/v1`. All 16 resource routers are mounted in [routes/v1/index.ts](../../server/src/routes/v1/index.ts). 79 endpoints total.

| Resource | Mount | Endpoints | Purpose |
|---|---|---|---|
| Auth | `/auth` | 7 | Profile bootstrap, session start, logout, onboarding, guided tours |
| Users | `/users` | 9 | Account CRUD, role/status changes, access links, achievements, profile view |
| Exams | `/exams` | 9 | Exam CRUD, managed list, take payload, submission analytics, export-to-deck |
| Attempts | `/attempts` | 7 | Start, autosave, submit, result, tab-violation reporting |
| Decks | `/decks` | 10 | Deck CRUD, study session start/save/end |
| Tracks | `/tracks` | 4 | Program/track management |
| Campuses | `/campuses` | 4 | Campus management |
| Categories | `/categories` | 5 | Dynamic subject categories, plus exams-by-category |
| Sessions | `/sessions` | 5 | Video-conference session scheduling |
| Notifications | `/notifications` | 6 | List, unread count, mark-read, **SSE stream + ticket** |
| Dashboard | `/dashboard` | 4 | Role stats, profile performance, daily question |
| Audit | `/audit` | 2 | Audit logs, activity feed |
| Reports | `/reports` | 2 | Exam performance, performance export |
| Uploads | `/uploads` | 2 | Cloudinary image upload (rate-limited per identity) |
| Calendar | `/calendar` | 1 | Combined calendar feed |
| Settings | `/settings` | 2 | Read/update system settings |

**Real-time notifications** use Server-Sent Events (`GET /notifications/stream`) with a short-lived ticket obtained from `POST /notifications/sse-ticket` — because an `EventSource` cannot send an `Authorization` header. See [sseTicket.service.ts](../../server/src/services/sseTicket.service.ts) and [notificationRealtime.service.ts](../../server/src/services/notificationRealtime.service.ts).

A complete, always-current endpoint list can be regenerated from `server/src/routes/v1/` — see §10.

---

## 8. Frontend structure

```
client/src/
├── pages/              49 page modules
│   ├── auth/           Login, Register, AuthCallback, CompleteProfile,
│   │                   SetPassword, ForgotPassword
│   ├── dashboards/     AdminDashboard, ReviewerDashboard, RevieweeDashboard
│   │                   + CalendarEvents/Conferences widgets
│   └── …               Exams, Study Hub, Management, Admin, Marketing/legal
├── components/
│   ├── auth/           Google sign-in, route guards
│   ├── editor/         Question/content authoring
│   ├── exam-view/      Exam-taking and review surfaces
│   ├── layout/         Sidebar, DashboardLayout, PageGuideOverlay
│   ├── manage/         Management tables and filters
│   ├── marketing/      Landing/auth layouts
│   └── ui/             Radix-based design-system primitives
├── contexts/           Auth, Notification
├── hooks/
└── lib/                axios (interceptors), supabase client, utilities
```

Public marketing and legal surfaces — Landing, About, Contact, FAQ, Terms, Privacy Policy — are part of the application.

### 8.1 Role-based navigation

From [Sidebar.tsx](../../client/src/components/layout/Sidebar.tsx):

| Group | Visible to | Items |
|---|---|---|
| General | All | Dashboard |
| Review | Reviewee | Study Hub, Exams, Calendar, Conferences |
| Content | Admin, Reviewer | Materials, Exams, Students, Calendar, Conferences |
| Admin | Admin | Programs, Campuses, Categories, User Management, Audit Logs |
| System | All | Notifications, Settings |

---

## 9. Known limitations and open items

Recorded honestly, as of 2026-08-04.

| # | Item | Nature | Impact |
|---|---|---|---|
| 1 | No documented data retention/deletion policy for exam attempts, answers, or audit logs | **Policy gap** — requires institutional decision, not code | Blocks ISO 27001 A.5.33 / SOC 2 confidentiality criteria. See §11. |
| 2 | Backup/restore relies on Supabase platform backups (7-day window on Pro tier); no documented restore drill | **Policy + process gap** | Blocks ISO 27001 A.8.13. Recommend a documented, tested restore procedure. |
| 3 | Automated test coverage is backend-only (6 files) and concentrated on security, registration, and visibility | **Engineering gap** | The exam-taking engine — the highest-risk path — has no automated regression coverage. Recommend this as the first post-handover investment. |
| 4 | No frontend automated tests | **Engineering gap** | Regression risk on UI changes |
| 5 | No documented incident-response or access-review procedure | **Policy gap** | Blocks ISO 27001 A.5.24–A.5.28, SOC 2 CC7. See §11. |
| 6 | No uptime/error monitoring or alerting configured | **Operational gap** | Faults are discovered by users rather than by the operator |
| 7 | Environment/config documentation is spread across `DEPLOYMENT.md`, `LOCAL_SETUP.md`, and `.env.example` files | **Documentation gap** | Consolidation recommended; auto-generatable (§10) |

None of these prevent the system from operating today. Items 1, 2, and 5 are **policy** decisions belonging to CNU, not defects in the software.

---

## 10. Documents that can be auto-generated from this repository

Per the documentation-generation standard, these can be produced mechanically from source with **no human judgment and no approval gate** — they are restatements of code:

| Document | Source of truth | Regeneration trigger |
|---|---|---|
| API endpoint inventory | `server/src/routes/v1/*.routes.ts` | Any route change |
| Database schema / ER reference | `server/prisma/schema.prisma` | Any migration |
| Migration history | `server/prisma/migrations/` | Any migration |
| Environment variable reference | `server/.env.example`, `client/.env.example` | Any config change |
| Dependency and licence inventory (SBOM) | `package.json` × 2, lockfiles | Any dependency change |
| Role-based navigation matrix | `client/src/components/layout/Sidebar.tsx` | Any nav change |
| Codebase scale metrics | Repository | Any commit |
| Feature summary (§4 of the Project Summary) | Routes + pages + schema | Any feature change |

These **require human review before finalisation** — they involve institutional policy, legal exposure, or commercial judgment that code cannot determine:

- Data Privacy Impact Assessment / records of processing
- Data retention and deletion policy
- Access-control policy and periodic access-review procedure
- Incident-response and breach-notification procedure
- Business-continuity / backup-restore policy
- Service-level agreement and support terms
- Any contract, pricing, or invoice document

---

## 11. Standards-readiness check

This document is **not** a certification artefact — it is internal project documentation. Per the standards-readiness requirement, the following flags identify anything that would need **rework** to achieve certification, so it is built in now rather than retrofitted under audit pressure.

### 11.1 Already in good shape

| Standard | Control area | Evidence in this system |
|---|---|---|
| ISO 27001 A.8.5 / SOC 2 CC6.1 | Secure authentication | Supabase Auth + JWKS verification; DB-read authorization on every request; no token-claim trust |
| ISO 27001 A.8.5 / SOC 2 CC6.6 | Brute-force protection | Global + per-auth-endpoint rate limiting, NAT-safe keying |
| ISO 27001 A.8.9 | Secure configuration | `helmet` with explicit CSP, `X-Powered-By` suppressed, tested |
| ISO 27001 A.8.15 / SOC 2 CC7.2 | Logging & monitoring | `AuditLog` with actor, role, action, entity, metadata |
| ISO 27001 A.5.15 / SOC 2 CC6.3 | Access control | Three-role RBAC, `authorize` middleware, status revocation effective next request |
| ISO 27001 A.8.24 | Cryptography | Credentials and tokens handled by Supabase Auth; no home-rolled crypto |
| ISO 27001 A.8.28 | Secure coding | Zod validation on all mutating endpoints, global UUID param guard, TypeScript strict typing |
| ISO 9001 7.5 | Documented information | Versioned documents with changelogs (this doc set) |
| DPTM — Governance | Accountability | Roles, audit trail, and data scoping are explicit and enforced in code |

### 11.2 Would require rework — flag now

| # | Gap | Standard(s) at risk | Recommended action | Effort |
|---|---|---|---|---|
| R1 | No data retention/deletion policy for student PII, attempts, and audit logs | ISO 27001 A.5.33, A.8.10; **DPTM — Retention Limitation**; SOC 2 C1.2 | CNU to set retention periods; then implement a scheduled purge job | Policy: CNU. Code: small |
| R2 | No documented lawful basis / consent record for student data processing | **DPTM — Consent, Notification, Purpose Limitation**; Philippine Data Privacy Act 2012 | Publish a data-processing notice; the existing Privacy Policy page is the natural home | Policy: CNU |
| R3 | No documented Data Subject Access Request (DSAR) procedure or export/erase capability | **DPTM — Access & Correction**; DPA 2012 §16 | Document the manual procedure now; automate later if volume warrants | Policy: CNU. Code: medium |
| R4 | No incident-response / breach-notification procedure | ISO 27001 A.5.24–A.5.28; SOC 2 CC7.3–CC7.5; DPTM — Data Breach Management | Adopt a one-page IR procedure naming an owner and NPC notification timeline | Policy: CNU |
| R5 | No tested backup-restore procedure | ISO 27001 A.8.13; SOC 2 A1.2 | Document and perform one restore drill; record the result | Small, joint |
| R6 | No periodic access review | ISO 27001 A.5.18; SOC 2 CC6.2 | Quarterly admin review of `ADMIN`/`REVIEWER` accounts; audit log already supplies the evidence | Policy: CNU |
| R7 | No change-management record linking code changes to approval | ISO 9001 8.5.6; ISO 27001 A.8.32; SOC 2 CC8.1 | Already 90% satisfied by GitHub PR history — formalise "PR review = change approval" in writing | Small |
| R8 | Exam-taking engine has no automated regression tests | ISO 9001 8.3.4 (design verification); SOC 2 CC8.1 | Add integration tests for attempt start / autosave / submit / auto-submit | Medium |
| R9 | No monitoring or alerting | ISO 27001 A.8.16; SOC 2 CC7.1 | Enable Render/Vercel alerts + an uptime check | Small |
| R10 | Third-party/sub-processor register absent (Supabase, Vercel, Render, Cloudinary, Google) | ISO 27001 A.5.19–A.5.22; DPTM — Transfer Limitation; SOC 2 CC9.2 | One-page register naming each sub-processor, data held, and hosting region | Small |

**The single most important flag: R1–R3 and R10 concern data residency and student PII.** Student records are processed on Supabase, Render, Vercel, Cloudinary, and Google infrastructure, whose hosting regions must be confirmed and recorded. Under DPTM's Transfer Limitation and the Philippine Data Privacy Act, cross-border transfer of student PII requires a documented basis. Establishing this while there are few records is materially cheaper than establishing it after several cohorts of exam data have accumulated.

---

## 12. How to verify every claim in this document

| Claim group | Verification command (run from repository root) |
|---|---|
| Stack and versions | `cat client/package.json server/package.json` |
| Endpoint inventory | `grep -rE "router\.(get\|post\|put\|patch\|delete)\(" server/src/routes/v1/` |
| Models and enums | `grep -E "^model \|^enum " server/prisma/schema.prisma` |
| Migration count | `ls server/prisma/migrations/` |
| Security controls | `sed -n '1,110p' server/src/app.ts` |
| Auth model | `cat server/src/middleware/authenticate.ts` |
| Navigation matrix | `cat client/src/components/layout/Sidebar.tsx` |
| Test inventory | `ls server/src/__tests__/` |
| Code scale | `find client/src server/src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| tail -1` |
