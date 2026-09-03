import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';

// ADR 0017 (i18n). Importing this registers a real, English-resolved i18next instance as
// react-i18next's default, so a component test that renders console chrome without mounting
// `ConsoleI18nProvider` sees English copy rather than raw keys — see `english-t.ts`'s own doc
// comment for why a `(key) => key` stub was rejected.
import './english-t';

// Accessibility is a gate, not a panel (#443): every `.test.tsx` in this app is also an axe run
// over what it rendered, WCAG 2.1 AA, no assertion needed. Two things are load-bearing and both
// are explained in the sweep's own doc comment — `vitest.config.ts`'s `dom` project must keep
// `sequence.hooks: 'list'`, and THIS module's `afterEach` must be the one handed over.
import { installA11ySweep } from '@lightbridge/ui-web/src/test/a11y-sweep';

installA11ySweep(afterEach);
