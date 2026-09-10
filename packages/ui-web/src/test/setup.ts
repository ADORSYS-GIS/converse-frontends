import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';

import { installA11ySweep } from './a11y-sweep';

// Accessibility is a gate, not a panel (#443). Every render test in this package is also an axe
// run — see `a11y-sweep.ts` for what that checks, why `vitest.config.ts` must keep
// `sequence.hooks: 'list'`, and why `afterEach` is passed in rather than imported there.
installA11ySweep(afterEach);
