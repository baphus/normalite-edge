# Normalite EDGE — App UI design system (v1.1.0)

Rules for **authenticated app surfaces** (dashboards, managers, editors, detail
pages). Marketing and auth pages are out of scope — they have their own look and
`DESIGN.md` governs the brand layer above this.

`DESIGN.md` defines the brand (palette, typefaces, radius scale). This document
defines how those are *applied* in dense product UI, and where the shared
components live. Where the two appear to conflict, the tokens in
`client/src/index.css` are the authority — see "Radius" below for a worked example.

> Supersedes `design-system-v1.0.0.md`. See the changelog for what moved.

---

## 1. Why this exists

Four visual dialects accumulated in `client/src/pages` before this was written:

| Dialect | Signature | Example |
| --- | --- | --- |
| A — current system | slate, 12px floor, weight ≤600 | `ManageExamsPage` |
| B — old editor | slate + `font-black uppercase tracking-widest` + `rounded-2xl` | `ManageExamViewPage` |
| C — gray card grid | `-gray-*`, `text-[9px]`–`[11px]`, card grids | dashboards |
| D — admin table | slate + `text-2xl` H1 + `h-10` controls + hardcoded `#800000` | `ProgramsPage` |

Dialect A is the target. The rest are migration debt, tracked in §9.

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
- **Category colour, where used, is confined to the badge.** `lib/categoryTone.ts`
  owns it. Tinting a whole card by category was tried on `/study` and removed:
  `Category` is a database model with an admin CRUD page, so a map keyed on
  literal category names silently collapsed every admin-created category to one
  fallback colour and lost the colour entirely on rename. Tones are derived from
  the category id so they are stable, and the badge always carries the name, so
  category is never conveyed by colour alone either.

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
| `ResourceGrid` | The card-grid counterpart: responsive columns, the same four states, card supplied as a render prop. Does **not** paginate |
| `ManageToolbar` | Title, search, segmented control, inline filters, popover filters, removable filter chips, view toggle |
| `CollectionState` | `CollectionEmpty` / `CollectionError` — shared so table and grid views cannot diverge |
| `StatusPill` | Status as dot + text |

`ResourceTable` takes a `ResourceColumn<T>[]`. Mark one column `primary` (line 1
of the stacked row), at most one `status`, and any number `stacked` (the line-2
meta strip). Pass `resetKey` — a serialisation of active filters — so filtering
never strands the user on a page that no longer exists.

`ResourceGrid` exists because both manager pages had grown a private copy of the
same container — same wrapper, same three-state preamble, same card shell — so a
fix to one never reached the other. `CollectionState` stopped the *states*
diverging; this stops the container diverging. Only the frame is shared: the card
is a render prop, because a manager card (status + kebab + meta) and a reviewee
card (category + one decisive action) genuinely differ.

`ManageToolbar`'s `segments` are not ownership-specific despite the original
comment. Any mutually-exclusive scope with honest counts belongs there — ownership
on the manager pages, exam status on `/exams`. Compute segment counts from a set
with every filter applied **except** the segment dimension, or the counts lie.
`createAction` is optional; reviewee surfaces browse rather than author.

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
`lib/questionImage.ts`, `lib/formatters.ts`, `lib/categoryTone.ts`.

---

## 6. Required patterns

**List surfaces.** Four states are mandatory and must be distinguishable:
loading (skeletons), empty ("nothing yet"), no-match (offers *Clear filters*,
**not** *Create*), and error (message + Retry). A fetch failure must never render
as an empty list.

**Form default depends on the job.**

| Surface | Default | Secondary |
| --- | --- | --- |
| Manager / audit (`/manage-*`, admin) | table | grid |
| Reviewee browse (`/exams`, `/study`) | **grid** | table |

This is a deliberate, scoped exception, not licence to pick per page. Auditing
means comparing many records across many attributes, which is what a table is
for. Browsing-and-picking means evaluating one record at a time and taking a
decisive action on it — a card carries that action at a legible size where a
table row cannot. Both forms must render the **same** records and the same
information; a toggle that changes what you can see is the divergence
`CollectionState` and `ResourceGrid` exist to prevent.

**Sorting lives on column headers, never in a filter menu.** A consequence of the
row above: the grid has no headers, so the grid has no user sorting. It renders
one deliberate fixed order and sorting is a reason to switch to the table. Do not
reintroduce a `Sort by` select to work around this — that is the pattern this
rule names.

**One control per dimension.** `/exams` previously had status as *both* a
collapsible section per state *and* a select in the filter popover, wired
together by a scroll-into-view effect; `/study` had category as *both* a pill row
*and* a popover select. Pick one surface per filterable dimension. Where a
dimension is worth promoting, use the toolbar's segments (with counts) or the
inline filter slot — not a second bespoke control.

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

**Never let the client be the authorization boundary.** A reviewee-facing list
must be scoped on the server, from the user row — not from token claims and not
by filtering in the browser. Both failure modes were live before v1.1.0:
`/decks` gated its track restriction on a field `req.user` does not carry, so the
restriction never applied at all; `/exams` was correctly scoped server-side but
carried a *second*, stricter, string-based filter in `ExamsPage` that could hide
exams the server had legitimately returned. `services/revieweeVisibility.ts` now
owns the predicate for both. A missing track must **narrow** the result set, never
widen it.

---

## 7. Accessibility bar — WCAG 2.1 AA on touched surfaces

Required whenever a surface is modified:

- `aria-label` on every icon-only control
- Table semantics: `scope`, `aria-sort` on sortable headers, a caption
- Grid semantics: the card grid is a list (`<ul>`/`<li>`) with an accessible name
- Keyboard parity for drag-and-drop (dnd-kit `KeyboardSensor` +
  `sortableKeyboardCoordinates`) — pointer-only reorder fails 2.1.1
- Visible focus rings on every interactive element
- No `<Link>` wrapping `<DropdownMenuItem>` — use `asChild`
- 12px type floor (also serves 1.4.4)
- Status by dot + text, not colour; category by badge text, not colour

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

**Baseline your lint.** The repo carries pre-existing `no-explicit-any`,
`react-hooks/purity` and `react-hooks/set-state-in-effect` findings. Capture a
baseline *before* you start (lint the unmodified tree, record the total) and
compare against that number rather than zero. At v1.1.0 the client-wide total is
**118 problems (107 errors, 11 warnings)**.

Server-side logic **is** testable — `server/src/__tests__`, `tsx --test`, no
Jest. Pure validators and pure query builders need no database; extract a pure
seam rather than reaching for a live connection. Prove a new test is meaningful
by running it against the pre-change code and confirming it fails.

**Review is not self-review.** Work is reviewed by an agent with no memory of
having written it.

---

## 9. Migration status

| Surface | Dialect | State |
| --- | --- | --- |
| `ManageExamsPage`, `ManageMaterialsPage`, `CreateExamPage`, `StudyMaterialEditorPage` | A | Done (PR #33) |
| `ExamsPage`, `StudyHubPage` | A | **Done (v1.1.0)** — grid default, table secondary, `ResourceGrid` extracted |
| `ProgramsPage`, `CampusesPage`, `StudentManagementPage`, `UserManagementPage` | D | **Next** — already table-shaped; also fixes `#800000` |
| `ManageExamViewPage`, `MaterialViewPage`, `RevieweeExamViewPage`, `RevieweeMaterialViewPage` | B | Pending — the jarring transition out of the new tables and grids |
| `ExamPerformancePage`, `CalendarPage`, `TakeExamPage`, `VideoConferencePage`, `ProfilePage`, `SettingsPage`, dashboards | C | Long tail — large, bespoke, low shared-component leverage |

Repo-wide drift measured at v1.0.0: **475** sub-12px sizes, **272**
`font-black`, **1,735** `-gray-*` (vs 602 `-slate-*`). `/exams` and `/study` have
since been removed from those counts; the rest stand.

---

## 10. Standards-readiness note

Per project policy this document was checked against ISO 9001, ISO 27001, DPTM,
and SOC 2 readiness. It is **not** a certification artefact — it is an internal
engineering standard. Relevant points:

- **Access control (§6, last rule) — new at v1.1.0 and the most material item.**
  A live fail-open authorization defect was found and fixed during this work:
  `GET /decks` never applied track scoping to any reviewee, so every reviewee
  could retrieve every published deck across every track. Relevant to ISO 27001
  A.5.15 / A.8 and SOC 2 Confidentiality. Two things follow for audit readiness:
  the rule is now stated so it is designed in rather than retrofitted, and if a
  formal record is ever required, this incident predates any access-review
  evidence and would have to be reconstructed from git history. Consider whether
  it warrants an entry in a security incident log.
- **Accessibility (§7)** remains the item most likely to require rework if
  deferred. DPTM and public-sector procurement commonly expect a stated
  conformance target; §7 sets one, but no formal conformance record exists yet.
- **Change control (§6, dirty guard).** Unsaved-work protection supports data
  integrity expectations under ISO 27001 A.8 / SOC 2 Processing Integrity. The
  guard is partial by design (browser navigation only); if an auditor treats
  in-app navigation loss as a data-integrity gap, moving to a React Router data
  router is the remedy and would be a structural change.
- **Segregation of duties (§8).** The no-self-review rule is stated here for the
  first time; it supports ISO 9001 clause 8.3.4 and SOC 2 CC8.1 change-management
  expectations, but is enforced by convention, not tooling.
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
| v1.1.0 | 2026-08-03 | Reviewee browse surfaces migrated. §3 category colour confined to the badge and derived from the category id. §5 adds `ResourceGrid` and generalises `ManageToolbar` segments; `createAction` optional. §6 adds the form-default table (grid for browse, table for audit), the consequence for sorting, "one control per dimension", and the client-is-never-the-authorization-boundary rule. §7 adds grid list semantics and category-not-by-colour. §8 adds the lint baseline figure and the no-self-review rule. §9 retires the `ExamsPage`/`StudyHubPage` row. §10 records the `/decks` fail-open access-control defect found and fixed during this work. |
| v1.0.0 | 2026-08-03 | Initial. Extracted from the materials/exams manager redesign (PR #33) — type scale, colour, radius, shared component inventory, required patterns, a11y bar, verification, migration status. |
