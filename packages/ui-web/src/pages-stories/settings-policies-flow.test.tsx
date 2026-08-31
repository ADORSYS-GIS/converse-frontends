import React from 'react';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react-vite';
import { describe, expect, it } from 'vitest';

import * as stories from './settings.stories';

/**
 * Runs the `/settings/policies` ("Project policies") page's project-rename `play` function for
 * real.
 *
 * `build-storybook` compiles stories; it does not execute them, so a `play` function that no
 * longer finds its own controls builds green and only fails in front of a human. `composeStories`
 * mounts the same story the browser would and lets vitest drive it — which is what makes
 * "verifiable in Storybook" a CI property rather than a manual one.
 *
 * IA v3 phase E ("the settings/accounts move") narrowed this file's scope: it used to be named
 * `settings-account-flow.test.tsx` and also covered the account create/rename flow, back when
 * `/settings/policies` still hosted `AccountSettings`. That coverage moved to
 * `settings-accounts-flow.test.tsx` along with the section itself; what stays here is the ONE
 * flow this page still legitimately owns — renaming a project from its own detail sheet.
 */
const { RenameProjectFlow } = composeStories(stories);

describe('SETTINGS/POLICIES — project rename stories', () => {
  it('drives the rename flow from the row that was pressed', async () => {
    const { container } = render(<RenameProjectFlow />);
    if (!RenameProjectFlow.play) throw new Error('RenameProjectFlow has no play function.');
    await RenameProjectFlow.play({ canvasElement: container });
  }, 30000);
});
