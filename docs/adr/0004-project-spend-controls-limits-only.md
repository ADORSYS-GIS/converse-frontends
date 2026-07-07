# ADR 0004: Project spend controls are default-limits only for v2

## Status

Accepted

## Context

ADR 0001 places budget at the project scope and sketches a full monetary budget model — amount, currency, period, warning threshold, enforcement mode, and current-spend/remaining. It also records the binding constraint:

> The current backend does not expose a first-class project budget field. It only exposes `billing_plan`, `allowed_models`, and `default_limits` (`concurrent_requests`, `requests_per_day`, `requests_per_second`). Therefore, the first backend-compatible implementation can expose default limits as the operational budget. Monetary project budgets require a backend contract addition before the UI can persist them.

During v2 planning we had to choose how far to go now. Options considered:

1. Ship limits now **and** render disabled monetary-budget controls plus file a backend contract request.
2. Block the whole project-spend surface until the backend adds a budget field.
3. Ship **only** `default_limits` as the complete v2 story and defer monetary budgets to v3 with no UI stub.

## Decision

For v2, project spend controls are **`default_limits` only**. Monetary budgets are **deferred to v3 with no UI stub** and no backend contract request in this cycle.

Concretely, Project settings will:

- Edit `default_limits` (`concurrent_requests`, `requests_per_day`, `requests_per_second`) and view `billing_plan` / `allowed_models`.
- Surface current spend and remaining headroom for the project from the Usage API (read-only, informational).
- Render **no** monetary-budget fields (amount, currency, period, threshold, enforcement).

Project settings copy frames `default_limits` as operational throughput controls, not a monetary spend cap.

## Consequences

- v2 project-spend work is fully self-contained in this repository with **no cross-team backend dependency** — this was the deciding factor.
- We avoid shipping a disabled/placeholder budget UI that implies a capability the backend cannot honor.
- v3 monetary budgets will **extend** the Project settings screen rather than rebuild it; when the backend adds a first-class budget field, a new ADR will supersede this scope decision.
- Enforcement behavior (throttle/block) remains a backend concern and is out of scope here regardless of phase.
- Tracked by issue #56. Refines the budget section of ADR 0001 by fixing the v2 boundary.
