# ADR 0014: LCI app scaffolding — name, chart, and the code-graph decision

## Status

Accepted.

Applies under [ADR 0008](0008-console-shell-inversion-and-visual-direction.md)'s locked visual
direction and [ADR 0010](0010-ui-primitive-stack-and-theming.md)'s primitive stack. Neither is
re-decided here — this ADR only settles what is specific to bringing
`lightbridge-code-intelligence`'s UI into this monorepo as a new app: its name, its deployment
identity, and how its one genuinely novel surface (the code graph) gets built.

Companion document: [`docs/design/lci-app/PRIMITIVES.md`](../design/lci-app/PRIMITIVES.md) — the
per-primitive gap list this ADR's decisions feed into.

## Context

The new app is scoped by the epic
([converse-frontends#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)) to reuse
`packages/ui-web` and `packages/chart-core`, sit beside `apps/console`, and inherit ADR 0008/0010
without re-litigating them. Two things are not yet decided anywhere:

1. **What the app and its deployment artifacts are called.** `apps/` today holds `console`
   (package name `"console"`) and `self-service` (Expo, scheduled for deletion). There is exactly
   one naming precedent (`console`), and the new name is referenced from three places that need to
   agree: the `pnpm-workspace.yaml` `apps/*` glob (any name works), the eventual Helm chart in
   `ai-helm/charts/` (the pattern [#287](https://github.com/ADORSYS-GIS/converse-frontends/issues/287)
   establishes for the console), and the ArgoCD `Application` entry in
   `ai-helm/charts/apps/values.yaml`.

   **This matters concretely**: `ai-helm/charts/lightbridge-code-intelligence/` already exists —
   it is LCI's **backend** service's chart. `ai-helm/charts/apps/values.yaml` already lists both
   `lightbridge-code-intelligence.yaml` (backend ArgoCD app) and `converse-ui.yaml` (console
   ArgoCD app) side by side. A new frontend chart or ArgoCD app named `lightbridge-code-intelligence`
   would collide with the existing backend entry.

2. **How the code graph gets built.** LCI's current code graph
   (`apps/web/components/repos/graph/`) is not a design-system concern — it is `@xyflow/react` +
   `dagre` layout logic. It shipped with a label-overflow rendering defect (long, unbroken Rust
   symbol paths bleeding past their node box and visually overlapping neighbouring nodes/edges),
   which `lightbridge-code-intelligence` has since fixed and merged to its own `main` — the label
   now clips to its node with an ellipsis, and the full name is available via a hover tooltip.
   That fix is upstream and stable by the time this app ports the screen; nothing about it needs
   deciding here. Neither `packages/ui-web` nor `packages/chart-core` has any node-link graph
   primitive; `chart-core` is scales/bins/color-ramps for time-series and histogram charts only.

## Decision

### App identity

The new app is `apps/lci`, package name `"lci"` — lowercase, unscoped, matching the existing
`"console"` precedent exactly (not `"@lightbridge/lci"`; that scope is reserved for `packages/*`
per `@lightbridge/ui-web` and `@lightbridge/chart-core`).

Its Helm chart and ArgoCD app (built when the #287-style pipeline is copied for this app, in
[#331](https://github.com/ADORSYS-GIS/converse-frontends/issues/331)) are named `lci-web` —
distinct from the existing `lightbridge-code-intelligence` chart/app, which stays the name for
LCI's backend. `ai-helm/charts/apps/values.yaml` gains an `lci-web.yaml` entry alongside
`converse-ui.yaml` and the existing `lightbridge-code-intelligence.yaml`; it does not replace or
rename either.

### Code graph: port as-is

The code graph is ported into `apps/lci` largely unchanged (`@xyflow/react` + `dagre`, the same
`code-graph-canvas.tsx` / `layout.ts` / `node-inspector.tsx` / `use-code-graph.ts` shape),
**including the already-merged label-clipping fix** (`overflow: hidden` / `text-overflow:
ellipsis` / `white-space: nowrap` on the node style, plus the full label surfaced via
`domAttributes.title` for hover). There is no known rendering defect to carry forward or absorb
into this epic's scope — the port inherits a screen that already renders correctly.

No graph-visualization library beyond what LCI already uses (`@xyflow/react` + `dagre`) is
introduced by this decision. If the design pass (`docs/design/lci-app/README.md`) surfaces a
second screen that also needs node-link visualization, that graph primitive extraction (its own
package, sibling to `chart-core`) is a separate, later decision — not assumed here.

One local addition beyond the port itself: the canvas sizes its own height to the space below it
in the viewport, rather than the fixed height LCI's screen uses upstream. This doesn't touch the
`@xyflow/react`/`dagre` decision above — it's a container-sizing detail, not a rendering or layout
change to the graph itself.

## Consequences

- Good, because the chart/app naming collision with LCI's existing backend chart is avoided
  before anyone writes a Helm manifest, rather than discovered at deploy time.
- Good, because the code-graph screen ports with no known rendering defect and no extra scope
  absorbed into this epic's phase 3 (`apps/lci`'s implementation, #331) — the upstream fix already
  landed on its own schedule, in its own repo, before this port needed it.
- Neutral, because if a second graph-visualization surface turns up during the design pass, the
  "extract a `graph-core` package" question is deferred to when there are two consumers, not one —
  consistent with how `chart-core` itself was only extracted once the console needed to share chart
  math with more than one screen.

## Alternatives considered

**App name `apps/code-intelligence`** — more descriptive, but breaks the short, single-word
pattern `console` set, and is a longer string to repeat across the chart name, the ArgoCD app
name, and CI job names. Rejected in favor of `apps/lci` — LCI is already how the epic, the issues,
and this document refer to the product.

**Reuse the `lightbridge-code-intelligence` chart name for the frontend, distinguish by
namespace instead** — technically possible in ArgoCD, but makes `ai-helm/charts/apps/values.yaml`
harder to read (two entries with the same base name, differing only in a namespace field a
reviewer has to open the file to see) and invites exactly the collision this ADR exists to avoid
if a namespace override is ever forgotten. Rejected.

## References

- Epic: [converse-frontends#328](https://github.com/ADORSYS-GIS/converse-frontends/issues/328)
- [converse-frontends#287](https://github.com/ADORSYS-GIS/converse-frontends/issues/287) — Helm
  chart and image workflow pattern this app's deployment copies
- [lightbridge-code-intelligence#640](https://github.com/ADORSYS-GIS/lightbridge-code-intelligence/pull/640) —
  the upstream fix this port inherits (label clipping + hover tooltip)
- [`docs/design/lci-app/README.md`](../design/lci-app/README.md),
  [`docs/design/lci-app/PRIMITIVES.md`](../design/lci-app/PRIMITIVES.md) — the design spec and gap
  list this ADR is a companion to
