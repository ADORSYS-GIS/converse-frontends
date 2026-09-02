import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The hard-cutover assertion for converse-frontends#452, story C9: **`isAdmin` is gone, and no
 * console code gates on a role string.**
 *
 * The story's own test expectation is "a grep assertion that `isAdmin` is gone". A literal grep
 * over the sources would fail on PROSE — several doc comments deliberately record what `isAdmin`
 * was and why it was deleted, and deleting that history to satisfy a matcher would trade a real
 * explanation for a green tick. So this strips comments first and asserts over the CODE only: an
 * identifier named `isAdmin`, or a literal `'lightbridge-admin'` used as a gate, may not exist.
 *
 * Why it matters, stated once so a future reader does not have to reconstruct it: prod mapped
 * `owner -> ["lightbridge-admin"]` and, under ADR-0026, every signed-in person owns an account —
 * so `roles.includes('lightbridge-admin')` was `true` for the entire user base. It was never a
 * decision anyone had made. Every gate now reads the permission set `procedure.getMyAccess`
 * resolved server-side (`server/access.ts`, `client/use-can.ts`), which cannot be conjured by a
 * claim mapper's default.
 *
 * If a sibling story adds a new admin page after this landed, the failure this produces is the
 * intended one: convert its gate rather than widening the allow-list below (there is none).
 */

/**
 * Removes line comments and block comments, leaving string literals alone enough for this file's
 * purpose.
 *
 * Deliberately simple, and honest about it: it tracks single-quoted, double-quoted, template and
 * regex-adjacent contexts well enough that a `//` inside a URL string (`https://…`) is not read as
 * a comment. It is not a JavaScript parser and does not need to be — a false NEGATIVE here would
 * only mean a comment survived into the scanned text, which makes the assertion stricter, not
 * looser.
 */
function stripComments(source: string): string {
  let out = '';
  let index = 0;
  let quote: string | null = null;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      if (char === '\\') {
        out += char + (next ?? '');
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      out += char;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      out += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 2;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

function sourceFiles(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

const FILES = sourceFiles(join(process.cwd(), 'src'));

/** This very file: it has to NAME what it forbids, so it cannot be subject to its own scan. */
const SELF = 'no-role-derived-gates.test.ts';

/**
 * Production source only.
 *
 * The `lightbridge-admin` scan below is scoped to it deliberately. A test may legitimately carry
 * that string as DATA — `role: 'lightbridge-admin'` is what a `PlatformRoleGrant` fixture holds,
 * and `roles: ['lightbridge-admin']` is exactly the session shape whose permission set must now be
 * consulted INSTEAD of its roles (the `route.test.ts` case that pins the inversion). Banning the
 * literal there would forbid testing the very thing this story changed.
 */
const PRODUCTION_FILES = FILES.filter((file) => !/\.test\.tsx?$/.test(file));

describe('the role-derived gate is gone', () => {
  it('finds source files to scan at all', () => {
    // A broken walk would make every assertion below pass vacuously.
    expect(FILES.length).toBeGreaterThan(50);
    expect(PRODUCTION_FILES.length).toBeGreaterThan(50);
  });

  it('declares or references no `isAdmin` identifier anywhere in the console', () => {
    const offenders = FILES.filter(
      (file) =>
        !file.endsWith(SELF) && /\bisAdmin\b/.test(stripComments(readFileSync(file, 'utf8')))
    );

    expect(
      offenders,
      `isAdmin survives in: ${offenders.join(', ')}. Gate on a permission ` +
        `(server/access.ts's can(), or client/use-can.ts's useCan()) instead.`
    ).toEqual([]);
  });

  it('never gates on the literal `lightbridge-admin` role string in production code', () => {
    const offenders = PRODUCTION_FILES.filter(
      (file) =>
        // `shared/permissions.ts` states the grantable role CATALOGUE (`PLATFORM_ROLES`), which is
        // what `/admin/roles`' dialog offers. That is a vocabulary, not a gate — no code branches
        // on it.
        !file.endsWith(join('shared', 'permissions.ts')) &&
        /lightbridge-admin/.test(stripComments(readFileSync(file, 'utf8')))
    );

    expect(
      offenders,
      `A 'lightbridge-admin' role literal appears in production code in: ${offenders.join(', ')}.`
    ).toEqual([]);
  });

  it('exports no ADMIN_ROLE constant from the token module', () => {
    const tokens = stripComments(
      readFileSync(join(process.cwd(), 'src', 'server', 'tokens.ts'), 'utf8')
    );

    expect(tokens).not.toContain('ADMIN_ROLE');
  });
});
