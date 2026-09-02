# LCI app — design spec and screen inventory

> **Superseded in part by [ADR 0012 — Console visual revamp](../../adr/0012-console-visual-revamp.md)
> and [ADR 0013 — Console information architecture v3](../../adr/0013-console-information-architecture-v3.md)**,
> landed 2026-08-30/31, after this document was first written — see
> [`PRIMITIVES.md`](PRIMITIVES.md)'s own notice and [`AUDIT.md`](AUDIT.md) §6 before treating the
> screen shapes or wireframes below as current. The console's shell is now two-column (a persistent
> sidebar + one content column, no right rail); `Card` is now the default, encouraged zone
> container, not a rejected pattern; `EmptyState` is a real, sanctioned `ui-web` primitive, which
> resolves this document's §4.2 "open conflict" in LCI's favour. The three wireframes below
> (`repositories.svg`, `code-graph.svg`, `runs.svg`) all draw a right-rail shell that no longer
> exists upstream and should be treated as historical, not a build target — matching ADR 0012's own
> precedent ("a wrong mockup is worse than none... the five SVG mockups are deleted"), a fresh set
> (or Storybook page-stories, now the ground truth `ui-web` itself uses) should replace them before
> `apps/lci` screens are actually built against this document.

Design spec for rebuilding `lightbridge-code-intelligence`'s UI
(`lightbridge-code-intelligence/apps/web`) as `apps/lci` in this monorepo, on `packages/ui-web`
and `packages/chart-core`, alongside `apps/console`
([epic #328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)).

**This document does not re-decide the visual direction.** The palette, shell inversion, nav
spine, chart-colour rule and table treatment stay exactly as locked by
[ADR 0008](../../adr/0008-console-shell-inversion-and-visual-direction.md) and
[ADR 0010](../../adr/0010-ui-primitive-stack-and-theming.md) — `apps/lci` is a second consumer of
those decisions, not an occasion to reopen them. What follows is the *application* of that
direction to LCI's screens, plus the per-primitive gap list in
[`PRIMITIVES.md`](PRIMITIVES.md), which is the actual deliverable this document supports.

Companion documents:

| File | What it is |
| --- | --- |
| [`PRIMITIVES.md`](PRIMITIVES.md) | The gap list — every LCI UI element mapped to its `ui-web` fate |
| [ADR 0014](../../adr/0014-lci-app-scaffolding-and-code-graph.md) | App name, chart name, and the code-graph build decision |
| ~~`repositories.svg`, `code-graph.svg`, `runs.svg`~~ | **Deleted** — drew a right-rail shell ADR 0012 D1 removed; see the notice at the top of this file and §2 below |

## Where this plan and the shipped app diverge

This document was written before `apps/lci` existed, against LCI's upstream `apps/web/app/dashboard/`
routes. Two concrete things the built app does differently, for anyone using this as a map of the
real app rather than a record of the plan:

- **No `/dashboard` prefix.** Routes are flat: `/` (overview), `/repositories`,
  `/repositories/[id]` (+ `/graph`, `/settings`), `/runs`, `/runs/[id]`, `/admin`, `/settings` —
  read `/dashboard/x` below as `/x`.
- **No persistent right rail anywhere.** `LciShell` never wires `ConsoleShell`'s `rail` slot — the
  code graph's node inspector is a second grid column inside the Graph tab's own `Card`
  (`grid-cols-[1fr_260px]` at `lg`+, stacked below it otherwise), and a run's review output is an
  inline `Card` on the same column as the rest of the page, not right-rail content. §2's
  `code-graph.svg`/`runs.svg` descriptions and §6 below describe the plan, not what shipped.
- Screen implementations live in `apps/lci/src/containers/*.tsx`; each `app/(lci)/**/page.tsx`
  route is a thin server component that fetches and renders its container.

---

## 0. What this design pass could and could not do

Honesty check before the rest of this document is read as more authoritative than it is:

- **No Refero research was run for this pass.** The console-redesign spec's research (style and
  screen references, scanned-vs-retrieved counts) was produced with the Refero MCP tool available
  in that session; it was **not available** in this one. Nothing in this document should be read
  as "research confirmed X" — the screen layouts below are derived directly from LCI's *existing*
  shipped UI (read from `lightbridge-code-intelligence@d46d6b4`, `main`) reinterpreted under
  ADR 0008/0010's rules, not from a fresh comparative survey of the field the way the console's
  spec was. Whoever picks this phase back up should treat a real Refero pass — the same style/
  screens/flows query shape the console spec used — as outstanding work, not as done.
- **Three screens got hand-authored SVG wireframes** (`repositories.svg`, `code-graph.svg`,
  `runs.svg`) — the ones with the most novel shape (tabs + embedded analytics, a node-link graph,
  a status-rich ledger with a detail panel). The remaining screens (`/dashboard` overview,
  `/dashboard/admin`, `/dashboard/settings`) are close enough in shape to existing `apps/console`
  screens (stat-card row, review-queue-with-detail-panel, settings-section list) that a redundant
  wireframe would mostly restate `console-redesign`'s own `overview.svg`/`admin-budget-review.svg`
  — they get a written spec in §3 instead, and should get their own SVG the moment their content
  diverges from that assumption during implementation.

---

## 1. Screen inventory

Ten routes exist in LCI's current `apps/web/app/dashboard/`. Every one gets a design decision
below; three get a wireframe.

| Route | Purpose | `ui-web` primitives (see `PRIMITIVES.md` for the full mapping) | Wireframe |
| --- | --- | --- | --- |
| `/sign-in` | Auth | Out of scope for this pass — auth flow, not a dashboard screen | — |
| `/dashboard` | Landing / insights overview | `stat-card`, `spend-series-chart`/`histogram-chart` family (repurposed for run/review metrics, not spend) | §3.1 |
| `/dashboard/repositories` | Repo list | `ledger-table`, `rail-select` (preset picker), `search-input`→`field` | `repositories.svg` |
| `/dashboard/repositories/[id]` | Repo detail shell | `sub-nav` (Overview/Graph/Settings tabs), floor content (no `Card`) | `repositories.svg` |
| `/dashboard/repositories/[id]/graph` | **Code graph** | app-local (see ADR 0012) — not a `ui-web` primitive | `code-graph.svg` |
| `/dashboard/repositories/[id]/settings` | Repo config | new settings-section primitive (see `PRIMITIVES.md`), `status-text` (provenance) | §3.1 |
| `/dashboard/runs` | Review runs list | `ledger-table`, `status-text` (run status), `rail-select`/pagination | `runs.svg` |
| `/dashboard/runs/[id]` | Review result detail | `review-detail-panel` (evaluate reuse vs. new — different domain than budget review), `error-line`/`inline-status` | `runs.svg` |
| `/dashboard/admin` | Admin actions | Needs confirmation — see §4 open question | §3.2 |
| `/dashboard/settings` | App-level settings | Same new settings-section primitive as repo settings | §3.2 |

---

## 2. Wireframes — deleted, kept here only as a description of what's missing

`repositories.svg`, `code-graph.svg`, `runs.svg` **no longer exist in this directory.** They were
hand-authored documentation artifacts drawn against the console's pre-revamp three-column
flush-rail shell (right-rail node inspector, right-rail review detail) — a shell ADR 0012 D1
removed outright. A wireframe of a shell that no longer exists is actively misleading, not merely
stale, so they were deleted rather than left to rot — the same call ADR 0012 itself made for the
five `console-redesign` SVGs it superseded. The subsections below (§2.1–§2.3) describe what each
one showed, so the next design pass knows what still needs drawing (against the real two-column
`Card`-based shell, `sections/page-header`, and `DetailSheet` for row detail) without having to
reverse-engineer it from a deleted file in git history.

### `repositories.svg` — list + detail shell

Left: `/dashboard/repositories` — a `ledger-table` of repos (name, last indexed, review status as
`status-text`, not a pill), a `rail-select`-style preset picker above it, matching the console's
`manage-projects.svg` ledger-plus-filter shape.

Right: `/dashboard/repositories/[id]` detail shell — `sub-nav` tabs (`Overview` / `Graph` /
`Settings`), content on the floor with no `Card` wrapper (the single largest gap-list item —
see `PRIMITIVES.md` §"Rows requiring a decision"). The `Overview` tab shown is a stat-card row
(files indexed, last run, open findings) directly on the floor, matching the console's own
Overview shape rather than LCI's current bordered cards.

### `code-graph.svg` — the code-graph screen

Shows the node-link canvas with `node-inspector.tsx` as a right-rail panel (persistent at `lg`,
matching the console's right-rail contract — never an overlay), including the label-clipping
behaviour LCI's own screen already ships: a long, fully-qualified Rust symbol path truncates to
one line with an ellipsis inside its fixed-size node box, with the full name available via a
hover tooltip. That behaviour is already correct upstream — see
[ADR 0014](../../adr/0014-lci-app-scaffolding-and-code-graph.md) — so this wireframe documents
what the port inherits, not a change this app needs to make.

### `runs.svg` — list + review-result detail

Left: `/dashboard/runs` — a `ledger-table` of runs with `status-text` (pending/active/success/
error — replacing `status-pill.tsx`'s daisy-badge treatment 1:1, including the "active" pulse,
which needs to move to `status-text` if it doesn't already support one) and pagination (the `new`
`Pagination` primitive from `PRIMITIVES.md`).

Right: `/dashboard/runs/[id]` — review output plus `run-logs-embed.tsx`'s Grafana panel
(app-local, per `PRIMITIVES.md`), shown as right-rail content the way the console's own
`review-detail-panel` occupies the right rail for budget review — evaluated in `PRIMITIVES.md` as
"reuse vs. new" since the domain differs (code review findings vs. budget decisions) even though
the layout shape (detail panel, right rail, decision/action row) is the same.

---

## 3. Screens without a dedicated wireframe

### 3.1 `/dashboard` (overview) and repo `/settings`

`/dashboard` is a stat-card row (repos indexed, runs today, open findings, agent status) — the
same shape as the console's `overview.svg` stat row, just with LCI's metrics instead of spend
figures. No new visual pattern; implement directly against `overview.svg`'s row spec and
`ui-web`'s `stat-card`.

Repo `/settings` is a list of `SettingsRow`-shaped rows (label, description, control, optional
provenance badge) — see `PRIMITIVES.md`'s `settings-section.tsx` entry. The content shape is
right; only the bordered-card chrome needs to go.

### 3.2 `/dashboard/admin` and app `/settings`

App `/settings` is the same settings-section pattern as repo settings, at a different scope.

`/dashboard/admin` needs a scoping decision before it can be wireframed at all — see the open
question in §4.2. Until that's answered, no primitive mapping for this screen in `PRIMITIVES.md`
should be treated as final.

---

## 4. States

### 4.1 Loading / error — no conflict

LCI's `states.tsx` `StatusLine`/`ApiErrorLine` already render as inline mono lines distinguishing
`unauthenticated` / `unavailable` / other failure reasons — this is already the shape
`ui-web`'s `inline-status`/`error-line` want. Direct class swap, no design decision needed.

### 4.2 Empty — a real, unresolved conflict

LCI's `states.tsx` documents its own house rule (ADR-0016, in `lightbridge-code-intelligence`):
*"The first-run empty is the one place a centered placard is right (the screen has nothing else
to do)."* `ui-web`'s rule has no such exception: *"Never a centered placard, never an
illustration."*

This design pass does not resolve it — it's flagged here rather than defaulted, because both
sides are a real, considered position, not an oversight:

- **Adopt `ui-web`'s rule with no exception**: consistent with the console, zero new surface area
  in `ui-web`. Con: an empty `/dashboard/repositories` (a user's very first visit, before they've
  connected any repo) becomes an inline line above an empty table — arguably less inviting for a
  genuine zero-to-one moment than LCI's current centered prompt-with-action.
- **Keep LCI's first-run exception, scoped narrowly**: only for the *true* first-run case (zero
  repositories connected, zero runs ever), never for "no results match this filter" (which stays
  inline in both proposals). Con: `ui-web` gains a second empty-state shape, which the console
  itself doesn't have and didn't ask for.

Recorded here as the one open item blocking `PRIMITIVES.md`'s `EmptyState` row from a final
`rebuild`/`keep` call — resolve before `apps/lci`'s repositories/runs list screens are built in
[#331](https://github.com/ADORSYS-GIS/converse-frontends/issues/331).

---

## 5. Open questions

1. **`/dashboard/admin`'s actual scope.** `app/dashboard/admin/actions.ts` alongside `page.tsx`
   suggests server actions (mutations), not a pure read-only status view — confirm with LCI
   maintainers what this screen does before designing it as agent/system status the way the epic's
   summary assumes.
2. **Does anything besides the code graph need node-link visualization?** If a second screen turns
   up wanting the same shape, the "extract a `graph-core` package, sibling to `chart-core`"
   question becomes live — not assumed by ADR 0012, which scopes the code graph to stay app-local
   on the assumption it's the only consumer.
3. **A real Refero pass is still owed** (§0) — this document substitutes reading LCI's existing
   shipped UI for the comparative field research the console spec had. That's a legitimate
   starting point, not a replacement for the research AC 1–2 implicitly expect.

---

## 6. Reviewed against `apps/console` for consistency

- Tabs → `sub-nav` (Base UI Tabs), not daisy `tabs`: consistent with the console's own migration.
- Status → text (`status-text`), never a pill: consistent; this is the single most-repeated fix
  across LCI's local primitives (`status-pill.tsx`, `source-badge.tsx`).
- No card-wrapped centre content: consistent; flagged as the largest single rebuild.
- Right rail is persistent at `lg`, never an overlay: `code-graph.svg`'s node inspector and
  `runs.svg`'s review detail both follow this, matching the console's `admin-budget-review.svg`.
  **Not what shipped** — see "Where this plan and the shipped app diverge" above.
- Empty states: **not yet consistent** — see §4.2, the one open conflict this pass did not resolve.
