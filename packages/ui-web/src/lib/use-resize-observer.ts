import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface ResizeObserverSize {
  width: number;
  height: number;
}

/**
 * Foundations hook backing the console-ui skill's "charts measure their container rather than
 * forcing a width" contract (packages/ui-web mobile-first + flex-shell pass). Attach `ref` to
 * the element whose content-box should be measured; `size` updates on every resize.
 *
 * Starts at `{ width: 0, height: 0 }` and stays there when `ResizeObserver` is unavailable
 * (older `jsdom` in unit tests never implements it) — callers should fall back to a static
 * dimension until `size.width`/`size.height` report something greater than zero, rather than
 * assume this hook alone is sufficient before first paint.
 */
export function useResizeObserver<T extends Element = HTMLDivElement>(): {
  ref: RefObject<T | null>;
  size: ResizeObserverSize;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ResizeObserverSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
