import { StatusText } from '@lightbridge/ui-web/src/components/status-text';

import type { Review, ReviewFinding } from '../lib/domain/tasks';

/**
 * The agent's persisted review for a run: one finding per disclosure row, priority and category
 * shown as status text. No `'use client'` — the disclosure rows are native `<details>`/
 * `<summary>`, so they work without JS.
 */
function priorityOf(finding: ReviewFinding): 'P0' | 'P1' | 'P2' {
  const p = finding.priority?.trim().toUpperCase();
  if (p === 'P0' || p === 'P1' || p === 'P2') return p;
  switch (finding.severity?.trim().toLowerCase()) {
    case 'error':
    case 'critical':
      return 'P0';
    case 'warning':
    case 'warn':
    case 'high':
      return 'P1';
    default:
      return 'P2';
  }
}

function categoryOf(finding: ReviewFinding): string {
  return finding.category?.trim() || 'correctness';
}

function isSecurity(finding: ReviewFinding): boolean {
  return categoryOf(finding).toLowerCase() === 'security';
}

export function ReviewOutput({
  review,
  repoPlatform,
}: {
  review: Review;
  repoPlatform?: 'github' | 'gitlab' | null;
}) {
  const counts = [
    `${review.inline_count} inline`,
    `${review.deferred_count} deferred`,
    review.out_of_scope_count > 0 ? `${review.out_of_scope_count} out of scope` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {review.summary ? (
        <p className="text-soft text-sm leading-relaxed">{review.summary}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-subtle text-xs">{counts.join(' · ')}</p>
        {review.review_url ? (
          <a
            href={review.review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline">
            {repoPlatform === 'gitlab' ? 'View on GitLab' : 'View on GitHub'}
          </a>
        ) : null}
      </div>
      {review.findings.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {review.findings.map((f, index) => (
            // biome-ignore: static, server-rendered list, index keeps the key unique when two
            // raw findings are identical (file/line/severity/title).
            <FindingItem key={`${f.file}:${f.line}:${index}`} finding={f} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The suggested-patch block's paint. Hoisted only so the `<pre>` fits on one line — see its
 *  `eslint-disable-next-line` for why that matters. */
const SUGGESTION_CLASS = 'bg-chrome rounded-field mt-2 overflow-x-auto p-2 font-mono text-xs';

function FindingItem({ finding }: { finding: ReviewFinding }) {
  const hasDetail = Boolean(finding.body || finding.suggestion || finding.resources?.length);
  const defaultOpen = priorityOf(finding) === 'P0' || isSecurity(finding);

  if (!hasDetail) {
    return (
      <li>
        <div className="border-border rounded-field flex flex-wrap items-center gap-2 border p-3">
          <FindingHeader finding={finding} />
        </div>
      </li>
    );
  }

  return (
    <li>
      <details open={defaultOpen} className="border-border rounded-field group border">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
          <FindingHeader finding={finding} />
        </summary>
        <div className="border-border border-t px-3 pt-2.5 pb-3">
          {finding.body ? (
            <p className="text-subtle text-sm whitespace-pre-wrap">{finding.body}</p>
          ) : null}
          {finding.suggestion ? (
            // `tabIndex={0}` because this scrolls: axe `scrollable-region-focusable` (WCAG 2.1.1)
            // — a suggested patch can be wider than the panel, and without a tab stop a keyboard
            // user cannot reach the rest of the line. Same treatment, same reason as
            // `LedgerTable`'s `ledger-scroll` box; no `role`, so it adds no landmark. The class
            // list is hoisted so the attribute fits on the element's own line — an
            // `eslint-disable-next-line` targets a LINE, and jsx-a11y reports at the `tabIndex`
            // attribute, not at the tag.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            <pre tabIndex={0} className={SUGGESTION_CLASS}>
              {finding.suggestion}
            </pre>
          ) : null}
          {finding.resources && finding.resources.length > 0 ? (
            <div className="mt-2">
              <span className="text-subtle text-[11px] font-medium tracking-wide uppercase">
                Resources
              </span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {finding.resources.map((url, index) => (
                  // biome-ignore: static list, index keeps the key unique when a URL repeats.
                  <li key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-xs break-all hover:underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/** Priority + category chips, then title, then file:line — plain text via `StatusText`, never a
 *  pill. A `security` category always reads as `attention`, regardless of priority. */
function FindingHeader({ finding }: { finding: ReviewFinding }) {
  const priority = priorityOf(finding);
  const security = isSecurity(finding);
  const priorityTone =
    security || priority === 'P0' ? 'attention' : priority === 'P1' ? 'muted' : 'muted';

  return (
    <>
      <StatusText tone={priorityTone} className="font-medium tracking-wide uppercase">
        {priority}
      </StatusText>
      <StatusText tone={security ? 'attention' : 'muted'} className="tracking-wide">
        {categoryOf(finding)}
      </StatusText>
      <span className="text-ink text-sm font-medium">{finding.title}</span>
      <span className="text-subtle ml-auto font-mono text-xs">
        {finding.file}:{finding.line}
      </span>
    </>
  );
}
