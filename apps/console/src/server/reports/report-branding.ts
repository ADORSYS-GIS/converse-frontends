import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import type { ConsoleEnv } from '../env';

/**
 * The configured brand, as a report sees it (owner feedback 2026-09-03: "the PDF has no custom
 * logo").
 *
 * The console header already renders `branding.logo`/`branding.logoLight` through
 * `GET /branding/logo` (issue #368). A report cannot fetch a URL — the sidecar compiles in a
 * sandbox with no egress — so the SAME file is read off disk here and shipped with the render job
 * as an asset. One configured file, two renderings; there is no second logo to keep in sync.
 *
 * **Which variant prints.** `branding.logo` is the default AND dark-theme mark (a white logo, per
 * the owner's 2026-08-31 "White is for dark themes" directive and prod's own values comment);
 * `branding.logoLight` is its light-theme counterpart. Paper is white, so the light-theme variant
 * is the correct one and is preferred when configured — a white logo printed on white paper is an
 * empty rectangle, which is worse than no logo at all. A deployment that set only `logo` gets
 * `logo`: one mark configured means it is the mark, whatever its background assumptions.
 *
 * **A missing or unreadable file is not a failed report.** The logo is chrome. If the path is
 * configured but the file is gone (a ConfigMap renamed, a volume not mounted yet), this logs and
 * returns no asset, and `_lib/report.typ` falls back to the brand name and then to the plain
 * title — the same header every report had before this existed. Refusing to produce the document
 * because its letterhead is missing would be the wrong trade.
 */

/** Where the branding logo lands inside the render root. Fixed, so a customised template can
 *  reference it by name (`image("branding/logo.png")`) as well as through `report.branding.logo`. */
export const REPORT_BRANDING_ASSET_DIR = 'branding';

/** Extensions Typst's own `image()` can decode. A narrower list than `env.ts`'s
 *  `BRANDING_LOGO_CONTENT_TYPES` would be wrong (every one of those five is decodable), but the
 *  list is restated here rather than imported because the QUESTION is different: that one asks
 *  "what Content-Type does `GET /branding/logo` serve", this one asks "can the compiler draw it". */
const TYPST_DRAWABLE_EXTENSIONS = new Set(['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif']);

/** `report.branding` in `data.json` — what a `.typ` template is allowed to know about the brand. */
export interface ReportBranding {
  /** Asset path of the logo inside the render root, absent when none is configured or readable. */
  logo?: string;
  /** `branding.name` from `config.yaml`, absent when unset. */
  name?: string;
}

export interface ResolvedReportBranding {
  /** Omitted entirely when nothing is configured, so `"branding" in report` is a real question a
   *  template can ask. */
  branding?: ReportBranding;
  /** The logo bytes to ship as a render asset, keyed by the path `branding.logo` names. */
  asset?: { path: string; bytes: Buffer };
}

/** The configured logo path to PRINT, and the extension the asset takes its name from. */
export function printLogoPath(branding: ConsoleEnv['branding']): string | undefined {
  return branding?.logoLightPath ?? branding?.logoPath;
}

/**
 * Takes the branding block rather than reading `serverEnv()` itself — a caller passes
 * `serverEnv().branding`. The module stays pure and a test can state "no branding configured" as
 * `undefined` without that being indistinguishable from "argument omitted, go read the real
 * config".
 */
export function resolveReportBranding(env: ConsoleEnv['branding']): ResolvedReportBranding {
  const name = env?.name;
  const sourcePath = printLogoPath(env);
  if (!sourcePath) return name ? { branding: { name } } : {};

  const extension = extname(sourcePath).toLowerCase();
  if (!TYPST_DRAWABLE_EXTENSIONS.has(extension)) {
    console.warn(
      `[console] Branding logo "${sourcePath}" has an extension Typst cannot draw (${extension}); ` +
        'reports will print the brand name instead.'
    );
    return name ? { branding: { name } } : {};
  }

  let bytes: Buffer;
  try {
    bytes = readFileSync(sourcePath);
  } catch (error) {
    console.warn(
      `[console] Branding logo "${sourcePath}" could not be read for a report:`,
      (error as Error).message
    );
    return name ? { branding: { name } } : {};
  }

  const path = `${REPORT_BRANDING_ASSET_DIR}/logo${extension}`;
  return { branding: { logo: path, ...(name ? { name } : {}) }, asset: { path, bytes } };
}
