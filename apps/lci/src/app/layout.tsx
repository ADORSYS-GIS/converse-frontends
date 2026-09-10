import { CONSOLE_THEME_NO_FLASH_SCRIPT } from '@lightbridge/ui-web/src/lib/theme';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { LciServiceWorker } from '../client/serwist-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lightbridge Code Intelligence',
  description: 'Repository-aware code review and Q&A across Lightbridge repositories.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

/**
 * Root layout — same shape as `apps/console`'s (console-ui skill "Composition"). The console-wide
 * theme (`black`/`wireframe`) is a first-class preference here too, via the same shared
 * `packages/ui-web/src/lib/theme.ts` `apps/authz-ui` also consumes — one resolution order, no
 * per-app reimplementation.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <LciServiceWorker>
          <NuqsAdapter>{children}</NuqsAdapter>
        </LciServiceWorker>
      </body>
    </html>
  );
}
