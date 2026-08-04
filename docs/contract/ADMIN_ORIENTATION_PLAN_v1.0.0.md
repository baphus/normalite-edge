# Normalite EDGE — Administrator Orientation Plan

**Version:** 1.0.0
**Date:** 2026-08-04
**Prepared by:** Joseph Sarsonas
**Prepared for:** Cebu Normal University
**Attachment to:** [PROPOSAL_AND_SOW_v1.0.0.md](PROPOSAL_AND_SOW_v1.0.0.md)
**Cost:** ₱0 — included in the ₱30,000 contract value

## Changelog

- v1.0.0 (2026-08-04): Initial orientation programme.

---

## 1. Objective

By the end of this programme, CNU administrators should be able to run Normalite EDGE **without me** — including during an examination period, when something goes wrong, and I am not reachable.

That is the actual test. Not "can they find the buttons," but: *can they set up a cohort, launch a timed exam, handle a student who lost their connection mid-attempt, export the results, and know what to do when something looks wrong?*

The programme is therefore built around **the tasks administrators actually have to perform**, in the order a real term requires them, rather than around a tour of the menus.

---

## 2. Programme at a glance

| Session | Focus | Duration | Format |
|---|---|---|---|
| **1** | Accounts, access, and organisational setup | ~2 hours | Hands-on walkthrough |
| **2** | The examination cycle end to end | ~2 hours | Hands-on walkthrough |
| **3** | Follow-up Q&A after independent use | ~1 hour | Open clinic |

**Total: approximately 5 hours across three sessions.**

**Scheduling.** Sessions 1 and 2 should be within the same week — they are two halves of one picture. **Session 3 should be at least two weeks later**, deliberately: its value comes from administrators having used the system on their own and hit real questions first. A Q&A held immediately after training answers questions nobody has yet.

**Format.** On campus or online, at CNU's preference. Online is fine and arguably better, because it makes screen sharing easier and can be recorded.

**Recording.** I recommend CNU record Sessions 1 and 2. Staff change, and a recording is the cheapest possible refresher for whoever inherits the role. I consent to being recorded.

---

## 3. Before the first session

Requested of CNU:

| # | Item | Why |
|---|---|---|
| 1 | Confirm attendees and their roles | Determines emphasis — an IT officer and a programme coordinator need different depth |
| 2 | Each attendee has a working **Admin** account and has signed in at least once | Sessions are hands-on. Debugging sign-in during a session wastes everyone's time. |
| 3 | Confirm on-campus or online, and dates | — |
| 4 | Attendees have skimmed [USER_MANUAL_ADMIN_v1.0.0.md](../manuals/USER_MANUAL_ADMIN_v1.0.0.md) | Not required, but sessions go further if they have |
| 5 | A non-production or clearly-marked test cohort is available | So attendees can create, break, and delete things freely without touching real student records |

**Item 5 matters more than it looks.** People do not learn an administrative system by watching; they learn it by doing something wrong and recovering. That must be possible without consequences for real students.

---

## 4. Session 1 — Accounts, access, and organisational setup (~2 hours)

### Part A — How identity actually works here (20 min)

This comes first because almost every support question administrators will receive is really a question about this.

- Why there is **no password** for `@cnu.edu.ph` users, and why that is a feature rather than a limitation
- The two-layer model: a Google sign-in gets someone *to the door*; a provisioned account is what lets them *in*
- Why a student who "can sign in with Google but sees nothing" is a provisioning question, not a password question
- How external reviewers and partners differ, and how access links work
- Why disabling an account takes effect on the user's **next request**, not at next login

**Discussion:** the three most likely sign-in complaints and how to triage each in under a minute.

### Part B — Organisational structure (30 min)

Set up in the order the system depends on:

1. **Campuses** — create, edit, and what happens to users attached to one
2. **Programs / tracks** — and why they are the backbone of content visibility
3. **Categories** — dynamic subject categories, and how they group exams

**The key point to land:** program track is what controls who sees which exam and which deck. Almost every "a student cannot see the exam" report traces back to a track mismatch. Administrators should learn to check this first.

### Part C — User and student management (40 min)

- Creating accounts; the difference between the three roles in practice
- Student records: campus, program, year level, section, student ID, contact number
- Changing a role, and when that is appropriate
- Disabling versus deleting — **and why disabling is almost always the right answer** when student attempt history must be preserved
- Generating an access link for an external reviewer
- Viewing a student's profile and performance history

**Hands-on:** each attendee creates a test student, assigns them to a campus and program, then disables and re-enables the account.

### Part D — Audit logs and accountability (20 min)

- Reading the audit log: actor, role, action, entity, summary
- Using it to answer "who changed this, and when?"
- Why this is the evidence base for any future access review or security audit
- The activity feed as a lighter-weight day-to-day view

### Part E — Questions (10 min)

---

## 5. Session 2 — The examination cycle end to end (~2 hours)

Structured as one continuous exercise: build an exam, take it as a student, and report on it. Attendees see the whole loop rather than isolated screens.

### Part A — System-wide examination policy (15 min)

The three institution-wide settings, what each does, and the trade-off in each:

| Setting | Trade-off to discuss |
|---|---|
| Allow multiple attempts | Practice value versus score integrity |
| Enforce single tab | Cheating deterrence versus false positives from genuine technical problems |
| Tab-switch grace period | Too short punishes accidents; too long defeats the control |

**This is a policy conversation, not a technical one.** These settings should be decided by CNU academic policy and then applied — not chosen by whoever happens to open the Settings page. My recommendation is that CNU records its chosen values and the reason for them.

### Part B — Building an exam (40 min)

- Creating an exam; sections and per-section time limits
- Authoring questions: choices, correct answer, images, **rationale**, point weighting
- Scheduling: start and end windows
- Attempt limits and cooldown periods
- Feedback mode — immediate versus after submission, and when each is appropriate
- Track visibility — restricting the exam to specific programs
- The **Draft → Live → Archived → Closed** lifecycle, and what each transition means for students
- Exporting exam questions into a study deck for revision

**Hands-on:** each attendee builds a short two-section exam and publishes it to the test cohort.

**Emphasised:** always preview an exam as a student before going live. This catches the great majority of authoring mistakes, and it takes two minutes.

### Part C — Taking the exam, from the student's side (25 min)

Attendees take the exam they just built. This is the most valuable segment in the programme, because administrators who have not experienced the exam interface cannot support students using it.

Demonstrated deliberately:

- The countdown, and that it is **server-calculated** — closing the browser does not stop the clock
- Autosave: answer a question, close the browser, reopen, and see the answer preserved
- Resuming an interrupted attempt
- Tab-switch detection and the grace period, triggered live
- Automatic submission when time expires

**Then the scenario that will actually happen:** *"A student says their internet dropped during the exam."* We walk through what the system did, what the administrator can see, and what the available options are. Handled here so it is not being worked out for the first time during a real examination.

### Part D — Results, analytics, and reporting (25 min)

- Per-attempt results and full answer review
- Submission analytics: averages, highs and lows, attempt counts, per-question performance
- **Using per-question analytics to find teaching gaps** — the questions most students got wrong are curriculum feedback, which is arguably the platform's most useful output
- Excel export, with campus, program, and date-range filters
- PDF report generation
- Student profile performance views

**Hands-on:** export the results of the exam just taken, with a filter applied.

### Part E — Notifications, calendar, and conferences (10 min)

- How in-app notifications work, and that they are **in-app only** — no email is sent, so announcements still need CNU's existing channels
- Calendar view
- Scheduling video-conference sessions and attaching recording links

### Part F — Questions (5 min)

---

## 6. Session 3 — Follow-up clinic (~1 hour)

Held **at least two weeks after** Session 2, once administrators have used the system independently.

No fixed agenda by design. Structure:

1. **Open questions** — whatever came up in real use (bulk of the session)
2. **Anything that went wrong**, walked through together
3. **Anything that felt awkward or slower than it should be** — this is genuinely useful to me; repeated user difficulty usually indicates an interface problem worth fixing, and any such fix falls inside the two-month support period at no charge
4. **Confirmation of the support channel** and how to report a defect (see [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) §5)
5. **What to do when I am not available** — the honest version

I would rather hear "this part is confusing" in Session 3 than have CNU work around it silently for a year.

---

## 7. Materials provided

| Material | Form |
|---|---|
| [USER_MANUAL_ADMIN_v1.0.0.md](../manuals/USER_MANUAL_ADMIN_v1.0.0.md) | Reference document — the primary handout |
| [USER_MANUAL_REVIEWER_v1.0.0.md](../manuals/USER_MANUAL_REVIEWER_v1.0.0.md) | For administrators who also support reviewers |
| [USER_MANUAL_REVIEWEE_v1.0.0.md](../manuals/USER_MANUAL_REVIEWEE_v1.0.0.md) | So administrators know exactly what students were told |
| [SYSTEM_DOCUMENTATION_v1.0.0.md](../system/SYSTEM_DOCUMENTATION_v1.0.0.md) | For IT staff attendees who need the technical baseline |
| Live walkthrough on the running system | The sessions themselves |
| Session recording | If CNU chooses to record — recommended |

**Note:** the manuals are the deliverable; the sessions exist to make the manuals stick. If an administrator can only keep one thing, it should be the Admin manual — it is written to be usable without me.

---

## 8. Suggested attendees

| Role | Why | Sessions |
|---|---|---|
| CNU system administrator(s) — whoever will hold Admin accounts | Primary audience | 1, 2, 3 |
| Review programme coordinator | Needs the exam lifecycle and reporting | 2, 3 |
| IT office representative | Needs the identity model, hosting tiers, and the technical baseline | 1, and Session 2 Part A |
| One or two reviewer/instructor leads | They will be the first line of support for students | 2, 3 |

**Recommended group size: 4–8.** Small enough that everyone can actually do the hands-on work; large enough that CNU is not left with a single point of knowledge failure.

**I would specifically encourage at least two administrators to attend.** A single trained administrator is an availability risk for CNU that no documentation fully mitigates.

---

## 9. Completion record

To be signed after each session — this is CNU's training evidence, and it satisfies the ISO 9001 competence-record requirement noted in §10.

### Session 1 — Accounts, access, and organisational setup

| | |
|---|---|
| Date conducted | ______________________________ |
| Duration | ______________________________ |
| Format | ☐ On campus  ☐ Online |
| Recorded | ☐ Yes  ☐ No |

| Attendee name | Position | Signature |
|---|---|---|
| | | |
| | | |
| | | |
| | | |

**Topics not covered / deferred:** ______________________________

### Session 2 — The examination cycle end to end

| | |
|---|---|
| Date conducted | ______________________________ |
| Duration | ______________________________ |
| Format | ☐ On campus  ☐ Online |
| Recorded | ☐ Yes  ☐ No |

| Attendee name | Position | Signature |
|---|---|---|
| | | |
| | | |
| | | |
| | | |

**Agreed system-wide policy settings** *(record the decision — see §5, Part A)*:

| Setting | Value chosen | Reason |
|---|---|---|
| Allow multiple attempts | ☐ On  ☐ Off | |
| Enforce single tab | ☐ On  ☐ Off | |
| Tab-switch grace period | ______ seconds | |

### Session 3 — Follow-up clinic

| | |
|---|---|
| Date conducted | ______________________________ |
| Duration | ______________________________ |

| Attendee name | Position | Signature |
|---|---|---|
| | | |
| | | |

**Issues raised** *(any classified as defects are covered by the support period at no charge)*:

| # | Issue | Classified as | Action |
|---|---|---|---|
| 1 | | Defect / New feature / Training | |
| 2 | | Defect / New feature / Training | |
| 3 | | Defect / New feature / Training | |

### Programme completion

CNU confirms that the administrator orientation programme has been delivered.

| | Service Provider | Client (CNU) |
|---|---|---|
| **Name** | Joseph Sarsonas | ______________________________ |
| **Position** | Independent Software Developer | ______________________________ |
| **Signature** | ______________________________ | ______________________________ |
| **Date** | ______________________________ | ______________________________ |

---

## 10. Standards-readiness note

This is a project artefact, not a certification artefact, so a standards-readiness check applies.

**Supports future certification:**

| Standard | Control | How this helps |
|---|---|---|
| ISO 9001 7.2 | Competence | §9 provides dated, signed training records per attendee |
| ISO 9001 7.1.6 | Organisational knowledge | Manuals plus optional session recordings retain knowledge beyond individual staff |
| ISO 27001 A.6.3 | Information security awareness and training | Session 1 Part A covers the identity and access model; Part D covers audit accountability |
| ISO 27001 A.5.18 | Access rights | Session 1 Part C covers provisioning, role changes, and revocation |
| SOC 2 CC1.4 | Competence of personnel | Same records as ISO 9001 7.2 |
| DPTM — Governance | Accountability | Administrators are trained on who can access student data and how access is logged |

**Would require rework for certification — flagged now:**

| # | Gap | Standard | Recommendation |
|---|---|---|---|
| R1 | No recurring refresher or onboarding training for administrators appointed later | ISO 9001 7.2; ISO 27001 A.6.3 | CNU should own an annual refresher, and a requirement that any newly appointed administrator completes the manual plus the recording before receiving an Admin account. A one-off session trains today's staff, not the role. |
| R2 | No competence assessment — attendance is recorded, capability is not | ISO 9001 7.2 requires evidence of competence, not just training | Add a short practical check to Session 3: each administrator independently creates an exam, publishes it to a track, and exports the results. Signed off if completed unaided. **I recommend adding this**, and will do so if CNU agrees. |
| R3 | No documented data-privacy briefing for administrators handling student PII | DPTM — Governance & Accountability; Data Privacy Act 2012 §20 | Once CNU settles its retention policy and privacy notice (SOW §13, R1–R2), a 15-minute privacy briefing should be added to Session 1. It cannot be written before those policy decisions exist. |
| R4 | No segregation-of-duties guidance for Admin accounts | ISO 27001 A.5.3; SOC 2 CC6.3 | CNU should decide whether one person may both author exams and administer accounts. The system permits it; whether policy should is CNU's call. Worth deciding in Session 1. |

**R2 is the one worth acting on**, because it is nearly free: a practical check at Session 3 converts an attendance record into competence evidence, which is what ISO 9001 7.2 actually asks for — and more importantly, it is how CNU finds out whether the training worked before an examination period proves otherwise.
