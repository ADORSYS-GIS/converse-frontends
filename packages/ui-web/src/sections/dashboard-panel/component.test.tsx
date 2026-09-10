import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPanel } from './component';

function press(key: string) {
  fireEvent.keyDown(document, { key });
}

describe('DashboardPanel', () => {
  it('renders a Card with a ZoneHeading title, subtitle, and an Expand button', () => {
    const { container } = render(
      <DashboardPanel id="p1" title="Total cost" subtitle="All accounts">
        {() => <p>body</p>}
      </DashboardPanel>
    );

    expect(container.querySelector('.console-card.dashboard-panel')).toBeInTheDocument();
    expect(screen.getByText('Total cost')).toBeInTheDocument();
    expect(screen.getByText('All accounts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Total cost' })).toBeInTheDocument();
  });

  /** The Expand affordance is appended by the panel, never merged into `actions` — a panel type
   *  cannot ship without a way back to full size by forgetting to add one. */
  it('keeps the Expand button alongside caller actions', () => {
    render(
      <DashboardPanel id="p1" title="Cost" actions={<button type="button">Scale</button>}>
        {() => <p>body</p>}
      </DashboardPanel>
    );
    expect(screen.getByRole('button', { name: 'Scale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Cost' })).toBeInTheDocument();
  });

  it('is focusable, so the hotkey has something to be scoped to', () => {
    const { container } = render(
      <DashboardPanel id="p1" title="Cost">
        {() => <p>body</p>}
      </DashboardPanel>
    );
    const card = container.querySelector('.dashboard-panel') as HTMLElement;
    expect(card.getAttribute('tabindex')).toBe('0');
    card.focus();
    expect(document.activeElement).toBe(card);
  });

  it('calls the body render-prop with size "panel" in the grid', () => {
    const body = vi.fn(({ size }: { size: string }) => <p>{size}</p>);
    render(
      <DashboardPanel id="p1" title="Cost">
        {body}
      </DashboardPanel>
    );
    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('opens the expanded dialog from the Expand button, rendering the body at size "expanded"', async () => {
    render(
      <DashboardPanel id="p1" title="Cost">
        {({ size }) => <p>rendered at {size}</p>}
      </DashboardPanel>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Cost' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/rendered at expanded/)).toBeInTheDocument();
  });

  it('opens from `v` while focus is inside the panel', async () => {
    const { container } = render(
      <DashboardPanel id="p1" title="Cost">
        {({ size }) => <p>rendered at {size}</p>}
      </DashboardPanel>
    );

    (container.querySelector('.dashboard-panel') as HTMLElement).focus();
    press('v');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  /** The AC: "with two panels, only the focused one expands." */
  it('expands only the focused panel when two are mounted', async () => {
    const { container } = render(
      <>
        <DashboardPanel id="a" title="Alpha">
          {() => <p>alpha body</p>}
        </DashboardPanel>
        <DashboardPanel id="b" title="Beta">
          {() => <p>beta body</p>}
        </DashboardPanel>
      </>
    );

    const panels = container.querySelectorAll<HTMLElement>('.dashboard-panel');
    panels[1].focus();
    press('v');

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Beta');
  });

  it('does nothing when `v` is typed into a field inside the panel', () => {
    render(
      <DashboardPanel id="p1" title="Cost">
        {() => <input aria-label="Filter" />}
      </DashboardPanel>
    );
    screen.getByLabelText('Filter').focus();
    press('v');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Esc and returns focus to the panel', async () => {
    const { container } = render(
      <DashboardPanel id="p1" title="Cost">
        {() => <p>body</p>}
      </DashboardPanel>
    );
    const card = container.querySelector('.dashboard-panel') as HTMLElement;

    card.focus();
    press('v');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(card));
  });

  it('supports controlled expansion for a URL-reflected open panel', async () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <DashboardPanel id="p1" title="Cost" expanded={false} onExpandedChange={onExpandedChange}>
        {() => <p>body</p>}
      </DashboardPanel>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Cost' }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    // Controlled: the panel does not open itself until the caller says so.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <DashboardPanel id="p1" title="Cost" expanded onExpandedChange={onExpandedChange}>
        {() => <p>body</p>}
      </DashboardPanel>
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('marks a span-2 panel for the grid without a second class', () => {
    const { container } = render(
      <DashboardPanel id="p1" title="Cost" span={2}>
        {() => <p>body</p>}
      </DashboardPanel>
    );
    expect(container.querySelector('.dashboard-panel')?.getAttribute('data-span')).toBe('2');
  });
  // ── chrome: 'bare' (self-panelling bodies) ─────────────────────────────────────────────────

  it('draws no card and no heading for a self-panelling body', () => {
    const { container } = render(
      <DashboardPanel id="cost" title="Total cost" chrome="bare">
        {() => <p>a self-panelled stat</p>}
      </DashboardPanel>
    );

    expect(container.querySelector('.console-card')).not.toBeInTheDocument();
    expect(container.querySelector('.dashboard-panel-bare')).toBeInTheDocument();
    // The stat's own label is the title — stating it twice is the whole reason this mode exists.
    expect(screen.queryByText('Total cost')).not.toBeInTheDocument();
    expect(screen.getByText('a self-panelled stat')).toBeInTheDocument();
  });

  /** The subtitle is an honesty caption ("only counts actors with usage in this window") — losing
   *  it because the panel has no title row would be the exact silent omission the console-ui
   *  skill's caption rule exists to prevent. */
  it('still renders the subtitle in bare mode', () => {
    render(
      <DashboardPanel
        id="cost"
        title="Active actors"
        subtitle="Only counts actors with usage"
        chrome="bare">
        {() => <p>stat</p>}
      </DashboardPanel>
    );
    expect(screen.getByText('Only counts actors with usage')).toBeInTheDocument();
  });

  /** A single numeral has nothing to reveal at 1280 x 80vh, so a bare panel offers no zoom at all
   *  — no button, and `v` inside it does nothing rather than opening an empty dialog. */
  it('offers no zoom affordance at all in bare mode', () => {
    const { container } = render(
      <DashboardPanel id="cost" title="Total cost" chrome="bare">
        {() => <p>stat</p>}
      </DashboardPanel>
    );

    expect(screen.queryByRole('button', { name: /Expand/ })).not.toBeInTheDocument();

    (container.querySelector('.dashboard-panel-bare') as HTMLElement).focus();
    press('v');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still declares its grid span and stays focusable in bare mode', () => {
    const { container } = render(
      <DashboardPanel id="cost" title="Total cost" chrome="bare" span={2}>
        {() => <p>stat</p>}
      </DashboardPanel>
    );
    const root = container.querySelector('.dashboard-panel-bare') as HTMLElement;
    expect(root.getAttribute('data-span')).toBe('2');
    expect(root.getAttribute('tabindex')).toBe('0');
  });
});
