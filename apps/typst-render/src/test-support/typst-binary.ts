/**
 * Is a usable `typst` on PATH right now?
 *
 * The golden tests shell out to the real binary — a mock would prove nothing about the one thing
 * this service does. CI always has it (the image is built from the pinned Typst image), but a
 * fresh laptop may not, so the suites that need it skip with a message that says how to get it
 * rather than failing with a confusing ENOENT.
 */
import { spawnSync } from 'node:child_process';

const probe = spawnSync(process.env.TYPST_BIN || 'typst', ['--version'], { encoding: 'utf8' });

export const typstAvailable = probe.status === 0;
export const typstVersion = typstAvailable ? probe.stdout.trim() : '';

export const TYPST_MISSING_MESSAGE =
  'SKIPPED: no `typst` on PATH — install it (`brew install typst`, or take the pinned binary ' +
  'out of ghcr.io/typst/typst:0.15.1) and re-run; these cases exercise the real compiler.';

if (!typstAvailable) {
  console.warn(`[typst-render tests] ${TYPST_MISSING_MESSAGE}`);
}
