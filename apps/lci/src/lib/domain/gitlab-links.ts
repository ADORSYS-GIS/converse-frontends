/**
 * GitLab web URLs are self-hosted per deployment — `gitlab.com` is only the last-resort default,
 * never assumed. The control plane resolves the real base URL(s) (`GET /config`) since it already
 * holds the GitLab integration's configuration; the frontend only normalizes and looks them up.
 */
export interface GitlabLinkConfig {
  defaultBaseUrl: string;
  projectBaseUrls: Record<string, string>;
}

/** Strips trailing slashes so `${base}/owner/repo` never double-slashes; empty/missing falls back
 *  to SaaS `https://gitlab.com`. */
export function normalizeGitlabBaseUrl(url: string | null | undefined): string {
  const base = url?.trim() || 'https://gitlab.com';
  return base.replace(/\/+$/, '');
}

export function gitlabLinkConfig(
  defaultBaseUrl: string | null | undefined,
  projectBaseUrls: Record<string, string> | null | undefined
): GitlabLinkConfig {
  return {
    defaultBaseUrl: normalizeGitlabBaseUrl(defaultBaseUrl),
    projectBaseUrls: Object.fromEntries(
      Object.entries(projectBaseUrls ?? {}).map(([projectId, url]) => [
        projectId,
        normalizeGitlabBaseUrl(url),
      ])
    ),
  };
}

/** The web base URL for a specific GitLab project, or the deployment default when the project has
 *  no override (or its id isn't known). */
export function gitlabBaseUrlForProject(
  config: GitlabLinkConfig,
  projectId: number | null | undefined
): string {
  if (projectId == null) return config.defaultBaseUrl;
  return config.projectBaseUrls[String(projectId)] ?? config.defaultBaseUrl;
}
