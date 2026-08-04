# Normalite EDGE — Deliverables Register

**Version:** 1.0.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas
**Prepared for:** Cebu Normal University
**Attachment to:** [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md)
**Baseline commit:** `0b641be` (2026-08-03)

## Changelog

- v1.0.0 (2026-08-04): Initial deliverables register. Every entry verified against the repository at the baseline commit.

---

## How to use this register

This is the **acceptance checklist**. Each row states one deliverable, how to verify it, and where the evidence lives. A CNU reviewer should be able to work down this table and confirm every item without needing to ask me anything.

The "Verify by" column gives a concrete action. Commands are run from the repository root.

**Status key:** ✅ Delivered · 🔄 Delivered, ongoing through support period · ⬜ Scheduled

---

## Part A — Software deliverables

| # | Deliverable | Verify by | Status |
|---|---|---|---|
| **D1** | Frontend application source code — React 19 + TypeScript, ~34,030 lines across 128 files, 49 page modules | `find client/src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| tail -1` | ✅ |
| **D2** | Backend API source code — Express 5 + TypeScript + Prisma, ~10,371 lines across 91 files, 79 REST endpoints across 17 route modules | `find server/src -name "*.ts" \| xargs wc -l \| tail -1` | ✅ |
| **D3** | Database schema — 19 models, 10 enums | `grep -E "^model \|^enum " server/prisma/schema.prisma` | ✅ |
| **D4** | Migration history — 28 sequential, reproducible migrations | `ls server/prisma/migrations/` | ✅ |
| **D5** | Live production deployment — frontend on Vercel, API on Render, database on Supabase, images on Cloudinary | Open the production URL and sign in | ✅ |
| **D6** | Deployment guide and pre-flight checklist | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md` | ✅ |
| **D7** | Deployment variable setup tooling | `setup-deployment-vars.js` | ✅ |
| **D7a** | Secret-generation scripts | `generate-secrets.sh`, `generate-secrets.bat` — present in Git history (commit `64bdb87`) but **absent from the current working tree**; recoverable with `git checkout 64bdb87 -- generate-secrets.sh generate-secrets.bat`. Confirm before handover. | ⚠️ Verify |
| **D8** | Local development setup guide | `LOCAL_SETUP.md` | ✅ |
| **D9** | Automated backend test suite — 6 modules | `cd server && npm test` | ✅ |
| **D10** | Database seed script for a working baseline dataset | `cd server && npm run db:seed` | ✅ |
| **D11** | Continuous type-checking and linting configuration | `cd client && npm run lint && npx tsc -b`; `cd server && npx tsc --noEmit` | ✅ |

## Part B — Feature deliverables

Every feature below is live in the deployed system. "Verify by" describes the user action that demonstrates it.

### B1 — Authentication and access control

| # | Feature | Verify by |
|---|---|---|
| F1.1 | Google OAuth sign-in restricted to `@cnu.edu.ph` accounts | Attempt sign-in with a non-CNU Google account — provisioning is refused |
| F1.2 | Password sign-in for external reviewers/partners | Admin generates an access link; external user sets a password and signs in |
| F1.3 | Two-layer identity — a valid session alone authorises nothing | A signed-in identity without a provisioned account reaches no protected resource |
| F1.4 | Three-role RBAC (Admin / Reviewer / Reviewee) | Sign in as each role; confirm the navigation and permissions differ |
| F1.5 | Immediate revocation — role and status read from the database per request | Disable an account while it is signed in; its next request is refused |
| F1.6 | Profile completion with role-specific field validation | Complete profile as each role; confirm required fields differ |
| F1.7 | Admin-generated access links for account recovery | User Management → generate access link |
| F1.8 | Guided onboarding flow with per-user progress tracking | Sign in as a new user |
| F1.9 | Per-page guided tours with completion tracking | Visit a page with a tour on first use |

### B2 — Exam authoring

| # | Feature | Verify by |
|---|---|---|
| F2.1 | Multi-section exams with per-section time limits | Create an exam with two sections having different limits |
| F2.2 | Multiple-choice question authoring with images | Add a question with an uploaded image |
| F2.3 | Rationalised answers (explanation per question) | Add a rationale; confirm it appears in post-submission review |
| F2.4 | Per-question point weighting | Set differing point values; confirm scoring reflects them |
| F2.5 | Exam scheduling — start and end windows | Schedule an exam; confirm it is unavailable outside the window |
| F2.6 | Maximum-attempt limits | Set a limit; confirm it is enforced |
| F2.7 | Cooldown period between attempts | Set a cooldown; confirm re-attempt is blocked until it elapses |
| F2.8 | Draft / Live / Archived / Closed lifecycle | Move an exam through each status |
| F2.9 | Visibility scoped to one or more program tracks | Restrict an exam to one track; confirm other tracks cannot see it |
| F2.10 | Feedback mode — immediate vs. after submission | Set each mode; confirm answer feedback timing differs |
| F2.11 | Export an exam's questions into a study deck | Manage Exams → export to deck |
| F2.12 | Dynamic, admin-managed subject categories | Create a category; assign it to an exam |

### B3 — Exam taking and integrity

| # | Feature | Verify by |
|---|---|---|
| F3.1 | Live countdown synced to a server-calculated end time | Start an exam; confirm the timer is not client-trusted (reload — the deadline holds) |
| F3.2 | Autosave every 15 seconds | Answer a question, wait, close the browser, resume — the answer persists |
| F3.3 | Resume an in-progress attempt | Reopen an interrupted attempt |
| F3.4 | Tab-switch / focus-loss detection | Enable single-tab enforcement; switch tabs during an exam |
| F3.5 | Configurable tab-switch grace period | Adjust grace seconds in Settings; confirm the threshold changes |
| F3.6 | Automatic submission on deadline or time expiry | Let a timer run out |
| F3.7 | Per-question elapsed-time tracking | Submit an attempt; confirm per-question times are recorded |
| F3.8 | Attempt state tracking across disconnection | Disconnect mid-exam and return |

### B4 — Results, analytics, and dashboards

| # | Feature | Verify by |
|---|---|---|
| F4.1 | Per-attempt results with full answer review | Open a submitted attempt |
| F4.2 | Exam-level submission analytics — averages, highs/lows, attempt counts, per-question performance | Manage Exam View → submission analytics |
| F4.3 | Admin dashboard | Sign in as Admin |
| F4.4 | Reviewer dashboard | Sign in as Reviewer |
| F4.5 | Reviewee dashboard | Sign in as Reviewee |
| F4.6 | Student profile performance view for reviewers | Students → open a student profile |
| F4.7 | Daily practice question | Reviewee dashboard |
| F4.8 | Student achievements | Reviewee profile |

### B5 — Study Hub

| # | Feature | Verify by |
|---|---|---|
| F5.1 | Study decks in view mode | Study Hub → open a deck in view mode |
| F5.2 | Flashcard mode | Same deck, flashcard mode |
| F5.3 | Quiz mode | Same deck, quiz mode |
| F5.4 | Student-created custom decks | Create a custom deck as a Reviewee |
| F5.5 | Session persistence with resume | Start a session, leave, return |
| F5.6 | Per-item session tracking | Complete a partial session; confirm per-item progress |
| F5.7 | Deck visibility scoped by program track | Restrict a deck to one track |
| F5.8 | Question images in decks | Add an image to a deck question |

### B6 — Administration

| # | Feature | Verify by |
|---|---|---|
| F6.1 | User account management — create, edit, disable | Admin → User Management |
| F6.2 | Role changes | Change a user's role; confirm effect on next request |
| F6.3 | Status changes (Active / Disabled) | Disable and re-enable an account |
| F6.4 | Student management with campus, program, year level, section, student ID, contact number | Admin/Reviewer → Students |
| F6.5 | Campus management | Admin → Campuses |
| F6.6 | Program/track management | Admin → Programs |
| F6.7 | Category management | Admin → Categories |
| F6.8 | System-wide exam policy — multiple attempts, single-tab enforcement, grace period | Settings |
| F6.9 | Audit log with actor, role, action, entity, summary, metadata | Admin → Audit Logs |
| F6.10 | Activity feed | Admin dashboard |

### B7 — Reporting and export

| # | Feature | Verify by |
|---|---|---|
| F7.1 | Excel export of student scores and submissions | Reports → export to Excel; open the file |
| F7.2 | Export filters — campus, program, date range | Apply each filter before exporting |
| F7.3 | PDF report generation for results and performance | Generate a PDF report |
| F7.4 | Exam-performance report with dedicated export endpoint | Reports → exam performance |

### B8 — Notifications and communication

| # | Feature | Verify by |
|---|---|---|
| F8.1 | Real-time in-app notifications over Server-Sent Events | Trigger a notifiable action in one browser; watch it arrive in another without refresh |
| F8.2 | Unread count | Notification bell |
| F8.3 | Mark read / mark all read | Notifications page |
| F8.4 | Calendar combining exams, conferences, and events | Calendar |
| F8.5 | Video-conference session scheduling with recording links | Conferences → create a session |

### B9 — Public-facing pages

| # | Feature | Verify by |
|---|---|---|
| F9.1 | Landing page | Visit the site while signed out |
| F9.2 | About, Contact, FAQ | Navigate from the landing page |
| F9.3 | Terms of Service | `/terms` |
| F9.4 | Privacy Policy | `/privacy` |

### B10 — Profile and platform

| # | Feature | Verify by |
|---|---|---|
| F10.1 | Profile management | Profile page |
| F10.2 | Profile picture upload with in-browser cropping | Upload and crop an avatar |
| F10.3 | Google default avatar handling | Sign in with Google; confirm the avatar renders |
| F10.4 | Responsive layout across desktop and mobile | Open on a phone and a desktop |

### B11 — Security controls

| # | Control | Verify by |
|---|---|---|
| F11.1 | Security headers with explicit Content Security Policy | Inspect response headers, or `cd server && npm test` |
| F11.2 | Global rate limiting — 100 requests / 15 min | Exceed the limit; observe the 429 and `RateLimit-*` headers |
| F11.3 | Auth-endpoint rate limiting — 10 attempts / 15 min | Repeated auth attempts |
| F11.4 | Per-identity upload rate limiting | Repeated uploads from one account |
| F11.5 | Rate limiting keyed per user, not per shared IP | Two accounts behind one campus network are limited independently |
| F11.6 | CSRF protection | Inspect `server/src/middleware/csrfProtection.ts` |
| F11.7 | Input validation on all mutating endpoints | Submit a malformed payload; observe structured rejection |
| F11.8 | Global UUID path-parameter validation | Request `/api/v1/exams/not-a-uuid` |
| F11.9 | Request body size caps | Oversized payload is rejected |
| F11.10 | `X-Powered-By` suppressed | Inspect response headers |
| F11.11 | JWT signature verification via JWKS | `server/src/utils/supabaseJwt.ts` |

## Part C — Documentation deliverables

| # | Deliverable | Location | Status |
|---|---|---|---|
| **D12** | System documentation — architecture, data model, API surface, security controls, standards-readiness | [docs/system/SYSTEM_DOCUMENTATION_v1.0.0.md](../system/SYSTEM_DOCUMENTATION_v1.0.0.md) | ✅ |
| **D13** | Project summary — feature inventory and known limitations | [PROJECT_SUMMARY_v2.0.0.md](../../PROJECT_SUMMARY_v2.0.0.md) | ✅ |
| **D14** | Administrator user manual | [docs/manuals/USER_MANUAL_ADMIN_v1.0.0.md](../manuals/USER_MANUAL_ADMIN_v1.0.0.md) | ✅ |
| **D15** | Reviewer user manual | [docs/manuals/USER_MANUAL_REVIEWER_v1.0.0.md](../manuals/USER_MANUAL_REVIEWER_v1.0.0.md) | ✅ |
| **D16** | Student user manual | [docs/manuals/USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | ✅ |
| **D17** | Proposal and statement of work | [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md) | ✅ |
| **D18** | This deliverables register | This document | ✅ |
| **D19** | Maintenance and support terms | [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) | ✅ |
| **D20** | Administrator orientation plan | [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md) | ✅ |
| **D21** | Deployment and local setup guides | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, `LOCAL_SETUP.md` | ✅ |
| **D22** | Requirements specification (as built against) | `requirements.md` | ✅ |
| **D23** | Design system documentation | `docs/design-system-v1.2.0.md` | ✅ |
| **D24** | Security audit record | `SECURITY_AUDIT.md` | ✅ |

## Part D — Service deliverables

| # | Deliverable | Terms | Status |
|---|---|---|---|
| **D25** | Two months of defect support from contract signing | [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) | 🔄 Begins on signing |
| **D26** | Administrator orientation Session 1 — accounts, access, organisation structure, audit | [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md) §4 | ⬜ To schedule |
| **D27** | Administrator orientation Session 2 — exam lifecycle, integrity, reporting, communication | [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md) §5 | ⬜ To schedule |
| **D28** | Administrator orientation Session 3 — follow-up Q&A | [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md) §6 | ⬜ To schedule |
| **D29** | Handover of repository and platform administrative access | [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md) §12 | ⬜ On acceptance |
| **D30** | Secure transfer of environment variables and secrets | [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md) §12 | ⬜ On acceptance |

---

## Part E — Explicitly outside this register

Recorded so the boundary is unambiguous. Full rationale in [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md) §9.

| Not delivered | Note |
|---|---|
| Hosting and infrastructure fees | Paid by CNU directly to each provider |
| Maintenance beyond two months | Separate arrangement |
| New features and scope changes | Quoted separately |
| Transactional email delivery | Designed out; would need a paid provider and verified domain |
| Institutional policy documents (retention, DPIA, incident response, access review) | CNU must own these decisions; I can draft for review |
| Automated tests for the exam-taking engine | Recommended next investment |
| Uptime and error monitoring | Not configured |
| Exam and deck content authoring | CNU's academic work |
| Student and reviewer live training | Covered by manuals; live sessions available separately |

---

## Acceptance sign-off

I confirm that the deliverables marked ✅ in Parts A, B, and C have been verified against the evidence stated, and that the service deliverables in Part D are understood and scheduled.

| | Reviewer (CNU) | Service Provider |
|---|---|---|
| **Name** | ______________________________ | Joseph Sarsonas |
| **Position** | ______________________________ | Independent Software Developer |
| **Signature** | ______________________________ | ______________________________ |
| **Date** | ______________________________ | ______________________________ |

**Findings raised during review** *(attach a separate sheet if needed — see acceptance procedure, `PROPOSAL_AND_SOW_v1.0.0.md` §8)*:

| # | Deliverable ref. | Finding | Classified as | Resolution |
|---|---|---|---|---|
| | | | Defect / New feature | |
| | | | Defect / New feature | |
| | | | Defect / New feature | |
