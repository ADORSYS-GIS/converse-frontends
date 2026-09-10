import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-expect-error -- a plain .mjs codemod at the repo root; there is no .d.ts and there should
// not be one. `violations()` returns string[]; that is the whole contract this file consumes.
import { storyFiles, TAXONOMY_ROOTS, violations } from '../../../scripts/storybook-taxonomy.mjs';

// `import.meta.dirname`, the way `section-class-audit.test.ts` does it — NOT
// `new URL(..., import.meta.url)`, which vitest can hand back as a non-`file:` URL. That failure
// mode is silent and dangerous here: the walk throws, gets swallowed, and `violations()` returns
// `[]` over zero files — a green test that checked nothing. The second case below exists to make
// exactly that unfalsifiable.
const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/**
 * The Storybook taxonomy, as a test rather than only a script.
 *
 * Two failures this catches that NOTHING else does:
 *
 * 1. **A duplicate title silently eats a story.** Storybook merges two metas with the same `title`
 *    into one sidebar entry — no warning, no build failure, one of the two screens simply stops
 *    being reachable. `build-storybook` passes either way, so CI would stay green while a page
 *    story disappeared.
 * 2. **A new story quietly re-opens a flat root.** The whole point of the 2026-09-03 reorganisation
 *    is that the sidebar has a small, fixed set of roots; a story titled `Components/Foo` compiles
 *    perfectly and puts the tree back where it was.
 *
 * The codemod (`node scripts/storybook-taxonomy.mjs --check`) runs the identical assertion for a
 * developer who wants it outside vitest. This is the gate; that is the convenience.
 */
describe('storybook taxonomy', () => {
  it('every story title is unique and sits under a taxonomy root', () => {
    expect(violations(REPO_ROOT)).toEqual([]);
  });

  it('covers both story roots — ui-web and apps/lci', () => {
    const files: string[] = storyFiles(REPO_ROOT);
    expect(files.some((f: string) => f.includes('/packages/ui-web/src/'))).toBe(true);
    expect(files.some((f: string) => f.includes('/apps/lci/src/'))).toBe(true);
  });

  it('names the roots `preview.tsx` sorts, so the two cannot drift apart unnoticed', () => {
    expect(TAXONOMY_ROOTS).toEqual([
      'Foundations',
      'Primitives',
      'Charts',
      'Shell',
      'Dashboard',
      'Sections',
      'Pages',
      'LCI',
      'Legacy',
    ]);
  });
});
