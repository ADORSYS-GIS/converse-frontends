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
  DEFAULT_FEEDBACK_RANGE,
  FEEDBACK_RANGE_OPTIONS,
  FEEDBACK_RANGES,
  feedbackNotes,
  feedbackView,
  panelsFor,
  parseFeedbackRange,
  type FeedbackAnalyticsResponse,
  type FeedbackPanelSpec,
  type FeedbackScope,
  type FeedbackUi,
} from '../lib/domain/feedback';
import type { ApiResult } from '../lib/server/api';

/**
 * The reviewer-feedback board shared by the Feedback page (every repository) and a repository's
 * Feedback tab (one) — LCI ADR-0116 D1.
 *
 * The range is the page's one control and lives in the URL (`?range=`, `shallow: false`), so
 * changing it re-renders the server page, which asks the control plane for the new window; the
 * board never fetches or aggregates anything itself. Panels come from the declarative list in
 * `lib/domain/feedback.ts` and render through `ui-web`'s panel kit.
 *
 * A failed request costs every panel its figure and nothing else: each one renders the reason in
 * place, so the page explains itself instead of showing zeros it cannot stand behind.
 */
export function FeedbackBoard({
  scope,
  feedback,
  now,
}: {
  scope: FeedbackScope;
  feedback: ApiResult<FeedbackAnalyticsResponse>;
  now: number;
}) {
  const [range, setRange] = useQueryState(
    'range',
    parseAsStringLiteral(FEEDBACK_RANGES)
      .withDefault(DEFAULT_FEEDBACK_RANGE)
      .withOptions({ shallow: false })
  );
  const [scales, setScales] = useState<Record<string, MultiSeriesSpendScale>>({});
  const [pages, setPages] = useState<Record<string, number>>({});

  const ui: FeedbackUi = {
    scaleFor: (panelId) => scales[panelId] ?? 'linear',
    onScaleChange: (panelId, scale) => setScales((prev) => ({ ...prev, [panelId]: scale })),
    pageFor: (panelId) => pages[panelId] ?? 0,
    onPageChange: (panelId, page) =>
      setPages((prev) => ({ ...prev, [panelId]: Math.max(page, 0) })),
  };
  const data = feedback.ok ? feedback.data : null;
  const notes = data ? feedbackNotes(data, now) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageControls
        label="Feedback controls"
        groups={[
          {
            id: 'range',
            label: 'Range',
            children: (
              <SelectField
                label="Range"
                value={range}
                options={FEEDBACK_RANGE_OPTIONS}
                onChange={(value) => {
                  setPages({});
                  void setRange(parseFeedbackRange(value));
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
          <FeedbackPanel key={spec.id} spec={spec} result={feedback} data={data} ui={ui} />
        ))}
      </DashboardGrid>
    </div>
  );
}

function FeedbackPanel({
  spec,
  result,
  data,
  ui,
}: {
  spec: FeedbackPanelSpec;
  result: ApiResult<FeedbackAnalyticsResponse>;
  data: FeedbackAnalyticsResponse | null;
  ui: FeedbackUi;
}) {
  const view = feedbackView(spec, data, ui);
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
              <ErrorLine message={failureMessage(result)} />
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

function failureMessage(result: ApiResult<FeedbackAnalyticsResponse>): string {
  if (result.ok) return "Couldn't draw this panel.";
  if (result.reason === 'unauthenticated') {
    return "Your session can't reach the control plane. Sign in again.";
  }
  if (result.reason === 'unavailable') return 'The control plane is unreachable right now.';
  return `Couldn't load feedback${result.status ? ` (HTTP ${result.status})` : ''}.`;
}
