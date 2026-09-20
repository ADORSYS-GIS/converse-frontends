import { FeedbackCentre } from '../../../containers/feedback-centre';
import { parseFeedbackRange, resolveFeedbackWindow } from '../../../lib/domain/feedback';
import { getFeedbackAnalytics } from '../../../lib/server/api';
import { now as fetchNow } from '../../../lib/server/now';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ range }, now] = await Promise.all([searchParams, fetchNow()]);
  const window = resolveFeedbackWindow(parseFeedbackRange(range), now);
  const feedback = await getFeedbackAnalytics(window);

  return <FeedbackCentre feedback={feedback} now={now} />;
}
