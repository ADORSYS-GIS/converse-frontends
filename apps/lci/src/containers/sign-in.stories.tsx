// `/sign-in` — the unauthenticated landing, the one LCI screen rendered outside the `(lci)` shell
// group (same as `apps/console`'s `app/auth/*`).
//
// It imports the route module directly because the screen IS the route: it takes no props, holds
// no credentials, and its whole body is the product statement plus one link to
// `/api/auth/login`. Nothing to lift into a container, so nothing is lifted — the story reaches
// across instead. The story file lives here rather than beside `page.tsx` to keep `src/app/` free
// of anything Next's router might have to reason about.
import type { Meta, StoryObj } from '@storybook/react-vite';

import SignInPage from '../app/sign-in/page';

const meta = {
  title: 'Pages/LCI/SignIn',
  component: SignInPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SignInPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

export const Mobile: Story = { globals: { viewport: { value: 'base390' } } };
