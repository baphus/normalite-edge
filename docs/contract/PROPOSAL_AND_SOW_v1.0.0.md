# Normalite EDGE — Project Proposal and Statement of Work

**For:** Contract of Service / Job Order engagement
**Version:** 1.0.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas — independent software developer
**Prepared for:** Cebu Normal University
**Contract value:** ₱30,000.00 (Philippine Pesos), fixed
**Engagement period:** January 2026 – August 2026

## Changelog

- v1.0.0 (2026-08-04): Initial proposal and statement of work, prepared for the Contract of Service. Supersedes `PRICING_PROPOSAL_v1.0.0.md` (2026-07-07), which quoted an unresolved range of ₱25,000–₱30,000 and did not cover the Phase 3 authentication and security work, the support period, the orientation programme, or the user manuals.

---

## 1. Parties

| | |
|---|---|
| **Client** | Cebu Normal University *(exact contracting office/department to be confirmed — see §14, Item A)* |
| **Service Provider** | Joseph Sarsonas, independent software developer |
| **Engagement type** | Contract of Service / Job Order *(to be confirmed with the CNU Accounting/BAC office — see §14, Item B)* |
| **Contract value** | ₱30,000.00, fixed and inclusive of all deliverables in §5 |
| **Period covered** | January 2026 – August 2026 |

---

## 2. Executive summary

Cebu Normal University required a review and mock-examination platform purpose-built for the Licensure Examination for Teachers (LET) — one the university owns outright, rather than renting capability from a general-purpose learning management system.

Between January and August 2026 I designed, built, deployed, and iterated **Normalite EDGE**: a production web application of approximately **44,400 lines of code**, comprising **79 REST API endpoints**, **49 application screens**, and **19 database models**, currently live and serving three distinct user roles across multiple campuses and academic programs.

This proposal formalises that work into a Contract of Service. It covers:

1. **The delivered system** — all features, source code, and deployment configuration (§4, §5.1)
2. **Two months of defect support** — I fix system bugs at no additional charge (§5.2, and `MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md`)
3. **Administrator orientation** — live training sessions for CNU admin users (§5.3, and `ADMIN_ORIENTATION_PLAN_v1.0.0.md`)
4. **User manuals** — one per role, Admin / Reviewer / Reviewee (§5.4, and `docs/manuals/`)
5. **Technical documentation** — architecture, data model, and API baseline for future maintainers (§5.5)

**Total: ₱30,000.00, fixed.** Items 2 through 5 are included at no additional charge; they are not separately billed.

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

The engagement ran in three phases. Phase boundaries reflect actual delivery, and each is verifiable against the repository's commit history.

### Phase 1 — Core platform (January – March 2026)

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

The most substantial engineering phase after the initial build, and the reason this proposal supersedes the July pricing document:

- **Authentication rebuilt on Supabase Auth.** The API server no longer issues tokens; it verifies them. Sign-in moved to Google OAuth restricted to `@cnu.edu.ph` accounts, with a two-layer identity model in which a valid session alone grants nothing and a provisioned application account is the authorization gate. Role and status are re-read from the database on every request, so a disable or role change takes effect on the next request rather than on token expiry.
- **This removed the platform's largest operational dependency.** The previous design needed a paid transactional email provider and a verified sending domain to deliver verification and password-reset mail — a recurring cost and an unresolved blocker. Delegating identity to Google eliminated the requirement entirely: institutional users have no password here, so there is nothing to reset, and account verification is Google's job. External reviewers and partners are provisioned by an admin-generated access link, which needs no mail provider.
- **Security hardening:** `helmet` with an explicit Content Security Policy; global rate limiting; stricter rate limiting on authentication endpoints; per-identity upload limits; CSRF protection; global UUID path-parameter validation; request body size caps; correct client-IP handling behind Render's proxy. Rate limiting is keyed on user identity rather than IP, so an entire campus computer laboratory behind one shared address is not throttled as a single client.
- **Automated security tests** covering headers, rate-limit behaviour, and registration-session handling.
- Dynamic admin-managed subject categories; guided onboarding and per-page tours; Manage Exam view redesign; profile avatar handling with in-browser cropping; public landing, About, Contact, FAQ, Terms, and Privacy Policy pages.

**Documentary note on the engagement start date.** The Git repository's first commit is dated **25 February 2026**. Requirements analysis, system design, data modelling, and initial implementation for January and early February 2026 predate the repository's creation and are therefore not evidenced by commit history. The January start date stated in this contract reflects when work actually began. If the contracting office requires commit-based evidence for the full period, I recommend the contract period be stated as **January 2026 – August 2026 (development)** with a note that version-control records commence 25 February 2026 — this is disclosed here so it cannot become an audit finding later.

---

## 5. Deliverables

Each item is itemised with its acceptance evidence in [DELIVERABLES_REGISTER_v1.0.0.md](DELIVERABLES_REGISTER_v1.0.0.md).

### 5.1 The delivered system

| # | Deliverable | Form |
|---|---|---|
| D1 | Complete frontend application source code | Git repository — React 19 / TypeScript, ~34,000 lines, 49 screens |
| D2 | Complete backend API source code | Git repository — Express 5 / TypeScript / Prisma, ~10,400 lines, 79 endpoints |
| D3 | Database schema and full migration history | 19 models, 10 enums, 28 sequential migrations |
| D4 | Production deployment, live and operational | Vercel (frontend), Render (backend), Supabase (database), Cloudinary (images) |
| D5 | Deployment configuration and runbook | `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, secret-generation scripts |
| D6 | Local development setup guide | `LOCAL_SETUP.md` |
| D7 | Automated backend test suite | 6 test modules covering security headers, rate limiting, registration sessions, content visibility, and profile handling |
| D8 | All features listed in §4 of `PROJECT_SUMMARY_v2.0.0.md` | As deployed |

### 5.2 Two months of defect support — included

I will fix system bugs at no additional charge for **two calendar months from the date of contract signing**.

Summary of terms (full terms in [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md)):

| | |
|---|---|
| **Covered** | Defects — the system not behaving as described in the delivered documentation |
| **Not covered** | New features, scope changes, third-party platform outages, data-entry errors, hosting fees |
| **Response targets** | Critical (system down / exam data at risk): acknowledge within 1 business day, workaround or fix within 2 business days. High: 2 / 5 business days. Medium and Low: best effort within the period. |
| **Channel** | A single named CNU point of contact, in writing |
| **Cost** | ₱0 — included in the contract value |

### 5.3 Administrator orientation — included

Live orientation for CNU administrator users, so the university can operate the platform without me.

Summary (full programme in [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md)):

| | |
|---|---|
| **Sessions** | Two sessions of approximately 2 hours each, plus one follow-up Q&A session of approximately 1 hour |
| **Session 1** | Account and access administration; campus, program, and category management; audit logs |
| **Session 2** | Exam lifecycle, integrity settings, reporting and export, notifications and conferences |
| **Session 3** | Follow-up Q&A after CNU staff have used the system independently |
| **Audience** | CNU administrators and designated reviewer/instructor leads |
| **Delivery** | On-campus or online, at CNU's preference |
| **Materials** | The user manuals in §5.4, plus a live walkthrough on the running system |
| **Cost** | ₱0 — included in the contract value |

### 5.4 User manuals — included

One manual per role, written against the system as actually deployed:

| # | Deliverable | Audience |
|---|---|---|
| D9 | [USER_MANUAL_ADMIN_v1.0.0.md](../manuals/USER_MANUAL_ADMIN_v1.0.0.md) | Administrators |
| D10 | [USER_MANUAL_REVIEWER_v1.0.0.md](../manuals/USER_MANUAL_REVIEWER_v1.0.0.md) | Reviewers / instructors |
| D11 | [USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | Students |

### 5.5 Technical documentation — included

| # | Deliverable | Purpose |
|---|---|---|
| D12 | [SYSTEM_DOCUMENTATION_v1.0.0.md](../system/SYSTEM_DOCUMENTATION_v1.0.0.md) | Technical baseline for any future maintainer — architecture, data model, API surface, security controls, and a standards-readiness assessment |
| D13 | [PROJECT_SUMMARY_v2.0.0.md](../../PROJECT_SUMMARY_v2.0.0.md) | Current feature inventory and honest statement of known limitations |
| D14 | This proposal and its companion contract documents | Commercial and support terms |

---

## 6. Contract value and allocation

**Total contract value: ₱30,000.00 (Thirty Thousand Pesos), fixed.**

| Phase / Item | Scope | Amount (₱) |
|---|---|---|
| Phase 1 — Core platform | Jan–Mar 2026. Authentication and RBAC, exam builder, exam-taking engine with integrity controls, results and analytics, Study Hub, campus/program/user administration, notifications, audit logging, calendar and conferencing, database design, production deployment | 19,000.00 |
| Phase 2 — Requested enhancements | Jul 2026. Submission analytics, Excel and PDF export, campus field on submissions, submission filters, error handling | 8,000.00 |
| Phase 3 — Authentication rebuild, security hardening, interface work | Aug 2026. Supabase Auth migration, security middleware and tests, dynamic categories, onboarding tours, Manage Exam redesign, public and legal pages | 3,000.00 |
| Two months of defect support | Per §5.2 | Included — 0.00 |
| Administrator orientation (3 sessions) | Per §5.3 | Included — 0.00 |
| User manuals (3 documents) | Per §5.4 | Included — 0.00 |
| Technical documentation | Per §5.5 | Included — 0.00 |
| **Total** | | **₱30,000.00** |

**A note offered in good faith, for CNU's information rather than as a request.** At ₱30,000 for approximately 44,400 lines of production code plus a two-month support period, orientation, and a full documentation set, the effective rate is well below prevailing market rates for comparable work in the Philippines. I am content with this figure and it is what I am proposing — I record the observation only so that (a) it is understood the price reflects the nature of this engagement rather than the scope's market value, and (b) any future scope beyond this contract can reasonably be quoted at standard rates without appearing inconsistent.

---

## 7. Payment terms

| | |
|---|---|
| **Amount** | ₱30,000.00 |
| **Structure** | Single payment on acceptance, unless CNU's disbursement process requires staged release |
| **Trigger** | Signed acceptance of the deliverables in §5, per the acceptance procedure in §8 |
| **Method** | As required by the CNU disbursement process |
| **Taxes** | Withholding tax on professional fees applies as determined by CNU Accounting. I will provide my TIN and any BIR forms required. Whether the ₱30,000 is treated as gross-of-withholding or net should be confirmed in writing before signing — see §14, Item C. |

If CNU's process requires staged release, I propose:

| Milestone | Trigger | Amount (₱) |
|---|---|---|
| 1 | Contract signing and acceptance of the delivered system (§5.1) | 24,000.00 |
| 2 | Completion of administrator orientation and acceptance of manuals (§5.3, §5.4) | 6,000.00 |

Either structure is acceptable to me; single payment is simpler for both parties.

---

## 8. Acceptance procedure

1. I submit this proposal together with the deliverables register and the full documentation set.
2. CNU nominates a single reviewer to verify each deliverable in the register against its stated acceptance evidence.
3. CNU has **fifteen (15) calendar days** from submission to accept the deliverables or to raise specific written findings.
4. Any finding that identifies a **defect** — the system not behaving as documented — I correct at no charge, and the review period restarts for that item only.
5. Any finding that requests **behaviour not previously specified** is a new feature, quoted separately, and does not block acceptance.
6. Absent written findings within fifteen days, the deliverables are deemed accepted.
7. The two-month support period (§5.2) runs from the date of contract signing, independently of the acceptance review.

---

## 9. What is not included

Stated plainly to avoid later dispute:

| # | Excluded | Why, and what it would take |
|---|---|---|
| E1 | **Hosting and infrastructure fees** | Pass-through platform costs paid directly by CNU to each provider. See §10. |
| E2 | **Ongoing maintenance beyond the two-month support period** | Would require a separate retainer or per-incident arrangement. See §11. |
| E3 | **New features and scope changes** | Quoted separately. Any request that changes documented behaviour is a new feature. |
| E4 | **Transactional email delivery** | Deliberately designed out (see §4, Phase 3). Should CNU later want system-sent email — bulk announcements, digest reports — it needs a paid provider and a verified sending domain, scoped separately. |
| E5 | **Institutional policy documents** | Data retention policy, Data Privacy Impact Assessment, incident-response procedure, and access-review procedure require institutional decisions CNU must own. I can draft them for CNU's review as separately scoped work; I cannot decide them. See §13. |
| E6 | **Automated test coverage for the exam-taking engine** | Recommended as the first post-handover investment. See §11. |
| E7 | **Uptime and error monitoring/alerting** | Not currently configured. Small effort; see §11. |
| E8 | **Third-party platform outages** | Vercel, Render, Supabase, Cloudinary, and Google availability are outside my control. |
| E9 | **Data entry, content authoring, and question banking** | The system provides the tools; exam and deck content is CNU's academic work. |
| E10 | **End-user training beyond the administrator orientation in §5.3** | Student and reviewer training is covered by the manuals; additional live sessions can be arranged separately. |

---

## 10. Recurring infrastructure costs (paid by CNU, not to me)

These are **not** part of the ₱30,000. They are ongoing platform fees CNU pays directly, and they scale with usage.

| Service | Role | Notes |
|---|---|---|
| **Supabase** | PostgreSQL database + Auth | The one tier decision that matters. The free tier pauses inactive projects and offers no point-in-time recovery; the paid tier adds daily backups with a 7-day retention window. **For a system holding student examination records, the paid tier is not optional.** |
| **Render** | Backend API hosting | Free tier spins services down when idle, causing a cold-start delay of tens of seconds on the first request — unacceptable at the start of a timed exam. A paid always-on instance is required for exam periods. |
| **Vercel** | Frontend hosting | The free tier is generally adequate for this workload; verify against CNU's expected traffic. |
| **Cloudinary** | Image storage and delivery | Free tier is likely adequate for profile pictures and question images at current volumes. |
| **Google Workspace** | Identity provider for `@cnu.edu.ph` sign-in | Already owned by CNU; no incremental cost. |

**I have deliberately not stated peso figures here.** Provider list prices change, are quoted in US dollars, and are subject to exchange rate movement — a number written into a contract document in August 2026 would be wrong by the time anyone acts on it, and I will not put a figure in a contract that I cannot stand behind. **Recommendation:** before signing, CNU obtains current quotations directly from Supabase and Render for the tiers described above. I will assist in specifying the correct tier for the expected number of concurrent exam takers. This must be settled before the first large-cohort exam period, because the required tier depends on peak concurrency and is the single most likely cause of an exam-day failure.

---

## 11. Recommendations beyond this contract

Offered as professional advice, not as a sales pitch. Priority order:

| Priority | Recommendation | Why | Rough effort |
|---|---|---|---|
| 1 | **Confirm Supabase and Render paid tiers before the next large exam cohort** | This is the highest-probability cause of an exam-day incident. Database backups and always-on API hosting are prerequisites, not upgrades. | CNU procurement only |
| 2 | **Automated regression tests for the exam-taking engine** | Attempt start, autosave, resume, tab-violation handling, and auto-submit are the highest-risk paths in the system and currently have no automated coverage. A regression here means lost student exam data. | Medium |
| 3 | **Data retention policy and sub-processor register** | Required for ISO 27001 / DPTM / Philippine Data Privacy Act readiness, and materially cheaper to establish now than after several cohorts of exam records have accumulated. See §13. | CNU policy decision; I can draft |
| 4 | **Uptime and error monitoring with alerting** | Currently, faults are discovered by students rather than by CNU. | Small |
| 5 | **Documented and tested backup restore drill** | An untested backup is an assumption, not a control. | Small, joint |
| 6 | **Frontend automated tests** | Regression protection for UI changes. | Medium |

---

## 12. Intellectual property and handover

Proposed terms, for confirmation in the executed contract:

1. **Ownership.** On full payment, all intellectual property in the source code, database schema, and documentation produced under this engagement transfers to Cebu Normal University.
2. **Third-party components.** The system uses open-source dependencies under their own licences (MIT, Apache 2.0, and similar). These are not mine to transfer and remain under their respective licences. A full dependency and licence inventory can be generated from the repository on request.
3. **Retained rights.** I retain no exclusive rights over the delivered code. I request only the right to describe the project in a professional portfolio at a general level — technologies used, scope, and role — **without** disclosing source code, student data, or CNU-internal information. This is a courtesy request and CNU may decline it.
4. **Handover package.** On acceptance I will transfer: repository ownership or a full mirror to a CNU-controlled account; administrative access to the Vercel, Render, Supabase, and Cloudinary projects; all environment variables and secrets, delivered through a secure channel and not by email; and the complete documentation set.
5. **Credential rotation.** I recommend CNU rotate all secrets — JWT signing keys, database credentials, Cloudinary keys, Supabase service keys — immediately after handover, and remove my access. This is standard practice and I will assist with it. It is in CNU's interest and I raise it proactively.
6. **No lock-in.** There is no licence key, no phone-home, and no dependency on any service I control. If CNU never contacts me again after handover, the system continues to run.

---

## 13. Standards-readiness assessment

This is a project document, not a certification artefact, so a standards-readiness check applies: anything that would require **rework** to achieve ISO 9001, ISO 27001, DPTM, or SOC 2 certification is flagged now rather than discovered at audit time. A state university's IT security office will plausibly review this system, since it processes student records.

### 13.1 Already built in

| Standard | Control area | Evidence |
|---|---|---|
| ISO 27001 A.8.5 / SOC 2 CC6.1 | Secure authentication | Supabase Auth with JWKS signature verification; two-layer identity; authorization decisions read from the database on every request |
| ISO 27001 A.8.5 / SOC 2 CC6.6 | Brute-force protection | Layered rate limiting with NAT-safe keying |
| ISO 27001 A.8.9 | Secure configuration | `helmet` with explicit CSP, verified by automated test |
| ISO 27001 A.8.15 / SOC 2 CC7.2 | Logging | `AuditLog` recording actor, role, action, entity, and metadata |
| ISO 27001 A.5.15 / SOC 2 CC6.3 | Access control | Three-role RBAC; revocation effective on next request |
| ISO 27001 A.8.28 | Secure coding | Zod validation on all mutating endpoints; global UUID parameter guard; TypeScript throughout |
| ISO 9001 7.5 | Documented information | Versioned documents with changelogs — this document set |
| ISO 9001 8.5.6 / ISO 27001 A.8.32 | Change control | Complete Git history with pull-request review |

### 13.2 Requires rework — flagged now

| # | Gap | Standard(s) at risk | Owner | Effort |
|---|---|---|---|---|
| R1 | No data retention/deletion policy for student PII, attempts, or audit logs | ISO 27001 A.5.33, A.8.10; **DPTM Retention Limitation**; SOC 2 C1.2 | CNU decides; I implement | Small code |
| R2 | No documented lawful basis or consent record for processing student data | **DPTM Consent & Purpose Limitation**; Data Privacy Act 2012 | CNU | Policy |
| R3 | No Data Subject Access Request procedure or export/erase capability | **DPTM Access & Correction**; DPA 2012 §16 | CNU decides; I implement | Medium code |
| R4 | No incident-response or breach-notification procedure | ISO 27001 A.5.24–A.5.28; SOC 2 CC7.3–CC7.5; DPTM Breach Management | CNU | Policy |
| R5 | No tested backup-restore procedure | ISO 27001 A.8.13; SOC 2 A1.2 | Joint | Small |
| R6 | No periodic access review of Admin/Reviewer accounts | ISO 27001 A.5.18; SOC 2 CC6.2 | CNU | Policy — audit log already supplies the evidence |
| R7 | Exam engine lacks automated regression tests | ISO 9001 8.3.4; SOC 2 CC8.1 | Scoped separately | Medium |
| R8 | No monitoring or alerting | ISO 27001 A.8.16; SOC 2 CC7.1 | Joint | Small |
| R9 | No sub-processor / data-residency register | ISO 27001 A.5.19–A.5.22; **DPTM Transfer Limitation**; SOC 2 CC9.2 | Joint | Small |

**The most consequential flag is R9, combined with R1 and R2.** Student examination records are processed by Supabase, Render, Vercel, Cloudinary, and Google — each with its own hosting region. Under DPTM's Transfer Limitation principle and the Philippine Data Privacy Act, cross-border transfer of student personal data requires a documented basis. CNU should confirm and record each provider's hosting region and establish the lawful basis for transfer. Doing this now, while the database holds relatively few records, costs a one-page register. Doing it after several LET cohorts have accumulated exam data, under audit pressure, costs considerably more — and may constrain choices that are still open today.

None of these are defects in the delivered software. R1, R2, R4, and R6 are institutional policy artefacts that only CNU can author. I flag them because they will surface at any future audit, and because a system that quietly leaves them for later is the more common failure mode.

---

## 14. Items requiring CNU confirmation before signing

I cannot resolve these unilaterally; each needs a decision from CNU.

| Item | Question | Recommendation |
|---|---|---|
| **A** | Which CNU office or department is the contracting party — the College of Teacher Education, the review centre, the IT office, or the university proper? | Confirm with the office authorising the disbursement, since this determines the signatory. |
| **B** | Should this be structured as a **Contract of Service** or a **Job Order**? | Confirm with CNU Accounting/BAC. Contract of Service is the usual instrument for an individual contractor without business registration; the choice determines the required paperwork (TIN, signed contract or MOA, accomplishment report). |
| **C** | Is ₱30,000 gross of withholding tax, or net? | Settle in writing before signing. This changes what I actually receive and should not be discovered at payment time. |
| **D** | Who is the single named point of contact for defect reports during the support period? | One named person with a working email address. Support terms depend on this. |
| **E** | Preferred format and schedule for the administrator orientation — on-campus or online, and which dates? | Two sessions of ~2 hours plus a ~1 hour follow-up. See the orientation plan. |
| **F** | Does CNU require the deliverables in printed and signed hard copy, or is the versioned document set sufficient? | Confirm with the disbursing office; some require a physical accomplishment report. |
| **G** | Confirm the contract period wording, given that version-control history begins 25 February 2026 (see §4). | State as "January 2026 – August 2026" with the disclosure note, so the discrepancy is documented rather than discovered. |

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

1. [DELIVERABLES_REGISTER_v1.0.0.md](DELIVERABLES_REGISTER_v1.0.0.md)
2. [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md)
3. [ADMIN_ORIENTATION_PLAN_v1.0.0.md](ADMIN_ORIENTATION_PLAN_v1.0.0.md)
4. [SYSTEM_DOCUMENTATION_v1.0.0.md](../system/SYSTEM_DOCUMENTATION_v1.0.0.md)
5. [PROJECT_SUMMARY_v2.0.0.md](../../PROJECT_SUMMARY_v2.0.0.md)
6. [USER_MANUAL_ADMIN_v1.0.0.md](../manuals/USER_MANUAL_ADMIN_v1.0.0.md)
7. [USER_MANUAL_REVIEWER_v1.0.0.md](../manuals/USER_MANUAL_REVIEWER_v1.0.0.md)
8. [USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md)

---

*This proposal is not a legal instrument. It is a technical and commercial statement of work intended to be attached to, or incorporated into, whatever contract instrument CNU's accounting and legal offices require. I am not a lawyer, and CNU should have the executed contract reviewed by its own legal office.*
