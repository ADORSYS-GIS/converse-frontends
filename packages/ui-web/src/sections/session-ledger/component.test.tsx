import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SessionLedger } from './component';
import { SessionLedgerControls } from './controls';
import type { SessionLedgerControlsProps } from './controls';
import { SessionDetailPanel } from './detail-panel';
import {
  activeSessionRowsFixture,
  revokedSessionDetailFixture,
  sessionDetailFixture,
  sessionRowsFixture,
} from './fixtures';
import type { SessionDetailPanelProps, SessionLedgerProps } from './types';

function ledgerProps(overrides: Partial<SessionLedgerProps> = {}): SessionLedgerProps {
  return {
    sessions: sessionRowsFixture,
    emptyMessage: 'No sessions match these filters.',
    onSelectSession: vi.fn(),
    ...overrides,
  };
}

function panelProps(overrides: Partial<SessionDetailPanelProps> = {}): SessionDetailPanelProps {
  return {
    session: sessionDetailFixture,
    onRequestClose: vi.fn(),
    closeConfirmOpen: false,
    onConfirmClose: vi.fn(),
    onCancelClose: vi.fn(),
    onRequestCloseAll: vi.fn(),
    closeAllConfirmOpen: false,
    onConfirmCloseAll: vi.fn(),
    onCancelCloseAll: vi.fn(),
    ...overrides,
  };
}

describe('SessionLedger', () => {
  it('renders the eight columns the story names, in order', () => {
    render(<SessionLedger {...ledgerProps()} />);

    for (const header of [
      'User',
      'Account',
      'Kind',
      // The header names the CLAIM, not just the concept: an operator cross-checking a token or a
      // log line is looking for `azp`, and "Client" alone left them to guess the two were the
      // same field (owner feedback, 2026-09-03).
      'Client \\(azp\\)',
      'Created',
      'Last used',
      'Expires',
      'Status',
    ]) {
      expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument();
    }
  });

  it('shows a resolved identity as name over email', () => {
    render(<SessionLedger {...ledgerProps()} />);

    expect(screen.getAllByText('Maria Okonkwo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maria@brightline.dev').length).toBeGreaterThan(0);
  });

  it('still lists a row whose identity is only a labelled sentinel', () => {
    render(<SessionLedger {...ledgerProps()} />);

    expect(screen.getByText('Unknown (pre-2026-08)')).toBeInTheDocument();
    expect(screen.getByText('Unresolved user')).toBeInTheDocument();
    expect(screen.getByText('usr_k3m9x1qp0z7b')).toBeInTheDocument();
  });

  it('marks only the offline sessions, and explains what the marker means', () => {
    render(<SessionLedger {...ledgerProps()} />);

    // Two of the five fixture rows carry an `offline_access` refresh chain.
    expect(screen.getAllByText('· offline')).toHaveLength(2);
    expect(screen.getByText(/refresh chain carries the/)).toBeInTheDocument();
  });

  it('distinguishes the three statuses by word, since two of them share a tone', () => {
    render(<SessionLedger {...ledgerProps()} />);

    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('names the absent facts rather than rendering a blank cell', () => {
    render(<SessionLedger {...ledgerProps()} />);

    expect(screen.getByText('None recorded')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  // The reset moved OUT with the filters (2026-09-03, ADR 0015 amendment A2): it is a
  // `PageControls` group, visible whenever a filter is active rather than only once the table has
  // already come back empty. So this line is a line, and nothing else.
  it('renders an empty result as an inline status line, never a centred placard', () => {
    render(<SessionLedger {...ledgerProps({ sessions: [] })} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No sessions match these filters.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
  });

  it('renders a degraded lookup as a status above a table that still lists every row', () => {
    render(
      <SessionLedger
        {...ledgerProps({
          status: 'User names could not be resolved — showing the raw user id instead.',
        })}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('could not be resolved');
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('replaces the table with an alert on a genuine fetch failure', () => {
    const onRetry = vi.fn();
    render(<SessionLedger {...ledgerProps({ error: 'Could not load sessions.', onRetry })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load sessions.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('reports the row that was activated', () => {
    const onSelectSession = vi.fn();
    render(
      <SessionLedger {...ledgerProps({ sessions: activeSessionRowsFixture, onSelectSession })} />
    );

    fireEvent.click(screen.getAllByRole('row')[1]!);
    expect(onSelectSession).toHaveBeenCalledWith(activeSessionRowsFixture[0]);
  });

  it('pages on the cursor the caller wired, prev/next only', () => {
    const onNext = vi.fn();
    render(
      <SessionLedger
        {...ledgerProps({
          pagination: { shown: 5, hasPrev: false, hasNext: true, onPrev: vi.fn(), onNext },
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(onNext).toHaveBeenCalled();
  });

  it('states the page size beside the count, so a short page reads as short', () => {
    render(
      <SessionLedger
        {...ledgerProps({
          pagination: {
            shown: 5,
            pageSize: 25,
            hasPrev: false,
            hasNext: true,
            onPrev: vi.fn(),
            onNext: vi.fn(),
          },
        })}
      />
    );

    expect(screen.getByText('5 of 25 sessions per page')).toBeInTheDocument();
  });

  it('falls back to the bare count when the caller states no page size', () => {
    render(
      <SessionLedger
        {...ledgerProps({
          pagination: { shown: 5, hasPrev: false, hasNext: true, onPrev: vi.fn(), onNext: vi.fn() },
        })}
      />
    );

    expect(screen.getByText('5 sessions')).toBeInTheDocument();
  });
});

describe('SessionLedgerControls', () => {
  function controlsProps(overrides: Partial<SessionLedgerControlsProps> = {}) {
    return {
      status: 'active' as const,
      onStatusChange: vi.fn(),
      kind: 'all' as const,
      onKindChange: vi.fn(),
      search: '',
      onSearchChange: vi.fn(),
      userOptions: [],
      selectedUser: '',
      onSelectedUserChange: vi.fn(),
      ...overrides,
    };
  }

  // Page size left this cluster on 2026-09-03 (ADR 0015 amendment A2): it was never a filter — it
  // changes how much of the same set you see, never which set — and the `sm:ms-auto` it wore to
  // hold itself apart from the three real filters is now a trailing `PageControls` group in
  // `admin-sessions-centre.tsx`.
  it('renders no page-size control — that is not a filter, and is a group of its own', () => {
    render(<SessionLedgerControls {...controlsProps()} />);

    expect(screen.queryByText('Per page')).not.toBeInTheDocument();
  });
});

describe('SessionDetailPanel', () => {
  it('shows the facts a table cell has no room for', () => {
    render(<SessionDetailPanel {...panelProps()} />);

    expect(screen.getByText('lightbridge-cli/1.9.2 (darwin; arm64)')).toBeInTheDocument();
    expect(screen.getAllByText('acc_5f2b81c07d3e').length).toBeGreaterThan(0);
    expect(screen.getByText('prj_1a9c33e6b842')).toBeInTheDocument();
    expect(screen.getByText('ses_7a3e5b1f8c02')).toBeInTheDocument();
  });

  it('offers Close session only while the session is active', () => {
    const { unmount } = render(<SessionDetailPanel {...panelProps()} />);
    expect(screen.getByRole('button', { name: 'Close session' })).toBeInTheDocument();
    unmount();

    render(<SessionDetailPanel {...panelProps({ session: revokedSessionDetailFixture })} />);
    expect(screen.queryByRole('button', { name: 'Close session' })).not.toBeInTheDocument();
  });

  it('confirms one session with a plain dialog — no name to type for a re-login', () => {
    render(<SessionDetailPanel {...panelProps({ closeConfirmOpen: true })} />);

    expect(screen.getByText('Close this session?')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('names the user and the number of sessions affected in the bulk confirmation', () => {
    render(<SessionDetailPanel {...panelProps({ closeAllConfirmOpen: true })} />);

    expect(screen.getByText('Close every session for Maria Okonkwo?')).toBeInTheDocument();
    expect(screen.getByText(/2 of them are listed on this page/)).toBeInTheDocument();
    // The typed guard: the object name is the person, so the action cannot be mis-aimed at the
    // row above or below it in an operator table.
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('withholds the bulk action when the row records no subject to aim it at', () => {
    render(
      <SessionDetailPanel
        {...panelProps({ session: { ...sessionDetailFixture, subject: undefined } })}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Close all sessions for this user' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Not recorded (pre-2026-08 session)')).toBeInTheDocument();
  });

  it('surfaces a failed revoke as an alert and a successful one as a status', () => {
    const { unmount } = render(
      <SessionDetailPanel {...panelProps({ error: 'Could not close the session.' })} />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not close the session.');
    unmount();

    render(<SessionDetailPanel {...panelProps({ success: 'Session closed.' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Session closed.');
  });

  it('disables both actions while a revoke is in flight', () => {
    render(<SessionDetailPanel {...panelProps({ busy: true })} />);

    expect(screen.getByRole('button', { name: 'Close session' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close all sessions for this user' })).toBeDisabled();
  });
});
