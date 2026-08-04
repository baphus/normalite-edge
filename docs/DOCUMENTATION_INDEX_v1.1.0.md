# Normalite EDGE — Documentation Index and Generation Classification

**Version:** 1.1.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas
**Purpose:** Single index of the Normalite EDGE documentation set, classifying each document by (a) which standard it can be derived from, and (b) whether it can be generated automatically without human approval.

## Changelog

- **v1.1.0 (2026-08-04):** Retargeted the whole index to the current document versions following the contract revision (period start moved to the first commit, full per-feature ₱30,000 allocation, hosting recorded as ₱0, platform access handover expanded). Added the five newly superseded versions to §1.5, corrected §2.3 item 6 to reflect that there is currently no automatic database backup, and added §5 on cross-reference version pinning.
- v1.0.0 (2026-08-04): Initial index and classification.

---

## 1. The documentation set

### 1.1 Contract of Service package

| Document | Purpose |
|---|---|
| [contract/PROPOSAL_AND_SOW_v1.1.0.md](contract/PROPOSAL_AND_SOW_v1.1.0.md) | Proposal, scope of work, ₱30,000 allocation, payment terms, acceptance, exclusions, IP and handover, standards-readiness |
| [contract/DELIVERABLES_REGISTER_v1.1.0.md](contract/DELIVERABLES_REGISTER_v1.1.0.md) | Itemised deliverables (D1–D30, F1.1–F11.11) with acceptance evidence and sign-off |
| [contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) | Two-month defect warranty: defect vs. feature, severity targets, reporting, exclusions, end-of-period options |
| [contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md](contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md) | Three-session administrator orientation with attendance and competence records |

### 1.2 System documentation

| Document | Purpose |
|---|---|
| [system/SYSTEM_DOCUMENTATION_v1.0.1.md](system/SYSTEM_DOCUMENTATION_v1.0.1.md) | Technical baseline — architecture, auth model, security controls, data model, API surface, standards-readiness |
| [../PROJECT_SUMMARY_v2.0.1.md](../PROJECT_SUMMARY_v2.0.1.md) | Feature inventory and honest known-limitations statement |

### 1.3 User manuals

| Document | Audience |
|---|---|
| [manuals/USER_MANUAL_ADMIN_v1.0.1.md](manuals/USER_MANUAL_ADMIN_v1.0.1.md) | Administrators |
| [manuals/USER_MANUAL_REVIEWER_v1.0.1.md](manuals/USER_MANUAL_REVIEWER_v1.0.1.md) | Reviewers / instructors |
| [manuals/USER_MANUAL_REVIEWEE_v1.0.0.md](manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | Students |

### 1.4 Pre-existing operational documentation (retained)

| Document | Purpose |
|---|---|
| [../DEPLOYMENT.md](../DEPLOYMENT.md), [../DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) | Deployment procedure and pre-flight checks |
| [../LOCAL_SETUP.md](../LOCAL_SETUP.md) | Local development environment |
| [../requirements.md](../requirements.md) | Original requirements specification |
| [../SECURITY_AUDIT.md](../SECURITY_AUDIT.md) | Security audit record |
| [design-system-v1.2.0.md](design-system-v1.2.0.md) | Design system |
| [../README.md](../README.md) | Repository entry point |

### 1.5 Superseded — do not distribute

| Document | Superseded by | Why |
|---|---|---|
| `PROJECT_SUMMARY_v1.1.1.md` | [PROJECT_SUMMARY_v2.0.1.md](../PROJECT_SUMMARY_v2.0.1.md) | Describes the pre-Supabase auth model; its "Known Limitations" and security-gap sections are no longer accurate |
| `PRICING_PROPOSAL_v1.0.0.md` | [contract/PROPOSAL_AND_SOW_v1.1.0.md](contract/PROPOSAL_AND_SOW_v1.1.0.md) | Quoted an unresolved ₱25,000–₱30,000 range; omits Phase 3, support, orientation, and manuals |
| `GETTING_STARTED_GUIDE_v1.0.0.md` | The three user manuals | Describes a `PENDING`-status manual-approval registration flow that no longer exists |
| `PROPOSAL_AND_SOW_v1.0.0.md` | `PROPOSAL_AND_SOW_v1.1.0.md` | Period started January (unevidenced); coarse phase pricing; hosting costs not yet ₱0; handover list omitted Vercel and the Google Cloud OAuth client |
| `DELIVERABLES_REGISTER_v1.0.0.md` | `DELIVERABLES_REGISTER_v1.1.0.md` | No cost allocation; handover list incomplete |
| `MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md` | `MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md` | Stale cross-references; hosting stated as a CNU-paid cost rather than ₱0 |
| `ADMIN_ORIENTATION_PLAN_v1.0.0.md` | `ADMIN_ORIENTATION_PLAN_v1.0.1.md` | Stale cross-references; no hosting/backup segment |
| `SYSTEM_DOCUMENTATION_v1.0.0.md` | `SYSTEM_DOCUMENTATION_v1.0.1.md` | Stated a 7-day Pro-tier backup window that does not apply on the free tier |
| `USER_MANUAL_ADMIN_v1.0.0.md` | `USER_MANUAL_ADMIN_v1.0.1.md` | Stale cross-references; hosting-tier guidance predated the free-tier position |
| `USER_MANUAL_REVIEWER_v1.0.0.md` | `USER_MANUAL_REVIEWER_v1.0.1.md` | Stale cross-references |
| `PROJECT_SUMMARY_v2.0.0.md` | `PROJECT_SUMMARY_v2.0.1.md` | Stated Supabase Pro-tier backups, which do not apply on the free tier; malformed table row in §7 |

**Retained in the repository as historical record.** They are versioned artefacts and deleting them would break the audit trail — but they must not be sent to CNU as current documentation.

---

## 2. Documents derivable from standards

Per the documentation-generation requirement, this identifies which documents can be produced by **referring to a published standard's control set** rather than invented from scratch. In each case the standard supplies the required structure and content; only the organisation-specific values need filling in.

### 2.1 Standards referenced

| Standard | Full name | Relevance here |
|---|---|---|
| **ISO 9001:2015** | Quality management systems | Documented information (7.5), competence (7.2), design verification (8.3.4), post-delivery activities (8.5.5), change control (8.5.6), nonconformity and corrective action (10.2) |
| **ISO/IEC 27001:2022** | Information security management systems | Annex A controls — organisational (A.5), people (A.6), technological (A.8) |
| **SOC 2 (AICPA TSC 2017)** | Trust Services Criteria | Security (CC1–CC9), Availability (A1), Confidentiality (C1) |
| **DPTM** | Data Protection Trustmark (Singapore IMDA) | Governance & Transparency, Management of Personal Data, Care of Personal Data, Individuals' Rights |
| **Philippine Data Privacy Act 2012 (RA 10173)** | — | Applicable law: student PII, NPC breach notification, data subject rights |

*Note on DPTM: it is a Singapore certification. It is included because it is on the organisation's standards list, and its principle structure maps cleanly onto RA 10173 obligations, which are the ones that legally bind CNU. Where the two differ, RA 10173 governs.*

### 2.2 Documents already written against these standards

| Document | Standard clauses applied |
|---|---|
| All documents in this set | ISO 9001 7.5 — versioned, dated, changelogged, with defined authorship |
| [system/SYSTEM_DOCUMENTATION_v1.0.1.md](system/SYSTEM_DOCUMENTATION_v1.0.1.md) §11 | ISO 27001 A.5.15, A.5.18, A.5.19–A.5.22, A.5.33, A.8.5, A.8.9, A.8.10, A.8.13, A.8.15, A.8.16, A.8.24, A.8.28; SOC 2 CC6, CC7, CC8, CC9, A1, C1; DPTM all principles |
| [contract/PROPOSAL_AND_SOW_v1.1.0.md](contract/PROPOSAL_AND_SOW_v1.1.0.md) §13 | Same, plus ISO 9001 8.3.4, 8.5.6 |
| [contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) §9 | ISO 9001 8.2.3, 8.5.5, 9.1.2, 10.2; ISO 27001 A.5.24–A.5.30, A.8.32; SOC 2 CC7.3–CC7.5, CC8.1 |
| [contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md](contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md) §10 | ISO 9001 7.1.6, 7.2; ISO 27001 A.5.3, A.5.18, A.6.3; SOC 2 CC1.4; DPTM Governance |

### 2.3 Outstanding documents, and the standard that supplies each template

These are the gaps flagged across the set. Each can be drafted **by following the named standard's control requirements** — the standard dictates the content; CNU supplies the decisions.

| # | Document | Standard supplying the template | CNU must decide | Can I draft it? |
|---|---|---|---|---|
| 1 | **Data Retention & Deletion Policy** | ISO 27001 A.5.33 + A.8.10; DPTM Retention Limitation; RA 10173 §11(e) | Retention period per data class (attempts, answers, audit logs, PII of graduated students) | Yes — structure from standard, CNU sets periods |
| 2 | **Privacy Notice / Record of Processing** | DPTM Notification & Purpose Limitation; RA 10173 §16(a) | Purposes of processing, lawful basis | Yes — the existing Privacy Policy page is the natural home |
| 3 | **Sub-processor & Data Residency Register** | ISO 27001 A.5.19–A.5.22; DPTM Transfer Limitation; SOC 2 CC9.2 | Nothing — this is factual. Hosting regions must be confirmed with each provider. | **Yes, almost entirely mechanical** |
| 4 | **Incident Response & Breach Notification Procedure** | ISO 27001 A.5.24–A.5.28; SOC 2 CC7.3–CC7.5; DPTM Breach Management; RA 10173 §20(f) — 72-hour NPC notification | Named incident owner, escalation path, NPC notification responsibility | Yes — structure from standard, CNU names roles |
| 5 | **Access Control Policy & Access Review Procedure** | ISO 27001 A.5.15, A.5.18; SOC 2 CC6.2–CC6.3 | Review frequency, approver, segregation-of-duties rule for Admin accounts | Yes |
| 6 | **Backup & Business Continuity Procedure** | ISO 27001 A.8.13; SOC 2 A1.2 | Recovery objectives (RPO/RTO), **and first whether to move off the Supabase free tier — which takes no automatic backups at all** | Procedure yes; but there is currently nothing to restore from, so the tier decision comes first |
| 7 | **Change Management Procedure** | ISO 9001 8.5.6; ISO 27001 A.8.32; SOC 2 CC8.1 | Nothing substantive — ~90% satisfied by existing GitHub PR practice; needs writing down | **Yes, largely mechanical** |
| 8 | **Defect / Incident Register** | ISO 9001 10.2; ISO 27001 A.5.24; SOC 2 CC7.3 | Nothing — template only | **Yes, mechanical** |
| 9 | **Data Subject Access Request (DSAR) Procedure** | DPTM Access & Correction; RA 10173 §16 | Response timeline, responsible officer | Yes |
| 10 | **Data Privacy Impact Assessment (DPIA)** | ISO 27001 A.5.34; RA 10173 / NPC guidance | Risk appetite and mitigation acceptance | Draft only — **CNU must formally accept the residual risk**; I cannot |

**None of items 1–10 are in the current contract scope** (see [contract/PROPOSAL_AND_SOW_v1.1.0.md](contract/PROPOSAL_AND_SOW_v1.1.0.md) §9, E5). They are listed here so the gap is visible and costed rather than discovered at audit time.

**Priority order if CNU commissions them: 3, 4, 1, 2, 5.** Item 3 is nearly free and unblocks items 1, 2, and 10. Item 4 is the one whose absence is most expensive at the moment it is needed.

---

## 3. Generation classification

Per the documentation-generation requirement, every document is classified by whether it can be produced **automatically, without human approval**.

### 3.1 Tier A — Fully automatic, no human approval required

These are mechanical restatements of the repository. They contain no judgment, so a wrong output is a wrong input, and regeneration is always safe.

| Document / artefact | Generated from | Regenerate when |
|---|---|---|
| API endpoint inventory (79 endpoints) | `server/src/routes/v1/*.routes.ts` | Any route changes |
| Database schema / ER reference (19 models, 10 enums) | `server/prisma/schema.prisma` | Any migration |
| Migration history (28 migrations) | `server/prisma/migrations/` | Any migration |
| Environment variable reference | `server/.env.example`, `client/.env.example` | Any config change |
| Dependency & licence inventory (SBOM) | `package.json` × 2, lockfiles | Any dependency change |
| Role-based navigation matrix | `client/src/components/layout/Sidebar.tsx` | Any navigation change |
| Codebase scale metrics | Repository | Any commit |
| Test inventory | `server/src/__tests__/` | Any test change |
| Security control inventory | `server/src/app.ts`, `server/src/middleware/` | Any middleware change |
| Page/screen inventory (49 modules) | `client/src/pages/` | Any page added or removed |
| **Sub-processor register** (§2.3, item 3) | Deployment config + provider confirmation | Any provider or tier change |
| **Defect register template** (§2.3, item 8) | Standard template | Once |

### 3.2 Tier B — Automatic draft, human review required before release

Generated from code, but containing interpretation or making commitments. Safe to draft automatically; **must not be released unreviewed**.

| Document | Why review is required |
|---|---|
| [system/SYSTEM_DOCUMENTATION_v1.0.1.md](system/SYSTEM_DOCUMENTATION_v1.0.1.md) | Its standards-readiness assessment (§11) is a professional judgment, not a code fact |
| [../PROJECT_SUMMARY_v2.0.1.md](../PROJECT_SUMMARY_v2.0.1.md) | The known-limitations section requires judgment about what constitutes a limitation versus a design decision |
| The three user manuals | Written from the code, but the guidance and troubleshooting reflect experience the code does not contain |
| Change Management Procedure (§2.3, item 7) | Describes how people should behave, not only what the tooling does |

### 3.3 Tier C — Human authorship required; cannot be auto-generated

These require institutional decisions, legal exposure, or commercial judgment. **No amount of code analysis can produce them**, and generating them automatically would produce something that looks authoritative and is not.

| Document | Why it cannot be automated |
|---|---|
| [contract/PROPOSAL_AND_SOW_v1.1.0.md](contract/PROPOSAL_AND_SOW_v1.1.0.md) | Commercial terms, pricing, payment, IP transfer |
| [contract/DELIVERABLES_REGISTER_v1.1.0.md](contract/DELIVERABLES_REGISTER_v1.1.0.md) | The register is largely derivable; the **acceptance criteria and sign-off** are contractual commitments |
| [contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) | Service commitments and defect/feature boundary |
| [contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md](contract/ADMIN_ORIENTATION_PLAN_v1.0.1.md) | Pedagogical judgment about what people need to learn and in what order |
| Data Retention Policy (§2.3, item 1) | Institutional decision on retention periods |
| Privacy Notice (§2.3, item 2) | Legal statement of lawful basis |
| Incident Response Procedure (§2.3, item 4) | Names accountable people; carries a statutory notification obligation |
| Access Control Policy (§2.3, item 5) | Institutional policy on who may hold which access |
| Backup & Continuity Procedure (§2.3, item 6) | Requires CNU's recovery objectives and tier decisions |
| DSAR Procedure (§2.3, item 9) | Legal obligation with a defined response timeline |
| DPIA (§2.3, item 10) | **Requires formal acceptance of residual risk by CNU** — a decision only CNU can make |

### 3.4 Summary

| Tier | Count | Human approval |
|---|---|---|
| **A** — fully automatic | 12 artefacts | Not required |
| **B** — automatic draft, review before release | 4 documents | Required before release |
| **C** — human authorship | 11 documents | Required throughout |

**The practical takeaway:** the technical reference layer of this documentation set can be kept permanently current with no human effort. The commercial, policy, and legal layer cannot be automated at all, and the four Tier B documents are the ones where an unreviewed automatic regeneration would do real damage — they read as authoritative precisely where they are exercising judgment.

---

## 4. Version control convention

All documents in this set follow semantic versioning in the filename, with an in-file changelog:

| Increment | When | Example |
|---|---|---|
| **PATCH** | Typos, clarifications, small corrections | `v1.0.0` → `v1.0.1` |
| **MINOR** | New sections, significant additions | `v1.0.1` → `v1.1.0` |
| **MAJOR** | Full rewrite or structural overhaul | `v1.1.0` → `v2.0.0` |

**A new versioned file is created for each revision; the previous version is never overwritten.** `PROJECT_SUMMARY_v2.0.1.md` is the worked example — the authentication rebuild invalidated so much of v1.1.1 that a MAJOR increment was the only honest classification, and v1.1.1 remains in the repository as the historical record of what was true in July 2026.

---

## 5. Cross-reference version pinning — a note for future revisions

Documents in this set link to each other by **version-pinned filename** (`PROPOSAL_AND_SOW_v1.1.0.md`, not `PROPOSAL_AND_SOW.md`). Combined with the rule that every edit creates a new versioned file, this has a consequence worth knowing before the next revision:

**Revising one document forces a version bump in every document that links to it**, purely to retarget the link. In this revision, changing the proposal required bumping four other documents — three of which had no substantive change at all beyond their cross-references.

That churn is harmless but it obscures signal: a reader scanning version numbers cannot tell which bumps carried real change and which were link maintenance. Two mitigations, either acceptable:

| Option | Effect |
|---|---|
| **Treat this index as the authoritative version map** *(recommended)* | Body text refers to documents by title; only this index carries version-pinned links. A revision then bumps the changed document plus this index — two files, not six. |
| **Keep pinning everywhere** | Maximum precision at every reference, at the cost of cascade bumps. Acceptable if revisions are rare. |

Whichever is chosen, the **changelog of each document states whether a bump was substantive or a link retarget** — see the v1.0.1 entries in the support terms and orientation plan, which say so explicitly. That is the practical safeguard, and it is already in place.
