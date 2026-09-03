import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsoleEnv } from '../env';
import { printLogoPath, resolveReportBranding } from './report-branding';

/**
 * The report letterhead (owner feedback 2026-09-03: "the PDF has no custom logo").
 *
 * Every case here is about ONE decision that is easy to get backwards: which of the two configured
 * logos is the one that survives being printed.
 */

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'report-branding-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function writeLogo(name: string, contents = 'PNGBYTES'): string {
  const path = join(dir, name);
  writeFileSync(path, contents);
  return path;
}

function branding(overrides: Partial<NonNullable<ConsoleEnv['branding']>>) {
  return overrides as ConsoleEnv['branding'];
}

describe('resolveReportBranding', () => {
  it('is empty when nothing is configured', () => {
    expect(resolveReportBranding(undefined)).toEqual({});
  });

  /**
   * The whole point. `branding.logo` is the DARK-theme mark — prod's is a white adorsys logo — and
   * a white logo on white paper is an empty rectangle. `logoLight` is the light-background
   * counterpart, so it is the one that prints.
   */
  it('prefers the light-theme logo, because paper is white', () => {
    const logoPath = writeLogo('logo.png', 'dark-mark');
    const logoLightPath = writeLogo('logo-light.png', 'light-mark');

    const resolved = resolveReportBranding(branding({ logoPath, logoLightPath }));

    expect(resolved.branding).toEqual({ logo: 'branding/logo.png' });
    expect(resolved.asset?.path).toBe('branding/logo.png');
    expect(resolved.asset?.bytes.toString('utf8')).toBe('light-mark');
  });

  it('uses branding.logo when it is the only mark configured', () => {
    const logoPath = writeLogo('logo.svg', '<svg/>');
    const resolved = resolveReportBranding(branding({ logoPath }));
    expect(resolved.branding).toEqual({ logo: 'branding/logo.svg' });
    expect(resolved.asset?.bytes.toString('utf8')).toBe('<svg/>');
  });

  it('names the asset after the SOURCE extension, so Typst decodes it correctly', () => {
    const logoPath = writeLogo('mark.WEBP');
    expect(resolveReportBranding(branding({ logoPath })).asset?.path).toBe('branding/logo.webp');
  });

  it('carries branding.name alongside the logo', () => {
    const logoPath = writeLogo('logo.png');
    expect(resolveReportBranding(branding({ logoPath, name: 'adorsys' })).branding).toEqual({
      logo: 'branding/logo.png',
      name: 'adorsys',
    });
  });

  it('carries a name with no logo at all — the template falls back to it', () => {
    expect(resolveReportBranding(branding({ name: 'adorsys' }))).toEqual({
      branding: { name: 'adorsys' },
    });
  });

  /**
   * A logo is chrome. A report that refuses to render because its letterhead file is missing —
   * a ConfigMap renamed, a volume not mounted yet — would be a worse answer than a report with a
   * plain header, which is exactly the header every report had before this existed.
   */
  it('degrades to no logo (never an exception) when the configured file cannot be read', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolved = resolveReportBranding(
      branding({ logoPath: join(dir, 'not-here.png'), name: 'adorsys' })
    );
    expect(resolved.asset).toBeUndefined();
    expect(resolved.branding).toEqual({ name: 'adorsys' });
  });

  it('refuses an extension Typst cannot draw rather than shipping a file it will choke on', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logoPath = writeLogo('logo.pdf');
    expect(resolveReportBranding(branding({ logoPath }))).toEqual({});
  });
});

describe('printLogoPath', () => {
  it.each([
    ['neither', undefined, undefined],
    ['logo only', { logoPath: '/a.png' }, '/a.png'],
    ['both', { logoPath: '/a.png', logoLightPath: '/b.png' }, '/b.png'],
    [
      'light only (config forbids it, but the rule is stated anyway)',
      { logoLightPath: '/b.png' },
      '/b.png',
    ],
  ])('picks the print variant with %s', (_label, input, expected) => {
    expect(printLogoPath(input as ConsoleEnv['branding'])).toBe(expected);
  });
});
