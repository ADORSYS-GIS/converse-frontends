import type React from 'react';
import { Route, Routes } from 'react-router';

import { DeviceConfirmRoute } from './routes/device-confirm';
import { DeviceEntryRoute } from './routes/device-entry';
import { DeviceSuccessRoute } from './routes/device-success';
import { ErrorRoute } from './routes/error-route';
import { PlaceholderPage } from './routes/placeholder-page';
import { ROUTE_PATHS, type RoutePath } from './routes/route-table';

// Keyed by RoutePath, so a path added to `route-table.ts` without an element here is a TYPE
// error, not a blank screen. This is the in-sync mechanism; `route-table.test.ts` re-asserts it
// at runtime for the reverse direction (an element with no path). Exported (not module-private)
// so that runtime test can inspect it directly rather than re-deriving it.
export const ELEMENTS: Record<RoutePath, React.ReactElement> = {
  '/': <PlaceholderPage />,
  '/device': <DeviceEntryRoute />,
  '/device/invalid': <DeviceEntryRoute invalidCode />,
  '/device/confirm': <DeviceConfirmRoute />,
  '/device/success': <DeviceSuccessRoute />,
  '/error': <ErrorRoute />,
};

// NO `<Route path="*">`. The server is the 404 now (lightbridge-authz#598): authz-idp only
// serves index.html for the paths in dist/routes.json, so an unknown /ui path never reaches
// this router at all. A catch-all here would be dead code that masks a manifest bug in
// `vite dev` — where there IS no server allowlist — and hide it until production.
export function App() {
  return (
    <Routes>
      {ROUTE_PATHS.map((path) => (
        <Route key={path} path={path} element={ELEMENTS[path]} />
      ))}
    </Routes>
  );
}
