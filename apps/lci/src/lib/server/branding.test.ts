import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { brandingConfigFromEnv } from './branding';

describe('brandingConfigFromEnv', () => {
  const original = {
    logo: process.env.LCI_BRANDING_LOGO_PATH,
    logoLight: process.env.LCI_BRANDING_LOGO_LIGHT_PATH,
  };

  beforeEach(() => {
    delete process.env.LCI_BRANDING_LOGO_PATH;
    delete process.env.LCI_BRANDING_LOGO_LIGHT_PATH;
  });

  afterEach(() => {
    if (original.logo === undefined) delete process.env.LCI_BRANDING_LOGO_PATH;
    else process.env.LCI_BRANDING_LOGO_PATH = original.logo;
    if (original.logoLight === undefined) delete process.env.LCI_BRANDING_LOGO_LIGHT_PATH;
    else process.env.LCI_BRANDING_LOGO_LIGHT_PATH = original.logoLight;
  });

  it('returns an empty config when unset', () => {
    expect(brandingConfigFromEnv()).toEqual({});
  });

  it('resolves the logo path and its content type', () => {
    process.env.LCI_BRANDING_LOGO_PATH = '/tmp/branding/logo.png';
    expect(brandingConfigFromEnv()).toEqual({
      logoPath: '/tmp/branding/logo.png',
      logoContentType: 'image/png',
    });
  });

  it('resolves both logo and logo-light together', () => {
    process.env.LCI_BRANDING_LOGO_PATH = '/tmp/branding/logo.svg';
    process.env.LCI_BRANDING_LOGO_LIGHT_PATH = '/tmp/branding/logo-light.webp';
    expect(brandingConfigFromEnv()).toEqual({
      logoPath: '/tmp/branding/logo.svg',
      logoContentType: 'image/svg+xml',
      logoLightPath: '/tmp/branding/logo-light.webp',
      logoLightContentType: 'image/webp',
    });
  });

  it('rejects a relative logo path', () => {
    process.env.LCI_BRANDING_LOGO_PATH = 'branding/logo.png';
    expect(() => brandingConfigFromEnv()).toThrow(/host-absolute path/);
  });

  it('rejects an unsupported extension', () => {
    process.env.LCI_BRANDING_LOGO_PATH = '/tmp/branding/logo.gif';
    expect(() => brandingConfigFromEnv()).toThrow(/must end in one of/);
  });

  it('rejects logo-light set without logo', () => {
    process.env.LCI_BRANDING_LOGO_LIGHT_PATH = '/tmp/branding/logo-light.png';
    expect(() => brandingConfigFromEnv()).toThrow(/requires LCI_BRANDING_LOGO_PATH/);
  });
});
