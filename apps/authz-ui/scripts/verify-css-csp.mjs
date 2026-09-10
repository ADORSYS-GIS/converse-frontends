// CSP gate for the built CSS (converse-frontends #407 — owner decision 2026-08-31: the strict
// `default-src 'self'; frame-ancestors 'none'` policy STANDS, with no `data:` carve-out).
//
// authz-idp serves this bundle under that CSP (lightbridge-authz ADR-0021 Decision 10). Measured
// in a real browser (#407's evidence comment): a `data:` URI referenced by an APPLIED rule is
// fetched and CSP-blocked even when the layer's background-size computes to 0% — for daisyUI's
// `.loading`/`.tooltip` masks and for the `--fx-noise` layer every daisy component composites in,
// that means functionally broken UI, not just console noise.
//
// Two invariants, checked against dist/assets/*.css after every build:
//
//  1. ZERO external references — no url(http(s)://...) and no protocol-relative url(//...).
//     Fonts are self-hosted (Fontsource → /ui/assets/*.woff2), so any external URL is a defect.
//
//  2. ZERO `data:` occurrences. Not "the count I measured last time" — zero.
//
// Invariant 2 used to be `=== EXPECTED_DATA_URI_COUNT` (10), pinning a status quo of inert daisy
// declarations that compiled in whether or not anything used them. That pin was unholdable,
// because the emitted set was a function of PROSE: Tailwind v4's scanner token-matches raw text,
// and `packages/ui-web/src/theme.css` `@source`s `packages/ui-web/src`, `apps/console/src` and
// `apps/lci/src` for every consumer of the stylesheet — this app included. #459 wrote the words
// "Total chat completions count" into an `apps/console/src/dashboards/derived-metrics.ts` doc
// comment, daisy's `.chat` component compiled into THIS bundle with its `--mask-chat` `data:`
// URI, the count went 10 → 11, and `main` went red on a comment.
//
// The fix was on the emit side, not here: `theme.css`'s `@plugin 'daisyui'` block now carries
// `exclude: chat, loading, mask, mockup, svg, tooltip` — the six (and only six) daisy parts whose
// CSS contains a `data:` URI, none of which this workspace uses. See that block's comment for the
// reachability argument. With them off, "zero" is a property of the daisy config rather than of
// anyone's comments, so this gate now fails only when something genuinely reintroduces a `data:`
// URI into a bundle whose CSP cannot fetch one.
//
// Reachability is still policed at the class level by `src/no-daisy-component-classes.test.ts`,
// `src/csp-safe-render.test.tsx` and `packages/ui-web/src/csp-safe-sections.test.ts` — this script
// is the emit-side gate, they are the usage-side gates.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const cssFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.error('verify-css-csp: no CSS files under dist/assets/ — did the build run?');
  process.exit(1);
}

const dataRefs = [];
const externalRefs = [];
for (const file of cssFiles) {
  const css = readFileSync(join(assetsDir, file), 'utf8');
  for (const m of css.matchAll(/data:/g)) {
    // Name the declaration that carries it, so the failure says WHAT came back rather than only
    // that a number moved: the property it is assigned to and the selector it sits under.
    const before = css.slice(Math.max(0, m.index - 400), m.index);
    const declStart = Math.max(
      before.lastIndexOf(';'),
      before.lastIndexOf('{'),
      before.lastIndexOf('}')
    );
    const property = before
      .slice(declStart + 1)
      .split(':')[0]
      .trim();
    const selector = before
      .slice(before.lastIndexOf('}') + 1)
      .split('{')[0]
      .trim();
    dataRefs.push(
      `${file}: ${selector.slice(-80) || '<unknown selector>'} { ${property}: data:… }`
    );
  }
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
if (dataRefs.length > 0) {
  console.error(
    `verify-css-csp: FAIL — ${dataRefs.length} \`data:\` occurrence(s) in built CSS, expected ` +
      `none. This bundle is served under \`default-src 'self'\` with no \`data:\` carve-out ` +
      `(#407), so an applied rule referencing one is fetched and blocked:`
  );
  for (const ref of dataRefs) console.error(`  - ${ref}`);
  console.error(
    `  If a daisyUI part came back, add it to the \`exclude:\` list in ` +
      `packages/ui-web/src/theme.css's \`@plugin 'daisyui'\` block (and check nothing in ` +
      `apps/console or apps/lci actually renders it). If it is our own CSS, inline the asset as a ` +
      `self-hosted file under /ui/assets instead — never a data: URI on this surface.`
  );
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `verify-css-csp: ok -- ${cssFiles.length} css file(s): 0 external url() refs, 0 data: URIs (#407)`
);
