import { AnalyticsCentre } from '../../../containers/analytics-centre';
import { parseAnalyticsRange, resolveAnalyticsWindow } from '../../../lib/domain/analytics';
import { getFeedbackAnalytics, getReviewAnalytics } from '../../../lib/server/api';
import { now as fetchNow } from '../../../lib/server/now';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ range }, now] = await Promise.all([searchParams, fetchNow()]);
  const window = resolveAnalyticsWindow(parseAnalyticsRange(range), now);

  const [reviews, feedback] = await Promise.all([
    getReviewAnalytics(window),
    getFeedbackAnalytics(window),
  ]);

  return <AnalyticsCentre reviews={reviews} feedback={feedback} now={now} />;
}
