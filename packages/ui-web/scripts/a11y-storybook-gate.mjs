#!/usr/bin/env node
/**
 * The Storybook accessibility gate, ratcheted (#443, owner directive 2026-09-03).
 *
 * Runs every story in headless Chromium under `@storybook/addon-a11y` with
 * `parameters.a11y.test = 'error'`, in BOTH themes, with `color-contrast` ON — the one place in
 * this repo where contrast can actually be measured. Then it compares what failed against
 * `a11y-storybook-baseline.json` and fails on anything that is not already recorded there.
 *
 * ## Why a baseline and not a plain pass/fail
 *
 * The first run of this gate produced 1674 failures across 2134 story-runs. 1632 of them are ONE
 * cause: the `subtle` token (`#8a8a8a` light / `#606060` dark) sits at 2.56–3.45:1 against the
 * surfaces it is used on, where WCAG 2.1 AA wants 4.5:1 for 12–13px text. That is not an accident
 * — `docs/design/console-redesign/README.md` §6 states it ("`muted` on `surface` is 2.8:1 — below
 * AA, so `muted` is used only for non-essential metadata") — so raising it is a palette decision
 * across every screen in the console, not something an accessibility-tooling change gets to make
 * on its own. It is filed as a follow-up. Everything else — the eight `aria-hidden-focus` findings
 * on Base UI's inert backdrops, and the handful of chart-token contrast failures on the `static`
 * report SVGs — is recorded the same way, per file, with its cause.
 *
 * ## What the ratchet actually enforces
 *
 * The baseline is keyed by STORY FILE and lists the rule ids that file is currently allowed to
 * fail. So:
 *
 *   - a violation in a file that is not in the baseline           → FAIL
 *   - a NEW rule id in a file that is in the baseline             → FAIL
 *   - a rule id that no longer fires anywhere in a listed file    → FAIL, telling you to remove it
 *
 * The last one is the ratchet: an entry can only ever be deleted. A fix that is not recorded makes
 * the gate red the same way a regression does, so the list cannot quietly stop matching reality.
 *
 * ## Why the ratchet is per RULE ID and not a count
 *
 * A per-file count of failing story-runs would be a tighter ratchet, and it was tried. It is not
 * stable: two identical runs of the same commit reported 29 and then 28 failing story-runs for
 * `multi-series-spend-chart/component.stories.tsx` (hover/tooltip stories whose rendered state
 * depends on timing), which would make the gate flap red for reasons no author could act on. A
 * `failing` count is still RECORDED per file, because the magnitude is the useful half of reading
 * this file — it is simply not asserted on. Rule ids are deterministic; counts are not.
 *
 * `--update` rewrites the baseline from the current run. Use it only when you have READ what
 * changed; it is not a way to make a red build green.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..');
const REPO = resolve(PKG, '../..');
const BASELINE = join(PKG, 'a11y-storybook-baseline.json');
const UPDATE = process.argv.includes('--update');

/** Rule ids the addon reports look like `… (color-contrast)"` in the assertion message. */
const RULE_ID = /\(([a-z][a-z0-9-]*)\)"/g;
/** Strip the reporter's ANSI colouring before matching anything. */
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
/**
 * A failure that is not an axe finding at all — the story threw, or its `play` did. Recorded under
 * this synthetic id so the baseline says plainly that the story does not render, rather than
 * pretending it is an accessibility exception.
 */
const RENDER_ERROR = 'story-did-not-run';

const out = join(mkdtempSync(join(tmpdir(), 'a11y-sb-')), 'results.json');
const run = spawnSync(
  'vitest',
  ['run', '--config', 'vitest.storybook.config.mts', '--reporter=json', `--outputFile=${out}`],
  { cwd: PKG, stdio: ['ignore', 'inherit', 'inherit'], shell: false, env: process.env }
);
if (run.error) {
  console.error(`a11y-storybook-gate: could not start vitest — ${run.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(out, 'utf8'));
} catch (error) {
  console.error(
    `a11y-storybook-gate: vitest produced no parseable report (exit ${run.status}). ` +
      `The browser run itself failed — read the output above, this is not a baseline problem.\n` +
      `  ${error.message}`
  );
  process.exit(1);
}

/** file → { failing: story-runs that failed, rules: Set(rule ids) }, across BOTH theme projects. */
const observed = new Map();
let failedAssertions = 0;
let totalAssertions = 0;

for (const suite of report.testResults ?? []) {
  const file = relative(REPO, suite.name).replaceAll('\\', '/');
  for (const assertion of suite.assertionResults ?? []) {
    totalAssertions += 1;
    if (assertion.status !== 'failed') continue;
    failedAssertions += 1;
    const message = (assertion.failureMessages ?? []).join('\n').replace(ANSI, '');
    const ids = [...message.matchAll(RULE_ID)].map((m) => m[1]);
    const entry = observed.get(file) ?? { failing: 0, rules: new Set() };
    entry.failing += 1;
    if (ids.length === 0) entry.rules.add(RENDER_ERROR);
    else for (const id of ids) entry.rules.add(id);
    observed.set(file, entry);
  }
}

const asObject = () =>
  Object.fromEntries(
    [...observed.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([f, entry]) => [f, { failing: entry.failing, rules: [...entry.rules].sort() }])
  );

if (UPDATE) {
  writeFileSync(BASELINE, `${JSON.stringify(asObject(), null, 2)}\n`);
  console.log(
    `a11y-storybook-gate: baseline rewritten — ${observed.size} file(s), ` +
      `${failedAssertions}/${totalAssertions} story-runs failing.`
  );
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const regressions = [];
const fixed = [];

for (const [file, entry] of observed) {
  const recorded = baseline[file];
  const allowed = new Set(recorded?.rules ?? []);
  for (const rule of entry.rules) {
    if (!allowed.has(rule)) regressions.push(`${file}  →  ${rule}`);
  }
}
for (const [file, entry] of Object.entries(baseline)) {
  const seen = observed.get(file);
  for (const rule of entry.rules) {
    if (!seen?.rules.has(rule)) fixed.push(`${file}  →  ${rule}`);
  }
}

console.log(
  `\na11y-storybook-gate: ${totalAssertions} story-runs (2 themes), ` +
    `${failedAssertions} failing, ${observed.size} file(s) with findings.`
);

if (regressions.length > 0) {
  console.error(
    `\nNEW accessibility findings — ${regressions.length}, none of them in the baseline:\n` +
      regressions.map((r) => `  ${r}`).join('\n') +
      `\n\nFix them. Adding them to ${relative(REPO, BASELINE)} is not the remedy: that file ` +
      `records deviations an owner has already ruled on, and it is only ever allowed to shrink.`
  );
}
if (fixed.length > 0) {
  console.error(
    `\nBaseline entries that no longer fire — ${fixed.length}:\n` +
      fixed.map((r) => `  ${r}`).join('\n') +
      `\n\nSomething got fixed. Ratchet it down: re-run with \`--update\` and commit the smaller ` +
      `baseline, so it cannot come back unnoticed.`
  );
}

process.exit(regressions.length + fixed.length > 0 ? 1 : 0);
