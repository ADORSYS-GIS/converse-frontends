import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Review, ReviewFinding } from '../lib/domain/tasks';
import { ReviewOutput } from './review-output';

function baseReview(overrides: Partial<Review> = {}): Review {
  return {
    task_id: 'task-1',
    summary: '',
    body: '',
    inline_count: 0,
    deferred_count: 0,
    out_of_scope_count: 0,
    findings: [],
    review_url: null,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function baseFinding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    file: 'src/handler.ts',
    line: 42,
    title: 'Missing null check',
    body: '',
    ...overrides,
  };
}

describe('ReviewOutput', () => {
  it('renders the summary and inline/deferred/out-of-scope counts', () => {
    render(
      <ReviewOutput
        review={baseReview({
          summary: 'Looks solid overall.',
          inline_count: 3,
          deferred_count: 1,
          out_of_scope_count: 2,
        })}
      />
    );

    expect(screen.getByText('Looks solid overall.')).toBeInTheDocument();
    expect(screen.getByText('3 inline · 1 deferred · 2 out of scope')).toBeInTheDocument();
  });

  it('omits the out-of-scope count entirely when there are none, rather than showing "0"', () => {
    render(
      <ReviewOutput
        review={baseReview({ inline_count: 2, deferred_count: 0, out_of_scope_count: 0 })}
      />
    );

    expect(screen.getByText('2 inline · 0 deferred')).toBeInTheDocument();
    expect(screen.queryByText(/out of scope/)).not.toBeInTheDocument();
  });

  it('links to GitHub or GitLab by repoPlatform, and renders no link when review_url is absent', () => {
    const { rerender } = render(
      <ReviewOutput
        review={baseReview({ review_url: 'https://github.com/acme/repo/pull/1' })}
        repoPlatform="github"
      />
    );
    expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/acme/repo/pull/1'
    );

    rerender(
      <ReviewOutput
        review={baseReview({ review_url: 'https://gitlab.com/acme/repo/-/merge_requests/1' })}
        repoPlatform="gitlab"
      />
    );
    expect(screen.getByRole('link', { name: 'View on GitLab' })).toBeInTheDocument();

    rerender(<ReviewOutput review={baseReview({ review_url: null })} repoPlatform="github" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a finding with no detail as a plain row, with no expandable disclosure', () => {
    render(
      <ReviewOutput
        review={baseReview({ findings: [baseFinding({ title: 'Unused import', body: '' })] })}
      />
    );

    expect(screen.getByText('Unused import')).toBeInTheDocument();
    expect(document.querySelector('details')).not.toBeInTheDocument();
  });

  it('renders a P0 finding pre-expanded, and shows its body and suggestion', () => {
    render(
      <ReviewOutput
        review={baseReview({
          findings: [
            baseFinding({
              priority: 'P0',
              title: 'SQL injection',
              body: 'User input reaches the query unescaped.',
              suggestion: 'Use a parameterized query.',
            }),
          ],
        })}
      />
    );

    const details = document.querySelector('details');
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('User input reaches the query unescaped.')).toBeInTheDocument();
    expect(screen.getByText('Use a parameterized query.')).toBeInTheDocument();
  });

  it('a non-security, non-P0 finding with detail stays collapsed by default', () => {
    render(
      <ReviewOutput
        review={baseReview({
          findings: [baseFinding({ priority: 'P2', category: 'style', body: 'Prefer const.' })],
        })}
      />
    );

    expect(document.querySelector('details')).not.toHaveAttribute('open');
  });

  it('a security finding is pre-expanded regardless of priority', () => {
    render(
      <ReviewOutput
        review={baseReview({
          findings: [
            baseFinding({
              priority: 'P2',
              category: 'security',
              body: 'Secret logged in plaintext.',
            }),
          ],
        })}
      />
    );

    expect(document.querySelector('details')).toHaveAttribute('open');
  });

  it('renders resource links when present', () => {
    render(
      <ReviewOutput
        review={baseReview({
          findings: [
            baseFinding({
              priority: 'P0',
              body: 'x',
              resources: ['https://owasp.org/a', 'https://owasp.org/b'],
            }),
          ],
        })}
      />
    );

    expect(screen.getByRole('link', { name: 'https://owasp.org/a' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://owasp.org/b' })).toBeInTheDocument();
  });
});
