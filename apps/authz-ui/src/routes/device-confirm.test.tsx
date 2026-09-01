import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeviceConfirmRoute } from './device-confirm';

const originalFetch = global.fetch;

function renderAtDeviceConfirm() {
  return render(
    <MemoryRouter initialEntries={['/device/confirm']}>
      <Routes>
        <Route path="/device/confirm" element={<DeviceConfirmRoute />} />
        <Route path="/device" element={<div>device entry landing</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DeviceConfirmRoute', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders the ready state once the context fetch resolves', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user_code: 'PAR12345', client_id: 'cli' }), { status: 200 })
      ) as unknown as typeof fetch;

    renderAtDeviceConfirm();

    expect(await screen.findByText('cli')).not.toBeNull();
    expect(screen.getByText('PAR1-2345')).not.toBeNull();
  });

  it('calls the context endpoint same-origin, credentials included', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user_code: 'PAR12345', client_id: 'cli' }), { status: 200 })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderAtDeviceConfirm();
    await screen.findByText('cli');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/device/verify/context');
    expect(init.credentials).toBe('same-origin');
  });

  it('renders the error state on a 500', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 })) as unknown as typeof fetch;

    renderAtDeviceConfirm();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('This confirmation is no longer available.');
  });

  it('renders the error state on a rejected fetch (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    renderAtDeviceConfirm();

    expect(await screen.findByRole('alert')).not.toBeNull();
  });

  it('navigates back to /device, replacing history, on a 404', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 })) as unknown as typeof fetch;

    renderAtDeviceConfirm();

    await waitFor(() => {
      expect(screen.getByText('device entry landing')).not.toBeNull();
    });
  });

  it('shows a loading skeleton before the fetch resolves', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const { container } = renderAtDeviceConfirm();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
