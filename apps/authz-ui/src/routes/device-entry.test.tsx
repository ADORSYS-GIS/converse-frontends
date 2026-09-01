import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { DeviceEntryRoute, sanitiseUserCode } from './device-entry';

describe('sanitiseUserCode', () => {
  it('returns undefined for null (no query param present)', () => {
    expect(sanitiseUserCode(null)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(sanitiseUserCode('')).toBeUndefined();
  });

  it('upper-cases lower-case input', () => {
    expect(sanitiseUserCode('abcd1234')).toBe('ABCD1234');
  });

  it('keeps the device alphabet (0-9, A-H, J, K, M, N, P-T, V-Z) plus the display separator, dropping I/L/O/U', () => {
    // device_store.rs's Crockford-style alphabet excludes I/L/O/U -- "PAIR" loses its "I".
    expect(sanitiseUserCode('PAIR-1234')).toBe('PAR-1234');
  });

  it('strips characters outside the device alphabet -- the DOM-sink-safety boundary', () => {
    expect(sanitiseUserCode('<script>ILOU')).toBe('SCRPT');
  });

  it('strips a javascript: sink attempt down to the alphabet-safe remainder', () => {
    expect(sanitiseUserCode("javascript:alert('x')")).toBe('JAVASCRPTAERTX');
  });

  it('clamps to 16 characters', () => {
    expect(sanitiseUserCode('0123456789ABCDEFGH')).toBe('0123456789ABCDEF');
  });

  it('returns undefined when every character is filtered out', () => {
    expect(sanitiseUserCode('ilou!!!')).toBeUndefined();
  });
});

describe('DeviceEntryRoute', () => {
  it('pre-fills the field from a sanitised ?user_code=', () => {
    render(
      <MemoryRouter initialEntries={['/device?user_code=abcd-1234']}>
        <DeviceEntryRoute />
      </MemoryRouter>
    );

    const field = screen.getByLabelText(/device code/i) as HTMLInputElement;
    expect(field.value).toBe('ABCD-1234');
  });

  it('shows no error line when invalidCode is unset', () => {
    render(
      <MemoryRouter initialEntries={['/device']}>
        <DeviceEntryRoute />
      </MemoryRouter>
    );

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows "That code cannot be used." when invalidCode is set', () => {
    render(
      <MemoryRouter initialEntries={['/device/invalid']}>
        <DeviceEntryRoute invalidCode />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert').textContent).toBe('That code cannot be used.');
  });
});
