# Full audit — `lightbridge-code-intelligence/apps/web` vs. `ui-web`'s gap list

Companion to [`PRIMITIVES.md`](PRIMITIVES.md) and [`README.md`](README.md). Where those two
documents were written from reading LCI's shared `components/ui/*.tsx` files, this document is
the result of reading **every file** in `apps/web` (56 source files: all routes, all components,
all hooks, all domain logic) plus the repo's only other workspace package (`packages/auth`), to
answer one question precisely: **is the gap list complete, and what's still missing?**

Answer: **no, the original gap list undercounted.** It correctly identified the shape of every
conflict, but not its full surface area, and missed two items entirely. This document corrects
that with exact file counts, then gives the real state of "built vs. still lacking."

- **Baseline**: `lightbridge-code-intelligence@18a2dca` (`main`), hard-reset from `adorsys/main`
  on 2026-08-31 — includes [PR #640](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/pull/640),
  merged the same day.
- **Method**: full-text read of every file listed below, plus `grep` verification across the
  whole `apps/web` tree for daisy classes `ui-web` has explicitly rejected (`badge`, `card`,
  `modal`, `alert`, `progress`, `radial-progress`, `stats`, `drawer`, `table-zebra`, `data-tip`),
  to catch inline usage that bypasses the shared `components/ui/` layer entirely.

---

## 1. Correction: issue #635 is resolved, not open

[`PRIMITIVES.md`](PRIMITIVES.md) and [ADR 0014](../../adr/0014-lci-app-scaffolding-and-code-graph.md)
previously treated `lightbridge-code-intelligence#635` (code-graph label overflow) as an open bug
this epic's port needed to absorb a fix for. It is resolved:
[PR #640](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/pull/640) merged to LCI's
`main` on 2026-08-31, closing #635.

**The actual fix differs from what ADR 0012 originally assumed.** The ADR's first draft assumed
the fix would size each node's box to its rendered label (`layout.ts`, `NODE_WIDTH`/`NODE_HEIGHT`).
The real fix is smaller and doesn't touch `layout.ts` at all — it clips the label to one line
inside the existing fixed 200×44 box:

```diff
 // code-graph-canvas.tsx — per-node style
   fontSize: 12,
   fontFamily: "var(--font-mono, monospace)",
   padding: "6px 10px",
+  overflow: "hidden",
+  textOverflow: "ellipsis",
+  whiteSpace: "nowrap",
 },
- title: `${n.source_file}:${n.start_line}`,
+ domAttributes: { title: `${n.label}\n${n.source_file}:${n.start_line}` },
```

The full label is still reachable — via a native hover tooltip, now actually wired (the old
`title` field wasn't a real `@xyflow/react` `Node` property and was silently dropped; the fix
moves it to `domAttributes`, which xyflow does spread onto the DOM element).

**This has already been corrected in this repo's docs** as part of this audit: ADR 0012's
Decision/Consequences/References sections were rewritten to say "port as-is" instead of "port,
then fix"; `PRIMITIVES.md`'s code-graph row and `README.md`'s `code-graph.svg` description were
updated to match; the wireframe itself (`code-graph.svg`) was redrawn to show label-clipping +
hover tooltip instead of the (incorrect) box-resizing it originally depicted. No remaining
`#635` references treat it as open.

---

## 2. Complete `apps/web` inventory

### Routes (10)

| Route                                   | File(s)                                       | Confirmed purpose                                                                |
| --------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `/sign-in`                              | `app/sign-in/page.tsx`                        | Auth                                                                             |
| `/dashboard`                            | `app/dashboard/page.tsx` + `layout.tsx`       | Overview — KPI row, runs-over-time sparkline, breakdown-by-repo/outcome          |
| `/dashboard/repositories`               | `app/dashboard/repositories/page.tsx`         | Repo list — cards, search, cursor pagination                                     |
| `/dashboard/repositories/[id]`          | `.../[id]/page.tsx` + `layout.tsx`            | Repo overview tab                                                                |
| `/dashboard/repositories/[id]/graph`    | `.../graph/page.tsx`                          | Code graph                                                                       |
| `/dashboard/repositories/[id]/settings` | `.../settings/page.tsx` + `actions.ts`        | Per-repo review config, with a 3-layer default/file/DB-override provenance model |
| `/dashboard/runs`                       | `app/dashboard/runs/page.tsx`                 | Run list — status/repo filters, search, timeline/table view toggle               |
| `/dashboard/runs/[id]`                  | `.../[id]/page.tsx` + `actions.ts`            | Run detail — review output, logs embed                                           |
| `/dashboard/admin`                      | `app/dashboard/admin/page.tsx` + `actions.ts` | **Repository approvals queue** — corrected below                                 |
| `/dashboard/settings`                   | `app/dashboard/settings/page.tsx`             | Account info (read-only, from OIDC claims) + GitHub App link                     |

**Correction to the epic's own summary and this design pass's earlier `README.md`**: `/dashboard/admin`
is not generic "agent status." Reading `app/dashboard/admin/page.tsx` directly: it is a
**repository approval queue** — newly-connected repos stay pending (unindexed, unreviewed) until
an admin with `repo:approve`/`repo:deny` permission approves them; decisions are reversible. This
maps closely onto `ui-web`'s **existing** `ReviewQueue`/`DecisionsLedger`/`review-detail-panel`
sections (built for the console's budget-refill approval flow) — a stronger, more concrete reuse
opportunity than the original design pass identified, since it assumed this screen's shape
without reading its actual implementation.

### Components (26, across 6 directories)

| Directory                 | Files                                                                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/`          | `button`, `card`, `command-snippet`, `pagination`, `search-input`, `select`, `settings-section`, `source-badge`, `states`, `status-pill`, `toggle` — 11 files                                                          |
| `components/shell/`       | `command-palette`, `console-shell`, `nav-link` — 3 files                                                                                                                                                               |
| `components/overview/`    | `insights` — 1 file                                                                                                                                                                                                    |
| `components/repos/`       | `preset-picker`, `repo-analytics-embed`, `repo-list`, `repo-tabs` — 4 files                                                                                                                                            |
| `components/repos/graph/` | `code-graph-canvas`, `code-graph-panel`, `layout`, `node-inspector`, `use-code-graph` — 5 files                                                                                                                        |
| `components/runs/`        | `review-output`, `run-list`, `run-logs-embed`, `run-row`, `run-table`, `run-timeline` — 6 files (previous count missed `run-list.tsx`, the filter/search/view-toggle container `RunTable`/`RunTimeline` render inside) |

### Hooks (3) — not previously catalogued at all

| Hook                                                            | What it does                                                                             | `ui-web` status                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/hooks/use-copy.ts` (`useCopyToClipboard`)                  | Clipboard write + transient "copied" flag, auto-reset on a timer                         | **Not shared in `ui-web`** — `SecretReveal` and the new `CommandSnippet` each hand-roll the identical logic inline. Real, if minor, gap: extract a shared hook.                                                                                                                                                                    |
| `lib/hooks/use-cursor-pagination.ts` (`useCursorPagination`)    | Keyset (cursor) pagination as URL state via `nuqs`, mapped to a numbered "N / M" display | **App logic, correctly not a `ui-web` concern** (`ui-web` primitives take no fetching/URL dependencies) — but real complexity `apps/lci` must reimplement against its own data layer; the presentational `Pagination` component built for `ui-web` is agnostic to cursor-vs-offset and needs no change.                            |
| `lib/hooks/use-local-storage-state.ts` (`useLocalStorageState`) | SSR-safe `useState` persisted to `localStorage`, with a type-guarded fallback            | **Not in `ui-web`**, but `ui-web`'s barrel already has a precedent "foundations" region for exactly this kind of shared hook (`useResizeObserver`, `useIsBelowLg`/`useIsBelowMd`, `useCommandPaletteShortcut`). Small, generic, low-risk addition candidate — used here to persist the runs list's timeline/table view preference. |

### Domain/visual-mapping logic read (for UI-relevant decisions only)

- `lib/domain/tasks.ts` — `statusVisual()`, the exact source of `StatusPill`'s five-state
  `pending`/`active`/`success`/`error`/`muted` mapping, including the **pulsing dot** on `active`
  (`animate-pulse` on a `size-1.5 rounded-full` span). Confirmed by reading `ui-web`'s
  `status-text/component.tsx` directly: **it renders a plain `<span>` with no pulse/dot support at
  all.** This is a real, previously-unflagged gap — see §4.
- `lib/domain/repos.ts` — `approvalVisual()`, same `StatusPill`/`Pill` shape for repo approval
  state, consumed by both `repo-list.tsx` and `admin/page.tsx`.
- `lib/domain/graph.ts` — `SYMBOL_KIND_STYLE` (3 node-kind colors: `primary`/`secondary`/`accent`)
  and `RELATION_STYLE` (3 edge colors/weights) for the code graph's legend. Multi-color by design
  (a node-link graph, not a time-series chart) — `ui-web`'s "monochrome ramp, orange at most once"
  chart rule doesn't apply here (confirmed correct scoping in ADR 0012: this isn't a `chart-core`
  concern), but the graph's own 3-color legend needs an explicit `ui-web`-token mapping when built
  (`--color-primary`/`-secondary`/`-accent` already exist and match 1:1).

---

## 3. What the original gap list undercounted

Grepping the full `apps/web` tree (not just `components/ui/`) for `ui-web`-rejected daisy
patterns surfaced real additional instances the original `PRIMITIVES.md` didn't count:

### 3.1 `Card` — 13 files import it, not the handful implied

```
app/dashboard/page.tsx · app/sign-in/page.tsx · app/dashboard/admin/page.tsx
app/dashboard/repositories/page.tsx · .../[id]/page.tsx · .../[id]/layout.tsx
.../[id]/graph/page.tsx · .../[id]/settings/page.tsx
app/dashboard/runs/page.tsx · .../[id]/page.tsx
components/repos/repo-list.tsx · components/overview/insights.tsx
components/repos/graph/code-graph-panel.tsx
```

Every route in the app wraps its content in `Card`. `insights.tsx` additionally has its **own**,
separate inline `card card-border bg-base-200` on its KPI tiles (`Kpi()`, not going through the
shared `Card` component at all) — a 14th, independent instance. This confirms `PRIMITIVES.md`'s
own characterization ("the single largest rebuild by usage count") was directionally right but
substantially understated the count.

### 3.2 The badge → `status-text` migration touches at least 9 files, 3 independent patterns

| Pattern                                                          | Files                                                                                                                                  | Notes                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `StatusPill`/`Pill` (`components/ui/status-pill.tsx`)            | `admin/page.tsx`, `runs/[id]/page.tsx`, `repositories/[id]/layout.tsx`, `run-row.tsx`, `repo-list.tsx`, `run-table.tsx` — 6 files      | Already known; **includes a pulsing dot on the `active` state** (see §4 — genuinely missing from `status-text`) |
| `SourceBadge` (`components/ui/source-badge.tsx`)                 | `repositories/[id]/settings/page.tsx` — 1 file                                                                                         | Already known                                                                                                   |
| Inline `badge-*` classes, independent of either shared component | `repo-list.tsx` ("Override" indicator), `review-output.tsx` (finding priority chip **and** category chip, 2 separate uses in one file) | **Not previously catalogued** — a third badge pattern with no shared component behind it at all                 |

### 3.3 A genuinely new, previously-missed row: `progress` → `Meter`

`components/overview/insights.tsx`'s `BreakdownCard` renders native `<progress
className="progress progress-primary h-2 flex-1">` bars for the "by repository"/"by outcome"
breakdowns. `ui-web`'s own rules explicitly reject this exact daisy class
(`console-redesign/PRIMITIVES.md` §"not adopted": _"`progress`/`radial-progress` — Rounded,
animated; `Meter` is a 4px square track."_). `ui-web` already has `Meter` built for precisely this
— it's a clean class swap, **zero new build work**, but it was absent from `PRIMITIVES.md`
entirely. It is the Overview screen's only chart-adjacent element besides the hand-rolled SVG
sparkline (see §5).

---

## 4. Genuinely new findings — not fixed, not previously known

1. **`status-text` cannot represent an "active" pulsing state.** Confirmed by reading its full
   component source (`packages/ui-web/src/components/status-text/component.tsx` — 6 lines, a bare
   `<span>` with a tone class, nothing else). `StatusPill`'s `active` variant renders a small
   `animate-pulse` dot ahead of the label; `status-text` has no equivalent. This blocks a clean
   `status-text` swap for every run-status usage (6 files, §3.2) until resolved — either extend
   `status-text` with an optional pulsing-dot slot, or accept that active-run status needs its own
   small addition.
2. **No shared `useCopyToClipboard` in `ui-web`.** Two components (`SecretReveal`, `CommandSnippet`)
   now duplicate the identical copy-and-reset-on-timeout logic. Not a blocker — a
   quality-of-life extraction, not a port blocker — but worth doing before a third consumer shows up.
3. **`useLocalStorageState` has no `ui-web` equivalent**, despite `ui-web`'s barrel already having
   a "foundations" region built for exactly this kind of small shared hook. Low-risk candidate
   addition once a real `apps/lci` consumer needs view-preference persistence (the runs list's
   timeline/table toggle is the first candidate).
4. **`run-timeline.tsx`'s shape is now resolved — no new primitive needed.** The prior design pass
   left this as an open question ("ledger-table variant, or a genuinely new visual form?"). Having
   read the actual 30-line implementation: it's neither. It's calendar-day-grouped `RunRow`s under
   a sticky section heading, inside a bordered rail (`border-l`) — composable entirely from
   existing/new primitives (a sticky label, `StatusText`, a `divide-y` wrapper) with no new
   `ui-web` component required. This closes one of `PRIMITIVES.md`'s two remaining open questions.
5. **A small `Legend` need for the code graph** — `code-graph-panel.tsx`'s `Legend()` (symbol-kind
   dots + relation-line swatches, ~15 lines) has no direct `ui-web` equivalent; `ChartLegend`
   exists but is shaped for chart series, not a fixed node/edge-kind key. Small enough to stay
   app-local rather than becoming a `ui-web` primitive, unless a second consumer appears.

---

## 5. Full build-status roster

### Built (4 — this epic's PR)

`Toggle`, `Pagination`, `CommandSnippet`, `SettingsSection`/`SettingsRow` — shipped with full
test/Storybook coverage, `ReportExportPanel` refactored to consume `Toggle`.

### Already covered by an existing `ui-web` primitive — confirmed by this audit, no new build

| LCI pattern                                           | `ui-web` primitive                                       | Confirmed via                                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `console-shell`, `command-palette` (cmdk), `nav-link` | `console-shell`, `command-palette`, `nav-spine`          | Full read of `components/shell/*` — structurally near-identical to `ui-web`'s versions                                                                                                      |
| `repo-tabs.tsx` (daisy `tabs`)                        | `sub-nav` (Base UI Tabs)                                 | Confirmed exact daisy-class match to what `sub-nav` already migrates away from                                                                                                              |
| `repo-list`/`run-list`/`run-table` row lists          | `ledger-table`                                           | Confirmed generic columns API fits; `RunTable`'s client-side column sort is **app logic** (`ledger-table` deliberately owns no sorting — "stays the consumer's job," per its own docstring) |
| `preset-picker.tsx`                                   | `rail-select`/`scope-select` family                      | Confirmed — fixed option set + free-text escape hatch                                                                                                                                       |
| `states.tsx`'s `StatusLine`/`ApiErrorLine`            | `inline-status`/`error-line`                             | Confirmed 1:1 shape match                                                                                                                                                                   |
| `insights.tsx`'s `progress` bars                      | `Meter`                                                  | **New finding this audit** — see §3.3                                                                                                                                                       |
| `/dashboard/admin`'s approval queue                   | `ReviewQueue`/`DecisionsLedger`/`review-detail-panel`    | **New finding this audit** — see §2, corrects the epic's "agent status" assumption                                                                                                          |
| `run-timeline.tsx`                                    | composition of existing/new primitives, no new component | **Resolved this audit** — see §4.4                                                                                                                                                          |

### Still blocked, still open

| Item                                       | Why it's still open                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Select` (generic list-filter/form select) | Sharing-vs-separate-from-`scope-select` decision, unresolved                                                                                |
| `Card` → floor rebuild                     | **Now confirmed to touch 14 files**, not a handful — the largest single item in the whole gap list, needs a per-screen call before building |
| First-run empty state (`EmptyState`)       | LCI's ADR-0016 (centered placard) vs. `ui-web`'s no-exception rule — a policy conflict, not resolved                                        |
| `search-input.tsx`                         | Still unclear whether it's a `field` variant or a standalone primitive                                                                      |

### Newly found, not yet triaged into a build decision

| Item                                                      | Category                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `status-text`'s missing active/pulse capability           | Blocks 6 files' badge→status-text migration                                                  |
| Badge migration's true surface area (9 files, 3 patterns) | Broadens `PRIMITIVES.md`'s existing rows, no new decision needed, just more work than stated |
| Shared `useCopyToClipboard` hook                          | Quality-of-life extraction, non-blocking                                                     |
| Shared `useLocalStorageState` hook                        | Small foundational addition, non-blocking                                                    |
| Code-graph `Legend`                                       | Small, likely stays app-local                                                                |

---

## 6. Recommended next actions

1. Update `PRIMITIVES.md`'s `Card`, badge-related, and `EmptyState` rows with the precise file
   counts from §3 so the document stops understating scope.
2. Add the `Meter`/`progress` row (§3.3) to `PRIMITIVES.md` — zero build work, just needs writing
   down so `apps/lci`'s Overview screen doesn't reinvent it.
3. Resolve `status-text`'s pulse-state gap (§4.1) before porting any of the 6 files that need it —
   it's small (one optional prop + a dot span) but currently blocks a clean swap.
4. Update `/dashboard/admin`'s entry in `README.md`'s screen inventory to reflect its real
   identity (repository approvals) and its stronger reuse opportunity (`ReviewQueue` family)
   instead of the epic's original "agent status" assumption.
5. Decide `Select` and `Card` before starting any further `#330` build work that depends on them —
   both remain explicitly blocked, not silently skipped.
