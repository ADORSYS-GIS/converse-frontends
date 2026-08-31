// CSP gate for the built CSS (converse-frontends #407 — owner decision 2026-08-31: the strict
// `default-src 'self'; frame-ancestors 'none'` policy STANDS, with no `data:` carve-out).
//
// authz-idp serves this bundle under that CSP (lightbridge-authz ADR-0021 Decision 10). Measured
// in a real browser (#407's evidence comment): a `data:` URI referenced by an APPLIED rule is
// fetched and CSP-blocked even when the layer's background-size computes to 0% — for daisyUI's
// `.loading`/`.tooltip` masks that means functionally broken UI, not just console noise.
//
// Two invariants, checked against dist/assets/*.css after every build:
//
//  1. ZERO external references — no url(http(s)://...) and no protocol-relative url(//...).
//     Fonts are self-hosted (Fontsource → /ui/assets/*.woff2), so any external URL is a defect.
//
//  2. The `data:` occurrence count equals EXPECTED_DATA_URI_COUNT exactly. The built CSS
//     unavoidably CONTAINS inert `data:` declarations (daisyUI defines `--fx-noise` at :root and
//     mask images for `.tooltip`/`.loading` whether or not anything uses them — Tailwind's
//     scanner token-matches raw text, so these rules compile in from prose alone). Inert
//     declarations are safe: no matching className exists in this app
//     (src/no-daisy-component-classes.test.ts is the class-level guard). This count pins the
//     status quo so any CHANGE — a daisy upgrade adding data: URIs, a new component emitting
//     one, or (fine, but must be conscious) a drop — fails the build and forces a human to
//     re-verify reachability against the #407 evidence before adjusting the number.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const EXPECTED_DATA_URI_COUNT = 10;

const assetsDir = join(process.cwd(), 'dist', 'assets');
const cssFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.error('verify-css-csp: no CSS files under dist/assets/ — did the build run?');
  process.exit(1);
}

let dataCount = 0;
const externalRefs = [];
for (const file of cssFiles) {
  const css = readFileSync(join(assetsDir, file), 'utf8');
  dataCount += (css.match(/data:/g) ?? []).length;
  for (const m of css.matchAll(/url\(\s*["']?(https?:|\/\/)[^)]*\)/g)) {
    externalRefs.push(`${file}: ${m[0].slice(0, 120)}`);
  }
}

let failed = false;
if (externalRefs.length > 0) {
  console.error(
    `verify-css-csp: FAIL — ${externalRefs.length} external url() reference(s) in built CSS; ` +
      `default-src 'self' blocks these at runtime:`
  );
  for (const ref of externalRefs) console.error(`  - ${ref}`);
  failed = true;
}
if (dataCount !== EXPECTED_DATA_URI_COUNT) {
  console.error(
    `verify-css-csp: FAIL — ${dataCount} \`data:\` occurrence(s) in built CSS, expected exactly ` +
      `${EXPECTED_DATA_URI_COUNT}. If this is a deliberate, verified-inert change (see #407's ` +
      `reachability evidence and src/no-daisy-component-classes.test.ts), update ` +
      `EXPECTED_DATA_URI_COUNT with a comment naming what changed; otherwise something new is ` +
      `referencing a data: URI the CSP will block.`
  );
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `verify-css-csp: ok -- ${cssFiles.length} css file(s): 0 external url() refs, ` +
    `${dataCount} data: occurrence(s) (all verified inert under the strict CSP, #407)`
);
