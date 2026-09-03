import type { Dispatcher } from 'undici';

import { serverEnv, type ConsoleEnv } from './env';
import { usageDispatcher } from './usage-dispatcher';

/**
 * Server-side build-stamp reads (lightbridge-authz#573), for the two backends the browser has no
 * path to.
 *
 * ## Why only two
 *
 * `authz-api` and `authz-budget` are read by the BROWSER, over the cratestack `getBuildInfo`
 * procedure and the console's own `/api` / `/api/budget` proxies the console already holds clients
 * for (`client/use-build-info.ts`). That is deliberate: it exercises the same transport every
 * other screen uses, so a green row there also means "the RPC path to this service works", which
 * is itself diagnostic information on a diagnostics screen.
 *
 * `authz-idp` and `authz-usage` have no such path:
 *
 * - **`authz-idp`** exposes no RPC surface at all — every route on it is an OAuth/OIDC endpoint
 *   plus the probes. Its `/version` is reachable, but only from the server: the browser never
 *   learns a backend origin (ADR 0009 Decision 3) and there is no `/api/idp/*` proxy to add one
 *   to for a single unauthenticated GET.
 * - **`authz-usage`**'s query listener requires a client CERTIFICATE (lightbridge-authz#347/#361).
 *   A browser cannot present the console's workload identity, and `usageDispatcher()` — the only
 *   thing that can — is server-only by construction.
 *
 * ## What this does NOT do
 *
 * It never returns a backend URL. `/settings/info` already refuses to print internal origins (see
 * `containers/info-centre.tsx`), and a diagnostic route that leaked them through the back door
 * would be the same disclosure by another name. The response carries build stamps and nothing
 * else; the only URL-shaped value in it is the image TAG the backend itself reports, which is a
 * public GHCR reference, not a topology fact.
 */

/** The wire shape `GET /version` answers with — `lightbridge_authz_core::BuildInfo`, serialized
 *  camelCase. Duplicated structurally rather than imported: it arrives over plain HTTP from a
 *  different repository, so it is parsed defensively (see `toFacts`) rather than trusted. */
interface RawBuildInfo {
  service?: unknown;
  version?: unknown;
  gitSha?: unknown;
  gitShortSha?: unknown;
  gitCommitDate?: unknown;
  gitDirty?: unknown;
  rustcVersion?: unknown;
  buildTime?: unknown;
  imageBuildSha?: unknown;
  imageTag?: unknown;
  imageBuildTime?: unknown;
}

/** The console's own normalized view of one service's stamp — the same field names
 *  `@lightbridge/ui-web`'s `BuildInfoFacts` uses, so the container passes it through untouched. */
export interface ServiceBuildFacts {
  version?: string;
  commitSha?: string;
  commitShortSha?: string;
  commitDate?: string;
  dirty?: boolean;
  toolchain?: string;
  builtAt?: string;
  imageSha?: string;
  imageTag?: string;
  imageBuiltAt?: string;
}

/**
 * One service's answer. Exactly one of `facts` / `unavailable` / `error` is set — the three are
 * genuinely different states and `/settings/info` renders them three different ways.
 */
export type ServiceBuildInfoResult =
  | { id: string; status: 'ready'; facts: ServiceBuildFacts }
  /** Settled, and there is honestly nothing to show — this deployment has no such backend. */
  | { id: string; status: 'unavailable'; caption: string }
  /** We asked and it did not answer. `message` is safe to render: it never carries the URL. */
  | { id: string; status: 'error'; message: string };

/** How long a `/version` read may take before it is reported as unreachable.
 *
 *  Short on purpose: this is a diagnostics screen, and a reader would rather see "authz-idp did
 *  not answer in 4s" than watch a spinner for the platform default. The screen is still useful
 *  with one service missing; it is not useful if one hung service blocks the whole card. */
const VERSION_TIMEOUT_MS = 4000;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Maps the backend's wire shape onto the console's. Every field is optional and independently
 * validated: a backend that ships a field this console has not seen is ignored, and a field of the
 * wrong type is dropped rather than rendered — a diagnostics screen showing `[object Object]`
 * where a SHA should be is worse than showing nothing.
 */
export function toFacts(raw: RawBuildInfo): ServiceBuildFacts {
  return {
    version: asString(raw.version),
    commitSha: asString(raw.gitSha),
    commitShortSha: asString(raw.gitShortSha),
    commitDate: asString(raw.gitCommitDate),
    dirty: typeof raw.gitDirty === 'boolean' ? raw.gitDirty : undefined,
    toolchain: asString(raw.rustcVersion),
    builtAt: asString(raw.buildTime),
    imageSha: asString(raw.imageBuildSha),
    imageTag: asString(raw.imageTag),
    imageBuiltAt: asString(raw.imageBuildTime),
  };
}

/**
 * Reads one backend's `GET {origin}/version`.
 *
 * **The failure message never names the origin.** `error.message` from a failed `fetch` routinely
 * embeds the URL it tried (`ECONNREFUSED https://lightbridge-idp.default.svc:3000/version`), and
 * this string is rendered in the browser — so the caught error is deliberately discarded in favour
 * of a fixed sentence. The real cause is logged server-side, where an operator can read it and the
 * user's browser cannot.
 */
async function readVersion(
  id: string,
  origin: string,
  dispatcher?: Dispatcher
): Promise<ServiceBuildInfoResult> {
  try {
    const response = await fetch(`${origin}/version`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(VERSION_TIMEOUT_MS),
      // `dispatcher` is undici's, not a standard `RequestInit` field — the same cast the usage
      // proxy uses (`server/proxy.ts`) for the same reason: Node's `fetch` IS undici's.
      ...(dispatcher ? ({ dispatcher } as Record<string, unknown>) : {}),
    });
    if (!response.ok) {
      console.error(`[console] ${id} /version answered ${response.status}`);
      return { id, status: 'error', message: `The service answered ${response.status}.` };
    }
    const body = (await response.json()) as RawBuildInfo;
    return { id, status: 'ready', facts: toFacts(body) };
  } catch (error) {
    console.error(`[console] Failed to read ${id} /version:`, error);
    return { id, status: 'error', message: 'The service did not answer.' };
  }
}

/** Reason a service is reported `unavailable` rather than errored — nothing was configured to
 *  call, so nothing was called. */
export const NOT_CONFIGURED_CAPTION = 'Not configured for this deployment.';

/**
 * Reads `authz-idp` and `authz-usage` concurrently.
 *
 * Concurrent, not sequential: they are independent and one of them being slow must not add its
 * latency to the other's. `Promise.all` over per-service `try`/`catch` (inside `readVersion`) means
 * this never rejects — one dead service degrades one row, never the whole card.
 */
export async function readBackendBuildInfo(
  env: ConsoleEnv = serverEnv()
): Promise<ServiceBuildInfoResult[]> {
  // `idp.issuer` IS `authz-idp`'s own origin in every deployment that runs one (it is the OIDC
  // issuer the console validates tokens against). A deployment federating to some other IdP still
  // gets an honest answer: that issuer either serves `/version` or it does not, and "did not
  // answer" is exactly right for an IdP that is not `lightbridge-authz`.
  const idpOrigin = env.idp.issuer;

  return Promise.all([
    idpOrigin
      ? readVersion('authz-idp', idpOrigin)
      : Promise.resolve<ServiceBuildInfoResult>({
          id: 'authz-idp',
          status: 'unavailable',
          caption: NOT_CONFIGURED_CAPTION,
        }),
    env.usageUrl
      ? readVersion('authz-usage', env.usageUrl, usageDispatcher(env))
      : Promise.resolve<ServiceBuildInfoResult>({
          id: 'authz-usage',
          status: 'unavailable',
          caption: NOT_CONFIGURED_CAPTION,
        }),
  ]);
}

/**
 * The console's OWN build stamp, assembled from build-time and runtime environment.
 *
 * Two different mechanisms, for the same reason the backend has two:
 *
 * - `NEXT_PUBLIC_BUILD_SHA` is inlined by `next build` and therefore fixed at BUILD time. It is
 *   the commit the bundle was compiled from. `apps/console/turbo.json` lists it in the task's
 *   `env` so a cache hit can never serve a bundle stamped with a different commit's SHA.
 * - `IMAGE_BUILD_SHA` / `IMAGE_TAG` / `IMAGE_BUILD_TIME` are read at RUNTIME, from `ENV` the
 *   Dockerfile promotes out of build-args. The image does not exist while `next build` runs, so
 *   there is nothing to inline.
 *
 * Every field is independently optional. A `next dev` server has none of them and reports only its
 * package version, which is the honest answer for a build that was never packaged.
 */
export function consoleBuildFacts(
  version: string,
  environment: Record<string, string | undefined> = process.env
): ServiceBuildFacts {
  const commitSha = asString(environment.NEXT_PUBLIC_BUILD_SHA);
  return {
    version,
    commitSha,
    commitShortSha: commitSha ? commitSha.slice(0, 7) : undefined,
    imageSha: asString(environment.IMAGE_BUILD_SHA),
    imageTag: asString(environment.IMAGE_TAG),
    imageBuiltAt: asString(environment.IMAGE_BUILD_TIME),
  };
}
