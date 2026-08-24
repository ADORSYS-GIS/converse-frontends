import React, { type KeyboardEvent } from 'react';

import { cn } from '../../cn';
import type { BottomSheetProps } from './types';

// Contract: docs/design/console-redesign/README.md §4/§7 `BottomSheet` — the compact-tier
// (600–1024) dock for right-rail content (shell-compact.svg): fixed to the viewport bottom,
// `--surface` fill, drag-handle affordance, a collapsed peek row and an expanded state carrying
// the same children the right rail would show at `full`. No portal, no focus trap — Escape
// collapses it and the handle/header toggles it, which is all a docked (not overlay) sheet needs.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  peek,
  children,
  className,
}: BottomSheetProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      onOpenChange(false);
    }
  };

  return (
    <div
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label={open ? title : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 rounded-t-[2px] bg-surface',
        open ? 'max-h-[70vh]' : undefined,
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full flex-col items-center gap-2 py-2"
      >
        <span aria-hidden="true" className="h-[3px] w-8 rounded-[2px] bg-border" />
        {title ? (
          <span className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
            {title}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="max-h-[calc(70vh-40px)] overflow-y-auto px-4 pb-4">{children}</div>
      ) : peek ? (
        <div className="px-4 pb-3">{peek}</div>
      ) : null}
    </div>
  );
}
