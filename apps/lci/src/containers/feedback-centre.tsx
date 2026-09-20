import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import type { FeedbackAnalyticsResponse } from '../lib/domain/feedback';
import type { ApiResult } from '../lib/server/api';
import { FeedbackBoard } from './feedback-board';

/**
 * Feedback: what reviewers did with the comments the bot posted, across every connected repository,
 * for the range in the URL. A single repository's figures are that repository's Feedback tab.
 */
export function FeedbackCentre({
  feedback,
  now,
}: {
  feedback: ApiResult<FeedbackAnalyticsResponse>;
  now: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Feedback"
        subtitle="How reviewers received the comments posted on your connected repositories."
      />
      <FeedbackBoard scope="estate" feedback={feedback} now={now} />
    </div>
  );
}
