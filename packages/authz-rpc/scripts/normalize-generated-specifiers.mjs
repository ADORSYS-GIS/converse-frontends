#!/usr/bin/env node
/**
 * Post-codegen normalizer: drop the `.js` extension from the generated client's own **relative**
 * import specifiers.
 *
 * ## Why this exists
 *
 * `cratestack generate-typescript` emits `generated/src/*.ts` in the NodeNext convention, where a
 * sibling `runtime.ts` is imported as `./runtime.js`. Every consumer in this repo resolves that
 * *except* Turbopack, which has no equivalent of webpack's `resolve.extensionAlias` — neither
 * `turbopack.resolveExtensions` nor `turbopack.resolveAlias` (`{'*.js': ['*.ts', '*.js']}`) makes
 * it map `./runtime.js` onto `runtime.ts` (re-verified against Next 16.3.2). That single detail
 * pinned `apps/console` to webpack in development, which measured ~3x slower than Turbopack on
 * every headline number (see the PR that added this file).
 *
 * The generated tree already compiles with `moduleResolution: "Bundler"`
 * (`generated/tsconfig.json`), under which the extension is optional, so removing it costs
 * nothing and every consumer — `tsc`, vitest/Vite, Metro, webpack and Turbopack — resolves the
 * result.
 *
 * ## Why a script rather than a hand edit
 *
 * `generated/` is gitignored and rebuilt by the root `postinstall` (`codegen:all`), so a manual
 * edit would evaporate on the next install. This runs as the second half of this package's
 * `codegen` script instead.
 *
 * ## Why this should not exist forever
 *
 * The right fix is upstream, in cratestack: an emit option for extensionless (bundler-style)
 * relative specifiers. Filed as a feature request — see the PR body. Delete this script and the
 * `&& node scripts/...` in `package.json` once the generator can emit that directly.
 *
 * ## Contract
 *
 * Deterministic and idempotent: it rewrites `from "./x.js"` / `from "../x.js"` (and the
 * `export … from` form, which shares the same tail) to the extensionless specifier, and touches
 * nothing else — not bare package specifiers, not `.json`, not string literals that are not
 * module specifiers. Running it twice is a no-op. It fails loudly if `generated/src` is missing.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const generatedSrc = join(dirname(dirname(fileURLToPath(import.meta.url))), 'generated', 'src');

if (!existsSync(generatedSrc)) {
  console.error(
    `normalize-generated-specifiers: ${generatedSrc} does not exist — run codegen first.`
  );
  process.exit(1);
}

/** `from "<relative path>.js"` — the only shape cratestack emits for a sibling module. */
const RELATIVE_JS_SPECIFIER = /(\bfrom\s+")(\.{1,2}\/[^"]*)\.js(")/g;

let rewritten = 0;
for (const entry of readdirSync(generatedSrc)) {
  if (!entry.endsWith('.ts')) continue;
  const path = join(generatedSrc, entry);
  const source = readFileSync(path, 'utf8');
  const next = source.replace(RELATIVE_JS_SPECIFIER, (_match, head, specifier, tail) => {
    rewritten += 1;
    return `${head}${specifier}${tail}`;
  });
  if (next !== source) writeFileSync(path, next);
}

console.log(`normalize-generated-specifiers: rewrote ${rewritten} relative specifier(s).`);
