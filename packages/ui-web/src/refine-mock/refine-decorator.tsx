// Storybook decorator mounting `<Refine>` over the mock data provider — console-ui skill
// "Refine-driven mock screens". No router: `apps/console` owns real routing (App Router); this
// harness only needs to prove the data-hook wiring, so `syncWithLocation` stays `false` and no
// `routerProvider` is passed, matching the skill's "no router" rule for this harness.

import React, { useMemo, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { Refine, type ResourceProps } from '@refinedev/core';

import { createMockDataProvider, type MockDataProviderConfig } from './mock-data-provider';

const RESOURCES: ResourceProps[] = [
  { name: 'projects' },
  { name: 'accounts' },
  { name: 'api-keys' },
  { name: 'refill-requests' },
  { name: 'decisions' },
];

export interface RefineMockRootProps {
  children: ReactNode;
  /** Latency/error-mode configuration for this mount's mock data provider. */
  providerConfig?: MockDataProviderConfig;
}

/** Mounts `<Refine>` (mock data provider, no router, no telemetry) around `children`. Each mount
 * gets its own `QueryClient` and its own in-memory data-provider store, so stories/tests never
 * leak mutated state into one another. Retries are disabled — `<Refine>` always builds its own
 * internal `QueryClient` from `options.reactQuery.clientConfig` (ignoring any ambient
 * `QueryClientProvider`) unless that config is already a `QueryClient` instance, so this is the
 * only place retry behaviour can be turned off for these hooks. Without it, an error-mode story's
 * rejected call would retry with backoff for several seconds before `isError` ever turns true. */
export function RefineMockRoot({ children, providerConfig }: RefineMockRootProps) {
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } }),
    [],
  );
  const dataProvider = useMemo(() => createMockDataProvider(providerConfig), [providerConfig]);

  return (
    <Refine
      dataProvider={dataProvider}
      resources={RESOURCES}
      options={{ syncWithLocation: false, disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
    >
      {children}
    </Refine>
  );
}

/** A Storybook `Decorator` factory — pass per-story provider config (e.g. an error-mode story's
 * `errorResources`) so each story in `Refine/*` gets exactly the mock backend it needs. Usage:
 * `{ decorators: [withRefineMock({ latencyMs: [300, 600] })] }`. */
export function withRefineMock(providerConfig?: MockDataProviderConfig) {
  return function RefineMockDecorator(Story: React.ComponentType) {
    return (
      <RefineMockRoot providerConfig={providerConfig}>
        <Story />
      </RefineMockRoot>
    );
  };
}
