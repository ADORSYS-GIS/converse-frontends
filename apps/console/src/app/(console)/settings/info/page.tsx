import { InfoCentre } from '../../../../containers/info-centre';
import { consoleBuildFacts } from '../../../../server/build-info';
import { serverEnv } from '../../../../server/env';
import packageJson from '../../../../../package.json';

/**
 * `/settings/info` — "Info." A diagnostic screen: what this console build is, what backend builds
 * it is talking to, what it is configured to reach, who is signed in, and its own
 * connectivity/theme state.
 *
 * Server component (unlike every other settings route) ONLY for the facts that genuinely live
 * server-side and must never leak a secret alongside them:
 *
 *  - `serverEnv().usageUrl`'s PRESENCE (never the URL itself — that would be exactly the "full
 *    URL, not a path" leak this screen's own deliverable forbids);
 *  - the console's own build stamp (`consoleBuildFacts`), two thirds of which is server-only
 *    environment: `IMAGE_BUILD_SHA`/`IMAGE_TAG`/`IMAGE_BUILD_TIME` are `ENV` the Dockerfile
 *    promotes out of build-args and are never exposed to the browser, while
 *    `NEXT_PUBLIC_BUILD_SHA` is inlined at build time. Resolving all of it in one place is what
 *    keeps the card from reporting a half-truth.
 *
 * Everything else — the BACKEND build stamps, signed-in subject/roles, active theme, offline
 * status — is read client-side by `InfoCentre` from the same hooks the chrome already uses
 * (`useConsoleSession`/`useConsoleTheme`/`useOnlineStatus`) plus `useBuildInfo`, since none of it
 * is server-only and threading it through props would just be a slower way to read the same client
 * state.
 */
export default function SettingsInfoRoute() {
  const usageConfigured = Boolean(serverEnv().usageUrl);

  return (
    <InfoCentre
      consoleBuild={consoleBuildFacts(packageJson.version)}
      usageConfigured={usageConfigured}
    />
  );
}
