# Normalite EDGE — Administrator Manual

**Version:** 1.0.0
**Date:** 2026-08-04
**For:** Cebu Normal University administrators
**Applies to:** Normalite EDGE as deployed at commit `0b641be` (2026-08-03)

## Changelog

- v1.0.0 (2026-08-04): Initial administrator manual. Replaces `GETTING_STARTED_GUIDE_v1.0.0.md`, which described a `PENDING`-status manual-approval registration flow that no longer exists in the system.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Signing in](#2-signing-in)
3. [Understanding how access works](#3-understanding-how-access-works)
4. [Setting up your organisation](#4-setting-up-your-organisation)
5. [Managing users](#5-managing-users)
6. [Managing students](#6-managing-students)
7. [System-wide examination policy](#7-system-wide-examination-policy)
8. [Exams and study materials](#8-exams-and-study-materials)
9. [Reports and exports](#9-reports-and-exports)
10. [Audit logs](#10-audit-logs)
11. [Notifications, calendar, and conferences](#11-notifications-calendar-and-conferences)
12. [Troubleshooting](#12-troubleshooting)
13. [What to do during an examination](#13-what-to-do-during-an-examination)
14. [Getting help](#14-getting-help)

---

## 1. Before you start

**Read this section. It is short, and it prevents the two mistakes that cause the most trouble.**

### Mistake 1 — Deleting a user instead of disabling them

**Disable, do not delete.** A student's account is attached to their examination attempts, answers, and results. Deleting the account risks losing that history. Disabling blocks access immediately while preserving everything.

Delete only when an account was created in error and has no activity.

### Mistake 2 — Forgetting that program track controls visibility

Almost every report of *"a student cannot see the exam"* comes down to a mismatch between the student's program track and the exam's track visibility. Check that first, before anything else. Section 12 covers the full procedure.

---

## 2. Signing in

1. Go to the Normalite EDGE address.
2. Click **Sign in with Google**.
3. Use your **`@cnu.edu.ph`** Google account.

That is the whole process. There is no separate Normalite EDGE password for CNU accounts.

**If Google refuses you**, that is a Google account problem — contact CNU IT. Normalite EDGE cannot help, because it never sees your password.

**If Google accepts you but Normalite EDGE shows nothing**, your Normalite EDGE account has not been provisioned yet, or has been disabled. Another administrator needs to check it.

---

## 3. Understanding how access works

Understanding this section will let you resolve most user complaints in under a minute.

### There are two separate things

| | What it is | Who controls it |
|---|---|---|
| **Your Google identity** | Proof of who you are | Google / CNU IT |
| **Your Normalite EDGE account** | Your role and permissions in this system | You, as administrator |

**Signing in with Google gets someone to the door. A Normalite EDGE account is what lets them in.**

Anyone in the world with a Google account can complete a Google sign-in. That grants them nothing here. Only a provisioned Normalite EDGE account with a role does. And only `@cnu.edu.ph` Google accounts can be provisioned as institutional users.

### Why there is no "forgot password" for CNU users

CNU users **have no password in this system**. They sign in with Google. There is nothing to forget and nothing to reset.

The only accounts with passwords are external reviewers and partners, and you recover those by generating a new access link (§5.4).

### Why there is no approval queue

Older documentation described a "Pending" status requiring administrator approval. **That no longer exists.** Google's verification of the `@cnu.edu.ph` account replaced it. Accounts are either **Active** or **Disabled**.

### Disabling takes effect immediately

When you disable an account, the block applies on that user's **very next action** — not at their next login. If someone is signed in and misusing the system, disabling them stops them within seconds. You do not need to wait for anything to expire.

---

## 4. Setting up your organisation

Set these up **in this order**, because each depends on the one before it.

### 4.1 Campuses — `Admin → Campuses`

Create one entry per CNU campus. Every user is attached to a campus, and reports can be filtered by it.

| Action | How |
|---|---|
| Add | **Campuses** → add, enter the name, save |
| Edit | Open the campus, change, save |
| Delete | Only when no users are attached |

### 4.2 Programs / tracks — `Admin → Programs`

**This is the most important structure in the system.** A program track determines which exams and study decks a student can see.

Create one entry per academic program participating in LET review — for example, BEEd, BSEd English, BSEd Mathematics.

Every student is assigned one track. Every exam and deck is made visible to one or more tracks. Get this right before enrolling students, because correcting it later means editing every affected record.

### 4.3 Categories — `Admin → Categories`

Subject categories group exams and decks by topic — General Education, Professional Education, and the specialisations. You can add, rename, and remove them at any time; they are managed data, not fixed code.

Rename freely. **Deleting** a category that is in use will affect the exams referencing it, so check `Categories → view exams in category` first.

---

## 5. Managing users

`Admin → User Management`

### 5.1 The three roles

| Role | Can do | Cannot do |
|---|---|---|
| **Admin** | Everything — accounts, campuses, programs, categories, system policy, audit logs, plus everything a Reviewer can do | — |
| **Reviewer** | Create and manage exams and study decks; view student performance and submission analytics | Manage accounts, campuses, programs, categories, or system policy |
| **Reviewee** | Take exams, study decks, view own results, join conferences | See other students' data; create content |

**Grant Admin sparingly.** An Admin can change any account's role, including their own, and can alter examination policy for the whole institution.

### 5.2 Creating an account

**User Management → create**, then supply the user's details and role.

For `@cnu.edu.ph` users, the account is linked to their Google identity when they first sign in. They need no password from you.

### 5.3 Changing a role

Open the account → change role → save. The change takes effect on the user's next action; they do not need to sign out.

**Recorded in the audit log**, with your name attached. This is intentional.

### 5.4 External reviewers and partners

For someone without an `@cnu.edu.ph` address — a visiting reviewer, a partner institution's instructor:

1. Create the account with the appropriate role.
2. Open the account → **generate access link**.
3. Send them the link through your normal channel.
4. They open it and set their own password.

**If they forget that password**, generate a new access link. That is the entire recovery procedure — there is no reset email.

> **Handle access links carefully.** An access link lets whoever holds it set the password on that account. Send it directly to the intended person, not to a group chat or shared mailbox. If a link goes astray, generate a new one immediately — this invalidates the old one.

### 5.5 Disabling and re-enabling

**Disable** when someone leaves, a role ends, or access must be stopped urgently. Their history is preserved and the account can be re-enabled at any time.

Re-enable by setting the status back to **Active**.

### 5.6 Deleting

Only for accounts created in error with no activity. See §1. When in doubt, disable.

---

## 6. Managing students

`Students` *(also available to Reviewers)*

Student records hold: full name, email, campus, **program/track**, year level, section, student ID, and contact number.

| Task | How |
|---|---|
| Find a student | Search or filter by campus, program, year level, or section |
| View performance | Open the student → profile performance view — their attempt history and scores |
| Correct details | Open the student → edit → save |
| Fix a wrong program assignment | Edit the program/track field. **This immediately changes which exams and decks they can see.** |

**The most common real correction you will make:** a student was enrolled under the wrong program and cannot see their exams. Fix the track field and the problem disappears.

---

## 7. System-wide examination policy

`Settings`

Three settings that apply to **the entire institution**, not to individual exams. Changing them affects every exam in progress and every exam to come.

| Setting | Effect | Consideration |
|---|---|---|
| **Allow multiple attempts** | Whether students may re-attempt exams at all | On: better for practice. Off: better for graded assessment. Individual exams also have their own attempt limits, which operate within this. |
| **Enforce single tab** | Whether switching browser tabs during an exam is recorded as a violation | On: deters looking things up. Off: avoids penalising students whose device or connection misbehaves. |
| **Tab-switch grace period** | Seconds before a tab switch counts as a violation. Default: 5 | Too short punishes accidental switches and notification pop-ups. Too long defeats the control. |

**Recommendation: treat these as academic policy, not as software settings.** They should be decided by CNU policy and then applied — not adjusted by whoever happens to open this page. Record the chosen values and the reasoning. Section 9 of the orientation plan provides a form for this.

**Do not change these while an examination is in progress.** Wait until the session has closed.

---

## 8. Exams and study materials

As an Admin you have full Reviewer capability. For complete instructions on building exams and study decks, see [USER_MANUAL_REVIEWER_v1.0.0.md](USER_MANUAL_REVIEWER_v1.0.0.md).

The essentials you need as an administrator:

### 8.1 Exam status lifecycle

| Status | Meaning |
|---|---|
| **Draft** | Being built. Invisible to students. |
| **Live** | Available to students, subject to its schedule and track visibility |
| **Archived** | Withdrawn from students; results retained |
| **Closed** | Finished; no further attempts accepted |

### 8.2 Track visibility

Each exam is made visible to one or more program tracks. A student sees an exam only if their track is among them.

**This, plus schedule and status, determines everything about who can see what.** When troubleshooting visibility, check all three.

### 8.3 Before any exam goes live

Ask the reviewer to confirm they have **previewed the exam as a student**. Two minutes of preview catches most authoring errors — wrong answer keys, missing images, an impossible time limit — and there is no way to recover a cohort's ruined attempt afterwards.

---

## 9. Reports and exports

`Reports`

| Output | Contains |
|---|---|
| **Excel export** | Student scores and submissions, as a spreadsheet |
| **PDF report** | Formatted results and performance summaries |
| **Exam performance report** | Exam-level analytics with its own export |

Filters: **campus**, **program**, and **date range**. Apply filters *before* exporting — the export honours whatever is currently applied.

**Check your filters before circulating an export.** An export that silently omitted a campus because a filter was left applied is the sort of error that is discovered by the person you sent it to.

### Per-question analytics are the most useful thing here

In `Manage Exam View → submission analytics`, you can see performance per question. Questions most students answered incorrectly are one of two things:

1. **A curriculum gap** — the topic needs more teaching attention. This is genuinely valuable feedback for the review programme.
2. **A defective question** — ambiguous wording, or a wrong answer key.

Either way it is worth reviewing. This is arguably the platform's most valuable output, and the one most often overlooked.

---

## 10. Audit logs

`Admin → Audit Logs`

Every significant action records: **who** did it, **their role**, **what** they did, **which record** it affected, and **when**.

Use it to answer:

- "Who changed this student's program?"
- "Who disabled this account?"
- "Who altered the exam settings, and when?"
- "Who generated an access link for this external account?"

**A recommendation worth adopting:** review the list of Admin and Reviewer accounts once a term. Confirm each person still needs the access they have, and that no unexpected role changes appear in the log. This takes about fifteen minutes and is exactly the evidence any future security or privacy audit will ask for.

The **activity feed** on the Admin dashboard is a lighter day-to-day view of the same information.

---

## 11. Notifications, calendar, and conferences

### Notifications

In-app notifications appear in real time — the bell updates without a page refresh.

> **Important: the system sends no email.** Notifications appear inside Normalite EDGE only. For anything students must be told reliably and promptly — an exam schedule change, a cancellation — use CNU's existing channels as well. Do not assume a student has seen an in-app notification.

### Calendar

`Calendar` combines exams, conferences, and events in one view.

### Conferences

`Conferences` — schedule video-conference review sessions and attach recording links afterwards, so students who could not attend can catch up.

---

## 12. Troubleshooting

### "A student cannot see an exam"

Check in this order — the first check resolves most cases:

1. **Program track.** Does the student's track match a track the exam is visible to? *(Most common cause.)*
2. **Exam status.** Is it **Live**? Draft, Archived, and Closed exams are invisible to students.
3. **Schedule.** Is the current time inside the exam's start–end window?
4. **Account status.** Is the student **Active**?
5. **Attempt limit and cooldown.** Have they already used their attempts, or are they inside a cooldown period?

### "A student can sign in with Google but sees nothing"

Their Google identity works; their Normalite EDGE account does not. Either it was never provisioned, or it is Disabled. Check `User Management`.

### "A student says Google will not let them in"

A Google account problem, outside this system. Refer them to CNU IT.

### "An external reviewer forgot their password"

Generate a new access link (§5.4).

### "A student's internet dropped during an exam"

Their answers were autosaved up to the last save, within the previous 15 seconds. When they sign back in they can resume the attempt, provided the exam window and their time limit have not expired.

**If the time expired while they were offline, the attempt is submitted automatically with the answers saved up to that point.** The clock is calculated on the server and does not pause when a student disconnects — this is deliberate, because a pausing clock would be trivially exploitable.

### "A student was flagged for tab-switching but says they did nothing"

Possible and worth taking seriously. A notification pop-up, a device switching networks, or an operating-system alert can steal focus. Check the grace period setting (§7) — if false positives are frequent, the grace period is too short, or single-tab enforcement is not the right control for your student devices.

### "The system is slow, or the first request takes a long time"

Most likely a hosting tier issue, not a code issue. If the backend runs on a free Render tier, it spins down when idle and the first request after a quiet period takes tens of seconds to wake it. **This is unacceptable at the start of a timed exam.** See §11 of the proposal — an always-on paid tier is required for examination periods.

### "Too many requests, please try again later"

The rate limit. It is deliberate protection against brute-force attacks and applies per user account, not per campus network, so one busy user does not affect others. Wait a few minutes. If it happens during normal use, report it as a defect.

---

## 13. What to do during an examination

A short checklist, because examination periods are when problems matter most.

### Before the examination

- [ ] Confirm the exam is **Live**, correctly scheduled, and visible to the right tracks
- [ ] Confirm a reviewer has previewed it as a student
- [ ] Confirm system-wide policy settings are as intended — **and do not change them once the exam opens**
- [ ] Confirm the hosting tier is adequate for the expected number of simultaneous students (see §12, "slow")
- [ ] Tell students, through your normal channels, when the exam opens and closes

### During the examination

- [ ] Do not change system settings
- [ ] Do not change exam configuration
- [ ] Do not disable accounts unless genuinely necessary — it takes effect immediately and will end that student's attempt
- [ ] Keep the support channel monitored

### If something goes wrong

1. **Do not change settings hoping to fix it.** During a live exam this is more likely to make things worse.
2. Record what happened: who, when, what they saw, whether it is repeatable.
3. Report it immediately through the support channel, marked urgent (see [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](../contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) §5).
4. **Anything that risks losing student answers is Critical.** Say so explicitly when reporting.

### After the examination

- [ ] Review submission analytics for defective questions (§9)
- [ ] Export results while filters are fresh in mind
- [ ] Note anything that behaved oddly, even if minor — patterns matter

---

## 14. Getting help

**Defects** — the system not behaving as this manual describes — go through the support channel in [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](../contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) §5. During the two-month support period these are fixed at no charge.

When reporting, include: what you did, what you expected, what happened, who it affected, when, and **whether it happens every time**. That last item is the most useful line in any report.

**Google sign-in problems** are not Normalite EDGE problems — contact CNU IT.

**Questions about how to do something** are answered here or in the orientation sessions. If this manual does not answer your question, that is a gap in the manual, and telling me lets me fix it.

### Related documents

| Document | For |
|---|---|
| [USER_MANUAL_REVIEWER_v1.0.0.md](USER_MANUAL_REVIEWER_v1.0.0.md) | Building exams and study decks |
| [USER_MANUAL_REVIEWEE_v1.0.0.md](USER_MANUAL_REVIEWEE_v1.0.0.md) | What students were told — useful when supporting them |
| [SYSTEM_DOCUMENTATION_v1.0.0.md](../system/SYSTEM_DOCUMENTATION_v1.0.0.md) | Technical detail, for IT staff |
| [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md](../contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.0.md) | Support scope and how to report defects |
