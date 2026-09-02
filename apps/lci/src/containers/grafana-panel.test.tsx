import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GrafanaPanel } from './grafana-panel';

describe('GrafanaPanel', () => {
  it('builds a chromeless d-solo embed URL with the given panel and template variables', () => {
    render(
      <GrafanaPanel
        baseUrl="https://grafana.example.com/"
        dashboardUid="lci-review-cost"
        dashboardSlug="review-cost"
        panelId={100}
        title="Billed cost"
        vars={{ repo: 'acme/widgets', model: '.+' }}
      />
    );

    const src = screen.getByTitle('Billed cost').getAttribute('src')!;
    // A trailing slash on baseUrl doesn't produce a double slash before the path.
    expect(src.startsWith('https://grafana.example.com/d-solo/lci-review-cost/review-cost?')).toBe(
      true
    );
    expect(src).toContain('panelId=100');
    expect(src).toContain('kiosk');
    expect(src).toContain('var-repo=acme%2Fwidgets');
    expect(src).toContain('var-model=.%2B');
  });

  it('includes a from/to range only when one is given', () => {
    const { rerender } = render(
      <GrafanaPanel
        baseUrl="https://grafana.example.com"
        dashboardUid="lci-task-runs"
        dashboardSlug="task-runs"
        panelId={100}
        title="Run logs"
        vars={{ task_id: 'task-1' }}
      />
    );
    expect(screen.getByTitle('Run logs').getAttribute('src')).not.toContain('from=');

    rerender(
      <GrafanaPanel
        baseUrl="https://grafana.example.com"
        dashboardUid="lci-review-cost"
        dashboardSlug="review-cost"
        panelId={100}
        title="Billed cost"
        vars={{ repo: 'acme/widgets' }}
        range={{ from: 'now-30d', to: 'now' }}
      />
    );
    const src = screen.getByTitle('Billed cost').getAttribute('src')!;
    expect(src).toContain('from=now-30d');
    expect(src).toContain('to=now');
  });
});
