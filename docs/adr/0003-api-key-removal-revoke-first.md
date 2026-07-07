# ADR 0003: API key removal is revoke-first, delete is admin-only

## Status

Accepted

## Context

ADR 0001 deliberately left one question open:

> The backend supports both delete and revoke. The current implementation still calls delete because that is the existing hook and route behavior. A follow-up should decide whether Self-Service should prefer revoke for auditability and only expose delete for cleanup/admin use.

The current API key list (`apps/self-service/src/views/api-keys-list-view.tsx`) exposes a single destructive `delete` row action. Delete removes the key record and its lifecycle history (`status`, `last_used_at`, `last_ip`, `revoked_at`). This is irreversible and destroys the audit trail that operators need when investigating a leaked or misused key.

The backend already distinguishes the two operations:

- Revoke disables a key while preserving its record and stamping `revoked_at` / `status: revoked`.
- Delete removes the record entirely.

The developer-console references in ADR 0001 (Gladia, Cohere) treat key removal as an auditable lifecycle transition, not a hard delete.

## Decision

Self-Service treats **revoke as the primary key-removal action** and **delete as a secondary, admin/cleanup-only action**.

- The default row action is **Revoke**. It calls the backend revoke endpoint, preserves the record, and reflects `status: revoked` / `revoked_at` in the row.
- **Delete** remains reachable but is visually secondary and gated behind typed confirmation. It is intended for cleanup/admin use, not routine key hygiene.
- **Rotation** (`POST /api/v1/api-keys/{key_id}/rotate`) is exposed alongside revoke and reuses the one-time-secret display contract from the create flow (ADR 0001).

This decision closes the follow-up question raised in ADR 0001 in favor of auditability.

## Consequences

- The primary remove path stops destroying audit history; revoked keys remain visible with a revoked status.
- The row action group now carries three lifecycle actions (rotate, revoke, delete); these should be composed from the shared segmented/grouped control with diagonal separators established in ADR 0001, not hand-rolled per row.
- Copy and confirmation must clearly distinguish revoke (disable, reversible-in-spirit, keeps history) from delete (permanent, removes record) so users do not conflate them.
- Tracked by issue #53. Supersedes the delete-first behavior described as interim in ADR 0001.
