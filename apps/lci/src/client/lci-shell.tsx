'use client';

import { CommandPalette } from '@lightbridge/ui-web/src/components/command-palette';
import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { useCommandPaletteShortcut } from '@lightbridge/ui-web/src/lib/use-command-palette-shortcut';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { LciSidebarContent, LciTopBarContent } from './lci-chrome';

/**
 * The persistent shell — mounted exactly once, wrapping every route in the app: sidebar, top bar,
 * and the command palette they both open. No detail rail yet, since no screen currently needs
 * row-selection detail alongside its list.
 *
 * A client component rendered BY `app/(lci)/layout.tsx` (a Server Component) with `userLabel` as
 * a prop — Next.js layouts only ever receive `{children}` from the router itself, so the session
 * read has to happen in the server layout and get handed down, not read here.
 */
export function LciShell({ children, userLabel }: { children: ReactNode; userLabel: string }) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteShortcut(setPaletteOpen);

  const openPalette = () => setPaletteOpen(true);
  const go = (href: string) => {
    setPaletteOpen(false);
    router.push(href);
  };

  return (
    <>
      <ConsoleShell
        sidebar={<LciSidebarContent userLabel={userLabel} onOpenPalette={openPalette} />}
        topBar={<LciTopBarContent onOpenPalette={openPalette} />}>
        {children}
      </ConsoleShell>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        label="Command menu"
        groups={[
          {
            key: 'navigate',
            heading: 'Navigate',
            items: [
              { key: 'overview', label: 'Overview', onSelect: () => go('/') },
              { key: 'repositories', label: 'Repositories', onSelect: () => go('/repositories') },
            ],
          },
          {
            key: 'actions',
            heading: 'Actions',
            items: [
              {
                key: 'sign-out',
                label: 'Sign out',
                onSelect: () => {
                  window.location.href = '/api/auth/logout';
                },
              },
            ],
          },
        ]}
      />
    </>
  );
}
