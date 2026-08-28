import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsRow, SettingsSection } from './component';

describe('SettingsSection', () => {
  it('renders the uppercase title', () => {
    render(
      <SettingsSection title="Review behaviour">
        <SettingsRow label="Review on push" />
      </SettingsSection>
    );

    expect(screen.getByText('Review behaviour')).toBeInTheDocument();
  });

  it('never wraps its rows in a bordered box — no card class, no rounded-box, no bg fill', () => {
    const { container } = render(
      <SettingsSection title="Review behaviour">
        <SettingsRow label="Review on push" />
      </SettingsSection>
    );

    const rowsContainer = container.querySelector('.divide-y');
    expect(rowsContainer).not.toBeNull();
    expect(rowsContainer?.className).not.toMatch(/\bcard\b/);
    expect(rowsContainer?.className).not.toMatch(/rounded-box/);
    expect(rowsContainer?.className).not.toMatch(/bg-(surface|base-200)/);
  });
});

describe('SettingsRow', () => {
  it('renders label, description, and control', () => {
    render(
      <SettingsRow
        label="Auto-merge on green"
        description="Merge once review and CI both pass."
        control={<button type="button">On</button>}
      />
    );

    expect(screen.getByText('Auto-merge on green')).toBeInTheDocument();
    expect(screen.getByText('Merge once review and CI both pass.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On' })).toBeInTheDocument();
  });

  it('falls back to children when no control is passed', () => {
    render(<SettingsRow label="Review tier">Fast</SettingsRow>);

    expect(screen.getByText('Fast')).toBeInTheDocument();
  });

  it('renders an optional badge ahead of the control', () => {
    render(
      <SettingsRow
        label="Review tier"
        badge={<span>Admin override</span>}
        control={<span>Fast</span>}
      />
    );

    expect(screen.getByText('Admin override')).toBeInTheDocument();
  });
});
