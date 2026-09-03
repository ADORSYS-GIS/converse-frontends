import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The i18n RATCHET (ADR 0017).
 *
 * ADR 0017 translated the shell, the command palette, `/settings/*`, `/admin/*`, the declarative
 * dashboards and the report templates. It did **not** translate the whole console — the account
 * overview, API keys, projects, the refill flow, the sign-in doorway's own panel and
 * `packages/ui-web`'s remaining defaults are named as follow-up work in
 * converse-frontends#490, and pretending otherwise in a comment is exactly the kind of claim this
 * repo does not accept.
 *
 * So this file measures instead of asserting. It counts the hard-coded user-visible strings still
 * left under `apps/console/src` and pins the number: the count may go DOWN freely, and going UP
 * fails. That makes "we are still finishing this" a checkable fact rather than a promise, and makes
 * the next screen someone writes in English a build failure rather than a silent regression.
 *
 * ── WHAT COUNTS ──────────────────────────────────────────────────────────────────────────────
 *  - **JSX text** in a `.tsx` file: `<span>Search</span>`. Only `.tsx`, because `>…<` in a `.ts`
 *    file is almost always a generic type argument (`Promise<void>`), and a scanner that cannot
 *    tell them apart is a scanner nobody trusts.
 *  - **Copy-bearing JSX attributes and object properties** in both: `title="Sessions"`,
 *    `label: 'Queue depth'`, `message: 'Could not load sessions.'`. The property form matters as
 *    much as the JSX form here — most of this console's copy reaches the screen as a prop built in
 *    a `use-*-screen` hook, never as a literal between two tags.
 *
 * ── WHAT DOES NOT ────────────────────────────────────────────────────────────────────────────
 * `ALLOWED` below, each entry with its reason. The rule for adding one: the string must be
 * something a person never reads in the product UI — a server log, an HTTP problem `message` a
 * machine consumes, a refine resource key, a config-error thrown at startup. "It is only a small
 * screen" is not a reason; that is what the count is for.
 *
 * Comments are stripped before scanning, so a doc comment quoting a string does not inflate the
 * number — the count would otherwise go up every time somebody explained a decision.
 */

const CONSOLE_SRC = join(import.meta.dirname);

/**
 * The pinned count, measured on the branch that introduced ADR 0017.
 *
 * Lower it when you translate something; the test tells you the new number. Never raise it.
 */
const REMAINING_HARDCODED_COPY = 28;

/** Attribute/property names whose string value is copy a person reads. */
const COPY_KEYS = [
  'title',
  'subtitle',
  'label',
  'placeholder',
  'aria-label',
  'message',
  'caption',
  'retryLabel',
  'emptyMessage',
  'heading',
  'description',
  'hint',
  'rowLabel',
  'actionLabel',
  'confirmLabel',
  'cancelLabel',
  'submitLabel',
  'helpText',
  'summary',
  'note',
  'legend',
  'tooltip',
];

/**
 * Files whose strings are NOT user-visible copy, each with the reason it is exempt rather than
 * merely untranslated. Paths are relative to `apps/console/src`.
 */
const ALLOWED: { path: string; why: string }[] = [
  {
    path: 'app/layout.tsx',
    why: 'Document metadata (`<title>`, description, PWA name). It is the application NAME, which is a proper noun in every locale, plus a manifest string the OS reads.',
  },
  {
    path: 'client/console-providers.tsx',
    why: "refine's `resources[].meta.label`. `syncWithLocation` is off and no refine UI renders these — they are the resource map's own keys, and the nav that a person reads is `console-chrome.tsx`'s.",
  },
  {
    path: 'server/proxy.ts',
    why: 'HTTP problem bodies returned to the RPC client, not rendered as prose. The screen turns a failed call into its own message.',
  },
  {
    path: 'server/build-info.ts',
    why: 'Backend probe outcomes carried as data to `BuildInfoCard`; the card is `/settings/info`, listed in the follow-up.',
  },
  {
    path: 'server/refresh-policy.ts',
    why: 'Refresh decision reasons — a server-side log/telemetry vocabulary, never shown.',
  },
  {
    path: 'server/session-store.ts',
    why: 'Cookie plumbing; the matched text is a TypeScript type fragment, not copy.',
  },
  {
    path: 'server/usage-scope-guard.ts',
    why: 'Authorization refusal reasons for the proxy, consumed as HTTP problem details.',
  },
  {
    path: 'server/reports/usage-fetch.ts',
    why: 'Report-route failure bodies; `/api/reports/page` renders them through its own JSON error shape, and the dialog states its own line.',
  },
  {
    path: 'i18n/resources.ts',
    why: 'A developer-facing throw naming a missing bundle — a startup misconfiguration, not a screen.',
  },
  {
    path: 'client/query-persister.ts',
    why: 'IndexedDB plumbing; the matched text is a type fragment.',
  },
  {
    path: 'client/use-shared-mutation.ts',
    why: 'Generic type fragments in a hook signature, not copy.',
  },
  {
    path: 'containers/use-budget-refill.ts',
    why: 'BigInt arithmetic expressions caught by the `>…<` heuristic, not copy.',
  },
  {
    path: 'server/reports/report-data.ts',
    why: 'A share-percentage expression caught by the heuristic; every real label in this module already comes from the `reports` bundle.',
  },
  {
    path: 'server/reports/report-html.ts',
    why: 'The HTML preview’s own debug scaffolding — a template-origin filename, not prose.',
  },
  {
    path: 'server/reports/consumption-report.ts',
    why: '`filters[].label` values (`account`, `project`) are FILTER KEYS echoed in the report header beside their ids, not sentences — the same identifiers the URL uses.',
  },
  {
    path: 'app/api/reports/consumption/route.ts',
    why: 'An HTTP problem body for a renderer failure; the dialog shows its own line.',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/** Line and block comments, and JSX comment expressions. Stripped so a doc comment that QUOTES a
 *  string cannot inflate the count — this codebase explains itself at length, and a scanner that
 *  punished that would be a scanner people route around. */
function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const HAS_WORD = /[A-Za-z]{2,}/;
const ATTRIBUTE = new RegExp(`\\b(${COPY_KEYS.join('|')})\\s*=\\s*(["'])([^"']{2,})\\2`, 'g');
const PROPERTY = new RegExp(
  `(^|[\\s{(,])(${COPY_KEYS.join('|')})\\s*:\\s*(["'])([^"']{2,})\\3`,
  'g'
);
const JSX_TEXT = />([^<>{}\n]+)</g;

export interface HardcodedCopySite {
  file: string;
  line: number;
  kind: string;
  text: string;
}

export function findHardcodedCopy(root: string = CONSOLE_SRC): HardcodedCopySite[] {
  const allowed = new Set(ALLOWED.map((entry) => entry.path));
  const sites: HardcodedCopySite[] = [];

  for (const file of walk(root)) {
    const rel = relative(root, file);
    if (allowed.has(rel)) continue;
    const isJsx = file.endsWith('.tsx');
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');

    lines.forEach((line, index) => {
      if (isJsx) {
        for (const match of line.matchAll(JSX_TEXT)) {
          const text = match[1].trim();
          if (HAS_WORD.test(text)) {
            sites.push({ file: rel, line: index + 1, kind: 'jsx-text', text });
          }
        }
      }
      for (const match of line.matchAll(ATTRIBUTE)) {
        if (HAS_WORD.test(match[3])) {
          sites.push({ file: rel, line: index + 1, kind: `attr:${match[1]}`, text: match[3] });
        }
      }
      for (const match of line.matchAll(PROPERTY)) {
        if (HAS_WORD.test(match[4])) {
          sites.push({ file: rel, line: index + 1, kind: `prop:${match[2]}`, text: match[4] });
        }
      }
    });
  }

  return sites;
}

describe('i18n ratchet (ADR 0017)', () => {
  it('never grows the number of hard-coded user-visible strings', () => {
    const sites = findHardcodedCopy();
    const report = sites.map((site) => `${site.file}:${site.line} ${site.kind} ${site.text}`);

    expect(
      sites.length,
      `Hard-coded copy went UP. New or moved sites:\n${report.join('\n')}\n\n` +
        'Translate the string (add a key under `apps/console/locales/en` AND `…/de`), or — only ' +
        'if it is genuinely never read by a person — add its file to `ALLOWED` with the reason.'
    ).toBeLessThanOrEqual(REMAINING_HARDCODED_COPY);
  });

  it('is pinned to the CURRENT count, so a translation lowers the number here too', () => {
    // The other half of a ratchet: without this, the pin drifts upward from reality and the first
    // assertion stops catching anything. When you translate a screen, this test tells you the new
    // number — put it in `REMAINING_HARDCODED_COPY`.
    expect(findHardcodedCopy().length).toBe(REMAINING_HARDCODED_COPY);
  });

  it('names a reason for every allow-listed file', () => {
    for (const entry of ALLOWED) {
      expect(entry.why.length, `${entry.path} needs a real reason`).toBeGreaterThan(30);
    }
  });
});
