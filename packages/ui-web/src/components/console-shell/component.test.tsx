import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { NavSpineItem } from '../nav-spine';
import { ConsoleShell } from './component';

const navItems: NavSpineItem[] = [{ key: 'overview', label: 'Overview', active: true }];

describe('ConsoleShell', () => {
  it('renders header and centre', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
  });

  it('renders the nav twice — once as a rail, once as a bottom-bar — from one NavSpineProps', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getAllByRole('button', { name: 'Overview' })).toHaveLength(2);
  });

  it('does not render a left-secondary trigger or right rail when neither is provided', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.queryByRole('button', { name: /scope/i })).not.toBeInTheDocument();
  });

  it('renders leftSecondary inline in the rail, and again in its drawer once opened', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getAllByText('Scope panel')).toHaveLength(1);

    const trigger = screen.getByRole('button', { name: /scope/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Scope panel')).toHaveLength(2);
  });

  it('renders the right rail inline, and its BottomSheet shows the peek row while collapsed', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        rightRail={<div>Right rail</div>}
        rightRailTitle="View"
        rightRailPeek={<span>peek summary</span>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    // The inline (lg) copy is always mounted. The BottomSheet's own Drawer.Content is always
    // mounted too (peek mode never unmounts, README §7 / skill: the right rail is never an
    // overlay that disappears) — but while collapsed it shows the one-line peek, not a second
    // full copy of the rail content.
    expect(screen.getByText('Right rail')).toBeInTheDocument();
    expect(screen.getByText('peek summary')).toBeInTheDocument();
  });

  it('mounts a second copy of the right rail inside the BottomSheet once it is expanded', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        rightRail={<div>Right rail</div>}
        rightRailTitle="View"
        rightRailPeek={<span>peek summary</span>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getAllByText('Right rail')).toHaveLength(2);
  });

  it('applies the sticky flex-none rail classes and flex-1 min-w-0 centre (flex-shell contract)', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
        rightRail={<div>Right rail</div>}
        rightRailPeek={<span>peek summary</span>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    const centre = screen.getByText('Centre').closest('main');
    expect(centre).toHaveClass('flex-1', 'min-w-0');

    const leftRail = screen.getByText('Scope panel').closest('div.md\\:w-\\[208px\\]');
    expect(leftRail).toHaveClass('flex-none', 'md:sticky', 'md:top-[56px]', 'md:overflow-y-auto');

    const rightRailEls = screen.getAllByText('Right rail');
    const inlineRightRail = rightRailEls[0].closest('div.lg\\:w-\\[280px\\]');
    expect(inlineRightRail).toHaveClass('lg:flex-none', 'md:sticky', 'md:top-[56px]', 'md:overflow-y-auto');
  });

  it('renders the floor background on the shell root', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getByText('Centre').closest('div.bg-muted')).toBeInTheDocument();
  });
});
