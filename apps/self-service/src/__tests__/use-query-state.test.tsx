import React from 'react';
import { render } from '@testing-library/react-native';

const mockSetParams = jest.fn();
let mockParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams }),
}));

// Import from the dedicated subpath, not the package barrel: the barrel re-exports
// auth-session → @tanstack/react-db (ESM), which Jest can't parse.
import { useQueryState, type UseQueryStateResult } from '@lightbridge/hooks/use-query-state';

async function mount(key: string, options?: Parameters<typeof useQueryState>[1]) {
  const box: { current: UseQueryStateResult } = { current: undefined as never };
  function Probe() {
    box.current = useQueryState(key, options);
    return null;
  }
  await render(<Probe />);
  return box;
}

describe('useQueryState', () => {
  beforeEach(() => {
    mockParams = {};
    mockSetParams.mockClear();
  });

  it('reflects the current URL param value without a manual effect', async () => {
    mockParams = { accountId: 'acc-1' };
    const box = await mount('accountId');
    expect(box.current[0]).toBe('acc-1');
  });

  it('returns undefined when the param is absent and no default is given', async () => {
    const box = await mount('accountId');
    expect(box.current[0]).toBeUndefined();
  });

  it('falls back to the default value when the param is absent', async () => {
    const box = await mount('accountId', { defaultValue: 'fallback' });
    expect(box.current[0]).toBe('fallback');
  });

  it('takes the first entry when the param arrives as an array', async () => {
    mockParams = { accountId: ['acc-a', 'acc-b'] };
    const box = await mount('accountId');
    expect(box.current[0]).toBe('acc-a');
  });

  it('writes the value to the URL via router.setParams', async () => {
    const box = await mount('accountId');
    box.current[1]('acc-9');
    expect(mockSetParams).toHaveBeenCalledWith({ accountId: 'acc-9' });
  });

  it('removes the param from the URL when set to null', async () => {
    mockParams = { projectId: 'proj-1' };
    const box = await mount('projectId');
    box.current[1](null);
    expect(mockSetParams).toHaveBeenCalledWith({ projectId: undefined });
  });
});
