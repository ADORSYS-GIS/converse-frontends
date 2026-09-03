import { readdirSync, readFileSync, statSync, type Dirent, type Stats } from 'node:fs';
import { join } from 'node:path';

import {
  TEMPLATE_FILE_NAME,
  assertSafeRouteSegments,
  templatesOverrideRoot,
  templatesRoot,
  type TemplateSource,
} from './template-resolver';

/**
 * The files that ship WITH a route's `report.typ` — a customer's own logo, a watermark, a
 * typeface (owner feedback 2026-09-03: "we need a way to pass custom templates WITH embedded
 * logos in prod").
 *
 * `resolveReportTemplate` answers "which `.typ` compiles this route". This answers "what else is
 * in that directory", so a mounted override can be a self-contained little bundle:
 *
 * ```
 * ${CONSOLE_TEMPLATES_DIR}/admin/overview/report.typ     <- compiles
 * ${CONSOLE_TEMPLATES_DIR}/admin/overview/logo.png       <- #image("logo.png")
 * ```
 *
 * Every non-`.typ` file under the route's template directory is sent as a render asset keyed by
 * its path RELATIVE TO THAT DIRECTORY, which is what makes `image("logo.png")` resolve: the
 * service writes assets at those paths under the render root, and the template compiles as
 * `main.typ` at that same root, so a relative `image()` from the template finds it. (Contrast
 * `_lib/report.typ`, which is imported from a subdirectory and therefore needs the root-absolute
 * `image("/" + p.chart)` — see that file's own comment.)
 *
 * **Lookup order matches the template's, per FILE.** The override directory is read first and
 * wins for any relative path it carries; the shipped directory then fills in the rest. An operator
 * who mounts only `logo.png` for a route gets their logo with the shipped template — the two are
 * not a package deal, exactly as the template lookup itself is not.
 *
 * **`.typ` files are excluded, deliberately.** The template is resolved by
 * `resolveReportTemplate`, and `_lib/report.typ` is read from the shipped root and is not
 * overridable (an override of the library would restyle every report at once). Shipping other
 * `.typ` files as assets would create a second, silent import surface with neither of those
 * rules applied to it.
 */

/**
 * The ceiling on everything this console attaches to one render job.
 *
 * It is `apps/typst-render`'s own `TYPST_RENDER_MAX_REQUEST_BYTES`. The service enforces it on the
 * base64 request BODY, which is ~4/3 of the raw bytes, so this cap is the LOOSER of the two: it
 * exists to refuse an obviously-wrong asset set (a video dropped into a template directory, a
 * 40 MB TIFF) here, with a message naming the files, instead of spending a round-trip to be told
 * `payload_too_large` by a service that cannot know what the files were. A payload between the two
 * bounds is still refused — by the renderer, whose 413 the export route passes through as a 413.
 */
export const REPORT_ASSET_BUDGET_BYTES = 8 * 1024 * 1024;

export interface TemplateAssetFile {
  /** Path inside the render root — the file's path relative to the template directory. */
  path: string;
  bytes: Buffer;
  /** Which rung of the lookup order this file came from. */
  origin: TemplateSource;
  /** Where it was read from on disk. Named in the over-budget message. */
  absolutePath: string;
}

export type TemplateAssetsOutcome =
  | { ok: true; files: TemplateAssetFile[]; totalBytes: number }
  | { ok: false; kind: 'too_large'; totalBytes: number; limitBytes: number; message: string };

/** How deep a template directory is walked. A template bundle is a handful of files beside a
 *  `.typ`; anything deeper is a mount mistake, and an unbounded walk of an operator-supplied
 *  directory is not something to leave open. */
const MAX_DEPTH = 4;

function walk(root: string, prefix: string, depth: number, out: { path: string; abs: string }[]) {
  // No annotation on purpose: `readdirSync`'s `withFileTypes` overload is generic over the name
  // encoding, and naming `ReturnType<typeof readdirSync>` picks the Buffer-named variant.
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    // Not a directory, or unreadable. A route with no template directory of its own is the normal
    // case (it renders through `_lib/default.typ`), not an error.
    return;
  }
  for (const entry of entries) {
    // Dotfiles are never template content: `..data`/`..2026_09_03…` are the symlink farm every
    // ConfigMap volume is built from, and shipping those would double every asset.
    if (entry.name.startsWith('.')) continue;
    const absolutePath = join(root, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    // `statSync`, not the dirent's own `isFile()`/`isDirectory()`: EVERY key in a mounted
    // ConfigMap is a SYMLINK into the volume's `..data` snapshot, for which both dirent
    // predicates are false. Trusting the dirent would find no files at all in prod — the exact
    // deployment this feature exists for.
    let stats: Stats;
    try {
      stats = statSync(absolutePath);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      if (depth < MAX_DEPTH) walk(absolutePath, relativePath, depth + 1, out);
      continue;
    }
    if (!stats.isFile()) continue;
    if (entry.name.toLowerCase().endsWith('.typ')) continue;
    out.push({ path: relativePath, abs: absolutePath });
  }
}

/**
 * Every non-`.typ` file beside `<route>/report.typ`, override directory first.
 *
 * `route` is a route PATTERN this process already matched against `dashboards.yaml`
 * (`assertSafeRouteSegments` is the second, structural check) — never a caller-supplied path.
 */
export function collectTemplateAssets(
  route: string,
  limitBytes: number = REPORT_ASSET_BUDGET_BYTES
): TemplateAssetsOutcome {
  const segments = assertSafeRouteSegments(route);

  const roots: { root: string; origin: TemplateSource }[] = [];
  const overrideRoot = templatesOverrideRoot();
  if (overrideRoot) roots.push({ root: join(overrideRoot, ...segments), origin: 'override' });
  roots.push({ root: join(templatesRoot(), ...segments), origin: 'shipped' });

  const files: TemplateAssetFile[] = [];
  const claimed = new Set<string>();
  let totalBytes = 0;

  for (const { root, origin } of roots) {
    const found: { path: string; abs: string }[] = [];
    walk(root, '', 1, found);
    for (const entry of found) {
      // First writer wins, so the override directory shadows the shipped file of the same
      // relative path — the same per-FILE precedence `templateLookupPaths` gives `report.typ`.
      if (claimed.has(entry.path)) continue;
      claimed.add(entry.path);

      let bytes: Buffer;
      try {
        bytes = readFileSync(entry.abs);
      } catch (error) {
        console.warn(
          `[console] Template asset "${entry.abs}" could not be read:`,
          (error as Error).message
        );
        continue;
      }
      totalBytes += bytes.byteLength;
      files.push({ path: entry.path, bytes, origin, absolutePath: entry.abs });
      if (totalBytes > limitBytes) {
        return {
          ok: false,
          kind: 'too_large',
          totalBytes,
          limitBytes,
          message:
            `The template assets for "${route}" total more than ` +
            `${Math.round(limitBytes / 1024 / 1024)} MiB, which is more than the report renderer ` +
            `accepts in one request. Largest so far: ${largest(files)}. Remove or shrink the ` +
            `files beside ${join(root, TEMPLATE_FILE_NAME)}.`,
        };
      }
    }
  }

  return { ok: true, files, totalBytes };
}

function largest(files: TemplateAssetFile[]): string {
  const biggest = files.reduce((worst, file) =>
    file.bytes.byteLength > worst.bytes.byteLength ? file : worst
  );
  return `${biggest.absolutePath} (${Math.round(biggest.bytes.byteLength / 1024)} KiB)`;
}
