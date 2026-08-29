import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NavSpineItem } from '../nav-spine';
import { ConsoleShell } from './component';

const navItems: NavSpineItem[] = [{ key: 'overview', label: 'Overview', active: true }];

describe('ConsoleShell', () => {
  it('renders header and centre', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Centre')).toBeInTheDocument();
  });

  it('renders the nav twice — once as a rail, once as a bottom-bar — from one NavSpineProps', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getAllByRole('button', { name: 'Overview' })).toHaveLength(2);
  });

  it('renders the banner slot directly under the header when provided', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        banner={<div role="alert">Could not revoke the key.</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not revoke the key.');
  });

  it('renders no banner region at all when the slot is omitted', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render a left-secondary trigger or right rail when neither is provided', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.queryByRole('button', { name: /scope/i })).not.toBeInTheDocument();
  });

  it('renders leftSecondary inline in the rail, and again in its drawer once opened', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope">
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getAllByText('Scope panel')).toHaveLength(1);

    const trigger = screen.getByRole('button', { name: /scope/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Scope panel')).toHaveLength(2);
  });

  // The left-secondary drawer had the same two defects `SectionSheet` already fixed one tier up:
  // its `md:hidden` lived on a wrapper `<div>` that vaul's `Drawer.Portal` never renders into,
  // and nothing gated `open` by tier — so an invisible-but-fully-modal dialog could freeze
  // pointer events at `md`+ widths (Radix's unconditional `modal: true` puts `pointer-events:
  // none` on `<body>`).
  describe('left-secondary drawer tier gate', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      if (originalMatchMedia) {
        window.matchMedia = originalMatchMedia;
      } else {
        // @ts-expect-error - deliberately removing the mock to restore the pre-test state.
        delete window.matchMedia;
      }
    });

    function renderWithLeftSecondary() {
      return render(
        <ConsoleShell
          header={<div>Header</div>}
          nav={{ items: navItems }}
          leftSecondary={<div>Scope panel</div>}
          leftSecondaryLabel="Scope">
          <div>Centre</div>
        </ConsoleShell>
      );
    }

    it('carries md:hidden on vaul’s own overlay and content, not on a wrapper the portal skips', () => {
      renderWithLeftSecondary();
      fireEvent.click(screen.getByRole('button', { name: /scope/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('md:hidden');
      // The overlay is vaul's own sibling of the content inside the portal.
      const overlay = dialog.parentElement?.querySelector('[data-vaul-overlay]');
      expect(overlay).toHaveClass('md:hidden');
    });

    it('never opens the modal at md and up, even if the trigger is somehow activated', () => {
      // `matches: false` = NOT below md, i.e. the persistent left rail is showing.
      const mql = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      window.matchMedia = vi.fn().mockImplementation(() => mql);

      renderWithLeftSecondary();
      fireEvent.click(screen.getByRole('button', { name: /scope/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // Only the inline rail copy exists — no second, portaled one.
      expect(screen.getAllByText('Scope panel')).toHaveLength(1);
    });
  });

  it('renders the right rail inline at lg, and nothing else — no shell-owned sheet, no peek row (owner revision 2026-08-25: pages own compact-tier right-rail access via SectionSheet)', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    expect(screen.getAllByText('Right rail')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the inline right rail as lg:flex, hidden below lg', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
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
        rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const centre = screen.getByText('Centre').closest('main');
    expect(centre).toHaveClass('flex-1', 'min-w-0');

    const leftRail = screen.getByText('Scope panel').closest('div.md\\:w-\\[208px\\]');
    expect(leftRail).toHaveClass('flex-none', 'md:sticky', 'md:top-[56px]', 'md:overflow-y-auto');

    const rightRailEls = screen.getAllByText('Right rail');
    const inlineRightRail = rightRailEls[0].closest('div.lg\\:w-\\[280px\\]');
    expect(inlineRightRail).toHaveClass(
      'lg:flex-none',
      'md:sticky',
      'md:top-[56px]',
      'md:overflow-y-auto'
    );
  });

  it('renders the floor background on the shell root', () => {
    render(
      <ConsoleShell header={<div>Header</div>} nav={{ items: navItems }}>
        <div>Centre</div>
      </ConsoleShell>
    );

    // The floor fill is `shell-root`'s (theme.css) — the shell's own chrome, alongside the sticky
    // header stack and the mobile dock band, rather than four utilities on four elements.
    expect(screen.getByText('Centre').closest('div.shell-root')).toBeInTheDocument();
  });

  it('renders each rail as one flush surface column — no outer gutter on the row, hairlines instead of gaps between sections (console-ui skill "Rails are flush, aligned, full-height columns")', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
        rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
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

  it('gives both rails a min-height matching their sticky max-height, so short content still fills the column to the floor', () => {
    render(
      <ConsoleShell
        header={<div>Header</div>}
        nav={{ items: navItems }}
        leftSecondary={<div>Scope panel</div>}
        leftSecondaryLabel="Scope"
        rightRail={<div>Right rail</div>}>
        <div>Centre</div>
      </ConsoleShell>
    );

    const leftRail = screen.getByText('Scope panel').closest('div.md\\:w-\\[208px\\]');
    expect(leftRail).toHaveClass('md:min-h-[calc(100dvh-56px)]', 'md:max-h-[calc(100dvh-56px)]');

    const rightRailEls = screen.getAllByText('Right rail');
    const inlineRightRail = rightRailEls[0].closest('div.lg\\:w-\\[280px\\]');
    expect(inlineRightRail).toHaveClass(
      'md:min-h-[calc(100dvh-56px)]',
      'md:max-h-[calc(100dvh-56px)]'
    );
  });
});
