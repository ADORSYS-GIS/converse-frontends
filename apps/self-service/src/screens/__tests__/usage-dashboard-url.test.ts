import type { UsageDashboardConfig } from '../../configs/runtime-config-types';
import { buildUsageDashboardUrl } from '../usage-dashboard-url';

const usage: UsageDashboardConfig = {
  grafanaUrl: 'https://grafana.example.com',
  dashboardPath: '/d/my-usage/ai-gateway-e28094-my-usage',
};

describe('buildUsageDashboardUrl', () => {
  it('builds a kiosk URL with the theme and default time range', () => {
    const url = buildUsageDashboardUrl(usage, 'dark', true);

    expect(url).toContain('https://grafana.example.com/d/my-usage/ai-gateway-e28094-my-usage?');
    expect(url).toContain('theme=dark');
    expect(url).toContain('from=now-30d');
    expect(url).toContain('to=now');
    expect(url).toContain('refresh=30s');
    // kiosk is a bare flag, not kiosk=
    expect(url.endsWith('&kiosk')).toBe(true);
    expect(url).not.toContain('kiosk=');
  });

  it('omits kiosk for the external (open-in-browser) URL', () => {
    const url = buildUsageDashboardUrl(usage, 'light', false);

    expect(url).toContain('theme=light');
    expect(url).not.toContain('kiosk');
  });

  it('never encodes a user identity into the URL', () => {
    const url = buildUsageDashboardUrl(usage, 'light', true);

    expect(url).not.toContain('var-user');
    expect(url.toLowerCase()).not.toContain('token');
  });
});
