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

  it('renders the right rail inline at lg, and nothing else — no shell-owned sheet, no peek row (owner revision 2026-08-25: pages own compact-tier right-rail access via SectionSheet)', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }} rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    expect(screen.getAllByText('Right rail')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the inline right rail as lg:flex, hidden below lg', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }} rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>,
    );

    const rightRail = screen.getByText('Right rail').closest('div.lg\\:w-\\[280px\\]');
    expect(rightRail).toHaveClass('hidden', 'lg:flex');
  });

  it('applies the sticky flex-none rail classes and flex-1 min-w-0 centre (flex-shell contract)', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
        rightRail={<div>Right rail</div>}
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

  it('renders each rail as one flush surface column — no outer gutter on the row, hairlines instead of gaps between sections (console-ui skill "Rails are flush, aligned, full-height columns")', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
        rightRail={<div>Right rail</div>}
      >
        <div>Centre</div>
      </ConsoleShell>,
    );

    const leftRail = screen.getByText('Scope panel').closest('div.md\\:w-\\[208px\\]');
    expect(leftRail).toHaveClass('bg-surface', 'divide-y', 'divide-raised');
    expect(leftRail).not.toHaveClass('gap-2');

    const rightRailEls = screen.getAllByText('Right rail');
    const inlineRightRail = rightRailEls[0].closest('div.lg\\:w-\\[280px\\]');
    expect(inlineRightRail).toHaveClass('bg-surface', 'divide-y', 'divide-raised');

    // The row holding header/rails/centre carries no outer gutter of its own — only the centre
    // (`main`) is padded, so the rails sit edge-to-edge against the viewport sides.
    const row = screen.getByText('Centre').closest('main')?.parentElement;
    expect(row).not.toHaveClass('gap-6');
    expect(row).not.toHaveClass('px-4');
    expect(row).not.toHaveClass('py-6');

    const centre = screen.getByText('Centre').closest('main');
    expect(centre).toHaveClass('px-4', 'py-6', 'md:px-6');
  });
});
