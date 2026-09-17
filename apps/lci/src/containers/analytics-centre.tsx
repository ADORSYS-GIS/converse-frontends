import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import type { FeedbackAnalyticsResponse, ReviewAnalyticsResponse } from '../lib/domain/analytics';
import type { ApiResult } from '../lib/server/api';
import { AnalyticsBoard } from './analytics-board';

/**
 * Analytics: review activity, findings and reviewer feedback across every connected repository,
 * for the range in the URL. Its own nav destination rather than part of the Overview; a single
 * repository's figures are that repository's Insights tab.
 */
export function AnalyticsCentre({
  reviews,
  feedback,
  now,
}: {
  reviews: ApiResult<ReviewAnalyticsResponse>;
  feedback: ApiResult<FeedbackAnalyticsResponse>;
  now: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        subtitle="Reviews, findings and feedback across your connected repositories."
      />
      <AnalyticsBoard scope="estate" reviews={reviews} feedback={feedback} now={now} />
    </div>
  );
}
