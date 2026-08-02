# Normalite EDGE — App UI design system (v1.0.0)

Rules for **authenticated app surfaces** (dashboards, managers, editors, detail
pages). Marketing and auth pages are out of scope — they have their own look and
`DESIGN.md` governs the brand layer above this.

`DESIGN.md` defines the brand (palette, typefaces, radius scale). This document
defines how those are *applied* in dense product UI, and where the shared
components live. Where the two appear to conflict, the tokens in
`client/src/index.css` are the authority — see "Radius" below for a worked example.

---

## 1. Why this exists

Four visual dialects accumulated in `client/src/pages` before this was written:

| Dialect | Signature | Example |
| --- | --- | --- |
| A — current system | slate, 12px floor, weight ≤600 | `ManageExamsPage` |
| B — old editor | slate + `font-black uppercase tracking-widest` + `rounded-2xl` | `ManageExamViewPage` |
| C — gray card grid | `-gray-*`, `text-[9px]`–`[11px]`, card grids | `ExamsPage`, dashboards |
| D — admin table | slate + `text-2xl` H1 + `h-10` controls + hardcoded `#800000` | `ProgramsPage` |

Dialect A is the target. The rest are migration debt, tracked in §7.

---

## 2. Type scale

**Nothing below 12px.** Density comes from row height and padding, never from
smaller glyphs. Shrinking type to 9px while keeping ten metadata rows per card
buys neither density nor clarity — that was the state before this system.

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Page title | 18px | 600 | `text-[18px] font-semibold tracking-tight` |
| Section / column header | 11px | 600 | uppercase, `tracking-[0.06em]`, muted |
| Table body / field value | 13px | 400–500 | |
| Secondary / meta | 12px | 400 | muted |
| Badge, pill | 11px | 600 | |

**Weight caps at 600.** No `font-black` (weight 900) anywhere.

**Uppercase is reserved for structural signposts** — column headers and section
labels only. Field labels, button text, and values are sentence case. All-caps
measurably slows reading at small sizes; it earns its place marking structure,
not shouting content.

Body font is Lexend (`--font-lexend`). Fraunces (`--font-serif`) is a brand
display face and is not used in dense app UI.

---

## 3. Colour

- **Neutral: slate.** Never `-gray-*`. Slate reads cooler next to the maroon
  primary; mixing the two ramps is visible.
- **Never hardcode brand hex.** Use the `primary` token.
  `index.css` sets `--primary: 358 61% 30%` = `#7B1E21`, matching `DESIGN.md`'s
  `#7A1E1E`. `#800000` — currently hardcoded 61 times across the four admin
  pages — is a **different, brighter red** and is a bug, not a variant.
- **Status is never colour alone** (WCAG 1.4.1). Always dot + text. Use
  `components/manage/StatusPill`.

---

## 4. Radius

`index.css` sets `--radius: 0.5rem` and maps `--radius-lg: var(--radius)`. So in
this project:

| Class | Actual | Use for |
| --- | --- | --- |
| `rounded-lg` | **8px** | buttons, inputs, selects, chips |
| `rounded-xl` | **12px** | cards, panels, table containers |

Do not use `rounded-2xl`/`3xl` in app UI.

> Worth knowing: `DESIGN.md`'s abstract scale lists md=8px / lg=12px, which does
> *not* match the token mapping. A code review flagged `rounded-lg` on buttons as
> a violation on that basis and was wrong. **The tokens win.**

---

## 5. Shared components — use these, don't rebuild

### `client/src/components/manage/` — list surfaces

| Component | Responsibility |
| --- | --- |
| `ResourceTable` | Sortable columns (`aria-sort`), client pagination with true totals, four states, two-line stacked rows below `lg` |
| `ManageToolbar` | Title, search, ownership segmented control, inline filters, popover filters, removable filter chips, view toggle |
| `CollectionState` | `CollectionEmpty` / `CollectionError` — shared so table and grid views cannot diverge |
| `StatusPill` | Status as dot + text |

`ResourceTable` takes a `ResourceColumn<T>[]`. Mark one column `primary` (line 1
of the stacked row), at most one `status`, and any number `stacked` (the line-2
meta strip). Pass `resetKey` — a serialisation of active filters — so filtering
never strands the user on a page that no longer exists.

### `client/src/components/editor/` — question editors

| Component | Responsibility |
| --- | --- |
| `EditorShell` | Breadcrumb, sticky bottom action bar, dirty pill, guarded discard, one-card settings panel |
| `QuestionListEditor` / `QuestionRow` | Collapsed ~44px summary rows, one expanded at a time, DnD with keyboard support, per-row completeness |
| `PublishReadiness` | "N of M complete" + blockers + jump to incomplete |
| `useDirtyGuard` | `beforeunload` warning while dirty |
| `types.ts` | `EditableQuestion` — the shared question shape |

`EditableQuestion` is `{ id, text, options[], correctOption, rationale, imageUrl?, section? }`.
A study-deck card and an exam question are the same object; `section` is
exam-only. Do not reintroduce per-page shapes.

### Shared libs

`lib/fetchAllPages.ts` (walks server pages — list endpoints are paginated and a
single `limit=100` silently truncates), `lib/importQuestions.ts`,
`lib/questionImage.ts`, `lib/formatters.ts`.

---

## 6. Required patterns

**List surfaces.** Table by default; card grid only as a secondary toggle. Four
states are mandatory and must be distinguishable: loading (skeleton rows),
empty ("nothing yet"), no-match (offers *Clear filters*, **not** *Create*), and
error (message + Retry). A fetch failure must never render as an empty list.

**Sorting** lives on column headers, never in a filter menu.

**Editors.** Track dirty state. Discard confirms when dirty; `beforeunload`
warns. Actions in a sticky bottom bar. Validation is live and locatable — never
a toast that says "some question is incomplete" without saying which.

> Scope limit: the app mounts plain `<Routes>`, not a data router, so React
> Router's `useBlocker` is unavailable and in-app sidebar navigation cannot be
> intercepted. Only browser navigation and explicit Discard are guarded.

**Blank rows are dropped, not rejected.** A wholly empty question (no text,
options, rationale, or image) is discarded at submit — it must not become a
validation blocker. See `isQuestionBlank`.

**Nullable text fields use the three-way contract.** A string writes, explicit
`null` clears, an omitted key leaves the stored value untouched. Validators use
`z.string().trim().nullable().optional()` and services set the field only when
the key was sent. Plain `.optional()` cannot express "clear this" — the value
gets stuck forever once set.

---

## 7. Accessibility bar — WCAG 2.1 AA on touched surfaces

Required whenever a surface is modified:

- `aria-label` on every icon-only control
- Table semantics: `scope`, `aria-sort` on sortable headers, a caption
- Keyboard parity for drag-and-drop (dnd-kit `KeyboardSensor` +
  `sortableKeyboardCoordinates`) — pointer-only reorder fails 2.1.1
- Visible focus rings on every interactive element
- No `<Link>` wrapping `<DropdownMenuItem>` — use `asChild`
- 12px type floor (also serves 1.4.4)
- Status by dot + text, not colour

As of v1.0.0 there are **62** `aria-label` attributes across the whole client.
Treat any surface you touch as needing an audit, not a spot check.

---

## 8. Verification

The client has **no test tooling** (no vitest/jest/testing-library) and this is
deliberate. The gate is:

```
cd client && npx tsc --noEmit && npm run lint    # then a browser walkthrough
```

`npm run build` (`tsc -b && vite build`) is stricter than `--noEmit` and has
caught errors the latter missed — run it before claiming done.

**Baseline your lint.** The repo carries pre-existing `no-explicit-any` and
`react-hooks` findings. Capture a baseline first (`git show main:<path>` into a
scratch dir, lint that) so you compare against reality rather than zero.

Server-side logic **is** testable — `server/src/__tests__`, `tsx --test`, no
Jest. Pure validators need no database. Prove a new test is meaningful by
running it against the pre-change code and confirming it fails.

---

## 9. Migration status

| Surface | Dialect | State |
| --- | --- | --- |
| `ManageExamsPage`, `ManageMaterialsPage`, `CreateExamPage`, `StudyMaterialEditorPage` | A | Done (PR #33) |
| `ProgramsPage`, `CampusesPage`, `StudentManagementPage`, `UserManagementPage` | D | **Next** — already table-shaped; also fixes `#800000` |
| `ExamsPage`, `StudyHubPage` | C | Pending — direct reviewee twins. Form decision needed first: browsing is not auditing, so a dense table may be wrong here |
| `ManageExamViewPage`, `MaterialViewPage`, `RevieweeExamViewPage` | B | Pending — the jarring transition out of the new tables |
| `ExamPerformancePage`, `CalendarPage`, `TakeExamPage`, `VideoConferencePage`, `ProfilePage`, `SettingsPage`, dashboards | C | Long tail — large, bespoke, low shared-component leverage |

Repo-wide drift at v1.0.0: **475** sub-12px sizes, **272** `font-black`,
**1,735** `-gray-*` (vs 602 `-slate-*`).

---

## 10. Standards-readiness note

Per project policy this document was checked against ISO 9001, ISO 27001, DPTM,
and SOC 2 readiness. It is **not** a certification artefact — it is an internal
engineering standard. Relevant points:

- **Accessibility (§7)** is the item most likely to require rework if deferred.
  DPTM and public-sector procurement commonly expect a stated conformance target;
  §7 sets one, but no formal conformance record exists yet. If an audit needs
  evidence, a conformance statement per released surface would have to be
  produced retrospectively.
- **Change control (§6, dirty guard).** Unsaved-work protection supports data
  integrity expectations under ISO 27001 A.8 / SOC 2 Processing Integrity. The
  guard is partial by design (browser navigation only); if an auditor treats
  in-app navigation loss as a data-integrity gap, moving to a React Router data
  router is the remedy and would be a structural change.
- **No document-control metadata.** This file has a version and changelog but no
  owner, review cycle, or approval record. ISO 9001 clause 7.5 expects
  controlled documents to carry those. Add them if this doc is ever pulled into
  a certification scope.

Nothing here blocks certification; these are flagged so they are built in rather
than retrofitted.

---

## Changelog

| Version | Date | Change |
| --- | --- | --- |
| v1.0.0 | 2026-08-03 | Initial. Extracted from the materials/exams manager redesign (PR #33) — type scale, colour, radius, shared component inventory, required patterns, a11y bar, verification, migration status. |
