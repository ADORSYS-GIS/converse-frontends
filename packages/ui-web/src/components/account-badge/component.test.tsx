import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountBadge, shortAccountId } from './component';

const ACCOUNT_ID = '49534505-4c60-4550-83dd-7af22152cec6';

describe('shortAccountId', () => {
  it('reduces a UUID to a readable token', () => {
    expect(shortAccountId(ACCOUNT_ID)).toBe('acct_49534505');
  });

  it('ignores hyphens when taking the leading characters', () => {
    expect(shortAccountId('ab-cd-ef-gh-ij')).toBe('acct_abcdefgh');
  });

  it('renders an em dash rather than a bare "acct_" for a missing id', () => {
    expect(shortAccountId('')).toBe('—');
  });
});

describe('AccountBadge', () => {
  it('shows the account name, with the short id beside it', () => {
    render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} />);

    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('acct_49534505')).toBeInTheDocument();
  });

  it('never renders the raw UUID as the visible label', () => {
    render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} />);

    expect(screen.queryByText(ACCOUNT_ID)).not.toBeInTheDocument();
  });

  it('falls back to the short token when the account has no name', () => {
    render(<AccountBadge accountId={ACCOUNT_ID} />);

    expect(screen.getByText('acct_49534505')).toBeInTheDocument();
    expect(screen.queryByText(ACCOUNT_ID)).not.toBeInTheDocument();
  });

  it('treats a whitespace-only name as no name at all', () => {
    render(<AccountBadge name="   " accountId={ACCOUNT_ID} />);

    expect(screen.getByText('acct_49534505')).toBeInTheDocument();
  });

  it('does not repeat the short id twice when it IS the displayed name', () => {
    render(<AccountBadge accountId={ACCOUNT_ID} />);

    expect(screen.getAllByText('acct_49534505')).toHaveLength(1);
  });

  it('keeps the full id reachable on hover', () => {
    const { container } = render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} />);

    expect(container.querySelector(`[title="${ACCOUNT_ID}"]`)).toBeInTheDocument();
  });

  it('copies the FULL id, not the short form, when activated', () => {
    const onCopyId = vi.fn();
    render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} onCopyId={onCopyId} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onCopyId).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it('is inert text, not a button, without a copy handler', () => {
    render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is a switcher when two or more accounts are reachable', () => {
    render(
      <AccountBadge
        name="adorsys-gis"
        accountId={ACCOUNT_ID}
        accounts={[
          { id: ACCOUNT_ID, label: 'adorsys-gis' },
          { id: 'other-id', label: 'adorsys-labs' },
        ]}
        onSelectAccount={() => {}}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Account adorsys-gis. Switch account.' })
    ).toBeInTheDocument();
  });

  it('is NOT a switcher with only one reachable account — a menu of one is not a control', () => {
    render(
      <AccountBadge
        name="adorsys-gis"
        accountId={ACCOUNT_ID}
        accounts={[{ id: ACCOUNT_ID, label: 'adorsys-gis' }]}
        onSelectAccount={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /Switch account/ })).not.toBeInTheDocument();
  });

  it('is NOT a switcher without a select handler, however many accounts are listed', () => {
    render(
      <AccountBadge
        name="adorsys-gis"
        accountId={ACCOUNT_ID}
        accounts={[{ id: ACCOUNT_ID }, { id: 'other-id' }]}
      />
    );

    expect(screen.queryByRole('button', { name: /Switch account/ })).not.toBeInTheDocument();
  });

  it('names itself for assistive tech including the copy affordance', () => {
    render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} onCopyId={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'Account adorsys-gis. Copy full account id.' })
    ).toBeInTheDocument();
  });

  // Regression (live, 2026-08-29): the console fed `accountScopeLabel`'s output — which renders
  // an unnamed account as "Unnamed account · <full uuid>" — into `name`. The badge appended its
  // own short form beside it, so the header read
  // "Unnamed account · 49534505-… acct_49534505": the raw UUID back, now twice as long as what
  // the badge replaced. `name` is the account's REAL name or nothing; the fallback is the badge's.
  it('never renders a name containing the full account id', () => {
    render(<AccountBadge name={`Unnamed account · ${ACCOUNT_ID}`} accountId={ACCOUNT_ID} />);

    expect(screen.queryByText(new RegExp(ACCOUNT_ID))).not.toBeInTheDocument();
  });

  // Shell brief (2026-08-30) — the sidebar variant is the same identity content, relocated into
  // `ConsoleSidebar`'s full-width workspace switcher row.
  describe('variant="sidebar"', () => {
    it('renders the workspace-switcher-row class instead of the compact chip', () => {
      render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} variant="sidebar" onCopyId={() => {}} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('workspace-switcher-row');
      expect(button).not.toHaveClass('account-chip');
    });

    it('renders the initials chip when initials are given', () => {
      render(
        <AccountBadge
          name="adorsys-gis"
          accountId={ACCOUNT_ID}
          variant="sidebar"
          initials="AG"
          onCopyId={() => {}}
        />
      );

      expect(screen.getByText('AG')).toBeInTheDocument();
    });

    it('renders no initials chip when none are given', () => {
      render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} variant="sidebar" onCopyId={() => {}} />);

      expect(screen.queryByText('AG')).not.toBeInTheDocument();
    });

    it('shows the short id beside the name without the md-and-up gate the inline variant uses', () => {
      render(<AccountBadge name="adorsys-gis" accountId={ACCOUNT_ID} variant="sidebar" onCopyId={() => {}} />);

      const shortId = screen.getByText('acct_49534505');
      expect(shortId).not.toHaveClass('hidden');
    });

    it('opens the Base UI menu (account list + Copy account id) as a real dropdown', () => {
      render(
        <AccountBadge
          name="adorsys-gis"
          accountId={ACCOUNT_ID}
          variant="sidebar"
          initials="AG"
          accounts={[
            { id: ACCOUNT_ID, label: 'adorsys-gis' },
            { id: 'other-id', label: 'adorsys-labs' },
          ]}
          onSelectAccount={() => {}}
          onCopyId={() => {}}
        />
      );

      const trigger = screen.getByRole('button', { name: 'Account adorsys-gis. Switch account.' });
      fireEvent.click(trigger);

      expect(screen.getByRole('menuitem', { name: 'adorsys-labs' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Copy account id' })).toBeInTheDocument();
    });

    it('shows a trailing chevron so the row reads as a dropdown', () => {
      const { container } = render(
        <AccountBadge
          name="adorsys-gis"
          accountId={ACCOUNT_ID}
          variant="sidebar"
          accounts={[
            { id: ACCOUNT_ID, label: 'adorsys-gis' },
            { id: 'other-id', label: 'adorsys-labs' },
          ]}
          onSelectAccount={() => {}}
        />
      );

      expect(container.querySelector('svg.chevron-right, svg')).toBeInTheDocument();
      expect(screen.getByRole('button')).toContainHTML('svg');
    });

    // Addition 6 regression: this backend seats exactly ONE account per identity in the
    // overwhelming common case (owner note — no account-creation item, `createAccount` conflicts
    // on a second attempt). The OLD rule ("a menu of one is not a control") left the sidebar
    // switcher looking like a dropdown that did nothing for almost every real sign-in — clicking
    // it fell straight to the copy-only button branch, no menu at all. The sidebar variant now
    // opens the SAME menu (account list, even a list of one, + Copy account id) whenever there is
    // at least one known account — the inline/top-bar variant keeps the original 2+ gate
    // unchanged (verified by the top-level "is NOT a switcher with only one reachable account"
    // test above, which renders the default `inline` variant).
    it('opens the menu for a single-account identity too — the common real case', () => {
      render(
        <AccountBadge
          name="adorsys-gis"
          accountId={ACCOUNT_ID}
          variant="sidebar"
          initials="AG"
          accounts={[{ id: ACCOUNT_ID, label: 'adorsys-gis' }]}
          onSelectAccount={() => {}}
          onCopyId={() => {}}
        />
      );

      const trigger = screen.getByRole('button', { name: 'Account adorsys-gis. Switch account.' });
      fireEvent.click(trigger);

      expect(screen.getByRole('menuitem', { name: 'adorsys-gis' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Copy account id' })).toBeInTheDocument();
    });
  });
});
