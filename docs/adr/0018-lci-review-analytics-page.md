# ADR 0018: LCI review analytics — a product surface fed by control-plane aggregates, not Grafana iframes

## Status

Proposed.

Applies under [ADR 0008](0008-console-shell-inversion-and-visual-direction.md)'s visual direction,
[ADR 0010](0010-ui-primitive-stack-and-theming.md)'s primitive stack,
[ADR 0011](0011-url-first-state-nuqs.md)'s URL-first state rule and
[ADR 0013](0013-console-information-architecture-v3.md)'s information architecture and chart
doctrine. None of them is re-decided here. Extends
[ADR 0014](0014-lci-app-scaffolding-and-code-graph.md), which brought `apps/lci` into this
monorepo but settled nothing about analytics.

Relates to [ADR 0015](0015-admin-console-v2-declarative-dashboards-permissions-export.md) without
adopting it: the panel **vocabulary** ADR 0015 D1 established is reused wholesale; its
`dashboards.yaml` **engine** is deliberately not — see D3.

Backend counterparts, decided in `lightbridge-code-intelligence` and referenced rather than
restated: ADR-0032 (finding priority and category), ADR-0035 (the review-feedback signal),
ADR-0044 (feedback memory M1), ADR-0046 (why the Grafana boards read Postgres), ADR-0100 (the DB
run transcript was retired; tokens and cost live in Loki only).

Companion document, and the evidence base for every claim below:
`docs/design/lci-app/REVIEW_ANALYTICS_REPORT.md`. It is deliberately **not** in the pull request
that lands this ADR — it arrives with the spike that acts on it
([#516](https://github.com/ADORSYS-GIS/converse-frontends/issues/516)), so this decision can be
argued on its own terms first.

**What approving this record does and does not do.** It fixes the decisions below so they are
argued in one place rather than re-litigated per pull request, and it unblocks the spike — the
measurements in #516, then the implementation sequence at the end of this document. It starts no
implementation by itself, and D5/D6 stay provisional until the spike's numbers are in: if reaction
coverage turns out too thin to chart, this ADR is amended before any code is written, which is
what the spike exists to make possible.

## Context

`apps/lci` has two analytics surfaces today, and neither answers the question people ask of it.

**The Overview page (`/`) cannot express a time window.** It calls `GET /tasks` with no parameters,
which the control plane caps at 100 rows
(`lightbridge-code-intelligence/services/control-plane/src/queue/tasks.rs:16`), then aggregates
those rows in JavaScript (`apps/lci/src/lib/domain/insights.ts`) into a 14-day sparkline, a pass
rate and two breakdowns. On any estate busy enough to matter, "the last 14 days" is the last day
and a half and "Total runs" reads `100` permanently. There is no range picker because there is
nothing a range picker could do: the endpoint underneath has no window parameter and no aggregate.

**The per-repository analytics is two Grafana iframes.** `repository-overview-centre.tsx:51` embeds
`d-solo` panels for "Billed cost" and "Tokens used". Those are the only two panels in the whole
generated board set that are genuinely repository-scoped — `review-quality.py`'s own comment records
that its Postgres findings and reactions panels are _not_ filtered by `$repo` and were left out of
the embed "rather than guessed at". So the repository page shows the two things that come from the
gateway's Loki stream, and none of the things that come from the review pipeline itself.

**Meanwhile the interesting data is collected and unseen.** Every finalized review persists its
findings with priority and category (ADR-0032). Every 👍/👎 on a comment the bot posted is polled
off the forge and reconciled into `review_feedback` (ADR-0035), and is already fed back into the
reviewer's prompt as "previously rejected here" (ADR-0044). None of it is visible anywhere a user of
the app can reach — only in a Grafana behind a separate OAuth2 proxy, at estate scope.

The control plane offers no aggregate endpoint at all: `/tasks`, `/tasks/{id}`,
`/tasks/{id}/review`, `/tasks/{id}/feedback` and `/repositories` are all row readers, and the
feedback one is per task. "How many reviews did this repository get last month, and what did the
team think of them" is currently answerable only by fetching every task and every task's feedback.

## Decision

### D1 — Review analytics is a first-class product surface in `apps/lci`, on two routes

| Route                         | Scope            | Replaces                                           |
| ----------------------------- | ---------------- | -------------------------------------------------- |
| `/`                           | every repository | the 100-row client-side aggregation                |
| `/repositories/[id]/insights` | one repository   | the two Grafana iframes on the repository Overview |

No new nav destination: `/` is already "Overview", and `Insights` becomes a fourth tab beside
Overview / Graph / Settings in `repo-tabs-nav.tsx`. The repository Overview tab keeps its facts
(branch, platform, run count, approval provenance) and loses the iframes.

The estate/per-entity split is the shape this console already uses for the same question
(`/admin/overview` beside `/settings/overview/project`), and the per-repo page is the natural
drill-down target of the estate page's repository table.

### D2 — The data contract is a new aggregated read API on the control plane; the app never aggregates a row listing

Two bearer-protected endpoints, both gated on `task:read`, both repo-scoped or estate-scoped:

```
GET /api/v2/analytics/reviews?repository_id=&from=&to=&bucket=
GET /api/v2/analytics/feedback?repository_id=&from=&to=&bucket=
```

`repository_id` omitted means estate. `from`/`to` are RFC3339 with `to` exclusive. `bucket` takes a
constrained interval grammar and is **rejected loudly** rather than silently defaulted, on the same
reasoning the console applies to a missing `limit`: a window parameter that quietly becomes
something else answers a different question than the panel's title claims.

Three properties are decided here, each a deliberate divergence from how the console talks to its
own backend, and each with a reason that only holds because we own this endpoint:

- **The comparison window is computed server-side, in the same response.** The console issues a
  twin query for `compare: true` because it does not own the usage API. Here one
  `FILTER (WHERE …)` pair over a doubled window costs less than a second round trip.
- **Two endpoints, split by subject, not one.** Feedback lags reviews by up to a poll cycle and
  fails differently. A feedback query that errors must degrade one zone, not blank the run counts
  beside it.
- **The whole page is two requests** — not one per panel, and not one per deduplicated query. At
  this cardinality the board family _is_ the dedupe unit.

Corollary, binding on the app: **no screen computes a KPI by aggregating a paged row listing.** The
current Overview is the counter-example this rule exists to delete.

### D3 — The page is declarative, but as a typed module in `apps/lci` — not as a second `dashboards.yaml`

Panels are declared as data and rendered through the shared kit in
`packages/ui-web/src/sections/dashboard-panels/`: the nine types in `types.ts:25`, the renderer
registry at `panel-renderers.tsx:213`, `renderPanelBody` at `panel-renderers.tsx:334`,
`DashboardGrid` and `DashboardPanel`. A renderer consumes a `DashboardPanelView` — render-ready
data with pre-formatted strings — and knows nothing about where the numbers came from, which is
what makes it reusable across two apps with unrelated backends. `apps/lci` supplies adapters from
its own responses to that view type, and takes nothing else from the console.

The **engine** in `apps/console/src/dashboards/` is not reused. Its schema, resolver and hook are
built around the usage backend's vocabulary (`scope` / `scope_id` / `group_by` /
`metric: cost|requests|tokens|latency`) and around a client-side `useQueries` layer. `apps/lci` has
no `@tanstack/react-query`, no `yaml`, no `zod`, and renders from Server Components. Serving LCI
from that engine means giving it a pluggable data source — a genuine refactor, to buy operator
override and one shared schema, for one app with two pages.

**The condition for revisiting is stated so it can actually be met**: extract the engine behind a
data-source seam when either a third LCI dashboard page appears, or an operator asks to change LCI
panels without a rebuild. Until one of those is true, a typed spec module is the smaller correct
thing.

### D4 — Range is the page's primary control, comparison is implicit, bucket is derived

One `PageControls` row on the floor (ADR 0015 amendment A2 — filters live outside cards), URL-backed
with `nuqs` exactly as `/runs` and `/repositories` already are.

- **Range**: This week · Last week · This month · Last month · Last 7 / 30 / 90 days · Custom.
- **Comparison**: always on, never a knob. Every headline number carries a delta against the
  immediately preceding window of equal length, under the rule already written down in
  [`docs/knowledge/comparison-windows.md`](../knowledge/comparison-windows.md).
- **Bucket**: derived from the range (≤7d → 1 hour, ≤90d → 1 day, else 7 days), not chosen. A second
  knob that can contradict the first is a way to draw a wrong chart, not a feature.
- **Repository** (estate page only): optional narrowing, and the drill-down entry to the per-repo
  page.

### D5 — "Quality" is a small set of honest indicators. There is no composite score

The page reports: reviews and findings in the window; findings by priority and by category; the
delivery outcome mix; run duration p50/p95; the standing reaction counts and the acceptance rate
`👍 / (👍 + 👎)`; and the most down-voted findings for a repository.

It does **not** report a single weighted "review quality" number. Such a number would have to invent
weights across incommensurable things (a P0 finding against a 👎), and it would rest on a reaction
sample whose coverage nobody has measured and whose bias is obvious — people react to what annoys
them. If a score is later wanted, its weights must be operator configuration and must be printed
beside the number, never compiled in.

Four honesty rules travel with the panels and are enforced in the adapters, not left to review:

1. **The acceptance rate divides by `👍 + 👎`, never by `count(*)`.** `review_feedback` stores every
   reaction the forge allows (`heart`, `rocket`, `eyes`, …).
2. **Reaction timestamps are reconcile times, not reaction times.** The forge emits no webhook for
   reactions; a singleton reconciler polls (default every 300 s). Any reaction time series carries
   that caption.
3. **Feedback older than the poll window is frozen.** `list_pollable_comments` only considers
   comments whose task is younger than `RECONCILER_WINDOW_DAYS` (default 14) and tiers by age within
   it. A range longer than the poll window must say that its left edge is stale — the page caps its
   feedback panels at the window and captions them, rather than drawing a curve that implies
   continuous reconciliation.
4. **Coverage is shown with the rate.** "42 reactions across 900 posted comments", not a bare
   percentage that implies everyone answered.

### D6 — Findings get a normalized projection; the jsonb column stays the audit record

`reviews.findings` remains the verbatim record of what the agent said. A `review_findings` child
table — `(task_id, idx, file, line, start_line, priority, category, title)`, with the ADR-0032
priority and category fallbacks resolved **at write time** — is added in the control plane and
written at finalize, with a backfill over existing rows.

This is not primarily a dashboard optimisation. Today both the Grafana board and the backend's own
ADR-0044 feedback memory recover the finding behind a 👎 by joining `review_comments.(file, line)`
to a jsonb element on `f->>'file' = rc.file AND f->>'line' = rc.line::text`; the backend's own doc
comment concedes it is best-effort and that "a path-normalization mismatch just misses a row". Every
"👎 by category" figure in existence is therefore under-counted by an unknown amount, and the memory
fed back into the reviewer is missing rows for the same reason. A real key fixes the correctness
problem and makes the aggregation an index scan as a side effect.

Indexes land with it: `tasks (repository_id, created_at DESC)`, `reviews (created_at)`,
`review_feedback (created_at)` and `(task_id, reaction)`, `review_findings (task_id)` plus
`(priority)` / `(category)`.

A daily rollup table is **explicitly deferred**. With the projection and the indexes, the aggregate
queries are index scans over a bounded window; a rollup buys speed at the cost of a staleness
surface and a backfill obligation. The trigger to build one is a measured p95, stated in D7 — not a
guess.

### D7 — "Fast" is a number with a test behind it

**p95 under 200 ms for a 30-day single-repository window, and under 500 ms for a 90-day estate
window**, measured on the control plane. The plan for both aggregate statements is pinned by an
`EXPLAIN` assertion in the backend test suite, so an index that stops being used fails CI rather
than quietly degrading the page. The app caches the responses for 60 s (`revalidate: 60`, replacing
today's blanket `cache: 'no-store'`), which is invisible against feedback that is already up to five
minutes stale by construction.

### D8 — Grafana keeps operations; the app takes the product surface

After D1 lands, the two per-repo iframes are deleted. The run-logs embed on `/runs/[id]` **stays** —
it is a Loki log viewer, not an analytics panel, and rebuilding it here buys nothing.

The generated boards in `lightbridge-code-intelligence/deploy/observability/` remain that
repository's, and remain the operator's tool: RED metrics, ingress and queue health, and — the part
that cannot move — **billed cost and token usage, which live in the AI-Gateway's Loki billing stream
and are not in the control-plane database at all** since ADR-0100 retired the DB run transcript. A
control-plane-fed page can report volume, outcome, findings and feedback. It cannot report money,
and it must not appear to.

## Consequences

- **Good** — the Overview stops being wrong. A window question gets a windowed answer at any estate
  size, instead of a chart drawn over whatever 100 rows happened to come back.
- **Good** — the 👍/👎 signal becomes visible to the people who produce it. "The bot is noisy"
  becomes a list of specific findings this repository's reviewers rejected, which is the same data
  the agent already consumes privately under ADR-0044.
- **Good** — D6 fixes a correctness bug in that memory as a by-product, in the repository where it
  matters, whether or not any of the UI work ever ships.
- **Good** — one fewer origin, one fewer auth hop, one fewer theme surface, and the analytics stop
  disappearing when `NEXT_PUBLIC_GRAFANA_URL` is unset, which is the default.
- **Bad** — this repository's work is blocked on two tickets in `lightbridge-code-intelligence`
  (the migration, then the endpoints). Storybook stories for the new panels can be built from
  fixtures first, which is what the panel kit was designed to allow, but the screens cannot land
  against a mock that will not match.
- **Bad** — two declarative dashboard mechanisms now exist in one monorepo (the console's YAML
  engine and LCI's typed spec). D3 states the condition for collapsing them; until then this is
  duplication that has to be tolerated and re-read.
- **Bad** — the app loses its only per-repository cost view. If money must stay visible in the
  product, the "Billed cost" embed has to be kept as an explicitly labelled Grafana panel in its own
  zone rather than the page implying the control plane could answer it.
- **Neutral, and flagged** — `apps/lci` has no i18n; ADR 0017's i18next contract covers
  `apps/console` and `packages/ui-web` only. This page adds a meaningful amount of new copy, so it
  either follows the app's current hard-coded-English convention and enlarges the eventual
  migration, or `apps/lci` adopts i18next first. That is a separate decision and is not taken here.
- **Neutral** — export (the console's Typst sidecar) is out of scope. Nothing here blocks it later;
  nothing here does it.

## Alternatives considered

**Keep embedding Grafana, and add the missing panels there.** Cheapest, and it is where the SQL
already is. Rejected: only two of the existing panels are repository-scoped, and making the rest so
means adding a `$repo` variable to boards whose own comments record that this was considered and
declined. It also leaves the product's core signal behind a second origin, a second auth hop and a
theme the app does not control — and it does nothing about the Overview page, which has no Grafana
in it at all.

**Compute the aggregates in the Next.js layer over a bigger page of `/tasks`.** No backend ticket,
so it ships first. Rejected: it is the current bug with a larger constant. `GET /tasks` is capped at
100, raising the cap moves the failure rather than fixing it, findings live in a jsonb column the
app would have to explode client-side, and per-task feedback would need one request per run.

**Adopt `dashboards.yaml` for LCI — one page entry per LCI route in the console's engine.** One
mechanism, operator-overridable, consistent. Rejected for now: the engine's vocabulary is the usage
backend's, and its execution model is a client-side query layer `apps/lci` does not have. The
refactor to make it source-agnostic is real work whose payoff arrives with the third page. D3 names
the trigger to reopen it.

**A `review_daily` rollup table from the start.** Fastest possible reads. Rejected as premature:
it adds a staleness surface, a backfill obligation and a second source of truth for numbers the
indexed queries can serve inside the D7 budget. D6 keeps it as the answer to a measurement, not to
an intuition.

**A single composite "review quality" score, tunable by the operator.** Attractive as a headline
number. Rejected as the default (D5): the weights would be invented, the reaction sample that feeds
them is unmeasured and biased, and a number that looks authoritative and is not is worse than four
honest ones.

## References

- `docs/design/lci-app/REVIEW_ANALYTICS_REPORT.md` — the evidence base: schema tables, the feedback
  pipeline, the gap analysis, the panel list and the sequencing. Lands with
  [#516](https://github.com/ADORSYS-GIS/converse-frontends/issues/516)
- [#516](https://github.com/ADORSYS-GIS/converse-frontends/issues/516) — the spike that measures
  the two assumptions D5 and D6 rest on, and moves this record to Accepted or amends it
- [ADR 0014](0014-lci-app-scaffolding-and-code-graph.md) — `apps/lci`'s scaffolding and deployment
  identity
- [ADR 0015](0015-admin-console-v2-declarative-dashboards-permissions-export.md) — the panel-type
  vocabulary reused here, and the engine deliberately not reused
- [`docs/knowledge/dashboards.md`](../knowledge/dashboards.md),
  [`docs/knowledge/comparison-windows.md`](../knowledge/comparison-windows.md)
- `packages/ui-web/src/sections/dashboard-panels/types.ts:25` — the nine panel types;
  `panel-renderers.tsx:213` — the registry
- `lightbridge-code-intelligence` ADR-0032 (finding priority/category), ADR-0035 (review feedback
  signal), ADR-0044 (feedback memory M1), ADR-0046 (dashboards read Postgres), ADR-0100 (DB
  transcript retired — tokens and cost are Loki-only)
