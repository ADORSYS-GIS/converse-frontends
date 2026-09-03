/**
 * The build stamp one service reports about itself — the console's own, or a backend's, in the
 * exact shape `lightbridge-authz`'s `GET /version` and `getBuildInfo` both answer with
 * (lightbridge-authz#573).
 *
 * Every field is optional because the two sides genuinely differ: the console knows its package
 * version and (when its pipeline supplies one) its commit and image, and nothing about `rustc`;
 * a backend knows all of it. A field that is absent is simply not rendered — this section never
 * prints a row it has no value for, and never invents one.
 */
export interface BuildInfoFacts {
  /** Package/crate version — `0.8.1`, `1.4.0`. */
  version?: string;
  /** Full commit SHA. What the Copy affordance actually writes; the short form is what is shown. */
  commitSha?: string;
  /** First 7 characters of `commitSha`. Rendered instead of the full 40 — the full value is one
   *  click away and a 40-character string in a settings row is noise. */
  commitShortSha?: string;
  /** Commit date, as the backend reported it (RFC 3339). Rendered verbatim, never re-formatted
   *  into a relative "3 days ago" — a diagnostic screen wants the fact, not a friendlier fact. */
  commitDate?: string;
  /** Whether the working tree had uncommitted changes at build time. Anything CI built is `false`;
   *  `true` is worth seeing, which is why it is rendered as a `-dirty` suffix rather than hidden. */
  dirty?: boolean;
  /** The compiler that produced the binary — `rustc 1.98.0 (…)`. Backends only. */
  toolchain?: string;
  /** When the binary was built (RFC 3339). */
  builtAt?: string;
  /** The container image's own build SHA. Copyable, same as `commitSha`. */
  imageSha?: string;
  /** The image tag it was pushed as. Not necessarily the tag it was pulled by — image-updater
   *  resolves by digest — which is why both this and `imageSha` are shown. */
  imageTag?: string;
  /** When the image was built (RFC 3339). */
  imageBuiltAt?: string;
}

/**
 * What is known about one service right now.
 *
 * `unavailable` is a settled, honest answer — "this deployment has no usage backend configured",
 * "this build carries no commit SHA" — and carries the reason as its own caption. It is NOT the
 * same as `error` (the call was made and failed) or `loading` (no answer yet), and the section
 * renders all three differently on purpose: a reader diagnosing a version skew needs to know
 * whether a blank row means "not deployed", "unreachable", or "still asking".
 */
export type BuildInfoEntryState =
  | { status: 'ready'; facts: BuildInfoFacts }
  | { status: 'loading' }
  | { status: 'unavailable'; caption: string }
  | { status: 'error'; errorMessage: string; onRetry?: () => void };

export interface BuildInfoEntry {
  /** Stable identity for this row group — the service name (`authz-api`), or `console`. Used as
   *  the React key and to scope the per-value "Copied" acknowledgement. */
  id: string;
  /** What the reader sees — `Console`, `authz-api`, `authz-idp`. */
  label: string;
  /** One line under the label: how this answer was obtained (`getBuildInfo over /api`) or what
   *  this service is. Never load-bearing. */
  description?: string;
  state: BuildInfoEntryState;
}

export interface BuildInfoCardProps {
  /** Card title. Defaults to `Platform`. */
  title?: string;
  /**
   * The services, in the order they should read. The console's own entry belongs first — a reader
   * comparing "what am I running" against "what am I talking to" needs their own side as the
   * reference point.
   */
  entries: BuildInfoEntry[];
  /**
   * Rendered as an `InlineStatus` under the whole card — for a fact about the SET of entries that
   * no single row owns (e.g. "two services could not be reached"). Omitted when there is nothing
   * to say; never a permanent placeholder.
   */
  caption?: string;
  className?: string;
}
