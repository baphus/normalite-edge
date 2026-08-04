# Normalite EDGE — Maintenance and Support Terms

**Version:** 1.0.1
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas
**Prepared for:** Cebu Normal University
**Attachment to:** [PROPOSAL_AND_SOW_v1.1.0.md](PROPOSAL_AND_SOW_v1.1.0.md)
**Support period:** Two (2) calendar months from the date of contract signing
**Cost:** ₱0 — included in the ₱30,000 contract value

## Changelog

- v1.0.1 (2026-08-04): Retargeted cross-references to `PROPOSAL_AND_SOW_v1.1.0.md` and `DELIVERABLES_REGISTER_v1.1.0.md`. Corrected N3 to state that hosting is currently ₱0 on free tiers. **No change to support scope, severity targets, defect definitions, or any term.**
- v1.0.0 (2026-08-04): Initial maintenance and support terms.

---

## 1. What this covers

For **two calendar months from the date of contract signing**, I will fix system bugs in Normalite EDGE at no additional charge.

This is a **defect-correction warranty**, not an open-ended maintenance retainer. The distinction matters and §3 defines it precisely, because "is this a bug or a new feature?" is the single most common source of friction in engagements like this one. Settling it in writing now protects both parties.

| | |
|---|---|
| **Period** | 2 calendar months from contract signing |
| **Start** | Date of signing — independent of the acceptance review |
| **End** | Same calendar day, two months later. If that day does not exist in the end month, the last day of that month. |
| **Cost** | ₱0, included in the contract value |
| **Scope** | Defects, as defined in §3.1 |
| **Channel** | Written report from CNU's single named point of contact (§5) |

---

## 2. Why two months, and what it is for

Two months is chosen deliberately: it should span at least one full examination cycle. The failures worth catching are the ones that only appear under real load — many students starting a timed exam at once, a network dropping mid-attempt, an export running against a full cohort's data. Those cannot be found in testing; they surface in use.

The purpose of this period is that CNU reaches the end of it **not needing me**. Every defect I fix, I will explain in writing — what broke, why, and what changed — so that CNU's own technical staff, or a future maintainer, accumulates understanding rather than dependency.

---

## 3. Defect vs. new feature

### 3.1 A defect (covered — I fix it free)

The system does not behave as described in the delivered documentation:

- [PROJECT_SUMMARY_v2.0.1.md](../../PROJECT_SUMMARY_v2.0.1.md) §4 — the feature list
- [SYSTEM_DOCUMENTATION_v1.0.1.md](../system/SYSTEM_DOCUMENTATION_v1.0.1.md) — architecture and security controls
- The three user manuals in [docs/manuals/](../manuals/)
- [DELIVERABLES_REGISTER_v1.1.0.md](DELIVERABLES_REGISTER_v1.1.0.md) Part B — the feature register

Examples of covered defects:

| Example | Why it is a defect |
|---|---|
| An exam autosave fails, and a student loses answers | Documented behaviour is 15-second autosave |
| The countdown timer shows the wrong remaining time | Documented behaviour is a server-synced countdown |
| An Excel export omits students who should be included by the applied filter | Documented behaviour is filterable export |
| A Reviewee can see an exam restricted to a different program track | Documented behaviour is track-scoped visibility |
| A disabled account can still access protected resources | Documented behaviour is revocation on next request |
| A page throws an unhandled error and shows a blank screen | Not documented behaviour |
| Auto-submission does not fire when a section timer expires | Documented behaviour is auto-submit on expiry |
| A security control listed in Part B11 of the register is not actually active | Documented control |

### 3.2 A new feature or scope change (not covered — quoted separately)

A request for behaviour the system was never documented as having. This is **not a refusal** — it means the work is quoted separately rather than absorbed into this warranty.

| Example | Why it is not a defect |
|---|---|
| "Add essay-type questions" | Only multiple-choice was ever in scope |
| "Send exam reminders by email" | Email delivery is explicitly designed out (SOW §9, E4) |
| "Add a fourth role" | Three roles were specified |
| "Export to a different report layout" | The delivered layout works as documented |
| "Integrate with the university's student information system" | Never in scope |
| "Change the passing score calculation" | A change to specified behaviour, not a fault in it |
| "Make the dashboard show a different metric" | A change of requirement |

### 3.3 Grey areas, and how they get settled

Some reports fall genuinely between the two. My commitment: **when it is arguable, I will treat it as a defect and fix it.** I would rather absorb a borderline hour than argue about it. What I will not absorb is a request that is plainly a new capability, because doing so would make this warranty unbounded and therefore worthless as a commitment.

If CNU and I disagree on a classification, I will state my reasoning in writing and propose a quote for the work as a new feature. CNU is then free to accept, decline, or defer.

---

## 4. Response targets

Business days are Monday to Friday, excluding Philippine public holidays.

| Severity | Definition | Acknowledge within | Workaround or fix within |
|---|---|---|---|
| **Critical** | System inaccessible, **or** examination data at risk of loss, **or** a security control failing | 1 business day | 2 business days |
| **High** | A core function is broken with no workaround — exams cannot be taken, results cannot be viewed, exports fail entirely | 2 business days | 5 business days |
| **Medium** | A function is impaired but has a workaround; incorrect display that does not affect stored data | 3 business days | Best effort within the support period |
| **Low** | Cosmetic issues, wording, minor layout problems | 5 business days | Best effort within the support period |

**Notes on these targets, stated honestly:**

- I am one person, not a support desk. These are the targets of a single developer acting in good faith, not a staffed SLA with penalty clauses. I would rather commit to figures I can actually meet than publish aggressive ones I cannot.
- "Workaround or fix" means I may first supply a way to keep operating — for example, an administrator procedure to work around a broken screen — and then deliver the permanent fix. During an examination period, restoring service takes priority over elegance.
- **Anything that puts student examination data at risk is Critical**, regardless of how few users it affects. Lost exam answers are not recoverable by apology.
- If a fault originates in a third-party platform (Vercel, Render, Supabase, Cloudinary, Google), I will diagnose it and tell CNU what is happening and what the options are — but I cannot commit to a resolution time for someone else's outage.

---

## 5. How to report a defect

**Channel.** One named CNU point of contact, reporting in writing. This must be confirmed before signing — see SOW §14, Item D. A single channel is not bureaucracy; it prevents the situation where three people report the same fault differently and the actual reproduction steps are lost.

**Please include:**

1. **What you did** — the steps, in order, that led to the problem
2. **What you expected** to happen
3. **What actually happened**
4. **Who it happened to** — role (Admin / Reviewer / Reviewee), and the account if relevant
5. **When** — the approximate date and time, which lets me correlate with server logs
6. **A screenshot**, if there is anything visible
7. **Whether it is repeatable** — does it happen every time, or did it happen once?

Item 7 is the most useful line in the report. A fault that reproduces reliably is usually fixed in a fraction of the time one that appears intermittently takes.

**During an active examination:** report immediately and mark it urgent, without waiting to assemble the full detail above. Get me the information you have; I will ask for the rest.

---

## 6. What is not covered

| # | Not covered | Note |
|---|---|---|
| N1 | New features and scope changes | §3.2. Quoted separately. |
| N2 | Third-party platform outages | Vercel, Render, Supabase, Cloudinary, Google. I will diagnose and advise, but cannot commit to another party's resolution time. |
| N3 | Hosting and infrastructure fees | Currently **₱0** — all platforms run on free tiers. Any future upgrade is a CNU decision and a separate cost, outside this warranty. See SOW §10. |
| N4 | Problems caused by CNU changes to the code, schema, or configuration | If CNU or a third party modifies the system, faults arising from those changes are outside this warranty. I will still help diagnose. |
| N5 | Data-entry errors | A wrong answer key or a mis-scheduled exam is a content correction, not a defect. I will show CNU how to correct it. |
| N6 | Content authoring | Exam questions and study decks are CNU's academic work. |
| N7 | User error and training gaps | Covered by the manuals and orientation. That said, if several users make the same mistake, I will treat that as a design problem worth fixing — repeated user error is usually the interface's fault, not the user's. |
| N8 | Performance degradation caused by an under-provisioned hosting tier | See SOW §10 and §11, Priority 1. If the free Render tier cold-starts during an exam, the fix is the tier, not the code. |
| N9 | Browser-specific issues on unsupported or outdated browsers | Current versions of Chrome, Edge, Firefox, and Safari are supported. |
| N10 | Requests arriving after the support period ends | See §7. |

---

## 7. What happens when the two months end

There is no cliff edge and nothing switches off. Specifically:

1. **The system keeps running.** There is no licence key, no time bomb, and no dependency on any service I control. If CNU never contacts me again, Normalite EDGE continues to operate.
2. **CNU owns everything.** Source code, database, and deployment accounts are CNU's, per SOW §12.
3. **Options for continued support**, should CNU want it:

| Option | Suits | Note |
|---|---|---|
| **Nothing** | CNU has technical staff, or the system is stable | Entirely viable. The documentation set exists so this is a real option, not a bluff. |
| **Per-incident** | Occasional problems | Quoted per issue as it arises |
| **Monthly retainer** | CNU wants a guaranteed response commitment | A fixed number of hours per month; unused hours do not roll over |
| **Project-based** | New features or the recommendations in SOW §11 | Quoted per scope |

I will not pressure CNU toward any of these. The purpose of the documentation and orientation is to make "nothing" a genuinely safe choice.

4. **End-of-period report.** Within one week of the period ending, I will provide a short written summary: every defect reported, how each was resolved, any known issues left open, and my recommendation on what CNU should watch. This is CNU's record of the system's actual reliability, and it is the honest input to whatever support decision follows.

---

## 8. My obligations during the period

To be explicit about what CNU is entitled to expect:

1. **Acknowledge every report** within the target in §4, even if only to say I have it and am investigating.
2. **Diagnose before fixing.** I will find the root cause rather than suppressing the symptom. A fix that hides a fault is worse than the fault, because the next occurrence is harder to find.
3. **Explain every fix in writing** — what broke, why, what changed. This builds CNU's understanding rather than my indispensability.
4. **Not introduce new defects.** Every fix goes through type checking and the existing test suite before deployment.
5. **Add a regression test** where a defect touches a critical path, so the same fault cannot silently return.
6. **Tell CNU when something is not my fault** — and equally, when it is. If I broke it, I will say so plainly.
7. **Escalate honestly.** If a defect is beyond what I can fix within the period, I will say so early rather than let a deadline pass in silence.

---

## 9. Standards-readiness note

This document is a project artefact, not a certification artefact, so a standards-readiness check applies.

**Supports future certification:**

| Standard | Control | How this document helps |
|---|---|---|
| ISO 9001 8.5.5 | Post-delivery activities | Defines the warranty scope, period, and response targets in writing |
| ISO 9001 9.1.2 | Customer satisfaction | The end-of-period report (§7.4) is a documented review input |
| ISO 9001 10.2 | Nonconformity and corrective action | §8.2 requires root-cause diagnosis; §8.5 requires a regression test on critical paths |
| ISO 27001 A.8.32 | Change management | Fixes go through type checking and tests before deployment (§8.4) |
| SOC 2 CC8.1 | Change management | Same |

**Would require rework for certification — flagged now:**

| # | Gap | Standard | Recommendation |
|---|---|---|---|
| R1 | No formal incident/defect register is maintained | ISO 9001 10.2; ISO 27001 A.5.24; SOC 2 CC7.3 | CNU maintains a simple log — date, reporter, severity, resolution, date closed. A spreadsheet is sufficient. I will supply the entries; CNU should own the register, since it must outlive this engagement. |
| R2 | Response targets are not enforced by contractual remedy | ISO 9001 8.2.3 | This is intentional for a single-developer engagement. If CNU later contracts a support provider, targets should carry defined remedies. Flagged so the absence is a recorded decision rather than an oversight. |
| R3 | No defined security-incident escalation path distinct from ordinary defects | ISO 27001 A.5.24–A.5.26; SOC 2 CC7.3–CC7.4 | A suspected data breach needs a different route from a broken button. CNU should name the person to contact on a suspected security incident, and the notification obligation to the National Privacy Commission. This is the one gap here I would close before signing. |
| R4 | No post-support-period continuity arrangement is defined | ISO 27001 A.5.30; ISO 9001 8.5.5 | §7 lists options but commits to none. CNU should decide before the period ends rather than after. |

**R3 is the one to act on now.** Everything else in this table can be settled later at low cost; a security incident with no named recipient and no notification timeline is the gap that becomes expensive precisely when you can least afford it.

---

## 10. Acknowledgement

| | Service Provider | Client (CNU) |
|---|---|---|
| **Name** | Joseph Sarsonas | ______________________________ |
| **Position** | Independent Software Developer | ______________________________ |
| **Signature** | ______________________________ | ______________________________ |
| **Date** | ______________________________ | ______________________________ |

**Support period start date:** ______________________________

**Support period end date:** ______________________________

**CNU named point of contact for defect reports:**

| | |
|---|---|
| Name | ______________________________ |
| Position | ______________________________ |
| Email | ______________________________ |
| Contact number | ______________________________ |

**Contact for a suspected security incident** *(may differ from the above — see §9, R3)*:

| | |
|---|---|
| Name | ______________________________ |
| Position | ______________________________ |
| Email | ______________________________ |
| Contact number | ______________________________ |
