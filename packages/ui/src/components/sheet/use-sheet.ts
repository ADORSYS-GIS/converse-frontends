import { createContext, useContext } from 'react';

import type { SheetApi } from './types';

export const SheetContext = createContext<SheetApi | null>(null);

/**
 * Access the imperative bottom-sheet API. Present a sheet from anywhere in the
 * tree without adding a route:
 *
 * ```tsx
 * const sheet = useSheet();
 * sheet.present(({ dismiss }) => <ConfirmView onCancel={dismiss} … />);
 * ```
 *
 * Must be called under a {@link SheetProvider}.
 */
export function useSheet(): SheetApi {
  const api = useContext(SheetContext);
  if (!api) {
    throw new Error('useSheet must be used within a <SheetProvider>.');
  }
  return api;
}
