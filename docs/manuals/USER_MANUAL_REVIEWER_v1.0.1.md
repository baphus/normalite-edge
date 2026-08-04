# Normalite EDGE — Reviewer / Instructor Manual

**Version:** 1.0.1
**Date:** 2026-08-04
**For:** Cebu Normal University reviewers and instructors
**Applies to:** Normalite EDGE as deployed at commit `0b641be` (2026-08-03)

## Changelog

- v1.0.1 (2026-08-04): Retargeted cross-references to the current document versions. **No change to any procedure or guidance.**
- v1.0.0 (2026-08-04): Initial reviewer manual.

---

## Contents

1. [What you can do](#1-what-you-can-do)
2. [Signing in](#2-signing-in)
3. [Your dashboard](#3-your-dashboard)
4. [Building an exam](#4-building-an-exam)
5. [Writing good questions](#5-writing-good-questions)
6. [Controlling who sees the exam](#6-controlling-who-sees-the-exam)
7. [Publishing and the exam lifecycle](#7-publishing-and-the-exam-lifecycle)
8. [Study materials — decks](#8-study-materials--decks)
9. [Monitoring submissions](#9-monitoring-submissions)
10. [Reading the analytics](#10-reading-the-analytics)
11. [Students](#11-students)
12. [Calendar and conferences](#12-calendar-and-conferences)
13. [Troubleshooting](#13-troubleshooting)
14. [Getting help](#14-getting-help)

---

## 1. What you can do

| You can | You cannot |
|---|---|
| Create and manage exams | Manage user accounts or change roles |
| Create and manage study decks | Create or edit campuses, programs, or categories |
| View student performance and submission analytics | Change system-wide examination policy |
| View student profiles | View audit logs |
| Schedule conferences | |

Anything in the second column, ask an Administrator.

---

## 2. Signing in

1. Go to the Normalite EDGE address.
2. Click **Sign in with Google**.
3. Use your **`@cnu.edu.ph`** Google account.

There is no separate Normalite EDGE password. If Google will not let you in, contact CNU IT — this system never sees your password.

If Google lets you in but Normalite EDGE shows nothing, your account needs provisioning by an Administrator.

**External reviewers** without a `@cnu.edu.ph` address: an Administrator sends you an access link where you set your own password. If you forget it, ask them for a new link.

---

## 3. Your dashboard

Your landing page shows your content and how students are doing with it. Use it as a starting point rather than a report — the detail lives in **Manage Exams** and the analytics views.

---

## 4. Building an exam

`Exams` *(under Content)* → create

Work in this order. Each step depends on the previous one.

### Step 1 — Exam details

| Field | Notes |
|---|---|
| Title | What students will see. Be specific — "Gen Ed Mock Exam 2" beats "Mock Exam". |
| Description | Instructions students see before starting. Use it. |
| Category | The subject grouping. Ask an Admin if the category you need does not exist. |

### Step 2 — Sections

An exam has one or more sections, each with **its own time limit**.

Use sections when different parts of the exam warrant different pacing — for example, a 40-item General Education section at 30 minutes and a 20-item Professional Education section at 20 minutes.

If your exam does not need this, one section is perfectly fine.

### Step 3 — Questions

For each question:

| Field | Notes |
|---|---|
| Question text | The stem |
| Image | Optional. Useful for diagrams, charts, and passages. |
| Choices | The multiple-choice options |
| Correct answer | **Check this twice.** See §5. |
| Rationale | The explanation students see when reviewing. **Please write these.** See §5. |
| Points | Weighting. Leave equal unless some questions genuinely deserve more. |

### Step 4 — Rules

| Setting | What it controls |
|---|---|
| **Schedule** | The start and end window. Outside it, students cannot begin. |
| **Maximum attempts** | How many times a student may take it |
| **Cooldown period** | How long a student must wait between attempts |
| **Feedback mode** | **Immediate** — students see whether each answer was right as they go. **After submission** — they see nothing until they finish. |

**On feedback mode:** use *after submission* for anything resembling a real assessment. Use *immediate* only when the goal is practice and learning rather than measurement — immediate feedback during a timed mock exam changes how students behave, and makes the score less comparable to a real LET sitting.

### Step 5 — Visibility

See §6. This determines who can see the exam at all.

### Step 6 — Preview it as a student

**Do this before publishing. Every time.**

It takes two minutes and catches the errors that cannot be undone afterwards:

- A wrong answer key
- An image that did not load
- A time limit that is impossible for the number of questions
- A question with two defensible correct answers
- Choices in a confusing order

A cohort's ruined attempt cannot be given back to them. Preview.

---

## 5. Writing good questions

Not software instructions — practical guidance, because the quality of your questions determines the value of everything else in the system.

### Always write the rationale

The rationale is the explanation a student sees when they review their attempt. It is the single most valuable field on the question.

A student who gets a question wrong and reads *why* has learned something. A student who only sees a red mark has learned that they got it wrong. The system gives you a place to teach at exactly the moment the student is most receptive — use it.

State why the correct answer is correct, **and** why the attractive wrong answer is wrong. That second half is where most of the learning is.

### Check the answer key twice

The most damaging error in an exam system is a wrong answer key, because it teaches the wrong thing confidently, to everyone, and students who reason correctly are marked wrong.

Check it when authoring, and check it again in preview.

### Watch for two-correct-answers

A question where a well-prepared student can defend a second option is a defective question, however clear it seemed when you wrote it. The per-question analytics (§10) will expose these — a question where strong students split evenly between two choices is usually ambiguous, not difficult.

### Use images deliberately

Images are useful for diagrams, charts, and reading passages. They are a poor container for text that could simply be typed — text in an image is harder to read on a phone, and students take these exams on phones.

### Match the LET

Where possible, mirror the phrasing conventions and difficulty of the actual Licensure Examination for Teachers. Familiarity with the format is itself part of the preparation.

---

## 6. Controlling who sees the exam

Three things together determine whether a given student can see and take your exam. All three must be right.

| # | Control | Where | Effect |
|---|---|---|---|
| 1 | **Program track visibility** | Exam settings | A student sees the exam only if their program track is among those selected |
| 2 | **Status** | Exam settings | Must be **Live**. Draft, Archived, and Closed are invisible to students. |
| 3 | **Schedule** | Exam settings | The current time must be inside the start–end window |

**Program track is the one that catches people out.** If you build an exam and no student can see it, this is almost certainly why — check that you selected the right tracks, and that your students are actually enrolled under those tracks. If a student is enrolled under the wrong program, an Administrator must correct their record.

---

## 7. Publishing and the exam lifecycle

| Status | Students see it | Use when |
|---|---|---|
| **Draft** | No | You are still building it. Everything new starts here. |
| **Live** | Yes, within its schedule | Ready for students |
| **Archived** | No | Finished with, but you want the results kept |
| **Closed** | No new attempts | The exam period is over |

Move **Draft → Live** when you have previewed it and are satisfied.

**Avoid editing an exam that is Live with attempts in progress.** Students taking it at that moment may see inconsistent content. If a correction is genuinely urgent, tell an Administrator first, and prefer to wait until the window closes.

### Export questions to a study deck

`Manage Exams → export to deck` turns an exam's questions into a flashcard deck for revision.

This works particularly well **after** an exam period: students who have just sat the exam can revise the same material in flashcard and quiz mode, with your rationales attached. It is one of the more useful features in the system and is easy to overlook.

---

## 8. Study materials — decks

`Materials` *(under Content)*

Study decks are flashcard-style collections students use in three modes:

| Mode | What the student does |
|---|---|
| **View** | Reads through question and answer together — revision |
| **Flashcard** | Sees the question, thinks, reveals the answer — self-testing |
| **Quiz** | Answers and is scored — practice under mild pressure |

You write one deck; students choose how to use it.

### Creating a deck

1. `Materials` → create
2. Set title, description, and category
3. Add questions — same fields as exam questions, **including the rationale**
4. Set **track visibility**, exactly as for exams (§6)
5. Publish

Students can also create their own private custom decks. Those are theirs; you will not see them.

### Decks versus exams

| Use a deck for | Use an exam for |
|---|---|
| Learning and revision | Measurement |
| Unlimited, untimed, self-paced repetition | Timed, limited attempts, integrity controls |
| Building familiarity | Assessing readiness |

The strongest pattern is both: a deck to learn the material, an exam to test whether it stuck, then the deck again for what did not.

---

## 9. Monitoring submissions

`Manage Exams` → open an exam → **Manage Exam View**

Here you can see who has submitted, their scores, and each individual attempt.

**Filters** — campus, program, and others — let you narrow to the group you care about. Filters also apply to exports, so set them before exporting.

Open any attempt to see the student's full answer-by-answer detail, including how long they spent per question.

### Exports

Export student scores and submissions to **Excel**, or generate a **PDF** report. Set your filters first — the export honours whatever is currently applied, and an export that quietly omitted a section because a filter was left on is a genuinely awkward mistake to discover later.

---

## 10. Reading the analytics

`Manage Exam View → submission analytics`

You get exam-level figures — average, highest, lowest, attempt counts — and, more usefully, **performance per question**.

### The per-question view is the point

Look at the questions most students answered incorrectly. Each one is telling you something:

| Pattern | Likely meaning | What to do |
|---|---|---|
| Most students wrong, spread across all choices | The topic was not learned | Teaching gap — revisit it in class or in a deck |
| Most students wrong, clustered on **one** wrong choice | A specific misconception | Address that misconception directly; it is a precise, valuable finding |
| Strong students split evenly between two choices | The question is probably ambiguous | Review the wording and the key — likely a defective question |
| Nearly everyone correct | Too easy to discriminate | Fine as a confidence-builder; it tells you little about readiness |

**This is the most valuable output of the whole platform.** A mock exam that only produces scores tells you who is behind. A mock exam with per-question analytics tells you *what to teach next*, and that is a considerably more useful thing to know.

Reviewing this after each exam period takes maybe twenty minutes and is worth more than most of the reporting.

### Individual student performance

`Students` → open a student → performance view: their attempt history and scores over time.

Watch the **trend**, not a single result. A student improving steadily from a low base is in a very different position from one whose scores are drifting downwards, even where today's numbers happen to match.

---

## 11. Students

`Students` *(under Content)*

You can view student records and performance. You **cannot** create accounts or change roles — ask an Administrator.

Filter by campus, program, year level, or section to focus on your own cohort.

---

## 12. Calendar and conferences

**Calendar** — a combined view of exams, conferences, and events.

**Conferences** — schedule video-conference review sessions. After the session, attach the recording link so students who could not attend can catch up. Students genuinely use these; adding the link takes seconds and is easy to forget.

> **The system sends no email.** Scheduling a conference creates an in-app notification, not a message in anyone's inbox. Announce anything time-critical through your usual channel as well.

---

## 13. Troubleshooting

### "No student can see my exam"

1. Is the status **Live**?
2. Is the current time inside the **schedule** window?
3. Did you select the correct **program tracks**?
4. Are your students actually enrolled under those tracks? *(An Admin can check.)*

Cause 3 or 4 in most cases.

### "One student cannot see it, but others can"

Their program track or account status. Ask an Administrator to check their record.

### "A student says they lost their answers"

Answers autosave every 15 seconds. They should be able to resume the attempt and find everything up to the last save. If genuine work was lost beyond that, **report it as a defect immediately** — see §14. Lost examination data is treated as the most serious category of fault.

### "A student ran out of time because of a technical problem"

The exam clock is calculated on the server and does not pause when a student disconnects — deliberately, because a pausing clock would be easy to abuse. If time expired, the attempt was submitted automatically with whatever had been saved.

Whether to allow an additional attempt is an academic decision for you and the Administrator, not something the system decides. An Administrator can adjust attempt limits.

### "A student was flagged for tab-switching but insists they did nothing wrong"

Take it seriously; false positives are possible. Notification pop-ups and operating-system alerts can steal focus. The grace period is set institution-wide by an Administrator — if this happens often, tell them, because it suggests the grace period is too short for the devices your students actually use.

### "I made a mistake in a published exam"

If no one has started it: fix it and republish.

If attempts are in progress: **speak to an Administrator before editing.** Changing a live exam mid-attempt can produce inconsistent results. Usually the better course is to wait for the window to close, then decide how to handle the affected attempts as an academic matter.

### "The export is missing students"

A filter is applied. Clear the filters and export again.

---

## 14. Getting help

**Defects** — the system not behaving as this manual describes — should be reported to your Administrator, who will pass them to the support channel. During the two-month support period they are fixed at no charge.

Include: what you did, what you expected, what happened, which student or exam was affected, when, and **whether it happens every time**.

**Anything involving possible loss of student examination data should be reported immediately and marked urgent.**

**Google sign-in problems** — contact CNU IT, not Normalite EDGE support.

### Related documents

| Document | For |
|---|---|
| [USER_MANUAL_REVIEWEE_v1.0.0.md](USER_MANUAL_REVIEWEE_v1.0.0.md) | What your students were told — useful when helping them |
| [USER_MANUAL_ADMIN_v1.0.1.md](USER_MANUAL_ADMIN_v1.0.1.md) | What your Administrator can do for you |
| [MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md](../contract/MAINTENANCE_AND_SUPPORT_TERMS_v1.0.1.md) | Support scope and reporting |
