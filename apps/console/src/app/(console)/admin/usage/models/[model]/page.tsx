import { notFound } from 'next/navigation';

import { AdminUsageModelCentre } from '../../../../../../containers/admin-usage-model-centre';
import { ADMIN_USAGE_MODEL_ROUTE } from '../../../../../../dashboards/usage-routes';
import { can } from '../../../../../../server/access';
import { readSession } from '../../../../../../server/session-store';
import { PERMISSION } from '../../../../../../shared/permissions';
import { decodeRouteParam } from '../../../../../../shared/route-params';
import { dashboardPage } from '../../../../../../dashboards/page-entry';

export const dynamic = 'force-dynamic';

/**
 * `/admin/usage/models/[model]` — one model's usage across the estate (converse-frontends#449,
 * owner feedback 2026-09-03: "/admin/usage should have panels with navigations too, the same way").
 *
 * Gated **server-side** on `usage:read-all` (converse-frontends#452), `notFound()` for anyone else,
 * byte-for-byte the mechanism every other `/admin/*` route uses. Every query this page issues is
 * `scope: 'all'` narrowed by a `model` filter, which the backend gates on that same permission and
 * `server/usage-scope-guard.ts` re-checks on the way out — an estate query with one more filter on
 * it, not a narrower permission.
 *
 * There is no id validation to do here, and none is invented: a model name is an opaque vendor
 * string with no closed vocabulary to check against, so an unknown one renders a page whose panels
 * all say "no usage in this window" — the honest answer, and the same one a real model with a quiet
 * month gets. That is the identical reasoning the channel route states for `azp`.
 *
 * **The segment is percent-decoded HERE, exactly once.** Next hands a page the RAW pathname segment
 * (measured, see `decodeRouteParam`), and a model name routinely carries the two characters that
 * make that matter: `openai/gpt-4o-mini` on a router-style gateway, `anthropic.claude-sonnet-4:0`
 * on Bedrock. Querying the encoded string would name a model that exists nowhere and render a
 * complete, confident, empty dashboard — which is exactly the defect this route was added
 * alongside a fix for.
 */
export default async function AdminUsageModelRoute({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  const { model: rawModel } = await params;
  const model = rawModel ? decodeRouteParam(rawModel) : rawModel;
  if (!model) {
    notFound();
  }

  // Read AND translated by the shared helper (ADR 0017): `dashboards.yaml` carries i18n
  // keys, and `dashboardPage` resolves them against this request's own locale before the
  // spec reaches a client component. It is also fail-loud on a missing entry.
  const page = await dashboardPage(ADMIN_USAGE_MODEL_ROUTE);

  return <AdminUsageModelCentre page={page} model={model} />;
}
