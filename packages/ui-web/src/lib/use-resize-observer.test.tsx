import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResizeObserver } from './use-resize-observer';

type ObserverCallback = (
  entries: Array<{ contentRect: { width: number; height: number } }>
) => void;

let observedCallback: ObserverCallback | null = null;
let disconnectSpy: ReturnType<typeof vi.fn>;

class FakeResizeObserver {
  constructor(callback: ObserverCallback) {
    observedCallback = callback;
  }
  observe() {}
  disconnect() {
    disconnectSpy();
  }
  unobserve() {}
}

function Probe() {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="probe">
      {size.width}x{size.height}
    </div>
  );
}

describe('useResizeObserver', () => {
  beforeEach(() => {
    observedCallback = null;
    disconnectSpy = vi.fn();
    // @ts-expect-error -- test double, narrower than the real ResizeObserver constructor shape.
    global.ResizeObserver = FakeResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error -- restoring the ambient global after each test.
    delete global.ResizeObserver;
  });

  it('starts at zero before any resize entry arrives', () => {
    render(<Probe />);

    expect(screen.getByTestId('probe')).toHaveTextContent('0x0');
  });

  it('updates size when the observer reports a content-rect change', () => {
    render(<Probe />);

    act(() => {
      observedCallback?.([{ contentRect: { width: 872, height: 176 } }]);
    });

    expect(screen.getByTestId('probe')).toHaveTextContent('872x176');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Probe />);
    unmount();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('never throws when ResizeObserver is unavailable', () => {
    // @ts-expect-error -- simulating older jsdom, which has no ResizeObserver at all.
    delete global.ResizeObserver;

    expect(() => render(<Probe />)).not.toThrow();
    expect(screen.getByTestId('probe')).toHaveTextContent('0x0');
  });
});
