import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { NavContainer } from '../nav-container';
import { NavItem } from './component';

const meta: Meta<typeof NavItem> = {
  title: 'UI/NavItem',
  component: NavItem,
  args: {
    label: 'Home',
  },
};

export default meta;
type Story = StoryObj<typeof NavItem>;

export const BottomActive: Story = {
  args: { placement: 'bottom', active: true },
};
export const BottomInactive: Story = {
  args: { placement: 'bottom', active: false },
};

export const SidebarBar: Story = {
  name: 'Sidebar (in NavContainer)',
  render: () => (
    <NavContainer placement="sidebar" style={{ position: 'relative', height: 240 }}>
      <NavItem placement="sidebar" label="Home" active />
      <NavItem placement="sidebar" label="Keys" />
      <NavItem placement="sidebar" label="Settings" />
    </NavContainer>
  ),
};

export const BottomBar: Story = {
  name: 'Bottom (in NavContainer)',
  render: () => (
    <NavContainer placement="bottom">
      <NavItem placement="bottom" label="Home" active />
      <NavItem placement="bottom" label="Keys" />
      <NavItem placement="bottom" label="Settings" />
    </NavContainer>
  ),
};
