# Retake Exam Feature — Spec

**Status:** Approved
**Date:** 2026-08-09

## Core Concept

- **First attempt is the only record that matters** for grading/rankings
- **Retakes are purely for practice** — reviewees can study on their own after the deadline
- **Admins see only the first attempt.** Reviewees see all their attempts with full details.

---

## Schema Changes (Migration)

### Fields to DROP

| Field | Model | Reason |
|---|---|---|
| `maxAttempts` | `Exam` | No attempt cap — first attempt is the only one that counts |
| `cooldownMinutes` | `Exam` | Retakes are instant, no wait required |
| `closeOnDeadline` | `Exam` | Redundant — if `scheduleEnd` is set, exam always auto-closes |
| `allowMultipleAttempts` | `SystemSetting` | Global switch removed — per-exam `allowRetakes` is the only control |

### Fields to KEEP and now enforce (previously dead)

| Field | Model | New Behavior |
|---|---|---|
| `allowRetakes` | `Exam` | When `scheduleEnd` passes and this is `true`, reviewee can retake infinitely |
| `feedbackMode` | `Exam` | `IMMEDIATE` = results shown after submission. `AFTER_SUBMIT` = results hidden until `scheduleEnd` passes |

---

## Retake Logic

| Rule | Behavior |
|---|---|
| Before deadline | One shot. No retakes. |
| After deadline + `allowRetakes = true` | Infinite retakes, no cooldown, no cap |
| After deadline + `allowRetakes = false` | Exam closed, no retakes |
| `scheduleEnd` not set | No deadline — retakes never available (exam stays open but no "after deadline" state) |
| `attemptNo` | Increments normally (1, 2, 3...). `attemptNo = 1` is the official attempt |

---

## Result Visibility (`feedbackMode`)

| Mode | Before `scheduleEnd` | After `scheduleEnd` |
|---|---|---|
| `IMMEDIATE` | Results shown right after submission | Results shown |
| `AFTER_SUBMIT` | Results hidden — "Results pending" card, no score | First attempt result released. Retake results stay hidden from **admin views only** |

**Edge case:** If no `scheduleEnd` is set, `AFTER_SUBMIT` behaves like `IMMEDIATE` (no deadline to wait for).

**`feedbackMode` is required** — no default. Reviewers must explicitly choose when creating/editing an exam.

---

## Reviewee Experience

| Surface | Behavior |
|---|---|
| Exam list (Past section) | Shows first attempt only. Score shown if `IMMEDIATE`, "Submitted" if `AFTER_SUBMIT` and deadline not passed |
| Result page | All attempts visible with full details (score, rationalizations, per-question breakdown). Attempt selector dropdown for multiple attempts |
| After first submit + retakes enabled | "Retake for Practice" button + info notice: *"Only your first attempt is recorded. Retakes are for your own practice."* |
| `AFTER_SUBMIT` result page (before deadline) | "Results pending" card — no score, no details, just "Results will be available after the exam deadline" |
| Exam instructions page | Shows notice when `feedbackMode = AFTER_SUBMIT`: "Results will be available after the exam deadline" |

---

## Admin/Reviewer Experience

| Surface | Behavior |
|---|---|
| Submissions tab | `WHERE attemptNo = 1` — one row per student, no retake rows |
| Results tab (analytics) | Aggregations based on first attempt only |
| Exam list score display | First attempt score only |
| Create/Edit form | "Allow practice retakes after deadline" toggle (renamed from "Allow retakes after deadline") |
| Create/Edit form | "Show results" radio group: "Immediately after submission" / "After exam deadline" — required, no default |
| Create/Edit form | `maxAttempts` input removed |
| Create/Edit form | `cooldownMinutes` input removed |
| Create/Edit form | `closeOnDeadline` toggle removed — auto-closes if deadline is set |

---

## What's NOT Changing

- `scheduleStart` / `scheduleEnd` — deadline handling stays the same
- `timeLimitMinutes` — exam duration per attempt stays the same
- `enforceExamSingleTab` / `tabSwitchGraceSeconds` — untouched
- Exam states (`LIVE`, `DRAFT`, `ARCHIVED`, `CLOSED`) — unchanged
- Notification system — unchanged
- Track visibility — unchanged
- `ExamSection`, `ExamQuestion`, `AttemptAnswer` models — unchanged

---

## Known Bug to Fix

`startAttempt` (`attempt.service.ts:367`) always rejects when `scheduleEnd <= now` without checking `allowRetakes`. This must be updated to allow post-deadline attempts when `allowRetakes = true`.
