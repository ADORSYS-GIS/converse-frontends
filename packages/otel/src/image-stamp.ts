/**
 * The container image half of the build stamp (lightbridge-authz#573), read from the environment
 * the image workflows promote out of build-args.
 *
 * ## Why this is two values and not one
 *
 * converse-frontends#477 stamped a single `IMAGE_TAG`, taken verbatim out of
 * `docker/metadata-action`'s `$TAGS` — which is a full image REFERENCE
 * (`ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad`), not a tag. Every consumer then
 * printed a reference where a tag was expected: `/settings/info`'s Image row, and — worse —
 * `service.version` on every span, where a 60-character registry path is not a version anyone can
 * group a Tempo query by.
 *
 * So the pipeline now stamps BOTH, and they mean different things:
 *
 *  - **`IMAGE_TAG`** — the tag alone (`sha-5fed3ad`). Short, immutable, resolves to exactly one
 *    digest, and is the thing argocd-image-updater promotes against. This is what
 *    `service.version` carries.
 *  - **`IMAGE_REF`** — the full reference the image was pushed as. Only a diagnostics screen wants
 *    it, and only because it is the string you can paste into `docker pull`.
 *
 * Deriving the tag from the reference (rather than requiring both) is deliberate: the reference
 * already contains the tag, so a caller that has only `IMAGE_REF` gets a correct answer instead of
 * a missing one. The reverse is not derivable and is not attempted — a tag names no registry.
 */

/**
 * The tag portion of a container image reference, or `undefined` when the reference carries none.
 *
 * The parsing rule is the one the OCI reference grammar implies, and the reason this is a function
 * rather than a `split(':')` is that both of the interesting cases break the naive version:
 *
 *  - `localhost:5000/console` — the only colon is a registry PORT. There is no tag here, and
 *    `5000/console` is not one.
 *  - `ghcr.io/…/console@sha256:abc…` — a digest reference. The digest is not a tag either, and its
 *    colon must not be mistaken for one.
 *
 * Hence: strip any digest, then accept a colon only if it comes AFTER the last `/`.
 */
export function tagFromImageReference(reference: string): string | undefined {
  const value = reference.trim();
  if (value === '') return undefined;

  const digestAt = value.lastIndexOf('@');
  const name = digestAt === -1 ? value : value.slice(0, digestAt);

  const lastColon = name.lastIndexOf(':');
  const lastSlash = name.lastIndexOf('/');
  if (lastColon === -1 || lastColon < lastSlash) return undefined;

  const tag = name.slice(lastColon + 1).trim();
  return tag === '' ? undefined : tag;
}

/** What this process knows about the image it is running inside. Both halves are optional: a
 *  `next dev` server is inside no image at all, and reporting nothing is the honest answer. */
export interface ImageStamp {
  /** The tag alone — `sha-5fed3ad`. */
  readonly tag?: string;
  /** The full reference — `ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad`. */
  readonly reference?: string;
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result === undefined || result === '' ? undefined : result;
}

/**
 * Reads `IMAGE_TAG` / `IMAGE_REF` out of an environment.
 *
 * `IMAGE_TAG` wins when both are present — it is what the pipeline explicitly decided the tag is —
 * and is itself run through the reference parser first, so an environment that (wrongly) puts a
 * full reference there still yields a tag rather than propagating the bug this function exists to
 * fix. A value the parser does not recognise as a reference is already a bare tag and is used
 * as-is.
 */
export function resolveImageStamp(env: Record<string, string | undefined>): ImageStamp {
  const reference = trimmed(env.IMAGE_REF);
  const stamped = trimmed(env.IMAGE_TAG);

  const tag = stamped
    ? (tagFromImageReference(stamped) ?? stamped)
    : reference
      ? tagFromImageReference(reference)
      : undefined;

  return { tag, reference };
}
