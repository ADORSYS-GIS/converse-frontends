import React from 'react';
import { act, render } from '@testing-library/react-native';
// Import from the dedicated subpath, not the package barrel: the barrel re-exports
// auth-session → @tanstack/react-db (ESM), which Jest can't parse. usePagination is a
// pure hook with no such deps.
import { usePagination, type UsePaginationResult } from '@lightbridge/hooks/pagination';

// RNTL v14 on React 19 renders asynchronously, so we mount a probe component with
// `await render` and read the hook's latest value from a mutable box (renderHook's
// `result.current` doesn't survive act() updates under the concurrent renderer).
type Options = Parameters<typeof usePagination>[0];

async function mount(options?: Options) {
  const box: { current: UsePaginationResult } = { current: undefined as never };
  function Probe() {
    box.current = usePagination(options);
    return null;
  }
  await render(<Probe />);
  return box;
}

describe('usePagination', () => {
  it('starts on page 1 with a zero offset and no previous', async () => {
    const box = await mount({ pageSize: 10 });

    expect(box.current.page).toBe(1);
    expect(box.current.offset).toBe(0);
    expect(box.current.limit).toBe(10);
    expect(box.current.canPrev).toBe(false);
  });

  it('advances offset by pageSize on next()', async () => {
    const box = await mount({ pageSize: 10 });

    await act(async () => box.current.next());

    expect(box.current.page).toBe(2);
    expect(box.current.offset).toBe(10);
    expect(box.current.canPrev).toBe(true);
  });

  it('retreats on prev() and clamps at page 1', async () => {
    const box = await mount({ pageSize: 10 });

    await act(async () => box.current.next());
    await act(async () => box.current.next());
    expect(box.current.page).toBe(3);
    expect(box.current.offset).toBe(20);

    await act(async () => box.current.prev());
    expect(box.current.page).toBe(2);

    // Heading back to page 1; further prev() must not go below 1.
    await act(async () => box.current.prev());
    await act(async () => box.current.prev());
    expect(box.current.page).toBe(1);
    expect(box.current.offset).toBe(0);
    expect(box.current.canPrev).toBe(false);
  });

  it('reset() jumps back to page 1', async () => {
    const box = await mount({ pageSize: 10 });

    await act(async () => box.current.next());
    await act(async () => box.current.next());
    expect(box.current.page).toBe(3);

    await act(async () => box.current.reset());
    expect(box.current.page).toBe(1);
    expect(box.current.offset).toBe(0);
  });

  it('derives hasMore from whether the page came back full (length === pageSize)', async () => {
    const box = await mount({ pageSize: 10 });

    expect(box.current.hasMore(10)).toBe(true); // full page → maybe more
    expect(box.current.hasMore(9)).toBe(false); // partial page → last page
    expect(box.current.hasMore(0)).toBe(false); // empty → no more
  });

  it('honors a custom pageSize and initialPage', async () => {
    const box = await mount({ pageSize: 25, initialPage: 3 });

    expect(box.current.page).toBe(3);
    expect(box.current.limit).toBe(25);
    expect(box.current.offset).toBe(50); // (3 - 1) * 25
    expect(box.current.hasMore(25)).toBe(true);
    expect(box.current.hasMore(24)).toBe(false);
  });

  it('defaults to a page size of 10 when unspecified', async () => {
    const box = await mount();

    expect(box.current.limit).toBe(10);
    await act(async () => box.current.next());
    expect(box.current.offset).toBe(10);
  });
});
