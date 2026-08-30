import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConsoleShell } from './component';

describe('ConsoleShell', () => {
  it('renders the sidebar, top bar and centre', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Top bar')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
  });

  it('renders the banner directly above the children, inside the capped content column', () => {
    render(
      <ConsoleShell
        sidebar={<div>Sidebar</div>}
        topBar={<div>Top bar</div>}
        banner={<div role="alert">Could not revoke the key.</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not revoke the key.');
  });

  it('renders no banner region at all when the slot is omitted', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('applies the flex-1 min-w-0 centre (flex-shell contract)', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const centre = screen.getByText('Centre').closest('main');
    expect(centre).toHaveClass('flex-1', 'min-w-0');
  });

  it('renders the floor background on the shell root, as a row at md and up', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getByText('Centre').closest('div.shell-root')).toBeInTheDocument();
  });

  it('caps the content column at a fixed reading measure', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const wrapper = screen.getByText('Centre').closest('div.max-w-\\[1120px\\]');
    expect(wrapper).toHaveClass('mx-auto', 'w-full');
  });

  it('renders no rail region at all when the slot is omitted', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.queryByText('Rail')).not.toBeInTheDocument();
  });

  it('renders the rail slot, visible at lg and hidden below it', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>} rail={<div>Rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const rail = screen.getByText('Rail').closest('div.lg\\:flex');
    expect(rail).toHaveClass('hidden', 'lg:flex', 'lg:flex-none');
  });

  it('defaults the rail width to 280px when uncontrolled', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>} rail={<div>Rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const rail = screen.getByText('Rail').closest('div.lg\\:flex') as HTMLElement;
    expect(rail.style.width).toBe('280px');
  });

  it('applies a controlled rail width, and renders the resizer only once a width owner is wired', () => {
    render(
      <ConsoleShell
        sidebar={<div>Sidebar</div>}
        topBar={<div>Top bar</div>}
        rail={<div>Rail</div>}
        railWidth={360}
        onRailWidthChange={() => {}}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const rail = screen.getByText('Rail').closest('div.lg\\:flex') as HTMLElement;
    expect(rail.style.width).toBe('360px');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders no resizer when the rail width is uncontrolled', () => {
    render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>} rail={<div>Rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('does not know about nav data — sidebar and top bar are opaque slots', () => {
    // Regression: the old ConsoleShell owned a `nav: NavSpineProps` prop and rendered NavSpine
    // twice itself. That responsibility moved entirely into `ConsoleSidebar` — this component
    // renders exactly the two slots it is given and nothing else.
    const { container } = render(
      <ConsoleShell sidebar={<div>Sidebar</div>} topBar={<div>Top bar</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(container.querySelectorAll('nav')).toHaveLength(0);
  });
});
