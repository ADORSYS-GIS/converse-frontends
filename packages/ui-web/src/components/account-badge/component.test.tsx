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
});
