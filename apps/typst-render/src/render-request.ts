/**
 * The `POST /render` wire contract and its validation.
 *
 * Validation is deliberately strict and total: the caller is the console's export route, so a
 * malformed body is a bug in a sibling service, not a user typo, and it should fail loudly with
 * a message that names the offending field. Nothing here touches the filesystem — the checks that
 * matter for safety (asset filenames) are pure string/path checks so they can be unit-tested
 * without a temp directory or a Typst binary.
 */
import path from 'node:path';

/** Filename the template source is always written as inside the render root. */
export const TEMPLATE_FILENAME = 'main.typ';
/** Filename `data` is always written as; `--input data=data.json` points `sys.inputs` at it. */
export const DATA_FILENAME = 'data.json';
/** Filename the compiled PDF is written to inside the render root. */
export const OUTPUT_FILENAME = 'out.pdf';

const RESERVED_FILENAMES = new Set([TEMPLATE_FILENAME, DATA_FILENAME, OUTPUT_FILENAME]);

/** A validated render request: exactly what `renderPdf` needs, nothing optional left to guess. */
export interface RenderRequest {
  /** Typst source, written to `main.typ` at the render root. */
  readonly template: string;
  /** Arbitrary JSON, written to `data.json` next to the template. */
  readonly data: unknown;
  /** Extra files (SVG/PNG/fonts) keyed by their path relative to the render root, base64-encoded. */
  readonly assets: ReadonlyMap<string, Buffer>;
}

export type ParseResult =
  | { readonly ok: true; readonly request: RenderRequest }
  | { readonly ok: false; readonly message: string };

function invalid(message: string): ParseResult {
  return { ok: false, message };
}

/**
 * Is `name` safe to write inside the render root?
 *
 * Rejects absolute paths, anything that escapes the root via `..`, Windows drive/UNC shapes, NUL
 * bytes, and the three filenames the service owns. `path.posix.normalize` is used rather than
 * `path.normalize` so the answer does not depend on the host OS: the render root is always a POSIX
 * layout inside the container, even when a developer runs the tests on Windows.
 */
export function isSafeAssetName(name: string): boolean {
  if (name.length === 0 || name.length > 255) return false;
  if (name.includes('\0')) return false;
  if (name.startsWith('/') || name.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(name)) return false;
  if (name.includes('\\')) return false;
  const normalized = path.posix.normalize(name);
  if (normalized === '.' || normalized === '..') return false;
  if (normalized.startsWith('../') || normalized.startsWith('/')) return false;
  if (RESERVED_FILENAMES.has(normalized)) return false;
  return true;
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Strict base64 decode. `Buffer.from(s, 'base64')` silently ignores every character it does not
 * recognise, so a truncated or accidentally-double-encoded asset would decode to plausible-looking
 * garbage and surface much later as an unreadable image inside a PDF. Reject it at the boundary.
 */
export function decodeBase64Strict(value: string): Buffer | null {
  const compact = value.replace(/[\r\n]/g, '');
  if (compact.length % 4 !== 0) return null;
  if (!BASE64_RE.test(compact)) return null;
  return Buffer.from(compact, 'base64');
}

export function parseRenderRequest(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return invalid('body must be a JSON object');
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.template !== 'string' || body.template.length === 0) {
    return invalid('`template` must be a non-empty string of Typst source');
  }

  const data: unknown = body.data ?? {};
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return invalid('`data` must be a JSON object');
  }

  const rawAssets: unknown = body.assets ?? {};
  if (typeof rawAssets !== 'object' || rawAssets === null || Array.isArray(rawAssets)) {
    return invalid('`assets` must be an object mapping filename to base64 content');
  }

  const assets = new Map<string, Buffer>();
  for (const [name, encoded] of Object.entries(rawAssets as Record<string, unknown>)) {
    if (!isSafeAssetName(name)) {
      return invalid(`asset name ${JSON.stringify(name)} is not a safe relative path`);
    }
    if (typeof encoded !== 'string') {
      return invalid(`asset ${JSON.stringify(name)} must be a base64 string`);
    }
    const bytes = decodeBase64Strict(encoded);
    if (bytes === null) {
      return invalid(`asset ${JSON.stringify(name)} is not valid base64`);
    }
    assets.set(path.posix.normalize(name), bytes);
  }

  return { ok: true, request: { template: body.template, data, assets } };
}
