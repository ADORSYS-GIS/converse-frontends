import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export type UseQueryStateOptions = {
  /** Value to fall back to when the param is absent from the URL. */
  defaultValue?: string;
};

export type UseQueryStateResult = [string | undefined, (next: string | null) => void];

/**
 * Read/write a single string query param through expo-router, so URL state and
 * component state stay in sync without a hand-rolled `useLocalSearchParams` +
 * `useState` + `useEffect` dance.
 *
 * Deliberately minimal (string params only): nuqs has no official Expo Router
 * adapter (https://github.com/47ng/nuqs/issues/837), and the call sites here need
 * a handful of string keys, not typed parsers/serializers.
 *
 * `setValue(null)` removes the param from the URL. Exported from the dedicated
 * `@lightbridge/hooks/use-query-state` subpath so it can be imported without
 * pulling the package barrel's `@tanstack/react-db` (ESM) chain.
 */
export function useQueryState(
  key: string,
  options: UseQueryStateOptions = {}
): UseQueryStateResult {
  const params = useLocalSearchParams();
  const router = useRouter();

  const raw = params[key];
  const current = Array.isArray(raw) ? raw[0] : raw;
  const value = (typeof current === 'string' ? current : undefined) ?? options.defaultValue;

  const setValue = useCallback(
    (next: string | null) => {
      // `undefined` drops the key from the URL; a string sets it. setParams
      // merges into the existing params, so other keys are preserved.
      router.setParams({ [key]: next ?? undefined });
    },
    [key, router]
  );

  return [value, setValue];
}
