import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve as resolvePath, sep } from 'node:path';

/**
 * Which `.typ` file a report route renders with, and where it is read from
 * (converse-frontends#453).
 *
 * The story's own words: "path-to-page = path-to-template". A page's `dashboards.yaml` key IS a
 * router path, and its template lives at the mirrored path under `apps/console/templates/`, with
 * `[param]` segments written LITERALLY — `/admin/usage/actors/[actorId]` →
 * `templates/admin/usage/actors/[actorId]/report.typ`. Nothing derives one from the other at
 * runtime beyond joining the strings, so a reader can find the template for a page by reading its
 * URL.
 *
 * **Lookup order, per FILE (an acceptance criterion, and the reason it is not per directory):**
 *
 *  1. `${CONSOLE_TEMPLATES_DIR}/<route>/report.typ` — the operator's override, mounted read-only
 *     by `charts/converse-console`'s `report-templates` volume. `CONSOLE_TEMPLATES_DIR` is ALWAYS
 *     set on the console container, whether or not anything is mounted there, which is only safe
 *     because this lookup is per file: a ConfigMap carrying one file overrides exactly one report,
 *     and an absent directory overrides nothing.
 *  2. `apps/console/templates/<route>/report.typ` — the template shipped in the image.
 *  3. `apps/console/templates/_lib/default.typ` — the generic report, which iterates
 *     `report.panels` and is a perfectly good document for any page. A route without a template of
 *     its own is therefore never an error; a page added to `dashboards.yaml` exports on the day it
 *     is added.
 *
 * **`path` is never used to read a file.** It is matched against the routes `dashboards.yaml`
 * itself declares (plus the built-in consumption report), and only the MATCHED route — a string
 * this process already owned — is joined into a path. `../../etc` cannot match a declared route,
 * so it is refused before any filesystem call; `assertSafeRouteSegments` is the second, structural
 * line of defence in case a future document ever carried such a route.
 */

export const TEMPLATE_FILE_NAME = 'report.typ';

/** Where the shipped templates live, relative to the console app's own working directory —
 *  `process.cwd()` under `next dev`/`next build`/`next start`, exactly like `config.yaml` and
 *  `dashboards.yaml`. `CONSOLE_TEMPLATES_ROOT` exists only so a test can point at a fixture tree. */
export const DEFAULT_TEMPLATES_ROOT = './templates';

/** The shared library every shipped template imports, and the home of the generic fallback. */
export const TEMPLATE_LIB_DIR = '_lib';
export const DEFAULT_TEMPLATE_PATH = `${TEMPLATE_LIB_DIR}/default.typ`;

export type TemplateSource = 'override' | 'shipped' | 'default';

export interface ResolvedTemplate {
  /** The Typst source itself — what gets POSTed to `typst-render` as `template`. */
  source: string;
  /** The absolute file it was read from. Named verbatim in a compile-error message so an operator
   *  can tell an override apart from the shipped template at a glance. */
  absolutePath: string;
  /** Which rung of the lookup order answered. Surfaced in the report's own metadata so a reader
   *  of a PDF can tell whether they are looking at a customised document. */
  origin: TemplateSource;
  /** The route the template was resolved for. */
  route: string;
}

/** The shipped-template root. */
export function templatesRoot(): string {
  const configured = process.env.CONSOLE_TEMPLATES_ROOT ?? DEFAULT_TEMPLATES_ROOT;
  return isAbsolute(configured) ? configured : resolvePath(process.cwd(), configured);
}

/** The override root, or `null` when this deployment has none. Mirrors `load-dashboards.ts`'s
 *  `consoleConfigDir()`: an unset variable is a dev checkout, not a broken deployment. */
export function templatesOverrideRoot(): string | null {
  const configured = process.env.CONSOLE_TEMPLATES_DIR;
  if (!configured || configured.length === 0) return null;
  return resolvePath(process.cwd(), configured);
}

/**
 * A route path (`/admin/usage/actors/[actorId]`) → its segments, verified to be safe to join into
 * a filesystem path.
 *
 * `[actorId]` is deliberately allowed through as a literal directory name — that IS the shipped
 * layout, and it is the whole point of "the template path mirrors the route path". What is
 * refused is anything that could ESCAPE the root or address something other than a directory
 * name: `..`, `.`, an empty segment, a path separator inside a segment, a NUL, or an absolute
 * shape. Throwing (rather than returning null) because every caller has already matched the route
 * against a declared list — reaching here with an unsafe segment means the DOCUMENT is wrong, and
 * that is not something to paper over.
 */
export function assertSafeRouteSegments(route: string): string[] {
  if (!route.startsWith('/')) {
    throw new Error(`[console] Report route must start with "/": got "${route}"`);
  }
  const segments = route.split('/').filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (
      segment === '.' ||
      segment === '..' ||
      segment.includes('\0') ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes(sep)
    ) {
      throw new Error(`[console] Unsafe segment "${segment}" in report route "${route}"`);
    }
  }
  return segments;
}

/** Every candidate file for `route`, most specific first — exported so the ORDER itself is
 *  testable without touching the filesystem. */
export function templateLookupPaths(route: string): { path: string; origin: TemplateSource }[] {
  const segments = assertSafeRouteSegments(route);
  const candidates: { path: string; origin: TemplateSource }[] = [];

  const overrideRoot = templatesOverrideRoot();
  if (overrideRoot) {
    candidates.push({
      path: join(overrideRoot, ...segments, TEMPLATE_FILE_NAME),
      origin: 'override',
    });
  }

  const shippedRoot = templatesRoot();
  candidates.push({ path: join(shippedRoot, ...segments, TEMPLATE_FILE_NAME), origin: 'shipped' });
  candidates.push({ path: join(shippedRoot, DEFAULT_TEMPLATE_PATH), origin: 'default' });

  return candidates;
}

/**
 * Reads the winning template for `route`.
 *
 * Throws only when even the generic fallback is missing, which means the image was built wrong —
 * a deployment-shaped failure, not a request-shaped one, and the message says so.
 */
export function resolveReportTemplate(route: string): ResolvedTemplate {
  const candidates = templateLookupPaths(route);
  const found = candidates.find((candidate) => existsSync(candidate.path));
  if (!found) {
    throw new Error(
      `[console] No report template for route "${route}". Looked at:\n` +
        candidates.map((candidate) => `  - ${candidate.path}`).join('\n')
    );
  }
  return {
    source: readFileSync(found.path, 'utf8'),
    absolutePath: found.path,
    origin: found.origin,
    route,
  };
}

/**
 * The `_lib/report.typ` shared library, shipped alongside every template and sent with the render
 * job as an asset so `#import "_lib/report.typ"` resolves inside the sidecar's per-request root.
 *
 * It is read from the SHIPPED root only — deliberately NOT overridable. An override that could
 * replace the library could replace every report at once, and the story's contract is that a
 * template decides "only document chrome — header, section order, captions" for ITS OWN route.
 * An operator who wants different chrome everywhere overrides each route's file, which is a
 * visible, enumerable act.
 */
export function readTemplateLibrary(): { path: string; source: string } {
  const path = join(templatesRoot(), TEMPLATE_LIB_DIR, 'report.typ');
  return { path: `${TEMPLATE_LIB_DIR}/report.typ`, source: readFileSync(path, 'utf8') };
}
