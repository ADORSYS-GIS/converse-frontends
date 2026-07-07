import { buildConfig, initialSelectedServers } from '../mcp-builder-view';

describe('buildConfig', () => {
  it('nests servers under "servers" for vscode and includes the type field', () => {
    const config = JSON.parse(buildConfig('vscode', initialSelectedServers));

    expect(config).toHaveProperty('servers');
    expect(config).not.toHaveProperty('mcpServers');
    expect(config.servers['brave-search'].type).toBe('stdio');
  });

  it('nests servers under "mcpServers" and omits the type field for non-vscode platforms', () => {
    const config = JSON.parse(buildConfig('cursor', initialSelectedServers));

    expect(config).toHaveProperty('mcpServers');
    expect(config).not.toHaveProperty('servers');
    expect(config.mcpServers['brave-search']).not.toHaveProperty('type');
  });

  it('only includes servers that are selected', () => {
    const config = JSON.parse(
      buildConfig('claude', {
        'brave-search': true,
        firecrawl: false,
        browserless: false,
        context7: false,
      })
    );

    expect(Object.keys(config.mcpServers)).toEqual(['brave-search']);
  });

  it('substitutes the generated secret into each selected server env, defaulting when absent', () => {
    const withSecret = JSON.parse(buildConfig('claude', initialSelectedServers, 'sk-real-secret'));
    expect(withSecret.mcpServers['brave-search'].env.BRAVE_API_KEY).toBe('sk-real-secret');
    expect(withSecret.mcpServers.firecrawl.env.FC_API_KEY).toBe('sk-real-secret');

    const withoutSecret = JSON.parse(buildConfig('claude', initialSelectedServers));
    expect(withoutSecret.mcpServers['brave-search'].env.BRAVE_API_KEY).toBe('YOUR_API_KEY_HERE');
  });

  it('produces an empty server map when nothing is selected', () => {
    const config = JSON.parse(
      buildConfig('vscode', {
        'brave-search': false,
        firecrawl: false,
        browserless: false,
        context7: false,
      })
    );

    expect(config.servers).toEqual({});
  });
});
