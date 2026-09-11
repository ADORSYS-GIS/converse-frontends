'use client';

import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import type { MultiSeriesSpendScale } from '@lightbridge/ui-web/src/components/multi-series-spend-chart/types';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { DashboardGrid } from '@lightbridge/ui-web/src/sections/dashboard-grid';
import { DashboardPanel } from '@lightbridge/ui-web/src/sections/dashboard-panel';
import {
  renderPanelActions,
  renderPanelBody,
} from '@lightbridge/ui-web/src/sections/dashboard-panels/panel-renderers';
import { panelChrome } from '@lightbridge/ui-web/src/sections/dashboard-panels/types';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useState } from 'react';

import {
  ANALYTICS_RANGE_OPTIONS,
  ANALYTICS_RANGES,
  analyticsView,
  DEFAULT_ANALYTICS_RANGE,
  feedbackNotes,
  panelsFor,
  parseAnalyticsRange,
  type AnalyticsData,
  type AnalyticsPanelSpec,
  type AnalyticsScope,
  type AnalyticsSource,
  type AnalyticsUi,
  type FeedbackAnalyticsResponse,
  type ReviewAnalyticsResponse,
} from '../lib/domain/analytics';
import type { ApiResult } from '../lib/server/api';

type Results = {
  reviews: ApiResult<ReviewAnalyticsResponse>;
  feedback: ApiResult<FeedbackAnalyticsResponse>;
};

/**
 * The review-analytics board shared by the Overview page (every repository) and a repository's
 * Insights tab (one) — ADR 0018 D1.
 *
 * The range is the page's one control and lives in the URL (`?range=`, `shallow: false`), so
 * changing it re-renders the server page, which asks the control plane for the new window; the
 * board never fetches or aggregates anything itself. Panels come from the declarative list in
 * `lib/domain/analytics.ts` and render through `ui-web`'s panel kit.
 *
 * The two requests fail independently. A panel reads exactly one of them, and a failed request
 * costs only the panels that read it — so the control plane's feedback query erroring leaves the run
 * and finding counts on screen beside the error it explains.
 */
export function AnalyticsBoard({
  scope,
  reviews,
  feedback,
  now,
}: Results & { scope: AnalyticsScope; now: number }) {
  const [range, setRange] = useQueryState(
    'range',
    parseAsStringLiteral(ANALYTICS_RANGES)
      .withDefault(DEFAULT_ANALYTICS_RANGE)
      .withOptions({ shallow: false })
  );
  const [scales, setScales] = useState<Record<string, MultiSeriesSpendScale>>({});
  const [pages, setPages] = useState<Record<string, number>>({});

  const ui: AnalyticsUi = {
    scaleFor: (panelId) => scales[panelId] ?? 'linear',
    onScaleChange: (panelId, scale) => setScales((prev) => ({ ...prev, [panelId]: scale })),
    pageFor: (panelId) => pages[panelId] ?? 0,
    onPageChange: (panelId, page) =>
      setPages((prev) => ({ ...prev, [panelId]: Math.max(page, 0) })),
  };
  const data: AnalyticsData = {
    reviews: reviews.ok ? reviews.data : null,
    feedback: feedback.ok ? feedback.data : null,
  };
  const notes = data.feedback ? feedbackNotes(data.feedback, now) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageControls
        label="Analytics controls"
        groups={[
          {
            id: 'range',
            label: 'Range',
            children: (
              <SelectField
                label="Range"
                value={range}
                options={ANALYTICS_RANGE_OPTIONS}
                onChange={(value) => {
                  setPages({});
                  void setRange(parseAnalyticsRange(value));
                }}
                layout="inline"
                hideLabel
              />
            ),
          },
        ]}
      />

      {notes.length > 0 ? (
        <div className="flex flex-col gap-1">
          {notes.map((note) => (
            <InlineStatus key={note}>{note}</InlineStatus>
          ))}
        </div>
      ) : null}

      <DashboardGrid>
        {panelsFor(scope).map((spec) => (
          <AnalyticsPanel
            key={spec.id}
            spec={spec}
            data={data}
            results={{ reviews, feedback }}
            ui={ui}
          />
        ))}
      </DashboardGrid>
    </div>
  );
}

function AnalyticsPanel({
  spec,
  data,
  results,
  ui,
}: {
  spec: AnalyticsPanelSpec;
  data: AnalyticsData;
  results: Results;
  ui: AnalyticsUi;
}) {
  const result = results[spec.source];
  const view = analyticsView(spec, data, ui);
  const chrome = panelChrome(spec.type);

  return (
    <DashboardPanel
      id={spec.id}
      title={spec.title}
      subtitle={spec.subtitle}
      span={spec.span}
      chrome={chrome}
      actions={view ? renderPanelActions(view, 'panel') : null}>
      {({ size }) => {
        if (!result.ok || !view) {
          return (
            <div className="flex flex-col gap-2">
              {/* A bare stat card has no heading row, so without this the error would not say WHICH
                  figure is missing. A carded panel already shows its title above. */}
              {chrome === 'bare' ? <span className={LABEL_CLASS}>{spec.title}</span> : null}
              <ErrorLine message={failureMessage(result, spec.source)} />
            </div>
          );
        }
        if (view.kind === 'table' && view.rows.length === 0) {
          return <InlineStatus>{spec.emptyMessage ?? 'Nothing in this window.'}</InlineStatus>;
        }
        return renderPanelBody(view, size);
      }}
    </DashboardPanel>
  );
}

function failureMessage(result: Results[AnalyticsSource], source: AnalyticsSource): string {
  if (result.ok) return `Couldn't draw this ${source} panel.`;
  if (result.reason === 'unauthenticated') {
    return "Your session can't reach the control plane. Sign in again.";
  }
  if (result.reason === 'unavailable') return 'The control plane is unreachable right now.';
  return `Couldn't load ${source === 'reviews' ? 'review' : 'feedback'} analytics${result.status ? ` (HTTP ${result.status})` : ''}.`;
}
