# Implementation plan — Story #329: design LCI's screens + produce the `ui-web` gap list

- **Epic:** [#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328) — LCI's UI as a new app in `converse-frontends`, on `ui-web`
- **This story:** [#329](https://github.com/ADORSYS-GIS/converse-frontends/issues/329) — Design the LCI app's screens and flows, and produce the `ui-web` gap list
- **Feeds:** [#330](https://github.com/ADORSYS-GIS/converse-frontends/issues/330) (build the gap), [#331](https://github.com/ADORSYS-GIS/converse-frontends/issues/331) (assemble, live APIs)
- **Baseline verified against:** `converse-frontends@62960f4` (`main`) and `lightbridge-code-intelligence@d46d6b4` (`main`), both hard-reset from their respective remotes on 2026-08-28 — no assumptions carried over from stale reads.

This plan is *not* the design itself. It is the execution plan for producing it, plus a firm
answer to "where does the gap list live" and a **preliminary** inventory to start the actual
design pass from — every item in §5 is evidence, not a finished decision, and must be confirmed
or overturned during the real design work, per #329 AC.

---

## 1. Where every deliverable lives (the "where do we document this" answer)

`converse-frontends` already has exactly one precedent for this kind of phase-1 work:
`docs/design/console-redesign/`. This story reuses that shape rather than inventing a new one —
there is no reason for LCI's design pass to look different from the console's.

| Artifact | Path | Modelled on |
| --- | --- | --- |
| Screen/flow design spec, refero research summary, code-graph decision | `docs/design/lci-app/README.md` | `docs/design/console-redesign/README.md` |
| Per-screen SVG mockups (1440×900 desktop + one compact/mobile) | `docs/design/lci-app/*.svg` | `overview.svg`, `shell-compact.svg`, etc. |
| **The gap list itself** — one row per LCI-needed primitive, `keep / class swap / rebuild / new`, phase, notes | `docs/design/lci-app/PRIMITIVES.md` | `docs/design/console-redesign/PRIMITIVES.md` |
| Decisions that must survive past phase 1 (see §4) | new ADR — **`docs/adr/0012-lci-app-scaffolding-and-code-graph.md`** | `0008`, `0009`, `0010` (visual direction / platform / primitive stack) |
| Actionable build items for #330 | GitHub sub-issues of #330, one per `PRIMITIVES.md` row marked `new` or `rebuild` | — |

Why an ADR *and* a design doc, not one or the other: this repo's convention (see `0008`–`0011`)
is that the design doc is the **application** of a decision, and the ADR is the decision that
must outlive any single doc revision. `PRIMITIVES.md` for the console explicitly says "Practical
companion to ADR 0010" — the LCI equivalent should say the same about the new ADR. Concretely,
ADR-0012 needs to record only the things a later PR reviewer would otherwise have to re-litigate:

1. **The code-graph decision** (epic's top risk — see §4.1). This is the one call in this story
   that is genuinely architectural, not a component gap.
2. **The new app's directory/package name** (see §4.2) — referenced by CI, the Helm chart, and
   `pnpm-workspace.yaml` globs, so it needs to be decided once and linked from everywhere, not
   left implicit in a folder someone happened to create.
3. **That LCI inherits ADR 0008/0010's visual direction unmodified** — stated explicitly so a
   future PR doesn't treat LCI as a chance to re-open the palette/shell debate, exactly how
   `console-redesign/README.md` opens by pointing at ADR 0008 and saying "this document does not
   re-decide the visual direction."

Do **not** put the gap list in the epic or story body on GitHub — issue bodies aren't diffable
against the code they describe, and `PRIMITIVES.md`'s whole value (per its own docstring: "point
implementation agents at rows of this table, not at the ADR") is being a live, git-blamable table
next to the components it maps.

---

## 2. Step-by-step plan

| # | Step | Output | Depends on |
| - | --- | --- | --- |
| 1 | Freeze the baseline: confirm `lightbridge-code-intelligence/apps/web`'s current route tree and component inventory against `main` (done in this session — see §5.1/§5.2; re-verify at design-pass time if `main` has moved) | §5 tables below | — |
| 2 | Refero research pass per screen (per #329 Implementation Notes) — one query per distinct screen family (list, detail-with-tabs, graph, settings-form), scanned vs. retrieved-in-full counts recorded honestly, same as console-redesign §1 | Research summary in `README.md` §1 | Step 1 |
| 3 | Draw SVG mockups, one per screen in §5.1, at 1440×900 + one compact (600–1024) variant, using **existing** `ui-web` tokens only (`theme.css` — no new hex) | `docs/design/lci-app/*.svg` | Step 2 |
| 4 | Per-screen primitive mapping: for every element in every mockup, name the `ui-web` primitive it uses, or mark it a gap | Feeds `PRIMITIVES.md` | Step 3 |
| 5 | Resolve the two concrete conflicts already found between LCI's current UI and `ui-web`'s locked rules (§5.3) — pill/badge status indicators, and the first-run centered-placard empty state | Decision recorded in `PRIMITIVES.md` + `README.md` §"States" | Step 4 |
| 6 | Make the code-graph call explicit (§4.1) — reuse `dagre`+`@xyflow/react` as-is, reuse after fixing [LCI#635](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/635) first, or evaluate a replacement | ADR-0012 §"Code graph" | Step 4 (needs to know if any other screen also wants graph/node-link visualization) |
| 7 | Write `PRIMITIVES.md` — full table, `keep / class swap / rebuild / new`, phase per row | `docs/design/lci-app/PRIMITIVES.md` | Steps 4–6 |
| 8 | Write `README.md` — spec, screen inventory, `ui-web`-primitives-per-screen, code-graph decision, empty/unavailable states | `docs/design/lci-app/README.md` | Steps 2–7 |
| 9 | Write ADR-0012 — code-graph decision, app name/location, "inherits 0008/0010" statement | `docs/adr/0012-lci-app-scaffolding-and-code-graph.md` | Step 6, 8 |
| 10 | File one GitHub sub-issue per `PRIMITIVES.md` row marked `new` (and any `rebuild` big enough to be its own PR) under [#330](https://github.com/ADORSYS-GIS/converse-frontends/issues/330), via `sub_issue_write` | Sub-issues of #330 | Step 7 |
| 11 | Review pass against `apps/console` for consistency — the explicit checkbox in #329's own AC | Sign-off note in `README.md` | Steps 8–9 |

Steps 2–3 are the only steps that require actual design work (refero + drawing); everything else
in this plan can proceed from the repo evidence already gathered in §5.

---

## 3. Mapping back to #329's acceptance criteria

| #329 AC | Satisfied by |
| --- | --- |
| 1. Every LCI surface has a screen design | Step 3 — one SVG per row in §5.1 |
| 2. Each screen names the `ui-web` primitives it uses | Step 4 → `README.md` |
| 3. A gap list — the real deliverable | Step 7 → `PRIMITIVES.md` |
| 4. Code-graph has an explicit decision | Step 6 → ADR-0012 |
| 5. Unavailable/empty states designed, not implicit | Step 5 |
| "Reviewed against `apps/console`" (verification evidence) | Step 11 |

---

## 4. Decisions this story must not leave implicit

### 4.1 The code graph — the epic's flagged top risk, confirmed real

[LCI#635](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/635) is an **open**
bug, not a hypothetical: `layoutGraph` in `apps/web/components/repos/graph/layout.ts` feeds
`dagre` a fixed `NODE_WIDTH = 200`/`NODE_HEIGHT = 44` regardless of actual label length, so long
Rust symbol paths overflow their node boxes and some edges render detached. This is graph-layout
logic — not a `ui-web` primitive, not a `chart-core` primitive (that package is scales/bins/color
ramps for time-series and histogram charts, nothing node-link). No new `ui-web` component makes
this problem go away.

The current implementation, for reference (`apps/web/components/repos/graph/`):

```
code-graph-canvas.tsx   — @xyflow/react canvas, renders nodes/edges, fixed-width node style
code-graph-panel.tsx    — panel chrome around the canvas
layout.ts               — dagre layout, the buggy fixed-size assumption (#635)
node-inspector.tsx      — side detail panel for a selected node
use-code-graph.ts       — data-fetching hook
```

Step 6 must pick one, explicitly, in ADR-0012:

- **(a) Port as-is**, carry #635 forward as a known bug to fix inside the new app.
- **(b) Fix #635 first**, in LCI's own repo, then port the corrected version. Cleaner, but is
  *not this repo's ticket* — it would need to land in `lightbridge-code-intelligence` before
  #331 can start on the graph screen, which is a cross-repo scheduling dependency the epic's
  sprint-fit risk didn't originally account for.
- **(c) Replace** `dagre` sizing with real measured-node-size layout (the fix #635's own Risks
  section already points at) as part of the port — absorbs the fix into this epic's phase 3.

None of these is obviously right from the UI side alone; whoever owns #331 should be in this
conversation before ADR-0012 is written, since it's their phase that inherits the cost either way.

### 4.2 New app name and location

`apps/` currently holds `console` (package name `"console"`) and `self-service` (being deleted by
#285). There is no established multi-word-app naming convention to copy — `console` is the only
precedent. Two things make the name non-trivial to pick casually:

- `pnpm-workspace.yaml`'s `apps/*` glob will pick up whatever directory is created — fine either
  way, but the *package.json* `name` field should follow the existing unscoped, lowercase
  pattern (`"console"`, not `"@lightbridge/console"`).
- **Naming collision risk in `ai-helm`**: `ai-helm/charts/lightbridge-code-intelligence/` already
  exists today — it's the Helm chart for LCI's **backend**. When #287's chart/image pattern is
  copied for this new frontend app (per #331 AC 5), the new chart must **not** reuse that same
  name, or it will collide with the existing backend chart in the same `ai-helm/charts/`
  directory. Suggest recording in ADR-0012 either `apps/lci` → chart `lci-web`/`lci-frontend`, or
  whatever name is picked, explicitly distinct from the existing backend chart name.

This doesn't block Steps 1–8 of this plan (the design work doesn't care what the folder is called
yet), but it must be resolved before ADR-0012 is finalized, since the ADR is the natural place to
pin it once for CI, Helm, and the workspace glob to all agree on.

---

## 5. Preliminary inventory (evidence for Steps 1–5 — not the finished gap list)

Everything below was read directly from `lightbridge-code-intelligence@d46d6b4` (`main`) and
`converse-frontends@62960f4` (`main`) in this session. It is a *starting point* for the design
pass, not a substitute for it — #329 AC 3 still requires the actual screens to be drawn.

### 5.1 LCI's current routes → the screens this story must design

| Route | Purpose | Current components |
| --- | --- | --- |
| `/sign-in` | Auth | — |
| `/dashboard` | Landing/overview | `components/overview/insights.tsx` |
| `/dashboard/repositories` | Repo list | `repo-list.tsx`, `repo-tabs.tsx`, `preset-picker.tsx` |
| `/dashboard/repositories/[id]` | Repo detail | `actions.ts`, `layout.tsx`, `repo-analytics-embed.tsx` (Grafana) |
| `/dashboard/repositories/[id]/graph` | **Code graph** | `code-graph-canvas.tsx`, `code-graph-panel.tsx`, `layout.ts`, `node-inspector.tsx`, `use-code-graph.ts` |
| `/dashboard/repositories/[id]/settings` | Repo config | (settings-section pattern) |
| `/dashboard/runs` | Review runs list | `run-list.tsx`, `run-row.tsx`, `run-table.tsx` |
| `/dashboard/runs/[id]` | Review result detail | `review-output.tsx`, `run-timeline.tsx`, `run-logs-embed.tsx` (Grafana) |
| `/dashboard/admin` | Admin / agent status | `actions.ts` + `page.tsx` |
| `/dashboard/settings` | App-level settings | `settings-section.tsx` |

### 5.2 LCI's current local primitives (`apps/web/components/ui/`) — candidates for the gap list

| LCI primitive | What it does | Likely `ui-web` fate |
| --- | --- | --- |
| `button.tsx` | Button | `keep`/reuse — `ui-web` already has `button` |
| `card.tsx` | Card wrapper | **Conflict** — see §5.3 |
| `command-snippet.tsx` | Copyable code/CLI snippet | No `ui-web` equivalent — likely `new` |
| `pagination.tsx` | Pager | No `ui-web` equivalent seen — likely `new` |
| `search-input.tsx` | Search box | Possibly extends `field` |
| `select.tsx` | Select | Likely maps to `scope-select`/`rail-select` |
| `settings-section.tsx` | Settings group | Likely maps to `rail-panel`/`section-sheet` |
| `source-badge.tsx` | Config-provenance badge | **Conflict** — see §5.3 |
| `states.tsx` | Empty/loading/error | **Conflict** — see §5.3 |
| `status-pill.tsx` | Run-status pill | **Conflict** — see §5.3 |
| `toggle.tsx` | Toggle switch | Not in current `ui-web` inventory — confirm during design pass |

`components/shell/` (`command-palette.tsx`, `console-shell.tsx`, `nav-link.tsx`) maps closely to
existing `ui-web` `command-palette`, `console-shell`, `nav-spine` — high-confidence reuse, low
gap-list risk.

`repo-analytics-embed.tsx` and `run-logs-embed.tsx` are Grafana `d-solo` iframe embeds
(`NEXT_PUBLIC_GRAFANA_URL`-gated). These aren't design-system primitives in the `ui-web` sense —
they're app-level integration components, the same way the console's usage panels wrap external
data. LCI's own [#609](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/609)
(component test harness, in review as
[PR #614](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/pull/614)) is the direct
prior art for testing this exact pattern and is worth reading before this story's screens reach
these two components.

### 5.3 Two concrete rule conflicts already found (not hypothetical — read from real source)

**1. Status/provenance indicators are pills; `ui-web` explicitly bans pills.**

```tsx
// apps/web/components/ui/status-pill.tsx (lightbridge-code-intelligence, current)
const pillVariants = cva("badge badge-sm gap-1.5", {
  variants: {
    variant: {
      pending: "badge-ghost",
      active: "badge-info badge-soft",
      success: "badge-success badge-soft",
      error: "badge-error badge-soft",
    },
  },
});
```

`ui-web`'s own rules (`docs/design/console-redesign/PRIMITIVES.md` §"What is explicitly not
adopted from daisyUI", and the console-ui skill's "Never do" list) are unambiguous: *"Counts go in
tab labels; status is text. No pills."* `source-badge.tsx` has the same shape for config
provenance (`default`/`file`/`db`). Both need a real design decision in Step 5 — the likely target
is `ui-web`'s existing `status-text` primitive, but "likely" is exactly the kind of guess #329
exists to resolve into a drawn screen.

**2. LCI's own empty-state rule (ADR-0016) allows a centered placard; `ui-web` forbids it.**

```tsx
// apps/web/components/ui/states.tsx (lightbridge-code-intelligence, current)
/**
 * Honest states (ADR-0016). The first-run *empty* is the one place a centered placard is right
 * (the screen has nothing else to do — house rule); errors are inline status lines, not placards.
 */
export function EmptyState({ title, children, action }: { ... }) {
  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-center">
```

`ui-web`'s rule is stricter: *"Empty: an inline mono status line above still-rendered structure...
Never a centered placard, never an illustration."* Interestingly, both sides already agree on the
underlying principle this epic cares about — LCI's own ADR-0016 is the same "honest states, don't
imply data that isn't there" intent as `converse-frontends`'
[#260](https://github.com/ADORSYS-GIS/converse-frontends/issues/260)/[#276](https://github.com/ADORSYS-GIS/converse-frontends/issues/276)
— they just landed on different visual treatments for the true first-run-with-nothing-to-show
case. Step 5 needs an explicit call: adopt `ui-web`'s inline-only rule with no exception, or
carve one for true first-run emptiness the way LCI already does. Either is defensible; leaving it
undecided is not.

---

## 6. Open questions to carry into the design pass

1. Does any other planned screen (beyond code graph) need node-link/graph visualization? If yes,
   the code-graph decision in §4.1 should be made at the "do we need a graph layer" level, not
   scoped to one screen.
2. Is `/dashboard/admin` agent/system status, or something else? `actions.ts` alongside `page.tsx`
   suggests server actions (mutations), not a pure status view — worth confirming with LCI
   maintainers before designing it as read-only.
3. Confirm with #331's owner before locking the code-graph decision (§4.1) and the app name/chart
   name (§4.2) in ADR-0012 — both directly shape what #331 has to build against.
