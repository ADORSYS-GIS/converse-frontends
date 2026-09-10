import { NOT_CONFIGURED_CAPTION, UNKNOWN_BUILD_VALUE } from './component';
import type { BuildInfoCardProps, BuildInfoEntry } from './types';

/** The console's own half — no `rustc`, and its commit comes from a build-time `NEXT_PUBLIC_*`
 *  rather than from a `build.rs`. */
const consoleEntry: BuildInfoEntry = {
  id: 'console',
  label: 'Console',
  description: 'this app',
  state: {
    status: 'ready',
    facts: {
      version: '0.1.0',
      commitSha: 'f95d35ea1c4b90d3f0a2b7e6c8419d5a3b2e7f01',
      commitShortSha: 'f95d35e',
      imageSha: 'f95d35ea1c4b90d3f0a2b7e6c8419d5a3b2e7f01',
      imageTag: 'sha-f95d35e',
      imageReference: 'ghcr.io/adorsys-gis/converse-frontends/console:sha-f95d35e',
      imageBuiltAt: '2026-09-03T05:41:00Z',
    },
  },
};

/** One healthy backend, all fields answered. Every backend in these fixtures reports the SAME
 *  commit on purpose — that is what a correctly-deployed estate looks like, and it makes the
 *  partial fixture's odd ones out obvious. */
function backendEntry(id: string, description: string): BuildInfoEntry {
  return {
    id,
    label: id,
    description,
    state: {
      status: 'ready',
      facts: {
        version: '0.8.1',
        commitSha: '509005ede47ed13cd2fbb3be0f7bb5bfbf029039',
        commitShortSha: '509005e',
        commitDate: '2026-09-03T06:12:04+02:00',
        dirty: false,
        toolchain: 'rustc 1.98.0 (88d9e12ae 2026-08-18)',
        builtAt: '2026-09-03T04:44:10Z',
        imageSha: '509005ede47ed13cd2fbb3be0f7bb5bfbf029039',
        // No `imageReference`: `lightbridge-authz`'s `GET /version` shape has no such field and is
        // deliberately not changed from this side. Its `imageTag` is whatever that backend stamps,
        // rendered verbatim.
        imageTag: 'ghcr.io/adorsys-gis/lightbridge-authz:509005e',
        imageBuiltAt: '2026-09-03T04:58:31Z',
      },
    },
  };
}

/** Everything answered — the shape a healthy production deployment reports. */
export const buildInfoAllKnown: BuildInfoCardProps = {
  entries: [
    consoleEntry,
    backendEntry('authz-api', 'getBuildInfo over /api'),
    backendEntry('authz-budget', 'getBuildInfo over /api/budget'),
    backendEntry('authz-idp', 'GET /version, server-side'),
    backendEntry('authz-usage', 'GET /version, server-side'),
  ],
};

/**
 * The realistic mixed state, and the one this card exists for: some services answered, one is
 * still being asked, one is genuinely not deployed here, one refused.
 *
 * Note `authz-idp` below reports the literal `unknown` sentinel for its commit — that is a real
 * answer from a backend built without `.git` and without the env fallbacks, not a rendering
 * failure, so it renders de-emphasized rather than being swallowed.
 */
export const buildInfoPartiallyUnavailable: BuildInfoCardProps = {
  entries: [
    consoleEntry,
    backendEntry('authz-api', 'getBuildInfo over /api'),
    {
      id: 'authz-budget',
      label: 'authz-budget',
      description: 'getBuildInfo over /api/budget',
      state: { status: 'loading' },
    },
    {
      id: 'authz-idp',
      label: 'authz-idp',
      description: 'GET /version, server-side',
      state: {
        status: 'ready',
        facts: {
          version: '0.8.1',
          commitSha: UNKNOWN_BUILD_VALUE,
          commitShortSha: UNKNOWN_BUILD_VALUE,
          commitDate: UNKNOWN_BUILD_VALUE,
          dirty: false,
          builtAt: '2026-09-03T04:44:10Z',
        },
      },
    },
    {
      id: 'authz-usage',
      label: 'authz-usage',
      description: 'GET /version, server-side',
      state: { status: 'unavailable', caption: NOT_CONFIGURED_CAPTION },
    },
  ],
  caption: 'Two services could not report a build. The rows above are what actually answered.',
};

/** Every backend refused; the console still knows its own build, which is the point — its row
 *  never depends on a backend being reachable. */
export const buildInfoError: BuildInfoCardProps = {
  entries: [
    consoleEntry,
    {
      id: 'authz-api',
      label: 'authz-api',
      description: 'getBuildInfo over /api',
      state: {
        status: 'error',
        errorMessage: 'Could not read the backend build. The RPC call failed.',
      },
    },
    {
      id: 'authz-budget',
      label: 'authz-budget',
      description: 'getBuildInfo over /api/budget',
      state: {
        status: 'error',
        errorMessage: 'Could not read the backend build. The RPC call failed.',
      },
    },
  ],
};

/** Nothing has answered yet — the first paint after navigating to `/settings/info`. */
export const buildInfoLoading: BuildInfoCardProps = {
  entries: buildInfoAllKnown.entries.map((entry) =>
    entry.id === 'console' ? entry : { ...entry, state: { status: 'loading' as const } }
  ),
};
