# Normalite EDGE — Deliverables Register

**Version:** 1.1.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas
**Prepared for:** Cebu Normal University
**Attachment to:** [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md)
**Baseline commit:** `0b641be` (2026-08-03)
**Contract value:** ₱30,000.00, fully allocated below

## Changelog

- **v1.1.0 (2026-08-04):** Significant additions following client direction.
  - **Cost allocation added to every feature group.** Each group in Part B now carries its allocated amount from `PROPOSAL_AND_SOW_v1.1.0.md` §6.1, and Part F reconciles all line items to exactly ₱30,000. The register is now usable as the accomplishment-report attachment for disbursement.
  - **Part D handover deliverables rewritten** around the platform-access method: CNU accounts added as owners/collaborators on every deployment service. **Vercel** and the **Google Cloud OAuth client** added — both were absent from the original list.
  - Hosting recorded as **₱0** in Part E; upgrade options are future separate costs.
  - Retargeted cross-references to the current document versions.
- v1.0.0 (2026-08-04): Initial deliverables register. Corrected endpoint count to 79 and flagged the missing `generate-secrets.*` scripts.

---

## How to use this register

This is the **acceptance checklist**. Each row states one deliverable, how to verify it, and where the evidence lives. A CNU reviewer should be able to work down this table and confirm every item without needing to ask me anything.

The "Verify by" column gives a concrete action. Commands are run from the repository root.

**Status key:** ✅ Delivered · 🔄 Delivered, ongoing through support period · ⬜ Scheduled · ⚠️ Needs confirmation

---

## Part A — Software deliverables · ₱5,800.00 allocated

Foundation work items 1–4 from `PROPOSAL_AND_SOW_v1.1.0.md` §6.1.

| # | Deliverable | Verify by | Allocation | Status |
|---|---|---|---|---|
| **D1** | Frontend application source code — React 19 + TypeScript, ~34,030 lines across 128 files, 49 page modules | `find client/src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| tail -1` | *see Part B* | ✅ |
| **D2** | Backend API source code — Express 5 + TypeScript + Prisma, ~10,371 lines across 91 files, 79 REST endpoints across 17 route modules | `find server/src -name "*.ts" \| xargs wc -l \| tail -1` | *see Part B* | ✅ |
| **D3** | Database schema — 19 models, 10 enums | `grep -E "^model \|^enum " server/prisma/schema.prisma` | ₱1,700.00 *(item 2)* | ✅ |
| **D4** | Migration history — 28 sequential, reproducible migrations | `ls server/prisma/migrations/` | *incl. in item 2* | ✅ |
| **D5** | Live production deployment — Vercel, Render, Supabase, Cloudinary | Open the production URL and sign in | ₱1,000.00 *(item 4)* | ✅ |
| **D6** | Deployment guide and pre-flight checklist | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md` | *incl. in item 4* | ✅ |
| **D7** | Deployment variable setup tooling | `setup-deployment-vars.js` | *incl. in item 4* | ✅ |
| **D7a** | Secret-generation scripts | `generate-secrets.sh`, `generate-secrets.bat` — present in Git history (commit `64bdb87`) but **absent from the current working tree**; recoverable with `git checkout 64bdb87 -- generate-secrets.sh generate-secrets.bat`. Confirm before handover. | — | ⚠️ Verify |
| **D8** | Local development setup guide | `LOCAL_SETUP.md` | *incl. in item 4* | ✅ |
| **D9** | Automated backend test suite — 6 modules | `cd server && npm test` | *see B11* | ✅ |
| **D10** | Database seed script for a working baseline dataset | `cd server && npm run db:seed` | *incl. in item 2* | ✅ |
| **D11** | Type-checking and linting configuration | `cd client && npm run lint && npx tsc -b`; `cd server && npx tsc --noEmit` | *incl. in item 1* | ✅ |
| **—** | Requirements analysis, system design, architecture | `requirements.md`, `docs/system/SYSTEM_DOCUMENTATION_v1.0.1.md` | ₱1,800.00 *(item 1)* | ✅ |
| **—** | UI design system and shared component library | `client/src/components/ui/`, `docs/design-system-v1.2.0.md` | ₱1,300.00 *(item 3)* | ✅ |

**Part A subtotal: ₱5,800.00**

---

## Part B — Feature deliverables · ₱24,200.00 allocated

Every feature below is live in the deployed system. "Verify by" describes the user action that demonstrates it.

Each group header carries its allocated amount. **No amount is assigned to individual features** — dividing ₱30,000 across ~90 features would imply precision that does not exist. Work-item level is the finest honest granularity.

### B1 — Authentication and access control · **₱4,000.00** *(item 5)*

Largest single line: built in Phase 1, then rebuilt on Supabase Auth in Phase 3.

| # | Feature | Verify by |
|---|---|---|
| F1.1 | Google OAuth sign-in restricted to `@cnu.edu.ph` accounts | Attempt sign-in with a non-CNU Google account — provisioning is refused |
| F1.2 | Password sign-in for external reviewers/partners | Admin generates an access link; external user sets a password and signs in |
| F1.3 | Two-layer identity — a valid session alone authorises nothing | A signed-in identity without a provisioned account reaches no protected resource |
| F1.4 | Three-role RBAC (Admin / Reviewer / Reviewee) | Sign in as each role; confirm navigation and permissions differ |
| F1.5 | Immediate revocation — role and status read from the database per request | Disable an account while it is signed in; its next request is refused |
| F1.6 | Profile completion with role-specific field validation | Complete profile as each role; confirm required fields differ |
| F1.7 | Admin-generated access links for account recovery | User Management → generate access link |
| F1.8 | Guided onboarding flow with per-user progress tracking | Sign in as a new user |
| F1.9 | Per-page guided tours with completion tracking | Visit a page with a tour on first use |

### B2 — Exam authoring · **₱3,200.00** *(item 6)*

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

### B3 — Exam taking and integrity · **₱3,800.00** *(item 7)*

Weighted above its code volume: this is the highest-risk path in the system — a fault here loses student examination data.

| # | Feature | Verify by |
|---|---|---|
| F3.1 | Live countdown synced to a server-calculated end time | Start an exam; reload — the deadline holds, proving it is not client-trusted |
| F3.2 | Autosave every 15 seconds | Answer a question, wait, close the browser, resume — the answer persists |
| F3.3 | Resume an in-progress attempt | Reopen an interrupted attempt |
| F3.4 | Tab-switch / focus-loss detection | Enable single-tab enforcement; switch tabs during an exam |
| F3.5 | Configurable tab-switch grace period | Adjust grace seconds in Settings; confirm the threshold changes |
| F3.6 | Automatic submission on deadline or time expiry | Let a timer run out |
| F3.7 | Per-question elapsed-time tracking | Submit an attempt; confirm per-question times are recorded |
| F3.8 | Attempt state tracking across disconnection | Disconnect mid-exam and return |

### B4 — Results, analytics, and dashboards · **₱2,700.00** *(item 8)*

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

### B5 — Study Hub · **₱2,400.00** *(item 9)*

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

### B6 — Administration · **₱2,200.00** *(item 10)*

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

### B7 — Reporting and export · **₱1,600.00** *(item 11)*

| # | Feature | Verify by |
|---|---|---|
| F7.1 | Excel export of student scores and submissions | Reports → export to Excel; open the file |
| F7.2 | Export filters — campus, program, date range | Apply each filter before exporting |
| F7.3 | PDF report generation for results and performance | Generate a PDF report |
| F7.4 | Exam-performance report with dedicated export endpoint | Reports → exam performance |

### B8 — Notifications and communication · **₱1,500.00** *(item 12)*

| # | Feature | Verify by |
|---|---|---|
| F8.1 | Real-time in-app notifications over Server-Sent Events | Trigger a notifiable action in one browser; watch it arrive in another without refresh |
| F8.2 | Unread count | Notification bell |
| F8.3 | Mark read / mark all read | Notifications page |
| F8.4 | Calendar combining exams, conferences, and events | Calendar |
| F8.5 | Video-conference session scheduling with recording links | Conferences → create a session |

### B9 — Public-facing pages · **₱700.00** *(item 13)*

| # | Feature | Verify by |
|---|---|---|
| F9.1 | Landing page | Visit the site while signed out |
| F9.2 | About, Contact, FAQ | Navigate from the landing page |
| F9.3 | Terms of Service | `/terms` |
| F9.4 | Privacy Policy | `/privacy` |

### B10 — Profile and platform · **₱500.00** *(item 14)*

| # | Feature | Verify by |
|---|---|---|
| F10.1 | Profile management | Profile page |
| F10.2 | Profile picture upload with in-browser cropping | Upload and crop an avatar |
| F10.3 | Google default avatar handling | Sign in with Google; confirm the avatar renders |
| F10.4 | Responsive layout across desktop and mobile | Open on a phone and a desktop |

### B11 — Security controls and automated tests · **₱1,600.00** *(item 15)*

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

**Part B subtotal: ₱24,200.00**

---

## Part C — Documentation deliverables · included at ₱0

| # | Deliverable | Location | Status |
|---|---|---|---|
| **D12** | System documentation — architecture, data model, API surface, security controls, standards-readiness | [../system/SYSTEM_DOCUMENTATION_v1.0.1.md](../system/SYSTEM_DOCUMENTATION_v1.0.1.md) | ✅ |
| **D13** | Project summary — feature inventory and known limitations | [../../PROJECT_SUMMARY_v2.0.1.md](../../PROJECT_SUMMARY_v2.0.1.md) | ✅ |
| **D14** | Administrator user manual | [../manuals/USER_MANUAL_ADMIN_v1.0.1.md](../manuals/USER_MANUAL_ADMIN_v1.0.1.md) | ✅ |
| **D15** | Reviewer user manual | [../manuals/USER_MANUAL_REVIEWER_v1.0.1.md](../manuals/USER_MANUAL_REVIEWER_v1.0.1.md) | ✅ |
| **D16** | Student user manual | [../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | ✅ |
| **D17** | Proposal and statement of work | [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md) | ✅ |
| **D18** | This deliverables register | This document | ✅ |
| **D19** | Maintenance and support terms | [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) | ✅ |
| **D20** | Administrator orientation plan | [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md) | ✅ |
| **D21** | Documentation index and generation classification | [../DOCUMENTATION_INDEX_v1.1.0.md](../DOCUMENTATION_INDEX_v1.1.0.md) | ✅ |
| **D22** | Deployment and local setup guides | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, `LOCAL_SETUP.md` | ✅ |
| **D23** | Requirements specification (as built against) | `requirements.md` | ✅ |
| **D24** | Design system documentation | [../design-system-v1.2.0.md](../design-system-v1.2.0.md) | ✅ |
| **D25** | Security audit record | `SECURITY_AUDIT.md` | ✅ |

---

## Part D — Service and handover deliverables · included at ₱0

### D.1 Services

| # | Deliverable | Terms | Status |
|---|---|---|---|
| **D26** | Two months of defect support from contract signing | [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) | 🔄 Begins on signing |
| **D27** | Orientation Session 1 — accounts, access, organisation structure, audit | [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md) §4 | ⬜ To schedule |
| **D28** | Orientation Session 2 — exam lifecycle, integrity, reporting, communication | [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md) §5 | ⬜ To schedule |
| **D29** | Orientation Session 3 — follow-up Q&A | [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md) §6 | ⬜ To schedule |
| **D30** | Advisory on hosting tier selection — on request, including after this contract ends | [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md) §10.2 | 🔄 Ongoing |

### D.2 Platform access handover

CNU-designated accounts added as **owners/collaborators with full proprietary rights** on every service used in deployment, so CNU holds independent administrative control of the entire stack.

**CNU supplies the account identities** — see [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md) §14, Item H. **At least two CNU accounts per service** is recommended; a single administrator is an availability risk no documentation mitigates.

| # | Service | Deliverable | Verify by | Status |
|---|---|---|---|---|
| **D31** | **GitHub** — `baphus/normalite-edge` | CNU accounts added as collaborators/owners; full repository transfer to a CNU account or organisation if preferred | CNU account can clone, push, and manage settings | ⬜ On acceptance |
| **D32** | **Supabase** | CNU accounts added as project owners/members | CNU account can open the project dashboard, view the database, and manage auth settings | ⬜ On acceptance |
| **D33** | **Render** | CNU accounts added as team members on the API service | CNU account can view logs, env vars, and trigger a deploy | ⬜ On acceptance |
| **D34** | **Vercel** | CNU accounts added as project/team members | CNU account can view deployments and trigger a build | ⬜ On acceptance |
| **D35** | **Cloudinary** | CNU accounts added to the account | CNU account can view the media library and API credentials | ⬜ On acceptance |
| **D36** | **Google Cloud** — OAuth 2.0 client | CNU accounts added as project owners/editors, **or** the OAuth client migrated into a CNU-owned Google Cloud project *(migration recommended)* | CNU account can view and edit the OAuth client and its redirect URIs | ⬜ On acceptance |
| **D37** | Environment variables and secrets — database credentials, Supabase service-role key, Cloudinary keys | Transferred via a secure channel, **never by email** | CNU confirms receipt and can start the system from them | ⬜ On acceptance |
| **D38** | Supabase Auth provider configuration and redirect URLs | Documented at handover | CNU can reproduce the configuration | ⬜ On acceptance |
| **D39** | Custom domain / DNS configuration, if in use | Registrar access or DNS record handover | CNU controls the DNS records | ⬜ If applicable |
| **D40** | Credential rotation assistance | I assist CNU in rotating all secrets and removing my access | All secrets rotated; my access removed | ⬜ Recommended |

> **D36 is the critical item.** Google sign-in for `@cnu.edu.ph` accounts depends on an OAuth 2.0 client credential held in a Google Cloud project. If that project remains under a personal account and is later deleted, suspended, or lapses, **every institutional user loses the ability to sign in simultaneously** — with no workaround available inside the application, and no amount of source-code ownership fixing it. Adding CNU accounts is sufficient; migrating the client into a CNU-owned project is safer and costs nothing.

> **D37 note.** The Supabase **service-role key bypasses all access control** and can provision or delete any identity. It is the most sensitive credential in the system and should be rotated first under D40.

---

## Part E — Hosting and infrastructure · ₱0

**Every platform runs on a free tier. There is no recurring hosting cost to CNU, and none is included in the ₱30,000.**

| Service | Role | Current tier | Cost |
|---|---|---|---|
| Supabase | PostgreSQL database + Auth | Free | ₱0 |
| Render | Backend API hosting | Free | ₱0 |
| Vercel | Frontend hosting | Free | ₱0 |
| Cloudinary | Image storage and delivery | Free | ₱0 |
| Google Cloud | OAuth client | Free | ₱0 |
| Google Workspace | `@cnu.edu.ph` identity provider | CNU-owned | ₱0 |
| | | **Total** | **₱0** |

**Future upgrades are separate costs and CNU decisions.** Options, triggers, and my advice are set out in [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md) §10.1–§10.2. In summary: the Supabase free tier provides **no automatic database backups**, and the Render free tier **cold-starts after idling**. Neither is urgent today; both are worth deciding before the next large exam cohort. I will advise whenever CNU wants to review it, including after this contract ends (D30).

---

## Part F — Cost reconciliation

| Part | Contents | Amount (₱) |
|---|---|---|
| **A** | Foundation — architecture, database, design system, deployment | 5,800.00 |
| **B** | Features — B1 through B11 | 24,200.00 |
| **C** | Documentation — 14 documents | 0.00 *(included)* |
| **D** | Support, orientation, advisory, and platform access handover | 0.00 *(included)* |
| **E** | Hosting and infrastructure | 0.00 *(all free tiers)* |
| | **TOTAL CONTRACT VALUE** | **₱30,000.00** |

### Feature-group allocation summary

| Group | Work item | Amount (₱) | % of total |
|---|---|---|---|
| Foundation (Part A) | 1–4 | 5,800.00 | 19.3% |
| B1 — Authentication and access control | 5 | 4,000.00 | 13.3% |
| B2 — Exam authoring | 6 | 3,200.00 | 10.7% |
| B3 — Exam taking and integrity | 7 | 3,800.00 | 12.7% |
| B4 — Results, analytics, dashboards | 8 | 2,700.00 | 9.0% |
| B5 — Study Hub | 9 | 2,400.00 | 8.0% |
| B6 — Administration | 10 | 2,200.00 | 7.3% |
| B7 — Reporting and export | 11 | 1,600.00 | 5.3% |
| B8 — Notifications and communication | 12 | 1,500.00 | 5.0% |
| B9 — Public-facing pages | 13 | 700.00 | 2.3% |
| B10 — Profile and platform | 14 | 500.00 | 1.7% |
| B11 — Security controls and tests | 15 | 1,600.00 | 5.3% |
| **Total** | | **30,000.00** | **100%** |

---

## Part G — Explicitly outside this register

Full rationale in [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md) §9.

| Not delivered | Note |
|---|---|
| Hosting upgrades beyond current free tiers | CNU decision, separate cost; I advise (D30) |
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

I confirm that the deliverables marked ✅ in Parts A, B, and C have been verified against the evidence stated; that the items in Part D are understood and scheduled; that hosting is ₱0 per Part E; and that the cost allocation in Part F totals ₱30,000.00.

| | Reviewer (CNU) | Service Provider |
|---|---|---|
| **Name** | ______________________________ | Joseph Sarsonas |
| **Position** | ______________________________ | Independent Software Developer |
| **Signature** | ______________________________ | ______________________________ |
| **Date** | ______________________________ | ______________________________ |

**Items requiring confirmation before handover completes:**

| # | Item | Confirmed |
|---|---|---|
| 1 | D7a — `generate-secrets.*` scripts recovered or confirmed unnecessary | ☐ |
| 2 | D31–D36 — CNU account identities supplied for all six platforms | ☐ |
| 3 | D36 — decision on migrating the Google Cloud OAuth client to a CNU-owned project | ☐ |
| 4 | D37 — secure channel agreed for secret transfer | ☐ |
| 5 | D39 — whether a custom domain is in use | ☐ |
| 6 | D40 — credential rotation scheduled | ☐ |

**Findings raised during review** *(see acceptance procedure, `PROPOSAL_AND_SOW_v1.1.0.md` §8)*:

| # | Deliverable ref. | Finding | Classified as | Resolution |
|---|---|---|---|---|
| | | | Defect / New feature | |
| | | | Defect / New feature | |
| | | | Defect / New feature | |
