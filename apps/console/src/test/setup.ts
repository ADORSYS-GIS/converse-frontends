import '@testing-library/jest-dom/vitest';

// ADR 0017 (i18n). Importing this registers a real, English-resolved i18next instance as
// react-i18next's default, so a component test that renders console chrome without mounting
// `ConsoleI18nProvider` sees English copy rather than raw keys — see `english-t.ts`'s own doc
// comment for why a `(key) => key` stub was rejected.
import './english-t';
