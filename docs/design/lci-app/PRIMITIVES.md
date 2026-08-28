# Primitive gap list — `apps/lci` on `packages/ui-web`

Companion to [ADR 0012](../../adr/0012-lci-app-scaffolding-and-code-graph.md). For every UI
element `lightbridge-code-intelligence/apps/web` currently hand-builds, this says what it becomes
under `packages/ui-web`. This is the actual output the epic
([#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)) calls "the entire input to
phase 2" — implementation work for the `new` and `rebuild` rows should point at rows of this
table, the same way `docs/design/console-redesign/PRIMITIVES.md` asks to be used for the console.

Read against `lightbridge-code-intelligence@d46d6b4` and `converse-frontends@62960f4`, both
`main`, verified by checking out and hard-resetting both local clones to their remotes rather than
trusting a cached read.

Legend, same as the console's table:

- **keep/reuse** — an existing `ui-web` primitive covers this as-is.
- **class swap** — same shape, LCI's hand-written daisy classes replace with the `ui-web`
  equivalent's variant API.
- **rebuild** — LCI's current implementation uses a pattern `ui-web` has already rejected for a
  documented reason (see [`console-redesign/PRIMITIVES.md`](../console-redesign/PRIMITIVES.md)
  §"What is explicitly not adopted from daisyUI"); the screen needs redesigning against the
  primitive that *is* sanctioned, not a mechanical port.
- **new** — does not exist in `ui-web` yet; a real gap for [#330](https://github.com/ADORSYS-GIS/converse-frontends/issues/330).
- **app-local** — not a design-system concern; stays a plain component in `apps/lci`, same as it
  is a plain component in `apps/web` today.

---

## Shell

| LCI component (`apps/web/components/shell/`) | Outcome | Becomes | Notes |
| --- | --- | --- | --- |
| `console-shell.tsx` | keep/reuse | `ui-web`'s `console-shell` | Same flex-shell/sticky-rail contract; LCI's version predates the flush-rail revision `ui-web`'s already has. |
| `command-palette.tsx` | keep/reuse | `ui-web`'s `command-palette` | `ui-web`'s is `cmdk`-based (ADR 0010); confirm LCI's page-jump/repo-switch actions register the same way. |
| `nav-link.tsx` | class swap | `ui-web`'s `nav-spine` | LCI hand-rolls a single active-link component; `nav-spine` already gives the full list + active-row treatment. |

## Forms and actions

| LCI component | Outcome | Becomes | Notes |
| --- | --- | --- | --- |
| `button.tsx` | keep/reuse | `ui-web`'s `button` | Direct match — both are a `variant`/`size` map over daisy `btn`. |
| `select.tsx` | **rebuild** | `ui-web`'s `scope-select`/`rail-select` pattern (Base UI Select) | LCI styles a **native** `<select>` with `select select-sm` — the exact "unstyleable option list, can't follow theme" problem `scope-select`'s own rebuild note describes. LCI's `Select` is also generic-purpose (list filters, form fields), not scope-specific — likely needs its own generic Base-UI-backed `Select` primitive in `ui-web`, distinct from the account/project-scope one. |
| `search-input.tsx` | rebuild, folds into an existing gap | `ui-web`'s `field` (Base UI Field + daisy `input`) | A search variant of `field` rather than a standalone primitive — confirm during the screen pass whether a dedicated `search-input` variant is warranted or `field` alone covers it. |
| `toggle.tsx` | **new** (extraction) | standalone `ui-web` `Toggle`/`Switch` | `ui-web` already uses Base UI Switch + daisy `toggle` *inside* `report-export-panel`, but does not export it as its own primitive. LCI needs a general-purpose one (settings rows, form-submit-on-change) — extract what `report-export-panel` already has rather than hand-rolling a second toggle. |
| `pagination.tsx` | **new** | — | No `ui-web` equivalent. LCI's version is a daisy `join` of prev/page-label/next, URL-state controlled (nuqs-compatible shape already). `row-action-group` uses `join` for a different purpose (inline row actions); pagination is a distinct primitive. |
| `command-snippet.tsx` | **new** | — | Copyable one-line shell command (e.g. `kubectl logs …`) with a copy-to-clipboard button. No equivalent anywhere in `ui-web`; closest relative is `secret-reveal`'s copy-affordance logic, which this can share rather than reimplement. |

## Data display

| LCI component | Outcome | Becomes | Notes |
| --- | --- | --- | --- |
| `card.tsx` (`Card`/`CardHeader`/`CardTitle`/`CardBody`) | **rebuild** | `RailPanel` / `StatCard` / bare floor, per usage | Wraps content in daisy `card card-border bg-base-200` — exactly the pattern `console-redesign/PRIMITIVES.md` lists as **not adopted** ("Centre content is never carded. Panels are `RailPanel`/`StatCard` only.") and the console-ui skill's "Never do" list repeats. Every current `Card` usage across `apps/web` needs a per-screen call: does this content become a `RailPanel` (if it's genuinely rail-scoped), a `StatCard`, or does it just sit on the floor with a `label` heading instead of a border? Not a mechanical swap — the biggest single "rebuild" item on this list by usage count. |
| `settings-section.tsx` (`SettingsSection`/`SettingsRow`) | **rebuild**, shares `card.tsx`'s problem | new `ui-web` primitive, floor-native (hairline `raised` separators, no `border`/`rounded-box` wrapper) | Same bordered-box pattern as `Card`. The label/description/control row shape itself is sound and close to what a `ui-web` settings-section primitive should look like — it just needs to lose the card chrome. Candidate for a genuinely **new** `ui-web` primitive (`settings-section` doesn't exist in the console's inventory either, since the console has no comparable settings screen yet). |
| `source-badge.tsx` | **rebuild** | `ui-web`'s `status-text` | Config-provenance indicator (`default`/`file`/`db`) rendered as a daisy `badge`. `status-text`'s whole reason to exist is "status is text, never a pill" — this is a direct instance of the rule it was written to enforce. |
| `status-pill.tsx` (`Pill`/`StatusPill`) | **rebuild** | `ui-web`'s `status-text` | Same conflict as `source-badge.tsx`: run status (`pending`/`active`/`success`/`error`) as a daisy `badge badge-soft`, including a pulsing dot for the active state. `status-text`'s pulsing/active treatment (if it has one) needs checking against this usage during the screen pass — this is the richest of the two badge conflicts (four states + a pulse animation, not just a label). |
| `repo-list.tsx`, `run-list.tsx` / `run-table.tsx` / `run-row.tsx` | class swap | `ui-web`'s `ledger-table` | Both are typed, sortable/paginated row lists — the exact shape `ledger-table` is generic over. |
| `run-timeline.tsx` | **new** | — | No `ui-web` equivalent seen in the current inventory (30+ primitives, none timeline-shaped). Confirm during the screen pass whether this is closer to a specialised `ledger-table` variant or a genuinely new visual form. |
| `repo-tabs.tsx`, tabs on repository detail (`Overview`/`Graph`/`Settings`) | class swap | `ui-web`'s `sub-nav` | `sub-nav` is already a **rebuild** onto Base UI Tabs in the console's own migration (counts stay in the label text, never a badge) — LCI's tabs should target the same rebuilt primitive, not the pre-migration daisy `tabs` class. |
| `preset-picker.tsx` | class swap | `ui-web`'s `rail-select`/`scope-select` family | A picker over a fixed option set — same shape as the account/project scope pickers. |

## Code graph — not a `ui-web` concern

| LCI component (`apps/web/components/repos/graph/`) | Outcome | Notes |
| --- | --- | --- |
| `code-graph-canvas.tsx`, `code-graph-panel.tsx`, `layout.ts`, `node-inspector.tsx`, `use-code-graph.ts` | **app-local** | Node-link graph rendering (`@xyflow/react` + `dagre`), not a design-system primitive — see [ADR 0012](../../adr/0012-lci-app-scaffolding-and-code-graph.md) for the full decision. Ported into `apps/lci` with [lightbridge-code-intelligence#635](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/635)'s fixed-node-size bug fixed as part of the port, not carried forward. Zero rows of this table apply to it — it does not become a `ui-web` primitive, and no `ui-web` primitive (including `chart-core`) currently has anything to offer a node-link graph. |

## External embeds — app-local, not a gap

| LCI component | Outcome | Notes |
| --- | --- | --- |
| `repo-analytics-embed.tsx`, `run-logs-embed.tsx` | **app-local** | Grafana `d-solo` iframe embeds gated on `NEXT_PUBLIC_GRAFANA_URL`/equivalent. Integration components, not design-system primitives — same category as `apps/console`'s usage-panel proxying. [lightbridge-code-intelligence#609](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/issues/609) (component test harness, [PR #614](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/pull/614)) is direct prior art for testing this exact env-var-gated-fallback shape and should be read before writing this screen's tests. |

## States

| LCI component | Outcome | Becomes | Notes |
| --- | --- | --- | --- |
| `states.tsx` → `StatusLine`/`ApiErrorLine` | class swap | `ui-web`'s `inline-status` / `error-line` | The inline (non-empty-screen) half of `states.tsx` already matches `ui-web`'s rule: a mono line, not a placard. |
| `states.tsx` → `EmptyState` (first-run, centered) | **rebuild — pending a decision, not a swap** | `ui-web`'s `inline-status`, *if* the design pass removes LCI's centered-placard exception | LCI's own ADR-0016 explicitly permits a centered placard for the true first-run-nothing-exists-yet case; `ui-web`'s rule ("never a centered placard, never an illustration") has no such exception today. This needs an explicit call during the screen pass — see [ADR 0012](../../adr/0012-lci-app-scaffolding-and-code-graph.md)'s scope did **not** settle this one; it belongs in `docs/design/lci-app/README.md` §"States" once the actual first-run screens (empty repositories list, empty runs list) are drawn. |

---

## Rows requiring a decision before implementation (do not start #330 on these without it)

1. **`Card` / `SettingsSection`** — the single largest-surface-area rebuild. Needs a per-screen
   pass, not a component-for-component swap, because the fix is "stop wrapping in a box," which
   changes layout, not just class names.
2. **First-run empty state** — LCI's ADR-0016 vs. `ui-web`'s no-exception rule. Two defensible
   answers, no default.
3. **`select.tsx`** — confirm whether LCI's generic list-filter/form `Select` shares a component
   with the account/project `scope-select`, or genuinely needs its own primitive; they currently
   solve different problems (scope switching vs. arbitrary option lists) that happen to look alike.
