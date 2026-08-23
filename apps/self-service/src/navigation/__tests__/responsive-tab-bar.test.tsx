import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// `has` is swapped per-test via `mockHas` — declared as a `mock`-prefixed top-level function so
// babel-plugin-jest-hoist's scope check allows referencing it from inside `jest.mock()` (same
// pattern api-keys-screen.test.tsx uses for its own hook mocks).
let mockHasPermission = false;
function mockHas(permission: string) {
  return permission === 'budget:review' ? mockHasPermission : true;
}

jest.mock('@lightbridge/hooks', () => ({
  usePermissions: () => ({ has: (permission: string) => mockHas(permission) }),
}));

import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';
import { designTokens } from '@lightbridge/ui';

import { ResponsiveTabBar } from '../responsive-tab-bar';
import { tabRoutes } from '../tab-routes';

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

function buildTabBarProps() {
  const state = {
    index: 0,
    routes: tabRoutes.map((route) => ({ key: route.name, name: route.name })),
  } as any;
  const descriptors = Object.fromEntries(
    tabRoutes.map((route) => [route.name, { options: { title: route.titleKey } }])
  ) as any;
  const navigation = { navigate: jest.fn() } as any;
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  return { state, descriptors, navigation, insets };
}

beforeEach(() => {
  mockHasPermission = false;
});

describe('ResponsiveTabBar — Admin role gating (ADR 0008 Decision 4)', () => {
  it('does NOT render the Admin item for a caller without budget:review', async () => {
    mockHasPermission = false;
    setWidth(designTokens.breakpoint.full);

    await render(<ResponsiveTabBar {...buildTabBarProps()} />);

    expect(screen.queryByLabelText('nav.admin')).toBeNull();
    // Sanity: the other three spine items are still there — this is a filter, not a
    // rendering failure. A non-admin sees exactly three top-level items.
    expect(screen.getByLabelText('nav.home')).toBeTruthy();
    expect(screen.getByLabelText('nav.apiKeys')).toBeTruthy();
    expect(screen.getByLabelText('nav.manage')).toBeTruthy();
  });

  it('DOES render the Admin item for a caller with budget:review', async () => {
    mockHasPermission = true;
    setWidth(designTokens.breakpoint.full);

    await render(<ResponsiveTabBar {...buildTabBarProps()} />);

    expect(screen.getByLabelText('nav.admin')).toBeTruthy();
    // An admin sees all four top-level items.
    expect(screen.getByLabelText('nav.home')).toBeTruthy();
    expect(screen.getByLabelText('nav.apiKeys')).toBeTruthy();
    expect(screen.getByLabelText('nav.manage')).toBeTruthy();
  });
});

describe('ResponsiveTabBar — breakpoint ladder (ADR 0008 Decision 2/3)', () => {
  it('renders the left nav as a persistent floating panel at the full tier (≥1024)', async () => {
    setWidth(designTokens.breakpoint.full);

    await render(<ResponsiveTabBar {...buildTabBarProps()} />);

    expect(screen.getByTestId('shell-left-panel-floating')).toBeTruthy();
    expect(screen.queryByTestId('shell-bottom-nav')).toBeNull();
  });

  it('renders the left nav as a persistent floating panel at the compact tier (600..1024)', async () => {
    setWidth(700);

    await render(<ResponsiveTabBar {...buildTabBarProps()} />);

    expect(screen.getByTestId('shell-left-panel-floating')).toBeTruthy();
    expect(screen.queryByTestId('shell-bottom-nav')).toBeNull();
  });

  it('collapses the left nav to bottom navigation at the guardRail tier (<600) — no floating panel', async () => {
    setWidth(400);

    await render(<ResponsiveTabBar {...buildTabBarProps()} />);

    expect(screen.getByTestId('shell-bottom-nav')).toBeTruthy();
    expect(screen.queryByTestId('shell-left-panel-floating')).toBeNull();
  });
});
