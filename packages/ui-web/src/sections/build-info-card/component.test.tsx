import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BuildInfoCard, NOT_CONFIGURED_CAPTION } from './component';
import {
  buildInfoAllKnown,
  buildInfoError,
  buildInfoLoading,
  buildInfoPartiallyUnavailable,
} from './fixtures';

/** Installs a stub clipboard and hands back the spy, so a test can assert what was WRITTEN — the
 *  full SHA — rather than only what was displayed. */
function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BuildInfoCard', () => {
  it('renders one labelled group per service, the console first', () => {
    render(<BuildInfoCard {...buildInfoAllKnown} />);
    for (const label of ['Console', 'authz-api', 'authz-budget', 'authz-idp', 'authz-usage']) {
      expect(screen.getByText(new RegExp(`^${label}`))).toBeInTheDocument();
    }
  });

  it('shows the short SHA but copies the full one', async () => {
    const writeText = stubClipboard();
    render(<BuildInfoCard {...buildInfoAllKnown} />);

    // Displayed: short. A 40-character SHA in a settings row is noise.
    expect(screen.getAllByText('509005e').length).toBeGreaterThan(0);
    expect(screen.queryByText('509005ede47ed13cd2fbb3be0f7bb5bfbf029039')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy authz-api commit SHA' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('509005ede47ed13cd2fbb3be0f7bb5bfbf029039')
    );
  });

  it('acknowledges the copy on the one button that was pressed, not on every button', async () => {
    stubClipboard();
    render(<BuildInfoCard {...buildInfoAllKnown} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy authz-api commit SHA' }));
    await screen.findByRole('button', { name: 'Copied authz-api commit SHA' });

    // Every other copy affordance is still unclaimed — the acknowledgement is keyed per value.
    expect(
      screen.getByRole('button', { name: 'Copy authz-budget commit SHA' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy authz-api image SHA' })).toBeInTheDocument();
  });

  it('never claims a copy the clipboard refused', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<BuildInfoCard {...buildInfoAllKnown} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy authz-api commit SHA' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: 'Copied authz-api commit SHA' })
    ).not.toBeInTheDocument();
  });

  it('distinguishes unavailable, loading and error rather than blanking all three', () => {
    render(<BuildInfoCard {...buildInfoPartiallyUnavailable} />);

    // Settled-and-nothing-to-show says why.
    expect(screen.getByText(NOT_CONFIGURED_CAPTION)).toBeInTheDocument();
    // Asked-and-failed is an alert with its own message; this fixture has none, so there is none.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The card-level caption states the aggregate fact no single row owns.
    expect(screen.getByText(/Two services could not report a build/)).toBeInTheDocument();
  });

  it("renders the backend's own `unknown` sentinel rather than swallowing it", () => {
    render(<BuildInfoCard {...buildInfoPartiallyUnavailable} />);
    // A backend built with no git context genuinely answers "unknown" — that is a real answer and
    // the screen shows it, de-emphasized, instead of hiding the row and implying nothing was asked.
    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0);
  });

  it('omits a fact the service did not report instead of printing a placeholder', () => {
    render(<BuildInfoCard {...buildInfoAllKnown} />);
    const consoleGroup = screen.getByText(/^Console/).closest('div');
    expect(consoleGroup).not.toBeNull();
    // The console has no rustc toolchain and never reports one, so there is no Toolchain row in
    // its group — not an em dash, not "N/A".
    expect(within(consoleGroup as HTMLElement).queryByText('Toolchain')).not.toBeInTheDocument();
    // The backends do report one.
    expect(screen.getAllByText('Toolchain').length).toBe(4);
  });

  it('surfaces a failed read as an alert with a retry', () => {
    const onRetry = vi.fn();
    render(
      <BuildInfoCard
        entries={buildInfoError.entries.map((entry) =>
          entry.state.status === 'error' ? { ...entry, state: { ...entry.state, onRetry } } : entry
        )}
      />
    );
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBe(2);
    expect(alerts[0]).toHaveTextContent('Could not read the backend build.');
    fireEvent.click(within(alerts[0]).getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('drops the binary build time once an image build time exists, and keeps it otherwise', () => {
    // Two near-identical timestamps on every service is density for its own sake: with an image,
    // the image's own build time is the deployment-relevant one and sits on the Image row.
    render(<BuildInfoCard {...buildInfoAllKnown} />);
    expect(screen.queryByText('Built')).not.toBeInTheDocument();

    // The `authz-idp` entry in this fixture has a build time and NO image — then it is the only
    // time fact there is, and dropping it would lose information rather than save a row.
    render(<BuildInfoCard {...buildInfoPartiallyUnavailable} />);
    expect(screen.getAllByText('Built').length).toBe(1);
  });

  it('shows the tag and the full reference as two rows, and copies the reference', async () => {
    // They answer different questions — "which build is this" vs "what do I type to pull it" —
    // and collapsing them is exactly how a registry path ended up rendered under "Image".
    const writeText = stubClipboard();
    render(<BuildInfoCard {...buildInfoAllKnown} />);

    const consoleGroup = screen.getByText('Console').closest('div') as HTMLElement;
    expect(within(consoleGroup).getByText('sha-f95d35e')).toBeInTheDocument();
    expect(
      within(consoleGroup).getByText('ghcr.io/adorsys-gis/converse-frontends/console:sha-f95d35e')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy Console image reference' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'ghcr.io/adorsys-gis/converse-frontends/console:sha-f95d35e'
      )
    );
  });

  it('omits the Reference row for a service that reports no reference', () => {
    // The backends do not: `lightbridge-authz`'s `/version` shape has no such field, and inventing
    // one from its tag would be a fabricated pull command.
    render(<BuildInfoCard {...buildInfoAllKnown} />);
    expect(screen.getAllByText('Reference').length).toBe(1);
  });

  it("keeps the console's own row readable while every backend is still loading", () => {
    render(<BuildInfoCard {...buildInfoLoading} />);
    // The console reads its build from its own bundle, so it can never be blocked on a backend.
    expect(screen.getByText('f95d35e')).toBeInTheDocument();
  });
});
