import React from 'react';

import { cn } from '../../cn';
import { BANNER_STICKY_CLASS, CONTENT_MAX_WIDTH_CLASS, SHELL_CENTRE_CLASS } from '../../lib/shell-grid';
import type { ConsoleShellProps } from './types';

// Shell brief (2026-08-30) — the three-rail, header-band shell (ADR 0008 Decision 3's original
// reading) is dead. The shape is now two columns: a persistent `sidebar` at `md`+, and a single
// stretching content column. Below `md` the sidebar is replaced by `topBar` plus the bottom
// navigation dock (which `sidebar` — a `ConsoleSidebar` — renders itself; this component knows
// nothing about nav data at all any more).
//
// PRIMITIVES.md's `console-shell` row is NO UPSTREAM: daisy's drawer is a CSS-grid sidebar and is
// explicitly rejected — a grid sidebar cannot be sticky, independently scrollable and flush at
// once. Every class here is therefore a hand-written utility by necessity, and every one of them
// lives in `lib/shell-grid.ts` beside `lib/rail-grid.ts`, annotated with the clause that requires
// it, rather than being retyped here.
//
//  - **Two columns, centre-only stretch**: `shell-root` is a flex row at `md`+ (column below it,
//    where the sidebar renders `hidden`); the sidebar is fixed-width and non-flexing, the content
//    column is the only stretching zone (`SHELL_CENTRE_CLASS`'s `min-w-0 flex-1`, the mandatory
//    min-width reset). No page-level horizontal overflow at any tier.
//  - **The sidebar owns its own stickiness and scroll** (`SIDEBAR_CLASS`, inside `ConsoleSidebar`)
//    — this component places it and adds nothing.
//  - **The banner sits at the top of the content column, sticky under whatever chrome is above it
//    at each tier** (`BANNER_STICKY_CLASS`: `top-12` below `md`, under the top bar; `top-0` at
//    `md`+, where there is no chrome above the content column at all).
//  - **A capped reading measure** (`CONTENT_MAX_WIDTH_CLASS`) wraps the banner and `children`
//    together, so a message always lines up with the content it is about.
export function ConsoleShell({ sidebar, topBar, banner, children, className }: ConsoleShellProps) {
  return (
    <div className={cn('shell-root', className)}>
      {sidebar}

      <div className="shell-content-column">
        {topBar}

        <main className={SHELL_CENTRE_CLASS}>
          <div className={CONTENT_MAX_WIDTH_CLASS}>
            {banner ? <div className={BANNER_STICKY_CLASS}>{banner}</div> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
