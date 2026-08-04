# Normalite EDGE — Project Summary

**Version:** 2.0.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas (independent developer)
**Prepared for:** Cebu Normal University
**Supersedes:** `PROJECT_SUMMARY_v1.1.1.md` (2026-07-07)

## Changelog

- **v2.0.0 (2026-08-04): Structural overhaul.** The authentication architecture was rebuilt on Supabase Auth after v1.1.1 was written, which invalidated that document's entire "Known Limitations" section and most of its security-readiness notes. Specifically:
  - Authentication migrated from self-issued JWTs to Supabase Auth; the API server no longer issues tokens.
  - Registration is now Google-OAuth-only, restricted to `@cnu.edu.ph` accounts.
  - `UserStatus` `PENDING` and the manual admin-approval step **no longer exist**; Google's verification of the university account replaced them.
  - "No email notifications" is **no longer a limitation** — the design was changed to remove the need for a transactional email provider entirely, rather than to add one.
  - "No self-service password reset" is **no longer a gap** — it is now a documented design decision (institutional users have no password; external accounts are recovered via admin-generated access links).
  - "No rate limiting" and "no security-headers middleware" are **closed**: `helmet` with an explicit CSP and `express-rate-limit` with NAT-safe keying are implemented and covered by automated tests.
  - Added: dynamic categories, campus management, exam submission analytics, Excel/PDF export, CSRF protection, global UUID parameter validation, guided onboarding tours, public marketing and legal pages.
  - Scale figures updated (34,030 frontend lines / 10,371 backend lines / 79 endpoints / 19 models / 28 migrations).
- v1.1.1 (2026-07-07): Noted that self-service password reset did not exist yet.
- v1.1.0 (2026-07-07): Added "Known Limitations" documenting absence of email notifications.
- v1.0.0 (2026-07-07): Initial project summary.

---

## 1. What it is

Normalite EDGE is a full-stack Licensure Examination for Teachers (LET) review and mock-examination platform built for Cebu Normal University. Reviewers and instructors build timed, multi-section practice exams and flashcard study decks; student reviewees take those exams under integrity controls, track their performance, and study; administrators manage accounts, campuses, programs, subject categories, and institution-wide exam policy.

The university owns the source code, the data, and the deployment. There is no vendor lock-in and no third-party LMS in the path.

For architecture, data model, and security controls, see [docs/system/SYSTEM_DOCUMENTATION_v1.0.0.md](docs/system/SYSTEM_DOCUMENTATION_v1.0.0.md).

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite 7, Radix UI |
| Backend | Node.js, Express 5, TypeScript, Prisma 6 |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth — Google OAuth (`@cnu.edu.ph`) + password for external accounts |
| Image storage | Cloudinary |
| Hosting | Vercel (frontend), Render (backend) |

**Scale:** ~34,000 lines frontend, ~10,400 lines backend, 49 page modules, 79 REST endpoints, 19 database models, 28 migrations.

## 3. User roles

| Role | Scope |
|---|---|
| **Admin** | Full system access — user, campus, program, and category management; system-wide exam policy; audit logs |
| **Reviewer** | Creates and manages exams and study materials; views student performance and submission analytics |
| **Reviewee** | Takes exams, studies decks, tracks own results, attends conferences |

## 4. Feature list

### 4.1 Authentication & access

- Google OAuth sign-in restricted to `@cnu.edu.ph` accounts
- Password sign-in for external reviewers/partners, provisioned by admin-generated access links
- Two-layer identity: a Supabase session alone grants nothing; a provisioned application account is the authorization gate
- Role-based access control (Admin / Reviewer / Reviewee) with role and status re-read from the database on every request
- Profile completion flow with role-specific field validation
- Guided onboarding flow and per-page guided tours, with per-user completion tracking

### 4.2 Exam engine — building

- Multi-section exams with per-section time limits
- Multiple-choice questions with images, rationalised answers, and point weighting
- Exam scheduling (start/end windows), maximum-attempt limits, cooldown periods
- Draft / Live / Archived / Closed status lifecycle
- Visibility scoped to one or more program tracks
- Configurable feedback mode (immediate vs. after submission)
- Dynamic, admin-managed subject categories
- Export an exam's questions into a study deck

### 4.3 Exam engine — taking

- Live countdown timer synced to a server-calculated end time
- Autosave every 15 seconds, with resume of an in-progress attempt
- Tab-switch / focus-loss detection with a configurable grace period
- Automatic submission on deadline or time expiry
- Per-question elapsed-time tracking
- Attempt state tracking across disconnections

### 4.4 Results & analytics

- Detailed per-attempt results with full answer review and rationales
- Exam-level submission analytics (averages, highs/lows, attempt counts, per-question performance)
- Role-specific dashboards for Admin, Reviewer, and Reviewee
- Student profile performance view for reviewers
- Daily practice question on the reviewee dashboard
- Student achievements

### 4.5 Study Hub

- Flashcard-style study decks with view / flashcard / quiz modes
- Custom student-created decks
- Per-user session persistence with resume support and per-item tracking
- Deck visibility scoped by program track

### 4.6 Administration

- User account management — create, edit, disable, change role, generate access links
- Student management with campus, program, year-level, and section fields; student ID and contact number
- Campus management
- Program/track management
- Subject category management
- Institution-wide exam policy: multiple-attempt permission, single-tab enforcement, tab-switch grace period
- System audit log with actor, actor role, action, entity, summary, and metadata
- Activity feed

### 4.7 Reporting & export

- Excel export of student scores and submissions, filterable by campus, program, and date range
- PDF report generation for exam results and performance summaries
- Exam-performance report endpoint with dedicated export

### 4.8 Notifications & communication

- Real-time in-app notifications over Server-Sent Events, with unread counts and mark-read/mark-all-read
- Calendar view combining exams, conferences, and events
- Video-conference session scheduling with recording links

### 4.9 Public-facing pages

- Landing page, About, Contact, FAQ
- Terms of Service and Privacy Policy

### 4.10 Other

- Profile management with Cloudinary image upload and in-browser cropping
- Responsive UI across desktop and mobile

## 5. Security posture

| Control | Status |
|---|---|
| Security headers with explicit Content Security Policy (`helmet`) | ✅ Implemented, tested |
| Global rate limiting (100 req / 15 min) | ✅ Implemented |
| Auth-endpoint rate limiting (10 attempts / 15 min) | ✅ Implemented |
| Per-identity upload rate limiting | ✅ Implemented |
| NAT-safe rate-limit keying (per user, not per shared campus IP) | ✅ Implemented |
| CSRF protection | ✅ Implemented |
| Input validation on all mutating endpoints (Zod) | ✅ Implemented |
| Global UUID path-parameter validation | ✅ Implemented |
| Request body size caps | ✅ Implemented |
| Audit logging | ✅ Implemented |
| JWT signature verification via JWKS | ✅ Implemented |
| Credential storage | ✅ Delegated to Supabase Auth — no home-rolled crypto |

## 6. Known limitations

Honest and current as of 2026-08-04.

1. **No documented data retention or deletion policy** for student PII, exam attempts, or audit logs. This is an institutional policy decision for CNU, not a code defect — but it is the highest-priority open item.
2. **Backup and restore depend on Supabase platform backups** (7-day window on the Pro tier). No restore drill has been performed or documented.
3. **Automated test coverage is backend-only** — 6 test files, concentrated on security, registration, and content visibility. The exam-taking engine, which carries the highest operational risk, has no automated regression coverage. This is the first recommended post-handover investment.
4. **No frontend automated tests.**
5. **No incident-response or periodic access-review procedure** is documented.
6. **No uptime or error monitoring/alerting** is configured — faults would be discovered by users rather than by the operator.
7. **Sub-processor and data-residency register is absent.** Student data is processed by Supabase, Render, Vercel, Cloudinary, and Google; hosting regions need confirming and recording.

Items 1, 5, and 7 are policy artefacts owned by CNU. Items 2, 3, 4, and 6 are engineering/operational work that can be scoped separately.

## 7. Documentation set

| Document | Contents |
|---|---|
[docs/system/SYSTEM_DOCUMENTATION_v1.0.0.md](docs/system/SYSTEM_DOCUMENTATION_v1.0.0.md) | Architecture, data model, API surface, security controls, standards-readiness |
| This document | Feature inventory and current state |
| [docs/contract/PROPOSAL_AND_SOW_v1.0.0.md](docs/contract/PROPOSAL_AND_SOW_v1.0.0.md) | Contract of Service proposal and statement of work |
| [docs/contract/DELIVERABLES_REGISTER_v1.0.0.md](docs/contract/DELIVERABLES_REGISTER_v1.0.0.md) | Itemised deliverables with acceptance evidence |
| [docs/contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](docs/contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) | Two-month defect-support terms |
| [docs/contract/ADMIN_ORIENTATION_PLAN_v1.0.0.md](docs/contract/ADMIN_ORIENTATION_PLAN_v1.0.0.md) | Administrator orientation programme |
| [docs/manuals/USER_MANUAL_ADMIN_v1.0.0.md](docs/manuals/USER_MANUAL_ADMIN_v1.0.0.md) | Administrator manual |
| [docs/manuals/USER_MANUAL_REVIEWER_v1.0.0.md](docs/manuals/USER_MANUAL_REVIEWER_v1.0.0.md) | Reviewer/instructor manual |
| [docs/manuals/USER_MANUAL_REVIEWEE_v1.0.0.md](docs/manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | Student manual |
| [DEPLOYMENT.md](DEPLOYMENT.md), [LOCAL_SETUP.md](LOCAL_SETUP.md) | Deployment and local development |

**Superseded — do not distribute:** `GETTING_STARTED_GUIDE_v1.0.0.md` describes a `PENDING`-status manual-approval registration flow that no longer exists. It is replaced by the three user manuals above.
