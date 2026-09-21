import { describe, expect, it } from 'vitest';

import { gitlabBaseUrlForProject, gitlabLinkConfig, normalizeGitlabBaseUrl } from './gitlab-links';

describe('normalizeGitlabBaseUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeGitlabBaseUrl('https://gitlab.example.com/')).toBe(
      'https://gitlab.example.com'
    );
  });

  it('falls back to gitlab.com for a null, empty, or blank value', () => {
    expect(normalizeGitlabBaseUrl(null)).toBe('https://gitlab.com');
    expect(normalizeGitlabBaseUrl(undefined)).toBe('https://gitlab.com');
    expect(normalizeGitlabBaseUrl('  ')).toBe('https://gitlab.com');
  });
});

describe('gitlabLinkConfig', () => {
  it('normalizes both the default and every project override', () => {
    const config = gitlabLinkConfig('https://gitlab.example.com/', {
      '42': 'https://other-gitlab.example.com/',
    });

    expect(config.defaultBaseUrl).toBe('https://gitlab.example.com');
    expect(config.projectBaseUrls['42']).toBe('https://other-gitlab.example.com');
  });
});

describe('gitlabBaseUrlForProject', () => {
  const config = gitlabLinkConfig('https://gitlab.example.com', { '42': 'https://other.example' });

  it('uses the project-specific override when one exists', () => {
    expect(gitlabBaseUrlForProject(config, 42)).toBe('https://other.example');
  });

  it('falls back to the deployment default for an unknown project id', () => {
    expect(gitlabBaseUrlForProject(config, 7)).toBe('https://gitlab.example.com');
  });

  it('falls back to the deployment default when no project id is known', () => {
    expect(gitlabBaseUrlForProject(config, null)).toBe('https://gitlab.example.com');
  });
});
