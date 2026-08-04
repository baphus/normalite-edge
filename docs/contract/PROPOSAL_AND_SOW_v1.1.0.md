# Normalite EDGE — Project Proposal and Statement of Work

**For:** Contract of Service / Job Order engagement
**Version:** 1.1.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas — independent software developer
**Prepared for:** Cebu Normal University
**Contract value:** ₱30,000.00 (Philippine Pesos), fixed
**Engagement period:** 25 February 2026 – August 2026

## Changelog

- **v1.1.0 (2026-08-04):** Significant additions and revisions following client direction.
  - **Engagement period now starts at the first commit (25 February 2026)** rather than January 2026. This removes the evidence gap flagged in v1.0.0 §4 — every day of the stated contract period is now backed by version-control history. The January–February pre-repository work (requirements analysis and initial design) is retained in the narrative as context but is no longer claimed as billable period.
  - **§6 replaced with a full per-feature cost allocation.** The coarse three-phase split in v1.0.0 (₱19,000 / ₱8,000 / ₱3,000) inherited its figures from the superseded July pricing proposal and materially under-weighted Phase 3. The new breakdown allocates all ₱30,000 across 15 work items traceable to the feature IDs in the deliverables register, and reconciles to a phase view. Phase totals therefore change to ₱21,700 / ₱2,500 / ₱5,800.
  - **§10 hosting costs set to ₱0.** All four platforms currently run on free tiers. Upgrade options are retained for future reference as separate costs, to be decided by CNU with my advice.
  - **§12 expanded** with the platform access handover method — CNU accounts added as owners/collaborators on every deployment service. Two services absent from the original handover list are added: **Vercel** and the **Google Cloud OAuth client**.
- v1.0.0 (2026-08-04): Initial proposal and statement of work. Superseded `PRICING_PROPOSAL_v1.0.0.md`.

---

## 1. Parties

| | |
|---|---|
| **Client** | Cebu Normal University *(exact contracting office/department to be confirmed — see §14, Item A)* |
| **Service Provider** | Joseph Sarsonas, independent software developer |
| **Engagement type** | Contract of Service / Job Order *(to be confirmed with the CNU Accounting/BAC office — see §14, Item B)* |
| **Contract value** | ₱30,000.00, fixed and inclusive of all deliverables in §5 |
| **Period covered** | 25 February 2026 – August 2026 |

---

## 2. Executive summary

Cebu Normal University required a review and mock-examination platform purpose-built for the Licensure Examination for Teachers (LET) — one the university owns outright, rather than renting capability from a general-purpose learning management system.

I designed, built, deployed, and iterated **Normalite EDGE**: a production web application of approximately **44,400 lines of code**, comprising **79 REST API endpoints**, **49 application screens**, and **19 database models**, currently live and serving three distinct user roles across multiple campuses and academic programs.

This proposal formalises that work into a Contract of Service. It covers:

1. **The delivered system** — all features, source code, and deployment configuration (§4, §5.1)
2. **Two months of defect support** — I fix system bugs at no additional charge (§5.2)
3. **Administrator orientation** — live training sessions for CNU admin users (§5.3)
4. **User manuals** — one per role, Admin / Reviewer / Reviewee (§5.4)
5. **Technical documentation** — architecture, data model, and API baseline for future maintainers (§5.5)
6. **Full platform access handover** — CNU accounts added as owners on every deployment service (§12)

**Total: ₱30,000.00, fixed.** Items 2 through 6 are included at no additional charge. **Hosting costs are ₱0** — every platform runs on a free tier (§10).

---

## 3. Background and rationale

Before Normalite EDGE, LET review at CNU depended on generic platforms not designed for the university's workflow. That created three concrete problems:

| Problem | How Normalite EDGE resolves it |
|---|---|
| **No data sovereignty.** Student records and performance data sat on third-party platforms under third-party terms. | CNU owns the source code, the database, and the deployment accounts. Student data resides in infrastructure CNU controls and can migrate at will. |
| **No exam integrity controls.** Generic quiz tools could not enforce timed multi-section exams, detect tab-switching, or survive a dropped connection mid-exam. | Purpose-built exam engine: server-calculated deadlines, 15-second autosave, resume-in-progress, tab-switch detection with configurable grace, automatic submission on expiry. |
| **No workflow fit.** Content could not be scoped to the university's campus-and-program structure, and role permissions did not match the review-centre hierarchy. | Content scoped by program track across multiple campuses; three-role RBAC (Admin / Reviewer / Reviewee) matching the actual review-centre structure. |

The system is not a general-purpose LMS and is deliberately not becoming one. Every feature earns its place against the student's core loop: **study → practice exam → review results → study again.**

---

## 4. Work performed

The engagement ran in three phases, each verifiable against the repository's commit history.

**On the contract period.** The repository's first commit is dated **25 February 2026**, and the contract period starts there. Requirements analysis and initial system design took place in the weeks before that, but because they predate the repository they are not evidenced by commit history — so they are **not claimed as part of the billable period**. Every day of the stated period is backed by verifiable version-control records. This is the deliberately conservative reading, and it means the period cannot become an audit finding.

Commit distribution across the period: February 3 · March 33 · July 15 · August 102 (153 commits total).

### Phase 1 — Core platform (February – March 2026)

Design and build of the complete platform from a blank repository:

- Authentication and three-role access control
- Exam builder: multi-section exams, per-section time limits, question authoring with images and rationalised answers, point weighting, scheduling, attempt limits, cooldowns, and the Draft/Live/Archived/Closed lifecycle
- Exam-taking engine: countdown timer, 15-second autosave, resume, tab-switch detection, automatic submission, per-question time tracking
- Results and analytics, with role-specific dashboards
- Study Hub: flashcard decks with view / flashcard / quiz modes and session resume
- Administration: user, campus, and program/track management; system-wide exam policy
- In-app notifications, calendar, video-conference scheduling
- Audit logging
- Database schema and migrations; production deployment to Vercel, Render, and Supabase

### Phase 2 — Requested enhancements (July 2026)

Delivered in response to CNU feedback after the platform went live:

- Detailed exam submission statistics and per-question performance analytics
- Excel export of student scores and submissions, filterable by campus, program, and date range
- PDF report generation for results and performance summaries
- Campus field added to submissions, with student submission filters in the Manage Exam view
- Improved error handling throughout

### Phase 3 — Authentication rebuild, security hardening, and interface work (August 2026)

The most substantial engineering phase after the initial build:

- **Authentication rebuilt on Supabase Auth.** The API server no longer issues tokens; it verifies them. Sign-in moved to Google OAuth restricted to `@cnu.edu.ph` accounts, with a two-layer identity model in which a valid session alone grants nothing and a provisioned application account is the authorization gate. Role and status are re-read from the database on every request, so a disable or role change takes effect on the next request rather than on token expiry.
- **This removed the platform's largest operational dependency.** The previous design needed a paid transactional email provider and a verified sending domain to deliver verification and password-reset mail — a recurring cost and an unresolved blocker. Delegating identity to Google eliminated the requirement entirely: institutional users have no password here, so there is nothing to reset, and account verification is Google's job. External reviewers and partners are provisioned by an admin-generated access link, which needs no mail provider.
- **Security hardening:** `helmet` with an explicit Content Security Policy; global rate limiting; stricter rate limiting on authentication endpoints; per-identity upload limits; CSRF protection; global UUID path-parameter validation; request body size caps; correct client-IP handling behind Render's proxy. Rate limiting is keyed on user identity rather than IP, so an entire campus computer laboratory behind one shared address is not throttled as a single client.
- **Automated security tests** covering headers, rate-limit behaviour, and registration-session handling.
- Dynamic admin-managed subject categories; guided onboarding and per-page tours; Manage Exam view redesign; profile avatar handling with in-browser cropping; public landing, About, Contact, FAQ, Terms, and Privacy Policy pages.

---

## 5. Deliverables

Each item is itemised with its acceptance evidence in [DELIVERABLES_REGISTER_v1.1.0.md](DELIVERABLES_REGISTER_v1.1.0.md).

### 5.1 The delivered system

| # | Deliverable | Form |
|---|---|---|
| D1 | Complete frontend application source code | Git repository — React 19 / TypeScript, ~34,000 lines, 49 screens |
| D2 | Complete backend API source code | Git repository — Express 5 / TypeScript / Prisma, ~10,400 lines, 79 endpoints |
| D3 | Database schema and full migration history | 19 models, 10 enums, 28 sequential migrations |
| D4 | Production deployment, live and operational | Vercel (frontend), Render (backend), Supabase (database + auth), Cloudinary (images) |
| D5 | Deployment configuration and runbook | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md` |
| D6 | Local development setup guide | `LOCAL_SETUP.md` |
| D7 | Automated backend test suite | 6 test modules covering security headers, rate limiting, registration sessions, content visibility, and profile handling |
| D8 | All features listed in §4 of `PROJECT_SUMMARY_v2.0.1.md` | As deployed |

### 5.2 Two months of defect support — included

I will fix system bugs at no additional charge for **two calendar months from the date of contract signing**. Full terms in [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md).

| | |
|---|---|
| **Covered** | Defects — the system not behaving as described in the delivered documentation |
| **Not covered** | New features, scope changes, third-party platform outages, data-entry errors, hosting fees |
| **Response targets** | Critical (system down / exam data at risk): acknowledge 1 business day, workaround or fix 2 business days. High: 2 / 5. Medium and Low: best effort within the period. |
| **Channel** | A single named CNU point of contact, in writing |
| **Cost** | ₱0 — included |

### 5.3 Administrator orientation — included

Live orientation so the university can operate the platform without me. Full programme in [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md).

| | |
|---|---|
| **Sessions** | Two of approximately 2 hours each, plus one follow-up Q&A of approximately 1 hour |
| **Session 1** | Account and access administration; campus, program, and category management; audit logs |
| **Session 2** | Exam lifecycle, integrity settings, reporting and export, notifications and conferences |
| **Session 3** | Follow-up Q&A after CNU staff have used the system independently |
| **Delivery** | On-campus or online, at CNU's preference |
| **Cost** | ₱0 — included |

### 5.4 User manuals — included

| # | Deliverable | Audience |
|---|---|---|
| D9 | [USER_MANUAL_ADMIN_v1.0.1.md](../manuals/USER_MANUAL_ADMIN_v1.0.1.md) | Administrators |
| D10 | [USER_MANUAL_REVIEWER_v1.0.1.md](../manuals/USER_MANUAL_REVIEWER_v1.0.1.md) | Reviewers / instructors |
| D11 | [USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | Students |

### 5.5 Technical documentation — included

| # | Deliverable | Purpose |
|---|---|---|
| D12 | [SYSTEM_DOCUMENTATION_v1.0.1.md](../system/SYSTEM_DOCUMENTATION_v1.0.1.md) | Technical baseline for any future maintainer |
| D13 | [PROJECT_SUMMARY_v2.0.1.md](../../PROJECT_SUMMARY_v2.0.1.md) | Current feature inventory and known limitations |
| D14 | This proposal and its companion contract documents | Commercial and support terms |

### 5.6 Platform access handover — included

CNU-designated accounts added as owners/collaborators on every service used in deployment. Full method and service list in §12.

---

## 6. Contract value and cost allocation

**Total contract value: ₱30,000.00 (Thirty Thousand Pesos), fixed.**

### 6.1 Allocation by work item

All ₱30,000 is allocated across 15 work items. Each is traceable to the feature IDs in [DELIVERABLES_REGISTER_v1.1.0.md](DELIVERABLES_REGISTER_v1.1.0.md) Part B, so every peso maps to something CNU can point at and verify.

| # | Work item | Feature IDs | Delivered in | Amount (₱) | % |
|---|---|---|---|---|---|
| | **A. Foundation** | | | | |
| 1 | Requirements analysis, system design, and application architecture | — | P1 | 1,800.00 | 6.0% |
| 2 | Database design — 19 models, 10 enums, 28 migrations | D3, D4 | P1, P3 | 1,700.00 | 5.7% |
| 3 | UI design system and shared component library | — | P1, P3 | 1,300.00 | 4.3% |
| 4 | Deployment, environment configuration, and hosting setup | D5, D6 | P1 | 1,000.00 | 3.3% |
| | *Foundation subtotal* | | | *5,800.00* | *19.3%* |
| | **B. Features** | | | | |
| 5 | Authentication, RBAC, and onboarding — incl. the Phase 3 Supabase rebuild | F1.1–F1.9 | P1, P3 | 4,000.00 | 13.3% |
| 6 | Exam authoring — sections, questions, scheduling, lifecycle, categories | F2.1–F2.12 | P1, P3 | 3,200.00 | 10.7% |
| 7 | Exam-taking engine and integrity controls | F3.1–F3.8 | P1 | 3,800.00 | 12.7% |
| 8 | Results, analytics, and role dashboards | F4.1–F4.8 | P1, P2 | 2,700.00 | 9.0% |
| 9 | Study Hub — decks, three study modes, sessions | F5.1–F5.8 | P1 | 2,400.00 | 8.0% |
| 10 | Administration — users, students, campuses, programs, policy, audit | F6.1–F6.10 | P1, P3 | 2,200.00 | 7.3% |
| 11 | Reporting and export — Excel, PDF, filters | F7.1–F7.4 | P2 | 1,600.00 | 5.3% |
| 12 | Notifications (real-time SSE), calendar, conferences | F8.1–F8.5 | P1 | 1,500.00 | 5.0% |
| 13 | Public and legal pages | F9.1–F9.4 | P3 | 700.00 | 2.3% |
| 14 | Profile management and platform polish | F10.1–F10.4 | P1, P3 | 500.00 | 1.7% |
| 15 | Security hardening and automated tests | F11.1–F11.11 | P3 | 1,600.00 | 5.3% |
| | *Features subtotal* | | | *24,200.00* | *80.7%* |
| | **TOTAL** | | | **30,000.00** | **100%** |

### 6.2 Included at no charge

| Item | Reference | Amount (₱) |
|---|---|---|
| Two months of defect support | §5.2 | 0.00 |
| Administrator orientation — 3 sessions, ~5 hours | §5.3 | 0.00 |
| User manuals — 3 documents | §5.4 | 0.00 |
| Technical documentation set | §5.5 | 0.00 |
| Platform access handover | §5.6, §12 | 0.00 |
| **Hosting and infrastructure** | §10 — all free tiers | **0.00** |

### 6.3 Reconciliation to the phase view

The same ₱30,000, grouped by delivery phase:

| Phase | Period | Amount (₱) | % |
|---|---|---|---|
| Phase 1 — Core platform | Feb–Mar 2026 | 21,700.00 | 72.3% |
| Phase 2 — Requested enhancements | Jul 2026 | 2,500.00 | 8.3% |
| Phase 3 — Auth rebuild, security, interface | Aug 2026 | 5,800.00 | 19.3% |
| **Total** | | **30,000.00** | **100%** |

Several work items span phases — authentication was built in Phase 1 and rebuilt in Phase 3; analytics began in Phase 1 and were extended in Phase 2. The phase figures above distribute each item across the phases that produced it.

> **Note on the change from the previous version.** v1.0.0 stated phase figures of ₱19,000 / ₱8,000 / ₱3,000. Those were carried over from the superseded July pricing proposal, which predated Phase 3 and therefore under-weighted it — ₱3,000 for an authentication rebuild plus a full security-hardening pass was not a defensible figure. The allocation above is derived from the work items themselves rather than inherited, which is why the phase split moves. **The total is unchanged at ₱30,000.**

### 6.4 How these figures were set

Stated plainly so the numbers can be challenged rather than merely accepted:

- The **total was fixed at ₱30,000 first**, by agreement. The allocation distributes that total; it is not a bottom-up estimate that happened to sum to it.
- Weighting reflects **relative implementation effort and risk**, judged by scope, code volume, and how much of the system each item touches. The exam-taking engine (item 7) carries a weight above its code volume because it is the highest-risk path in the system — a fault there loses student examination data.
- Authentication (item 5) is the largest single line because it was **built twice**: once in Phase 1 and rebuilt on Supabase in Phase 3.
- **No allocation is made to individual features** (F1.1, F1.2, and so on). Dividing ₱30,000 across roughly 90 individual features would imply a precision that does not exist. Work-item level is the finest honest granularity.
- Figures are round to ₱100. They sum to exactly ₱30,000.

### 6.5 A note on market rate

Offered for CNU's information, not as a request to change the figure.

At ₱30,000 for approximately 44,400 lines of production code — plus a two-month support period, an orientation programme, and a full documentation set — the effective rate is well below prevailing market rates for comparable work in the Philippines. I am content with this figure and it is what I am proposing. I record the observation only so that (a) it is understood the price reflects the nature of this engagement rather than the scope's market value, and (b) any future scope beyond this contract can reasonably be quoted at standard rates without appearing inconsistent.

---

## 7. Payment terms

| | |
|---|---|
| **Amount** | ₱30,000.00 |
| **Structure** | Single payment on acceptance, unless CNU's disbursement process requires staged release |
| **Trigger** | Signed acceptance of the deliverables in §5, per the acceptance procedure in §8 |
| **Method** | As required by the CNU disbursement process |
| **Taxes** | Withholding tax on professional fees applies as determined by CNU Accounting. I will provide my TIN and any BIR forms required. Whether the ₱30,000 is gross-of-withholding or net should be confirmed in writing before signing — see §14, Item C. |

If CNU's process requires staged release, I propose:

| Milestone | Trigger | Amount (₱) |
|---|---|---|
| 1 | Contract signing and acceptance of the delivered system (§5.1) | 24,000.00 |
| 2 | Completion of administrator orientation, acceptance of manuals, and access handover (§5.3, §5.4, §5.6) | 6,000.00 |

Either structure is acceptable to me; single payment is simpler for both parties.

---

## 8. Acceptance procedure

1. I submit this proposal together with the deliverables register and the full documentation set.
2. CNU nominates a single reviewer to verify each deliverable against its stated acceptance evidence.
3. CNU has **fifteen (15) calendar days** from submission to accept the deliverables or to raise specific written findings.
4. Any finding that identifies a **defect** — the system not behaving as documented — I correct at no charge, and the review period restarts for that item only.
5. Any finding that requests **behaviour not previously specified** is a new feature, quoted separately, and does not block acceptance.
6. Absent written findings within fifteen days, the deliverables are deemed accepted.
7. The two-month support period runs from the date of contract signing, independently of the acceptance review.

---

## 9. What is not included

| # | Excluded | Why, and what it would take |
|---|---|---|
| E1 | **Hosting upgrades beyond the current free tiers** | Current hosting is ₱0 (§10). Any upgrade is a CNU decision and a separate cost; I will advise on what to choose and when. |
| E2 | **Ongoing maintenance beyond the two-month support period** | Would require a separate retainer or per-incident arrangement. See §11. |
| E3 | **New features and scope changes** | Quoted separately. Any request that changes documented behaviour is a new feature. |
| E4 | **Transactional email delivery** | Deliberately designed out (§4, Phase 3). Should CNU later want system-sent email, it needs a paid provider and a verified sending domain, scoped separately. |
| E5 | **Institutional policy documents** | Data retention policy, Data Privacy Impact Assessment, incident-response procedure, and access-review procedure require institutional decisions CNU must own. I can draft them for CNU's review as separately scoped work; I cannot decide them. See §13. |
| E6 | **Automated test coverage for the exam-taking engine** | Recommended as the first post-handover investment. See §11. |
| E7 | **Uptime and error monitoring/alerting** | Not currently configured. Small effort; see §11. |
| E8 | **Third-party platform outages** | Vercel, Render, Supabase, Cloudinary, and Google availability are outside my control. |
| E9 | **Data entry, content authoring, and question banking** | The system provides the tools; exam and deck content is CNU's academic work. |
| E10 | **End-user training beyond the administrator orientation** | Student and reviewer training is covered by the manuals; additional live sessions can be arranged separately. |

---

## 10. Hosting and infrastructure — ₱0

**Every platform currently runs on a free tier. There is no recurring hosting cost to CNU today, and none is included in or added to this contract.**

| Service | Role | Current tier | Cost |
|---|---|---|---|
| **Supabase** | PostgreSQL database + Auth | Free | ₱0 |
| **Render** | Backend API hosting | Free | ₱0 |
| **Vercel** | Frontend hosting | Free | ₱0 |
| **Cloudinary** | Image storage and delivery — profile pictures and question images | Free | ₱0 |
| **Google Cloud** | OAuth client backing `@cnu.edu.ph` sign-in | Free | ₱0 |
| **Google Workspace** | Identity provider for `@cnu.edu.ph` accounts | Already owned by CNU | ₱0 |
| | | **Total** | **₱0** |

### 10.1 When an upgrade may become necessary — for future reference

Listed so CNU can plan rather than react. **Each is a separate cost and a CNU decision; my role is to advise, not to decide.**

| Service | What the free tier does | Trigger to consider upgrading | What upgrading provides |
|---|---|---|---|
| **Render** | Spins the service down when idle; the first request after a quiet period takes tens of seconds to wake it | An exam period where students begin at a scheduled time — the first student absorbs the cold start | An always-on instance; no cold start |
| **Supabase** | **No automatic backups.** Projects pause after prolonged inactivity. Fixed database size and connection limits. | Before the database holds examination records CNU could not afford to lose; or when concurrent exam takers approach the connection limit | Daily automatic backups with a retention window; no pausing; more compute, storage, and connections |
| **Vercel** | Generous bandwidth and build limits for this workload | Sustained traffic growth across multiple cohorts | Higher limits, team features |
| **Cloudinary** | Adequate for profile pictures and question images at current volumes | Large volumes of question images across many exams | More storage and transformation credits |

### 10.2 My advice, stated once and plainly

Two of these are worth CNU's attention before the next large exam cohort, and I would be failing in my duty not to say so:

1. **Supabase free tier has no automatic backups.** This system holds student examination records — attempts, answers, and scores that cannot be reconstructed if lost. Free-tier hosting is entirely reasonable for a pilot; it is a different proposition once a cohort's LET readiness data lives in it. The relevant question is not cost but whether CNU could tolerate losing that data.
2. **Render free tier cold-starts.** For everyday use this is a minor annoyance. At the opening minute of a scheduled timed examination, when many students connect at once, it is the single most likely cause of an exam-day incident.

Neither is urgent today and neither is my decision. **I will advise on tier selection, expected concurrency, and timing whenever CNU wants to review it** — including after this contract ends. I raise it now because the cheapest moment to plan for it is before it matters, and because a recommendation made only after data loss is worth nothing.

---

## 11. Recommendations beyond this contract

Professional advice, not a sales pitch. Priority order:

| Priority | Recommendation | Why | Rough effort |
|---|---|---|---|
| 1 | **Decide the Supabase backup position** (§10.2) | Student examination records currently have no automatic backup. This is a data-loss exposure, not a performance question. | CNU decision; I advise |
| 2 | **Automated regression tests for the exam-taking engine** | Attempt start, autosave, resume, tab-violation handling, and auto-submit are the highest-risk paths and have no automated coverage. A regression here means lost student exam data. | Medium |
| 3 | **Plan the Render tier ahead of the next large cohort** (§10.2) | Cold start at exam opening is the likeliest exam-day failure | CNU decision; I advise |
| 4 | **Data retention policy and sub-processor register** | Required for ISO 27001 / DPTM / Data Privacy Act readiness, and materially cheaper now than after several cohorts accumulate | CNU policy; I can draft |
| 5 | **Uptime and error monitoring with alerting** | Faults are currently discovered by students rather than by CNU | Small |
| 6 | **Documented and tested backup restore drill** | An untested backup is an assumption, not a control — and presently there is no automatic backup to test | Small, joint |
| 7 | **Frontend automated tests** | Regression protection for UI changes | Medium |

---

## 12. Intellectual property, access handover, and continuity

### 12.1 Ownership

1. On full payment, all intellectual property in the source code, database schema, and documentation produced under this engagement transfers to Cebu Normal University.
2. **Third-party components.** The system uses open-source dependencies under their own licences (MIT, Apache 2.0, and similar). These are not mine to transfer and remain under their respective licences. A full dependency and licence inventory can be generated from the repository on request.
3. **Retained rights.** I retain no exclusive rights over the delivered code. I request only the right to describe the project in a professional portfolio at a general level — technologies used, scope, and role — **without** disclosing source code, student data, or CNU-internal information. This is a courtesy request and CNU may decline it.
4. **No lock-in.** There is no licence key, no phone-home, and no dependency on any service I control. If CNU never contacts me again after handover, the system continues to run.

### 12.2 Platform access handover — method

CNU-designated accounts will be added as **owners/collaborators with full proprietary rights** on every service used in deployment. CNU therefore holds independent administrative control of the entire stack, not access delegated through me.

**CNU supplies the account identities to add** (see §14, Item H). I add them, verify each has working access, and then CNU may remove my access at its discretion.

| # | Service | What CNU receives | Why it matters |
|---|---|---|---|
| 1 | **GitHub** — `baphus/normalite-edge` | Collaborator/owner access, and repository transfer to a CNU-owned account or organisation if CNU prefers | The source code and its full history |
| 2 | **Supabase** | Project owner/member access | The database **and** the authentication configuration. Losing this means losing both the data and every user's ability to sign in. |
| 3 | **Render** | Team member access to the API service | Backend hosting, environment variables, deploy history |
| 4 | **Vercel** | Project/team member access | Frontend hosting and deployments |
| 5 | **Cloudinary** | Account access | Profile pictures and question images |
| 6 | **Google Cloud Console** — OAuth 2.0 client | Project owner/editor access, or migration of the OAuth client into a CNU-owned Google Cloud project | **See the warning below.** |

#### Two services worth calling out explicitly

**Vercel** was absent from the original handover list. Without it, CNU owns the backend and the database but cannot deploy or modify the frontend that students actually use.

**Google Cloud OAuth client — this is the critical one.** Google sign-in for `@cnu.edu.ph` accounts is backed by an OAuth 2.0 client credential that lives in a Google Cloud project. If that project remains under a personal account and is later deleted, suspended, or simply lapses, **every institutional user loses the ability to sign in** — simultaneously, with no workaround available from inside the application, and no amount of source-code ownership fixes it.

**My recommendation: migrate the OAuth client into a CNU-owned Google Cloud project rather than merely adding CNU accounts to mine.** Transferring access is sufficient; migrating ownership is safer, and it costs nothing. Either way this must not be left informal.

### 12.3 Also transferred

| Item | Method |
|---|---|
| Environment variables and secrets — database credentials, Supabase service-role key, Cloudinary keys | Secure channel only, **never by email** |
| Any custom domain or DNS configuration, if in use | Registrar access or DNS record handover |
| Supabase Auth provider configuration and redirect URLs | Documented at handover |
| Complete documentation set | This repository |

### 12.4 Credential rotation — recommended

I recommend CNU rotate all secrets — Supabase service-role key, database credentials, Cloudinary keys — immediately after handover, and then remove my access. This is standard practice, it is in CNU's interest rather than mine, and I raise it proactively. I will assist with it.

Note that the Supabase **service-role key bypasses all access control** and can provision or delete any identity. It is the single most sensitive credential in the system and should be rotated first.

---

## 13. Standards-readiness assessment

This is a project document, not a certification artefact, so a standards-readiness check applies: anything requiring **rework** to achieve ISO 9001, ISO 27001, DPTM, or SOC 2 certification is flagged now rather than discovered at audit time.

### 13.1 Already built in

| Standard | Control area | Evidence |
|---|---|---|
| ISO 27001 A.8.5 / SOC 2 CC6.1 | Secure authentication | Supabase Auth with JWKS verification; two-layer identity; authorization read from the database on every request |
| ISO 27001 A.8.5 / SOC 2 CC6.6 | Brute-force protection | Layered rate limiting with NAT-safe keying |
| ISO 27001 A.8.9 | Secure configuration | `helmet` with explicit CSP, verified by automated test |
| ISO 27001 A.8.15 / SOC 2 CC7.2 | Logging | `AuditLog` recording actor, role, action, entity, metadata |
| ISO 27001 A.5.15 / SOC 2 CC6.3 | Access control | Three-role RBAC; revocation effective next request |
| ISO 27001 A.8.28 | Secure coding | Zod validation on all mutating endpoints; global UUID guard; TypeScript throughout |
| ISO 9001 7.5 | Documented information | Versioned documents with changelogs |
| ISO 9001 8.5.6 / ISO 27001 A.8.32 | Change control | Complete Git history with pull-request review |
| ISO 27001 A.5.30 | ICT readiness for continuity | §12.2 gives CNU independent administrative control of the full stack |

### 13.2 Requires rework — flagged now

| # | Gap | Standard(s) at risk | Owner | Effort |
|---|---|---|---|---|
| R1 | **No automatic database backup** (Supabase free tier) | ISO 27001 A.8.13; SOC 2 A1.2; ISO 9001 8.5.4 | CNU decides tier; see §10.2 | CNU decision |
| R2 | No data retention/deletion policy for student PII, attempts, or audit logs | ISO 27001 A.5.33, A.8.10; DPTM Retention Limitation; SOC 2 C1.2 | CNU decides; I implement | Small code |
| R3 | No documented lawful basis or consent record for processing student data | DPTM Consent & Purpose Limitation; Data Privacy Act 2012 | CNU | Policy |
| R4 | No Data Subject Access Request procedure or export/erase capability | DPTM Access & Correction; DPA 2012 §16 | CNU decides; I implement | Medium code |
| R5 | No incident-response or breach-notification procedure | ISO 27001 A.5.24–A.5.28; SOC 2 CC7.3–CC7.5; DPTM Breach Management | CNU | Policy |
| R6 | No periodic access review of Admin/Reviewer accounts | ISO 27001 A.5.18; SOC 2 CC6.2 | CNU | Policy — audit log supplies the evidence |
| R7 | Exam engine lacks automated regression tests | ISO 9001 8.3.4; SOC 2 CC8.1 | Scoped separately | Medium |
| R8 | No monitoring or alerting | ISO 27001 A.8.16; SOC 2 CC7.1 | Joint | Small |
| R9 | No sub-processor / data-residency register | ISO 27001 A.5.19–A.5.22; DPTM Transfer Limitation; SOC 2 CC9.2 | Joint | Small |
| R10 | **OAuth client ownership not yet formalised** | ISO 27001 A.5.19, A.5.30; SOC 2 CC9.2 | Joint — see §12.2 | Small |

**R1 has moved to the top of this list in this revision.** With hosting on free tiers, there is no automatic backup of student examination data. Every other item here is a documentation or process gap that can be closed at leisure; this one is an availability and integrity exposure that no policy document mitigates. It remains CNU's decision, and I have set out the trade-off in §10.2.

**R9 combined with R3 remains the most consequential compliance flag.** Student examination records are processed by Supabase, Render, Vercel, Cloudinary, and Google — each with its own hosting region. Under DPTM's Transfer Limitation principle and the Philippine Data Privacy Act, cross-border transfer of student personal data requires a documented basis. Establishing this now, while the database holds relatively few records, costs a one-page register.

None of these are defects in the delivered software. R2, R3, R5, and R6 are institutional policy artefacts only CNU can author.

---

## 14. Items requiring CNU confirmation before signing

| Item | Question | Recommendation |
|---|---|---|
| **A** | Which CNU office or department is the contracting party? | Confirm with the office authorising the disbursement — it determines the signatory. |
| **B** | **Contract of Service** or **Job Order**? | Confirm with CNU Accounting/BAC. Contract of Service is the usual instrument for an individual contractor without business registration; the choice determines the required paperwork (TIN, signed contract or MOA, accomplishment report). |
| **C** | Is ₱30,000 gross of withholding tax, or net? | Settle in writing before signing. This changes what I actually receive and should not be discovered at payment time. |
| **D** | Who is the single named point of contact for defect reports? | One named person with a working email address. |
| **E** | Preferred format and dates for the administrator orientation? | Two sessions of ~2 hours plus a ~1 hour follow-up. |
| **F** | Does CNU require printed and signed hard copies? | Confirm with the disbursing office; some require a physical accomplishment report. |
| **G** | Confirm the ₱30,000 allocation in §6.1 is acceptable as the basis of the accomplishment report. | The work-item breakdown is designed to be attachable to a disbursement voucher. |
| **H** | **Which CNU account identities should be added to each platform in §12.2?** | Supply email addresses for GitHub, Supabase, Render, Vercel, Cloudinary, and Google Cloud. I recommend **at least two** CNU accounts per service — a single administrator is an availability risk no documentation mitigates. |
| **I** | **Should the Google Cloud OAuth client be migrated into a CNU-owned project?** | **Recommended — see §12.2.** It costs nothing and removes a single point of failure for all institutional sign-in. |

---

## 15. Signatures

| | Service Provider | Client |
|---|---|---|
| **Name** | Joseph Sarsonas | ______________________________ |
| **Position** | Independent Software Developer | ______________________________ |
| **Office/Dept.** | — | ______________________________ |
| **Signature** | ______________________________ | ______________________________ |
| **Date** | ______________________________ | ______________________________ |

**Attachments forming part of this proposal:**

1. [DELIVERABLES_REGISTER_v1.1.0.md](DELIVERABLES_REGISTER_v1.1.0.md)
2. [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md)
3. [ADMIN_ORIENTATION_PLAN_v1.0.1.md](ADMIN_ORIENTATION_PLAN_v1.0.1.md)
4. [SYSTEM_DOCUMENTATION_v1.0.1.md](../system/SYSTEM_DOCUMENTATION_v1.0.1.md)
5. [PROJECT_SUMMARY_v2.0.1.md](../../PROJECT_SUMMARY_v2.0.1.md)
6. [USER_MANUAL_ADMIN_v1.0.1.md](../manuals/USER_MANUAL_ADMIN_v1.0.1.md)
7. [USER_MANUAL_REVIEWER_v1.0.1.md](../manuals/USER_MANUAL_REVIEWER_v1.0.1.md)
8. [USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md)

---

*This proposal is not a legal instrument. It is a technical and commercial statement of work intended to be attached to, or incorporated into, whatever contract instrument CNU's accounting and legal offices require. I am not a lawyer, and CNU should have the executed contract reviewed by its own legal office.*
