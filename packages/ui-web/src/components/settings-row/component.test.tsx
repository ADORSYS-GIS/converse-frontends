import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsRow } from './component';

describe('SettingsRow', () => {
  it('renders the label and value as plain text', () => {
    render(<SettingsRow label="Account name" value="Widgets Ltd" />);

    expect(screen.getByText('Account name')).toBeInTheDocument();
    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
  });

  it('renders the optional description under the label', () => {
    render(
      <SettingsRow
        label="Default quota tier"
        description="Applied to new projects."
        value="growth"
      />
    );

    expect(screen.getByText('Applied to new projects.')).toBeInTheDocument();
  });

  it('renders no value node when value is omitted', () => {
    const { container } = render(<SettingsRow label="Account name" />);

    expect(container.querySelector('.settings-row-value')?.textContent).toBe('');
  });

  it('renders the trailing action', () => {
    render(
      <SettingsRow label="Account name" value="Widgets Ltd" action={<button>Rename</button>} />
    );

    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('renders as a <div> by default, and as a <button> when onClick is given', () => {
    const { container: divContainer } = render(<SettingsRow label="Account name" value="x" />);
    expect(divContainer.querySelector('.settings-row')?.tagName).toBe('DIV');

    const onClick = vi.fn();
    render(<SettingsRow label="adorsys-gis/research" onClick={onClick} />);
    const button = screen.getByRole('button', { name: /adorsys-gis\/research/ });
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('marks the current selection with data-current, not a hand-written background class', () => {
    render(<SettingsRow label="gateway-prod" onClick={vi.fn()} current />);

    expect(screen.getByRole('button', { name: 'gateway-prod' })).toHaveAttribute(
      'data-current',
      'true'
    );
  });

  it('shows a trailing chevron only on a row that opens something', () => {
    const { container: clickable } = render(<SettingsRow label="gateway-prod" onClick={vi.fn()} />);
    expect(clickable.querySelector('.settings-row-value svg.chevron-right')).toBeInTheDocument();

    // A plain value row (`/settings/account`'s Status/Default quota tier rows) has nothing to
    // open, so it gets none of the click affordance — no chevron, same as no hover/pointer.
    const { container: plain } = render(<SettingsRow label="Status" value="active" />);
    expect(plain.querySelector('.settings-row-value svg')).not.toBeInTheDocument();
  });
});
