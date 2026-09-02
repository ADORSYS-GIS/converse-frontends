/**
 * The `/admin/usage` area's route vocabulary — the four `dashboards.yaml` keys, the two href
 * builders, and the actor `?type=` enum (converse-frontends#449, story C6).
 *
 * **Why a module and not four string literals.** `/admin/usage`'s ranked rows and ledgers link
 * into the actor and channel pages through `options.link` TEMPLATES in the YAML
 * (`/admin/usage/actors/:key?type=$lens`), while `/admin/overview`'s top-spender tables link with
 * a literal `?type=account`. The pages those links land on are declared here, and
 * `usage-routes.test.ts` asserts a ROUND TRIP: every link template C4 and C5 wrote, resolved for
 * one row key, equals what `actorHref`/`channelHref` produce for that same key. A link that says
 * `?type=user` while the page reads `type` out of a three-valued enum is exactly the class of
 * quiet wrongness a shared builder exists to prevent, and it is an explicit AC of this story.
 *
 * Pure, React-free and free of `nuqs` — `page-report.ts` and the route gates both import it from
 * the server side.
 */

/** The estate page. */
export const ADMIN_USAGE_ROUTE = '/admin/usage';

/** One actor's own slice — `[actorId]` LITERAL, because a `dashboards.yaml` key IS the router
 *  path (and the report template path mirrors it, converse-frontends#453). */
export const ADMIN_USAGE_ACTOR_ROUTE = '/admin/usage/actors/[actorId]';

/** One OAuth client's slice. */
export const ADMIN_USAGE_CHANNEL_ROUTE = '/admin/usage/channels/[channelId]';

/** The chat-shaped operations across the estate. */
export const ADMIN_USAGE_CHATS_ROUTE = '/admin/usage/chats';

/**
 * What an actor page can be ABOUT — the closed `?type=` vocabulary, identical to the engine's own
 * `DASHBOARD_LENSES` and to `url-state.ts`'s `ADMIN_USAGE_LENSES` (both asserted equal by test).
 *
 * It is closed because it is substituted straight into a query's `scope`, which the usage backend
 * validates against its own enum: `?type=everything` must be a 404 on the way in, not a 400 on the
 * way out with an actor's name already printed above it.
 */
export const ADMIN_USAGE_ACTOR_TYPES = ['user', 'account', 'project'] as const;
export type AdminUsageActorType = (typeof ADMIN_USAGE_ACTOR_TYPES)[number];

export function isAdminUsageActorType(
  value: string | undefined | null
): value is AdminUsageActorType {
  return value != null && (ADMIN_USAGE_ACTOR_TYPES as readonly string[]).includes(value);
}

/**
 * One actor's page. The id is percent-encoded because a `user_id` is a backend-supplied string
 * rather than a guaranteed cuid — the usage backend's own sentinel keys
 * (`missing:github:preferred_username`) contain colons, and an account id can be an `owner/repo`
 * slug whose slash would otherwise invent a path segment.
 */
export function actorHref(actorId: string, type: AdminUsageActorType): string {
  return `/admin/usage/actors/${encodeURIComponent(actorId)}?type=${type}`;
}

/** One channel's page. `azp` is an OAuth client id — a bare token in practice, encoded anyway for
 *  the same reason. */
export function channelHref(channelId: string): string {
  return `/admin/usage/channels/${encodeURIComponent(channelId)}`;
}

/**
 * The `options.link` template a YAML panel writes for actor rows.
 *
 * `:key` is the row's own group value (filled per row by `panelRowHref`) and `$lens` is resolved
 * by `resolve-dashboard.ts` at the moment it swaps the lens-driven `group_by` — a panel that is
 * NOT lens-driven passes its literal type instead, which is what `/admin/overview`'s two
 * top-spender ledgers do.
 */
export function actorLinkTemplate(type: AdminUsageActorType | '$lens'): string {
  return `/admin/usage/actors/:key?type=${type}`;
}

export function channelLinkTemplate(): string {
  return '/admin/usage/channels/:key';
}
