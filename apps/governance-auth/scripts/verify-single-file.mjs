// Build gate: the ONE property this app exists to guarantee.
//
// `governance-auth` (lightbridge-governance) `include_str!`s the built page at compile time and
// writes it to a socket bound to 127.0.0.1. There is no origin behind it, no CDN, and the machine
// may be offline. A second emitted file, or a single surviving external reference, does not
// degrade the page -- it breaks it in exactly the situation the page is for. Worse, a reference
// to a third party would hand that party a Referer for a URL that just carried an OAuth
// authorization code.
//
// The upstream Rust test (`callback_page::tests::makes_no_external_requests`) probes for the
// literal substrings `http://`, `https://`, `//cdn`, `<link`, `@import`, `src=`. Three of those
// cannot survive contact with a real bundler and are checked here in their meaningful form
// instead -- see NAMESPACE_URLS and README.md's "What the Rust-side test has to become".
//
// Run by `build:web`, after `vite build`. It reads only what is on disk.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(appDir, 'dist');

/**
 * `http(s)://` URLs that are XML namespace IDENTIFIERS, not fetch targets. A namespace URI is a
 * name -- nothing ever requests it. React DOM carries these unconditionally (`createElementNS`),
 * and daisyUI's inline `data:image/svg+xml` background carries the SVG one inside its own markup,
 * so no bundle containing React or the console stylesheet can be free of them.
 */
const NAMESPACE_URLS = new Set([
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/XML/1998/namespace',
]);

/**
 * URLs that appear only as TEXT inside a thrown error's message. `react-dom`'s production build
 * appends this to its minified error codes (`formatProdErrorMessage`); it is a place for a human
 * to read afterwards, never something the page requests. Nothing in this app can throw it — the
 * page has no state to get wrong — but it is in every production React bundle regardless.
 */
const DIAGNOSTIC_URLS = new Set(['https://react.dev/errors/']);

/**
 * The faces `packages/ui-web/src/styles.css` declares: Inter 400, IBM Plex Mono 400/500/600.
 * ONE `@font-face` each — `vite.config.ts`'s `latinSubsetAliases` is what collapses `@fontsource`'s
 * eleven-subsets-per-weight fan-out (22 faces, 656 KiB) down to these four.
 */
const EXPECTED_FONT_FACES = 4;

/** Budget for inlined font data. Unsubsetted it was 656 KiB; the Latin faces are ~181 KiB. */
const FONT_BUDGET_KIB = 200;

const failures = [];

function check(description, ok, detail) {
  if (ok) {
    console.log(`  ok   ${description}`);
  } else {
    failures.push(`${description}${detail ? `\n       ${detail}` : ''}`);
    console.log(`  FAIL ${description}`);
  }
}

// --- 1. Exactly one output file, and it is index.html -------------------------------------

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [path.relative(distDir, full)];
  });
}

let emitted;
try {
  emitted = walk(distDir).sort();
} catch {
  console.error(`verify-single-file: no build output at ${distDir} -- run \`vite build\` first.`);
  process.exit(1);
}

console.log(`\nverify-single-file: ${distDir}`);
console.log(`  emitted: ${emitted.length === 0 ? '(nothing)' : emitted.join(', ')}`);

check(
  'dist/ contains exactly one file',
  emitted.length === 1,
  `got ${emitted.length}: ${emitted.join(', ')}`
);
check('the one file is index.html', emitted[0] === 'index.html');

if (emitted[0] !== 'index.html') {
  console.error('\nverify-single-file FAILED\n');
  process.exit(1);
}

const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
console.log(`  size:    ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB`);

// --- 2. No construct that would make the browser fetch anything ---------------------------

// `src=` / `href=` on a real tag. Written as a tag-attribute match rather than the bare substring
// the Rust test probes for, so a `src=` that happens to occur inside a minified string literal is
// not a false positive -- and so a real `<script src>` cannot hide behind whitespace.
const TAG_ATTRIBUTE =
  /<(?:script|img|link|source|iframe|embed|object|video|audio|track|input|use|image)\b[^>]*?\s(?:src|href|srcset|data|poster)\s*=/gi;
const tagRefs = [...html.matchAll(TAG_ATTRIBUTE)].map((m) => m[0]);
check(
  'no tag carries a src/href/srcset/data/poster attribute',
  tagRefs.length === 0,
  tagRefs.join(' | ')
);

check('no <link> element at all', !/<link\b/i.test(html));
check('no CSS @import', !/@import\b/.test(html));
check('no protocol-relative URL', !/(?<![a-z:])\/\/(?:cdn|[a-z0-9-]+\.[a-z]{2,})/i.test(html));

// Every url(...) in the inlined CSS must be a data: URI, or a same-document fragment. `url(#a)`
// and its percent-encoded twin `url(%23a)` — which is what a fragment reference looks like once
// it is inside an inlined `data:image/svg+xml` — point at an element in the very same document.
const nonDataUrls = [...html.matchAll(/url\(\s*(['"]?)((?!data:)[^)'"]{0,120})\1\s*\)/gi)]
  .map((m) => m[0])
  .filter((raw) => !/url\(\s*(#|%23)/i.test(raw));
check('every CSS url() is a data: URI', nonDataUrls.length === 0, nonDataUrls.join(' | '));

// --- 3. Every absolute URL left in the file is a name or a diagnostic, not a target --------

const urls = [...new Set([...html.matchAll(/https?:\/\/[^\s'"`)<>\\]+/g)].map((m) => m[0]))];
const unexpected = urls.filter((url) => !NAMESPACE_URLS.has(url) && !DIAGNOSTIC_URLS.has(url));
check(
  'every absolute URL is an XML namespace or an error-message diagnostic',
  unexpected.length === 0,
  unexpected.join(' | ')
);
console.log(`  urls:    ${urls.length} distinct — ${urls.join(', ') || '(none)'}`);

// --- 3b. Fonts: Latin subsets only, inside budget -----------------------------------------

const faces = [...html.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => {
  const family = /font-family:\s*([^;}]+)/.exec(m[0])?.[1]?.trim() ?? '?';
  const weight = /font-weight:\s*([^;}]+)/.exec(m[0])?.[1]?.trim() ?? '?';
  return `${family} ${weight}`;
});
check(
  `exactly ${EXPECTED_FONT_FACES} @font-face rules, one per console face`,
  faces.length === EXPECTED_FONT_FACES,
  `got ${faces.length}: ${faces.join(', ')} — more than that means vite.config.ts's latinSubsetAliases stopped applying; fewer means a face went missing`
);

const fontBytes = [...html.matchAll(/url\(data:font\/[^)]*\)/g)].reduce(
  (total, m) => total + m[0].length,
  0
);
const fontKiB = fontBytes / 1024;
console.log(
  `  fonts:   ${faces.length} faces (${faces.join(', ')}), ${fontKiB.toFixed(1)} KiB inlined`
);
check(
  `inlined font data is under ${FONT_BUDGET_KIB} KiB`,
  fontKiB < FONT_BUDGET_KIB,
  `${fontKiB.toFixed(1)} KiB`
);

// --- 4. The contract with the Rust side ----------------------------------------------------

const placeholder = '__GOVERNANCE_AUTH_CALLBACK_STATUS__';
const placeholderCount = html.split(placeholder).length - 1;
check(
  `the status placeholder survives the build exactly once (${placeholder})`,
  placeholderCount === 1,
  `found ${placeholderCount}`
);
check(
  'the placeholder sits in the data-callback-status attribute',
  html.includes(`data-callback-status="${placeholder}"`)
);

// Both outcomes must be in the one shipped file -- the Rust side selects between them by
// rewriting the placeholder, so a bundle carrying only one of them is a broken page for the
// other.
check('the success heading is in the bundle', html.includes("You're signed in"));
check('the failure heading is in the bundle', html.includes('Sign-in failed'));

// The dev-only `?status=` override must not exist in a production bundle (`src/main.tsx`).
check(
  'the dev-only ?status= override was tree-shaken out',
  !html.includes("get('status')") && !html.includes('get("status")')
);

if (failures.length > 0) {
  console.error(`\nverify-single-file FAILED (${failures.length}):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error('');
  process.exit(1);
}

console.log('verify-single-file: OK\n');
