/**
 * Runtime white-label logo, the same mechanism `apps/console` uses (issue #368, Phase H) — just
 * sourced from plain env vars (`LCI_BRANDING_LOGO_PATH`/`LCI_BRANDING_LOGO_LIGHT_PATH`) instead of
 * a `config.yaml` document, since this app has no such document. A configured path is a
 * host-absolute path a real deployment mounts from a ConfigMap volume (see
 * `charts/converse-lci`'s own `branding` values block); it's read straight off disk by
 * `GET /branding/logo`/`GET /branding/logo-light`, so a relative path is always a config mistake,
 * not a valid deployment shape — fail fast at boot rather than 404ing on every request forever.
 */

export interface BrandingConfig {
  logoPath?: string;
  logoContentType?: string;
  logoLightPath?: string;
  logoLightContentType?: string;
}

/** `LCI_BRANDING_LOGO_PATH`'s extension -> the `Content-Type` `GET /branding/logo` serves it
 *  with. Deliberately narrow: only formats a logo realistically ships as. */
const BRANDING_LOGO_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Shared by `LCI_BRANDING_LOGO_PATH` and `LCI_BRANDING_LOGO_LIGHT_PATH` — identical
 *  host-absolute-path + extension-allow-list contract, just against two different env vars.
 *  `varName` is used verbatim in the error so a failure names exactly the var to fix. */
function validateLogoPath(varName: string, logoPath: string): string {
  if (!logoPath.startsWith('/')) {
    throw new Error(`${varName} must be a host-absolute path, got "${logoPath}"`);
  }
  const extensionMatch = logoPath.match(/\.[^./\\]+$/);
  const extension = extensionMatch?.[0].toLowerCase();
  const contentType = extension ? BRANDING_LOGO_CONTENT_TYPES[extension] : undefined;
  if (!contentType) {
    throw new Error(
      `${varName} must end in one of ${Object.keys(BRANDING_LOGO_CONTENT_TYPES).join(', ')} ` +
        `(got "${logoPath}")`
    );
  }
  return contentType;
}

/**
 * `LCI_BRANDING_LOGO_LIGHT_PATH` is deliberately NOT independently optional like
 * `LCI_BRANDING_LOGO_PATH` is: it's a light-theme (`wireframe`) COUNTERPART to the base logo
 * (which doubles as both the default mark and the dark-theme mark) — a logo-light-without-logo
 * deployment would render no logo at all under `black`, this app's default theme, which is never
 * what an operator setting it actually wants.
 */
export function brandingConfigFromEnv(): BrandingConfig {
  const logoPath = process.env.LCI_BRANDING_LOGO_PATH?.trim() || undefined;
  const logoLightPath = process.env.LCI_BRANDING_LOGO_LIGHT_PATH?.trim() || undefined;

  if (logoLightPath && !logoPath) {
    throw new Error(
      'LCI_BRANDING_LOGO_LIGHT_PATH requires LCI_BRANDING_LOGO_PATH to also be set — a ' +
        'light-theme-only brand has no mark for "black", the default theme'
    );
  }

  return {
    ...(logoPath
      ? { logoPath, logoContentType: validateLogoPath('LCI_BRANDING_LOGO_PATH', logoPath) }
      : {}),
    ...(logoLightPath
      ? {
          logoLightPath,
          logoLightContentType: validateLogoPath('LCI_BRANDING_LOGO_LIGHT_PATH', logoLightPath),
        }
      : {}),
  };
}
