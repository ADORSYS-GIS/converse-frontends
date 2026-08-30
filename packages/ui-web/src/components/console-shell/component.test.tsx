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
