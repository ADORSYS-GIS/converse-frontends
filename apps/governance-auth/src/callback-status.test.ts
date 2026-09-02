import { describe, expect, it } from 'vitest';

import {
  CALLBACK_STATUS_ATTRIBUTE,
  CALLBACK_STATUS_PLACEHOLDER,
  readCallbackStatusMarker,
  resolveCallbackStatus,
} from './callback-status';

describe('resolveCallbackStatus', () => {
  it('resolves the success marker the Rust side injects', () => {
    // Arrange / Act / Assert
    expect(resolveCallbackStatus('success')).toBe('success');
  });

  it('resolves the failure marker the Rust side injects', () => {
    expect(resolveCallbackStatus('error')).toBe('error');
  });

  // The point of the whole module. Broken deliberately during review to confirm it catches the
  // bug it is written for: making `resolveCallbackStatus` return `'success'` for anything other
  // than `'error'` makes every case below fail, each on the input it names.
  it.each([
    ['the unreplaced placeholder', CALLBACK_STATUS_PLACEHOLDER],
    ['an empty attribute', ''],
    ['a missing attribute', null],
    ['an absent attribute', undefined],
    ['a near miss', 'succes'],
    ['a case variant', 'SUCCESS'],
    ['padding', ' success '],
    ['something else entirely', 'ok'],
  ])('fails closed on %s', (_label, marker) => {
    expect(resolveCallbackStatus(marker)).toBe('error');
  });
});

describe('readCallbackStatusMarker', () => {
  it('reads the attribute index.html declares', () => {
    // Arrange
    const element = document.createElement('html');
    element.setAttribute(CALLBACK_STATUS_ATTRIBUTE, 'success');

    // Act / Assert
    expect(readCallbackStatusMarker(element)).toBe('success');
  });

  it('returns null when the attribute is absent, which resolveCallbackStatus rejects', () => {
    const element = document.createElement('html');

    expect(readCallbackStatusMarker(element)).toBeNull();
    expect(resolveCallbackStatus(readCallbackStatusMarker(element))).toBe('error');
  });
});
