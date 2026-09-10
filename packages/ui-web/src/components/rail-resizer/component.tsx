import React, { useRef } from 'react';

import { cn } from '../../cn';
import type { RailResizerProps } from './types';

/** How many px one arrow-key press moves the rail — a comfortable, visible step without needing
 *  to hold the key down for a useful resize. */
const KEYBOARD_STEP = 16;

// The owner's locked layout contract (2026-08-30 restatement): "Right rail shall be there... and
// be resizable by drag." Base UI ships no window-splitter primitive (`@base-ui/react` has no
// `Splitter`/`Resizable` export as of this package's pinned version) — this is a legitimately
// bespoke component for exactly that reason (`scripts/base-ui-adoption.ts`'s `EXPECTED['rail-
// resizer'] = null`, alongside its own stated reason).
//
// The WAI-ARIA window-splitter pattern (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
// is the accessibility contract: `role="separator"`, `aria-orientation="vertical"` (it moves the
// boundary horizontally), `aria-valuenow`/`-min`/`-max` in px, and Left/Right arrow keys move the
// boundary — all present here rather than only the pointer-drag affordance a purely visual handle
// would ship.
//
// Dragging is a raw `pointermove`/`pointerup` listener pair on `document` rather than a `<input
// type="range">` in disguise: the handle's own hit area is a few px wide (a real slider control
// would be both the wrong shape and the wrong semantics — this boundary has no "value" outside the
// rail's own width), and pointer capture keeps the drag tracking even when the cursor leaves the
// handle's own bounding box mid-drag, which a plain `onMouseMove` on the handle itself would lose.
export function RailResizer({
  value,
  onChange,
  min,
  max,
  label = 'Resize inspector rail',
  className,
}: RailResizerProps) {
  // Not view state and not a dialog draft — a plain interaction-scoped ref for the in-flight drag,
  // read only inside the pointermove/pointerup handlers this effect-free component attaches
  // directly to `document` for the duration of one drag gesture.
  const dragStart = useRef<{ pointerX: number; startWidth: number } | null>(null);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Only the primary button/touch drags the boundary.
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragStart.current = { pointerX: event.clientX, startWidth: value };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = dragStart.current;
      if (!drag) return;
      // The rail sits on the TRAILING (right) edge of the shell, so dragging the handle LEFT
      // (a negative delta) widens it, and dragging RIGHT narrows it — the boundary moves opposite
      // to the pointer relative to which side of it the rail is on.
      const delta = drag.pointerX - moveEvent.clientX;
      onChange(clamp(drag.startWidth + delta));
    };

    const handlePointerUp = () => {
      dragStart.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(clamp(value + KEYBOARD_STEP));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(clamp(value - KEYBOARD_STEP));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(min);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(max);
    }
  };

  // A FOCUSABLE `role="separator"` is the ARIA window-splitter pattern: with `aria-valuenow`/
  // `-valuemin`/`-valuemax` present, `separator` is a widget role and MUST be in the tab order and
  // MUST answer arrow keys — both of which this does (`handleKeyDown`, Arrow/Home/End). jsx-a11y
  // treats `separator` as structural in every case, so it reports both the tabIndex and the
  // handlers; axe, which reads the valuenow trio, does not. A block disable rather than two
  // `-next-line`s because the two findings land on different lines of the same element (the
  // element's own line and the `tabIndex` attribute's), and a comment cannot sit inside a JSX
  // attribute list.
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className={cn('rail-resizer', className)}
    />
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}
