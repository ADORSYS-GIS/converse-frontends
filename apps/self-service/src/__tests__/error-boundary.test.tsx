import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorBoundary } from '../components/error-boundary';

// A render-time throw, gated by a mutable ref rather than a prop, so a test
// can flip it and have the *next* render behave differently without needing
// React Testing Library's `rerender` (which wouldn't help here anyway: the
// element identity inside <ErrorBoundary> doesn't change across a retry, only
// what it does when it renders).
function Bomb({ shouldThrow }: Readonly<{ shouldThrow: { current: boolean } }>) {
  if (shouldThrow.current) {
    throw new Error('boom: bomb detonated');
  }
  return <Text>bomb defused</Text>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('catches a render-time throw and renders the fallback instead of crashing', async () => {
    const shouldThrow = { current: true };

    await render(
      <ErrorBoundary fallback={({ error }) => <Text>caught: {error.message}</Text>}>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(screen.getByText('caught: boom: bomb detonated')).toBeTruthy();
    expect(screen.queryByText('bomb defused')).toBeNull();
  });

  // Proves the boundary never becomes the silent swallower it's explicitly
  // forbidden from being (see the component's own doc comment, and issue
  // #180 -- the crash this exists for was only diagnosable because it hit the
  // console with a real stack). If a future refactor drops the console.error
  // call, this test is what should catch it.
  it('reports the caught error and its component stack to the console', async () => {
    const shouldThrow = { current: true };

    await render(
      <ErrorBoundary fallback={() => <Text>fallback</Text>}>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const boundaryLogCall = consoleErrorSpy.mock.calls.find(
      (call) => call[0] === '[ErrorBoundary] Caught a render error:'
    );

    expect(boundaryLogCall).toBeDefined();
    expect(boundaryLogCall?.[1]).toBeInstanceOf(Error);
    expect((boundaryLogCall?.[1] as Error).message).toBe('boom: bomb detonated');
    // Not asserting on the exact frame names inside the stack: this Jest/Node
    // environment's synthesized `componentStack` names frames after whatever
    // identifier the throw site happens to read (verified by hand -- renaming
    // the test's prop changes the frame name that comes out), not off
    // `Bomb.name`, so pinning to "contains 'Bomb'" would be asserting on a
    // test-harness artifact rather than boundary behavior. What's actually
    // load-bearing is that a real, non-empty, multi-frame stack came through.
    expect(typeof boundaryLogCall?.[2]).toBe('string');
    const componentStack = boundaryLogCall?.[2] as string;
    expect(componentStack.length).toBeGreaterThan(0);
    expect(componentStack).toContain('ErrorBoundary');
  });

  it('also forwards the caught error to onError, for callers that want to assert on it', async () => {
    const shouldThrow = { current: true };
    const onError = jest.fn();

    await render(
      <ErrorBoundary onError={onError} fallback={() => <Text>fallback</Text>}>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [error, componentStack] = onError.mock.calls[0] as [Error, string | null];
    expect(error.message).toBe('boom: bomb detonated');
    expect(componentStack).toContain('ErrorBoundary');
  });

  it('lets the user recover: pressing retry remounts children once the failure clears', async () => {
    const shouldThrow = { current: true };

    await render(
      <ErrorBoundary fallback={({ onRetry }) => <Text onPress={onRetry}>retry</Text>}>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(screen.getByText('retry')).toBeTruthy();

    shouldThrow.current = false;
    await fireEvent.press(screen.getByText('retry'));

    expect(screen.getByText('bomb defused')).toBeTruthy();
    expect(screen.queryByText('retry')).toBeNull();
  });

  it('scopes the crash: content outside the boundary keeps working', async () => {
    const shouldThrow = { current: true };

    await render(
      <>
        <ErrorBoundary fallback={() => <Text>this screen crashed</Text>}>
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
        <Text>sibling screen is fine</Text>
      </>
    );

    expect(screen.getByText('this screen crashed')).toBeTruthy();
    expect(screen.getByText('sibling screen is fine')).toBeTruthy();
  });
});
