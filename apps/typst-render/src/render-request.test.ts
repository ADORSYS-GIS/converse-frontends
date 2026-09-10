import { describe, expect, it } from 'vitest';
import { decodeBase64Strict, isSafeAssetName, parseRenderRequest } from './render-request.js';

describe('isSafeAssetName', () => {
  it.each(['logo.svg', 'brand/logo.svg', 'fonts/Inter-Regular.ttf', 'a/b/c/d.png'])(
    'accepts the relative path %s',
    (name) => {
      expect(isSafeAssetName(name)).toBe(true);
    }
  );

  it.each([
    ['..', 'the parent directory itself'],
    ['../secrets.env', 'a direct escape'],
    ['brand/../../secrets.env', 'an escape that only appears after normalisation'],
    ['/etc/passwd', 'an absolute path'],
    ['C:/windows/system32/drivers/etc/hosts', 'a Windows drive path'],
    ['\\\\server\\share\\x', 'a UNC path'],
    ['bad\0name.svg', 'an embedded NUL'],
    ['', 'the empty name'],
    ['main.typ', 'a filename the service owns'],
    ['data.json', 'a filename the service owns'],
    ['out.pdf', 'a filename the service owns'],
  ])('rejects %s (%s)', (name) => {
    expect(isSafeAssetName(name)).toBe(false);
  });
});

describe('decodeBase64Strict', () => {
  it('decodes well-formed base64', () => {
    expect(decodeBase64Strict(Buffer.from('hello').toString('base64'))?.toString()).toBe('hello');
  });

  it('tolerates the line breaks a wrapped encoder emits', () => {
    const wrapped = Buffer.from('x'.repeat(120))
      .toString('base64')
      .replace(/(.{40})/g, '$1\n');
    expect(decodeBase64Strict(wrapped)?.length).toBe(120);
  });

  it.each(['not base64!', 'YWJj=', 'YWJ'])('rejects %s instead of silently dropping bytes', (v) => {
    expect(decodeBase64Strict(v)).toBeNull();
  });
});

describe('parseRenderRequest', () => {
  it('accepts a minimal request and defaults data/assets', () => {
    const parsed = parseRenderRequest({ template: '= Hi' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.request.template).toBe('= Hi');
    expect(parsed.request.data).toEqual({});
    expect(parsed.request.assets.size).toBe(0);
  });

  it('normalises an asset key so the written path matches the validated one', () => {
    const parsed = parseRenderRequest({
      template: '= Hi',
      assets: { './brand//logo.svg': Buffer.from('<svg/>').toString('base64') },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect([...parsed.request.assets.keys()]).toEqual(['brand/logo.svg']);
  });

  it.each([
    [null, 'body must be a JSON object'],
    [[], 'body must be a JSON object'],
    [{}, '`template` must be a non-empty string of Typst source'],
    [{ template: '' }, '`template` must be a non-empty string of Typst source'],
    [{ template: '= a', data: [] }, '`data` must be a JSON object'],
    [{ template: '= a', assets: [] }, '`assets` must be an object'],
  ])('rejects %j', (body, expected) => {
    const parsed = parseRenderRequest(body);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain(expected);
  });

  it('rejects a traversal asset name with a message naming the offender', () => {
    const parsed = parseRenderRequest({
      template: '= a',
      assets: { '../../etc/passwd': 'eA==' },
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain('../../etc/passwd');
  });
});
