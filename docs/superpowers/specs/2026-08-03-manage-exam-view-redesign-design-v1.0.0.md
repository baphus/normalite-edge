# ManageExamViewPage redesign — design (v1.0.0)

Design for migrating `client/src/pages/ManageExamViewPage.tsx` (`/manage-exams/:id/view`)
from visual dialect B to dialect A, per `docs/design-system-v1.1.0.md` §9.

Status: approved 2026-08-03. Supersedes nothing.

---

## 1. Why

`/manage-exams/:id/view` is the page a manager lands on immediately after clicking a
row in the redesigned `/manage-exams` table. It is the last high-traffic manager
surface still on the old dialect, so the inconsistency is felt on every drill-down.

Measured in the current file (1,546 lines):

| Marker | Count | Rule broken |
| --- | --- | --- |
| `font-black` | 13 | §2 — weight caps at 600 |
| `rounded-2xl` | 9 | §4 — not used in app UI |
| `text-[10px]` | 20 | §2 — 11px floor, headers/badges only |
| `uppercase` | 26 | §2 — structural signposts only |
| `tracking-widest` | 13 | §2 |
| `aria-label` | 0 | §7 — required on every icon-only control |

Colour is largely compliant (114 `-slate-*`, zero `-gray-*`), so this is a weight,
size, radius and structure problem rather than a palette one.

### 1.1 The alignment defect

`DashboardLayout.tsx:75` already wraps every routed page:

```
w-full max-w-screen-2xl mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5
```

Migrated pages therefore open with `<div className="flex flex-col gap-3 pb-6 font-lexend">`
and add no padding. `ManageExamViewPage` instead opens with
`flex-1 flex flex-col min-w-0 bg-[#f8f5f5] min-h-screen`, then an internal
`sticky top-0 z-10 px-8 py-4` header, then `p-8 space-y-8`. Three visible consequences:

1. Content is inset ~32px further than every other page, so the left edge shifts on
   navigation from `/manage-exams`.
2. `min-h-screen bg-[#f8f5f5]` paints a grey slab inside an already-padded, already-centred
   container, so the background stops short of the window edge and reads as a floating
   panel. `#f8f5f5` is also a hardcoded hex (§3).
3. A second sticky header, at `z-10`, inside the scroll container — `DashboardLayout`
   already has one at `z-30`.

### 1.2 Findings beyond the brief

Established by direct reading during design, not assumed:

- **Seven jobs, not five.** The score-distribution chart (`:1083-1109`) and top-programs
  panel (`:1112-1139`) are additional bespoke surfaces. Both carry `text-[10px]` labels,
  and the distribution chart's counts are reachable **only on hover**
  (`opacity-0 group-hover:opacity-100`, `:1101`) — pointer-only, WCAG 2.1.1 failure.
  `bg-[#D4AF37]` appears on the program bars, a second instance of that hardcoded hex.
- **No `data-guide` attributes on this page.** Zero occurrences; 51 exist repo-wide. The
  only one in this render path is `data-guide="page-content"` on the layout wrapper.
  Markup can be restructured without breaking `PageGuideOverlay`.
- **`ExamPerformancePage.tsx` (710 lines) is unrouted and unimported** — dead code that
  reads as a superseded draft of this surface. §9 lists it as dialect-C migration debt,
  which overstates the remaining work. Left in place by decision (§4.7); noted for §9.
- **Third-party PII flow.** `getAvatarUrl` (`:295`) sends each student's full name to
  `ui-avatars.com` in a query string, once per row. See §6.
- **Silent truncation.** `fetchAllAttempts` (`:323`) hand-rolls pagination; when
  `meta.totalPages` is absent it resolves to the current page, exiting after one request
  and capping at 500 attempts with no signal. See §6.
- **Misleading zero state.** `attemptSummary` (`:459-485`) returns `0` for average,
  highest and lowest when no attempt has been submitted, so an exam with no submissions
  renders "Average 0.00% / Highest 0.00% / Lowest 0.00%".
- **Export defects.** jsPDF and jspdf-autotable are statically imported (`:37-38`) while
  exceljs is dynamic (`:229`); `handleExportStudentScores` has `try/finally` with no
  `catch` and the page imports no toast, so failures are silent; `#800000` is baked into
  both the PDF (`setFillColor(128, 0, 0)`) and the Excel header (`argb: 'FF800000'`),
  which §3 identifies as a different, brighter red than the `#7B1E21` primary and "a bug,
  not a variant"; the header's "Export Full PDF" and the dialog's PDF button produce
  different output under the same label; `exportingScores` guards Excel but not PDF.
- **`submission-analytics` has a side effect.** `exam.service.ts:393` calls
  `closeExpiredLiveExams()`, transitioning deadline-expired LIVE exams to CLOSED. The
  request cannot be dropped even though the page consumes only `scheduleEnd` from it. It
  also returns `canStudentsSubmit` and a written `message` that the page fetches and
  discards.

---

## 2. Scope

**`ManageExamViewPage` only.** `MaterialViewPage`, `RevieweeExamViewPage` and
`RevieweeMaterialViewPage` (339 / 470 / 197 lines) remain on dialect B and follow in a
separate change.

Rationale: rewriting 1,546 lines is already a large diff for a no-self-review pass, and
bundling four pages degrades that review. The three remaining pages serve different
audiences — one is reviewee-facing — so a shell component extracted now would be designed
against one real caller and three hypotheses.

The obligation this creates: the shell contract is written into the standard as a **rule**
(§9 below, landing in the standard's §6), not left implicit in this page's source, so the
follow-up has something to conform to.

---

## 3. Information architecture

A persistent identity header, then three tabs.

```
┌ Exam library / General Education ───────────────────┐
│ LET Review Mock 3                        ● Live     │
│                          [Export ▾]  [Edit exam]    │
│ 120 items · 90m · Due 14 Aug 2026 · 2 attempts      │
│ Students can still submit until the exam deadline.  │
├─────────────────────────────────────────────────────┤
│ [ Results ]   Submissions 84   Questions 120        │
├─────────────────────────────────────────────────────┤
│ ┌Submitted┐┌ Average ┐┌ Highest ┐┌ Lowest ┐         │
│ │   84    ││  76.4%  ││  98.0%  ││ 41.7%  │         │
│ └─────────┘└─────────┘└─────────┘└────────┘         │
│ ┌ Score distribution ────┐┌ By program ───────┐     │
│ └────────────────────────┘└───────────────────┘     │
└─────────────────────────────────────────────────────┘
```

**Why tabs.** The questions list is unbounded — a 120-item exam renders 120 cards at
roughly 200px each into the same scroll as everything else. And §6's list-surface rules
cannot be honoured for the submissions table without giving it a header area it owns,
which is what a tab panel is.

**Cost, stated.** `components/ui/tabs.tsx` exists but has **zero callers** anywhere in the
client, and §5 does not list it. This introduces a primitive with no precedent, which is
why §5 gains a row for it (§7).

- Tab state lives in `?tab=` via `useSearchParams`, already used in five pages.
- Default tab is `results`; an unrecognised value falls back to `results`.
- Tab labels carry counts.
- Exam **facts** (items, duration, deadline, attempts) stay in the persistent header
  because they are configuration; **outcomes** (the KPIs) live in Results.

### 3.1 Results tab

Four `MetricTile`s, then the two charts.

- Value: `text-[24px] font-semibold tabular-nums`. Label: 11px uppercase 600.
- `—` when there are no submitted attempts. Not `0.00%`.
- Percentages to one decimal.
- Removed: the emerald "Total Attempts" and "Top" pills, the rose "Alert" pill, and
  `border-l-4 border-l-[#D4AF37]`. "Alert" on the lowest score conveys nothing, and the
  tinting reads as status on a value that has none.
- **Charts become text-first.** Each band's count renders permanently beneath its bar; the
  bar is `aria-hidden` decoration sized by percentage. This removes the hover-only tooltip
  and the 2.1.1 failure without building a keyboard tooltip. The chart is marked up as a
  list with an accessible name (§7).
- `bg-[#D4AF37]` and the alternating `bg-primary/80` / `bg-primary/40` both go; one colour.

### 3.2 Submissions tab

`ManageToolbar` (heading and view toggle omitted — see §5) above `ResourceTable`.

Filter mapping, satisfying "one control per dimension":

| Dimension | Control |
| --- | --- |
| Attempt status | Toolbar `segments`, with counts computed over every filter **except** status |
| Score band | Inline select |
| Program | Popover filter |
| Campus | Popover filter |
| Free text | Toolbar search |

Removed: the bespoke collapsible Filters panel (`:1191-1278`) and the Shown / Done / Open
mini-tiles, whose information the segment counts now carry honestly.

`ResourceTable` supplies sortable `aria-sort` headers, the four mandatory states,
pagination with true totals, the stacked sub-`lg` row, and the `sr-only` caption.
`resetKey` is a serialisation of all five filters. Default order stays newest-first via
`initialSort`; `ResourceTable`'s internal sort state needs no change because there is no
grid to keep in agreement (§3.4).

Columns: Student (primary, name + email) · Program / Section (stacked) · Campus (stacked) ·
Attempt (stacked) · Raw score · Percentage · Status (`StatusPill`) · Submitted · Time spent.

The percentage cell stops being tinted emerald/slate by attempt status. That is colour-only
semantics (§3, WCAG 1.4.1) applied to a *score*, which has no status. Plain text, `—` when
not submitted.

### 3.3 Questions tab

Section pill row (one control per dimension) plus the question list. Gains the empty state
("this exam has no questions") and the no-match state (a section filter matching nothing,
offering *Clear filter*, not *Create*).

### 3.4 No grid view

The Submissions panel ships a table only, with no view toggle.

§6's form-default table assigns manager/audit surfaces a table default and a grid
secondary. The justification §6 gives for grids is that a card "carries that action at a
legible size where a table row cannot" — and a student attempt has no decisive per-record
action. §6 also requires both forms to render the same records and the same information,
so a trimmed card is not available as a compromise; the honest card would be a table row
drawn in a box.

This is recorded as a **clarification to §6** (§7), not left as an unexplained deviation.

---

## 4. Decisions

| # | Decision | Chosen |
| --- | --- | --- |
| 4.1 | Scope | This page only; shell contract written into the standard |
| 4.2 | IA | Persistent header + facts strip + three tabs, URL state, default Results |
| 4.3 | Toolbar | Widen `ManageToolbar` with optional props (§5) |
| 4.4 | KPIs | Four tiles, restyled; new §2 display row |
| 4.5 | Export | Extract to `lib/` + page-local dialog, fix five defects (§6) |
| 4.6 | Files | Page-local `components/exam-view/`; only `MetricTile` shared |
| 4.7 | Adjacent | Drop `ui-avatars.com`; swap to `fetchAllPages`. `ExamPerformancePage` left untouched |
| 4.8 | §6 grid | No grid; clarify the rule |
| 4.9 | Fetch | `allSettled`, per-panel errors, surface `examStatus.message` |

Four judgement calls made without a separate decision point, approved with the design:

1. `<h1>` is the exam title alone. "Exam Results Analytics:" labels the page's function,
   which the tabs now state.
2. The percentage cell loses its status tinting (§3.2).
3. `StatusPill` gains two additive tone aliases, `success` and `pending`, mapping to the
   existing emerald and amber classes. Reusing `live` / `draft` for an *attempt* renders
   correctly but reads as a bug in source.
4. Percentages render to one decimal. `41.67%` is false precision.

---

## 5. Shared-component changes

Both are **additive and backwards compatible**. All four existing callers
(`ManageExamsPage`, `ManageMaterialsPage`, `ExamsPage`, `StudyHubPage`) pass every prop
today and are untouched.

### `ManageToolbar`

- `title` and `description` become optional. When absent, the heading block is not
  rendered. Required because the toolbar hardcodes `<h1>` (`ManageToolbar.tsx:89`) and the
  page already has one; a second would reintroduce the heading-order defect being fixed.
  The Submissions panel supplies its own `sr-only` `<h2>`.
- `view` and `onViewChange` become optional. When absent, the view toggle is not rendered
  (§3.4).

### `StatusPill`

- `StatusTone` gains `success` and `pending`, reusing the existing emerald and amber class
  pairs. No visual change to any current caller.

### New: `components/manage/MetricTile.tsx`

The one component promoted to the shared directory. Its purpose is to **encode the new §2
display row** — label, `text-[24px] font-semibold tabular-nums` value, `—` for no data — so
the next surface needing a KPI number cannot hand-roll `text-3xl font-black`.

The distinction being drawn: a component that enforces a stated rule earns the shared
directory at one caller; a component that merely anticipates a second caller does not.
That is why the detail header, the tab shell and the charts stay page-local despite being
equally reusable in principle.

---

## 6. Adjacent fixes in scope

**Remove `ui-avatars.com`.** Student initials render locally, as `ManageExamsPage`'s
`AvatarFallback` already does. The current code sends each student's full name to an
unauthenticated third party once per row, in bulk, on every render — a data flow with no
processor agreement. ISO 27001 A.5.14 / A.5.19, SOC 2 Confidentiality. Recorded in §10 of
the standard.

**Swap `fetchAllAttempts` for `lib/fetchAllPages.ts`,** matching `ManageExamsPage`, and
warn via toast when it reports `truncated`. Closes the silent 500-attempt cap. An export
labelled "complete report" that quietly omits rows is a processing-integrity defect, not a
UI one — SOC 2 Processing Integrity.

**Export subsystem** — extracted and repaired:

- Generation moves to `client/src/lib/examReportExport.ts`, pure, no React: takes data,
  returns or saves a blob. Care required — `handleExportPDF` currently reads
  `questionsWithSection`, which is declared *below* it (`:911`) and captured by closure.
- The dialog moves to `components/exam-view/ExportScoresDialog.tsx` — page-local, not
  `components/manage/`, because nothing else exports scores and its column set is
  exam-specific.
- jsPDF and jspdf-autotable become dynamic imports, matching the exceljs precedent already
  in the file. The PDF bundle stops loading for every visitor who never exports.
- Both paths gain `catch` and an error toast.
- The header collapses to a single `Export ▾` menu, so there is one set of scope semantics
  rather than two buttons labelled the same producing different output.
- PDF export is guarded against double-fire, as Excel already is.
- `#800000` and `#D4AF37` are replaced with the primary token's RGB in both the PDF and the
  Excel header fill.

**Out of scope by decision.** `ExamPerformancePage.tsx` is left untouched despite being
dead code. §9's dialect-C row is annotated to record that it is unrouted, so the next
reader does not budget migration effort for it.

---

## 7. Fetching and failure

`Promise.all` (`:359`) is replaced with independent settlement:

- **Exam detail is required.** On failure the page renders `CollectionError` with Retry —
  replacing the current dead-end card whose only action is "Back to Exams", which §6 does
  not permit.
- **Attempts and analytics degrade independently.** The Submissions and Results panels
  render their own error state with their own Retry. A failed attempts request must never
  render as an empty submissions list — §6 forbids this explicitly.
- `examStatus.message` is surfaced in the header facts strip, using a value the page
  already fetches and discards.

Loading: skeleton header and skeleton tiles; `ResourceTable`'s own loading state for
submissions.

---

## 8. File decomposition

```
pages/ManageExamViewPage.tsx        ~250   shell, fetch, tab state
components/exam-view/
  ExamDetailHeader.tsx               ~90   breadcrumb, h1, StatusPill, actions, facts strip
  ExamResultsTab.tsx                ~140   MetricTiles + both charts
  ExamSubmissionsTab.tsx            ~220   toolbar wiring + ResourceTable columns
  ExamQuestionsTab.tsx              ~120   section filter + question list
  ExportScoresDialog.tsx            ~110
  types.ts                           ~80   ExamDetails, AttemptItem, StudentScoreRow
components/manage/MetricTile.tsx     ~40
lib/examAnalytics.ts                ~120   pure: summary, distribution, top programs
lib/examReportExport.ts             ~280   pure: PDF + Excel generation
```

Line counts are targets, not commitments. `ExamSubmissionsTab` is the most likely to run
over once five filters and their chips are wired.

`formatDate`, `formatPercent`, `formatDuration` and `formatCompactNumber` are currently
local to the page. `lib/formatters.ts` provides `formatShortDate` and
`formatDurationMinutes` only — it does **not** cover date-with-time, percentages, or
seconds-to-duration. The three uncovered formatters move to `lib/formatters.ts` rather
than being reimplemented; `formatCompactNumber` is dropped, since compact notation on a
submission count is a needless abstraction at these magnitudes.

---

## 9. Standard changes — `docs/design-system-v1.2.0.md`

New file. v1.1.0 retained, changelog carried forward, `AGENTS.md` pointer repointed.
**MINOR** — new sections and rows, no rewrite.

| § | Change |
| --- | --- |
| 2 | New row: `Metric value (display)` — 24px, weight 600, `tabular-nums`, paired with an 11px uppercase label. Explicitly **not** an exception to the weight cap: the cap exists because heavy weights hurt legibility at small sizes, and 600 at 24px is already emphatic. "Weight caps at 600" stays absolute. |
| 5 | `MetricTile` added to the `components/manage/` inventory. `ManageToolbar` entry notes that heading and view toggle are optional, so it serves detail-page panels. `ui/tabs` recorded as the tab primitive for multi-job detail pages. |
| 6 | Two additions. **Clarification:** the form-default table governs **page-level collection surfaces**, not collection panels embedded in a detail page — a panel whose records carry no decisive per-record action ships table-only. **New rule, the detail-page shell contract:** no padding on the page root (`DashboardLayout` supplies it), exactly one `<h1>`, no second sticky header, no page-level background. |
| 7 | Charts and other graphical data displays must convey their values as text, not by hover — a count reachable only on pointer hover fails 2.1.1. Card grids and chart bands are lists with accessible names. |
| 9 | `ManageExamViewPage` retired from the dialect-B row. Note that `ExamPerformancePage` is unrouted and unimported. |
| 10 | The `ui-avatars.com` third-party PII flow, found and removed during this work. The `fetchAllPages` truncation hole as the reason the shared helper is mandatory rather than preferred. |

### Standards-readiness check

Applied per project policy. `design-system-v1.2.0.md` is an internal engineering standard,
not a certification artefact.

- **ISO 27001 A.5.14 / A.5.19, SOC 2 Confidentiality** — the `ui-avatars.com` flow. Fixed
  here. Like the `/decks` fail-open defect recorded at v1.1.0, it predates any
  access-review evidence and would have to be reconstructed from git history if a formal
  record were ever required. Worth an entry in a security incident log if one exists.
- **SOC 2 Processing Integrity** — the attempt-fetch truncation hole. Fixed here; named in
  §10 so the shared-helper rule is understood as an integrity control, not a style
  preference.
- **ISO 9001 clause 7.5** — the standard still carries no owner, review cycle or approval
  record. Unchanged from v1.1.0, still flagged, not blocking.
- **ISO 9001 8.3.4 / SOC 2 CC8.1** — the no-self-review rule is honoured for this change
  (§10) but remains enforced by convention rather than tooling. Unchanged.
- **DPTM / accessibility** — §7's conformance target is restated and extended here (chart
  text alternatives, list semantics). No formal conformance record exists yet; this remains
  the item most likely to need rework if deferred.

---

## 10. Verification

Per §8 of the standard. The client has no test tooling and none is added.

1. **Baseline lint on the unmodified tree first**, and record the total. Compare against
   that number, not zero. **Measured on the unmodified tree at 2026-08-03: 118 problems
   (107 errors, 11 warnings)** — matching the figure §8 of the standard records.
2. `cd client && npx tsc --noEmit`
3. `npm run lint` — at or below baseline
4. `npm run build` (`tsc -b && vite build`) — stricter than `--noEmit` and has previously
   caught what it missed
5. **Browser walkthrough**, every state of every surface touched: all three tabs; the
   submissions table in loading, empty, no-match and error; each of the five filters and
   their chips; sorting on every sortable column; pagination; the export dialog in both
   scopes with partial column selection; both export formats; an export failure; the
   sub-`lg` stacked row; keyboard traversal and visible focus on every control.
6. **Server tests** — `cd server && npm test`. No server code changes, so this confirms
   they are unaffected. No new server test is justified, and per §8 none is invented to
   look thorough.
7. **Review by an agent with no memory of the work**, per §8 and project policy. Findings
   addressed or explicitly declined with a reason.

## 11. Definition of done

- Page root carries no padding; left edge aligns with `/manage-exams`.
- Zero `font-black`, zero `rounded-2xl`, zero hardcoded hex, nothing below 11px, 11px
  confined to headers and badges.
- Exactly one `<h1>`, correct heading order, `aria-label` on every icon-only control,
  visible focus rings, `StatusPill` for both exam and attempt status.
- Submissions table has all four states; a fetch failure never renders as an empty list.
- No chart data reachable only by hover.
- No student PII sent to a third party.
- `tsc` clean, `build` clean, lint at or below the recorded baseline, server tests green,
  browser walkthrough complete.
- Reviewed by an agent that did not write it.

---

## Changelog

| Version | Date | Change |
| --- | --- | --- |
| v1.0.0 | 2026-08-03 | Initial. Written after design review against `docs/design-system-v1.1.0.md`, from a direct read of `ManageExamViewPage.tsx`, `ManageExamsPage.tsx`, all five `components/manage/` files, `DashboardLayout.tsx`, `lib/formatters.ts`, `lib/fetchAllPages.ts` and `server/src/services/exam.service.ts`. |
