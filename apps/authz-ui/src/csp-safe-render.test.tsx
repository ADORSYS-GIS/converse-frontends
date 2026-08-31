import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, it, vi } from 'vitest';

import { DeviceConfirmRoute } from './routes/device-confirm';
import { DeviceEntryRoute } from './routes/device-entry';
import { DeviceSuccessRoute } from './routes/device-success';
import { ErrorRoute } from './routes/error-route';
import { PlaceholderPage } from './routes/placeholder-page';

// The falsifiable end-to-end CSP guard (plan A6b), and the one that actually closes V24:
// `no-daisy-component-classes.test.ts` scans `apps/authz-ui/src/**/*.tsx` by regex over
// `className=` literals -- it cannot see a class an imported `packages/ui-web` section
// contributes at render time. A source scan proves things about *files*; this proves things
// about the *DOM the browser will style*, so it holds no matter which module contributed the
// class. Mirrors that test's own forbidden-class list.
const FORBIDDEN = new Set([
  'alert',
  'btn',
  'badge',
  'checkbox',
  'radio',
  'toggle',
  'menu',
  'loading',
  'tooltip',
  'card',
  'input',
  'select',
  'table',
  'tabs',
  'skeleton',
]);

function assertCspSafe(container: HTMLElement, label: string) {
  const elements = container.querySelectorAll('*');
  for (const el of Array.from(elements)) {
    for (const token of Array.from(el.classList)) {
      if (FORBIDDEN.has(token)) {
        throw new Error(
          `${label}: forbidden CSP-unsafe class "${token}" on <${el.tagName.toLowerCase()}> -- ` +
            'daisyUI component classes fetch a data: URI background regardless of visibility ' +
            "and are blocked by this app's default-src 'self' CSP (see D6 in the migration plan)"
        );
      }
    }
  }
}

const originalFetch = global.fetch;

describe('csp-safe-render -- every route element renders no forbidden class', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    cleanup();
  });

  it('/ (placeholder)', () => {
    const { container } = render(<PlaceholderPage />);
    assertCspSafe(container, '/');
  });

  it('/device', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/device']}>
        <DeviceEntryRoute />
      </MemoryRouter>
    );
    assertCspSafe(container, '/device');
  });

  it('/device/invalid', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/device/invalid']}>
        <DeviceEntryRoute invalidCode />
      </MemoryRouter>
    );
    assertCspSafe(container, '/device/invalid');
  });

  it('/device/confirm (ready)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user_code: 'PAR12345', client_id: 'cli' }), { status: 200 })
      ) as unknown as typeof fetch;

    const { container } = render(
      <MemoryRouter initialEntries={['/device/confirm']}>
        <DeviceConfirmRoute />
      </MemoryRouter>
    );
    await screen.findByText('cli');
    assertCspSafe(container, '/device/confirm (ready)');
  });

  it('/device/confirm (loading)', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const { container } = render(
      <MemoryRouter initialEntries={['/device/confirm']}>
        <DeviceConfirmRoute />
      </MemoryRouter>
    );
    assertCspSafe(container, '/device/confirm (loading)');
  });

  it('/device/confirm (error)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 })) as unknown as typeof fetch;

    const { container } = render(
      <MemoryRouter initialEntries={['/device/confirm']}>
        <DeviceConfirmRoute />
      </MemoryRouter>
    );
    await screen.findByRole('alert');
    assertCspSafe(container, '/device/confirm (error)');
  });

  it('/device/success', () => {
    const { container } = render(<DeviceSuccessRoute />);
    assertCspSafe(container, '/device/success');
  });

  it('/error', () => {
    const { container } = render(<ErrorRoute />);
    assertCspSafe(container, '/error');
  });
});
