import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { NavContainer } from '../nav-container';
import { NavItem } from './component';

// A neutral placeholder for the icon slot. The app passes Ionicons here; the story
// only needs to show that the slot is filled and how it sits next to the label.
function GlyphIcon({ active }: Readonly<{ active?: boolean }>) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: active ? '#7c3aed' : '#9ca3af',
      }}
    />
  );
}

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
  args: { placement: 'bottom', active: true, icon: <GlyphIcon active /> },
};
export const BottomInactive: Story = {
  args: { placement: 'bottom', active: false, icon: <GlyphIcon /> },
};

export const SidebarBar: Story = {
  name: 'Sidebar (in NavContainer)',
  render: () => (
    <NavContainer placement="sidebar" style={{ position: 'relative', height: 240 }}>
      <NavItem placement="sidebar" label="Home" active icon={<GlyphIcon active />} />
      <NavItem placement="sidebar" label="Keys" icon={<GlyphIcon />} />
      <NavItem placement="sidebar" label="Settings" icon={<GlyphIcon />} />
    </NavContainer>
  ),
};

export const BottomBar: Story = {
  name: 'Bottom (in NavContainer)',
  render: () => (
    <NavContainer placement="bottom">
      <NavItem placement="bottom" label="Home" active icon={<GlyphIcon active />} />
      <NavItem placement="bottom" label="Keys" icon={<GlyphIcon />} />
      <NavItem placement="bottom" label="Settings" icon={<GlyphIcon />} />
    </NavContainer>
  ),
};
