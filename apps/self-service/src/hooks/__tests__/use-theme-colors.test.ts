import { renderHook } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useColorScheme from 'react-native/Libraries/Utilities/useColorScheme';
import { useThemeColors } from '../use-theme-colors';

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('useThemeColors', () => {
  it('resolves the dark palette when the system scheme is dark', async () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useThemeColors());

    // ADR 0008 Decision 5 recalibration: dark `surface` (floating panels) is now `#191919`.
    expect(result.current.surface).toBe('rgb(25 25 25)');
    // console-redesign spec §2.1 refinement: dark `border` (`--line`) is now `#3a3a3a`.
    expect(result.current.border).toBe('rgb(58 58 58)');
  });

  it('resolves the light palette when the system scheme is light', async () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = await renderHook(() => useThemeColors());

    expect(result.current.surface).toBe('rgb(255 255 255)');
    expect(result.current.border).toBe('rgb(230 232 236)');
  });

  it('falls back to the light palette when the system scheme is unavailable', async () => {
    mockUseColorScheme.mockReturnValue(null);

    const { result } = await renderHook(() => useThemeColors());

    expect(result.current.surface).toBe('rgb(255 255 255)');
  });
});
