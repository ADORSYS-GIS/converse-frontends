import { InfoCentre } from '../../../../containers/info-centre';
import { serverEnv } from '../../../../server/env';
import packageJson from '../../../../../package.json';

/**
 * `/settings/info` — "Info." A diagnostic screen: what this console build is, what it's
 * configured to talk to, who is signed in, and its own connectivity/theme state.
 *
 * Server component (unlike every other settings route) ONLY for the two facts that genuinely
 * live server-side and must never leak a secret alongside them: `serverEnv().usageUrl`'s
 * PRESENCE (never the URL itself — that would be exactly the "full URL, not a path" leak this
 * screen's own deliverable forbids) and the console's own `package.json` version. Everything else
 * — signed-in subject/roles, active theme, offline status — is read client-side by `InfoCentre`
 * from the same hooks the chrome already uses (`useConsoleSession`/`useConsoleTheme`/
 * `useOnlineStatus`), since none of it is server-only and threading it through props would just
 * be a slower way to read the same client state.
 */
export default function SettingsInfoRoute() {
  const usageConfigured = Boolean(serverEnv().usageUrl);

  return <InfoCentre consoleVersion={packageJson.version} usageConfigured={usageConfigured} />;
}
