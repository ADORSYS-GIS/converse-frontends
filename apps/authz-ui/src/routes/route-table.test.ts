import { describe, expect, it } from 'vitest';

import { ELEMENTS } from '../app';
import { ROUTE_PATHS } from './route-table';

// The reverse of `app.tsx`'s type-level check. `Record<RoutePath, React.ReactElement>` catches a
// route MISSING an element (an unmapped `RoutePath` key) as a `tsc` error, but nothing at the
// type level stops `ELEMENTS` itself from silently growing an entry `route-table.ts` and
// `vite.config.ts`'s manifest emitter never learn about -- a route with no path is dead code at
// best, and a maintenance trap if `ROUTE_PATHS` is ever built by anything other than a literal
// array. This test closes that direction at runtime, exactly as `app.tsx`'s own comment says it
// does.
describe('ELEMENTS <-> ROUTE_PATHS', () => {
  it('covers exactly ROUTE_PATHS -- no missing key, no extra key', () => {
    const elementKeys = Object.keys(ELEMENTS).sort();
    const routeKeys = [...ROUTE_PATHS].sort();

    expect(elementKeys).toEqual(routeKeys);
  });
});
