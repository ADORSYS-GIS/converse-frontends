import { afterEach } from 'vitest';

// Accessibility is a gate, not a panel (#443): every rendering test in this app is also an axe run
// over what it rendered, WCAG 2.1 AA, no assertion needed. Two things are load-bearing and both
// are explained in the sweep's own doc comment — `vitest.config.ts` must keep
// `sequence.hooks: 'list'`, and THIS module's `afterEach` must be the one handed over.
import { installA11ySweep } from '@lightbridge/ui-web/src/test/a11y-sweep';

installA11ySweep(afterEach);
