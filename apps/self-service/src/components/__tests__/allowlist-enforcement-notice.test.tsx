import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { initI18n } from '@lightbridge/i18n';

// Exercise the web (localStorage) storage branch, so assertions can stay
// synchronous. The native (SecureStore) branch is covered by
// use-dismissible-notice.test.ts — this file is about the component's
// rendering/dismissal behavior, not the storage mechanism itself.
Platform.OS = 'web';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
(globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage() as unknown as Storage;

import { AllowlistEnforcementNotice } from '../allowlist-enforcement-notice';

const NOTICE_TEXT = /this allowlist is now enforced/;

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  localStorage.clear();
});

describe('AllowlistEnforcementNotice', () => {
  it('renders, showing the current allowlist, when the allowlist is non-empty', async () => {
    await render(
      <AllowlistEnforcementNotice projectId="proj-1" models={['gpt-4o', 'claude-sonnet-5']} />
    );

    expect(
      screen.getByText(
        'Heads up: this allowlist is now enforced. Calls to models not on this list will be rejected. Currently allowed: gpt-4o, claude-sonnet-5.'
      )
    ).toBeTruthy();
  });

  it('does not render when the allowlist is empty', async () => {
    await render(<AllowlistEnforcementNotice projectId="proj-1" models={[]} />);

    expect(screen.queryByText(NOTICE_TEXT)).toBeNull();
  });

  it('dismisses on press and does not reappear on a later mount for the same project', async () => {
    const first = await render(
      <AllowlistEnforcementNotice projectId="proj-1" models={['gpt-4o']} />
    );

    expect(screen.getByText(NOTICE_TEXT)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Got it'));

    expect(screen.queryByText(NOTICE_TEXT)).toBeNull();

    await act(async () => {
      first.unmount();
    });

    await render(<AllowlistEnforcementNotice projectId="proj-1" models={['gpt-4o']} />);
    expect(screen.queryByText(NOTICE_TEXT)).toBeNull();
  });

  it('dismissal is scoped per project — a different project still sees the notice', async () => {
    localStorage.setItem('lightbridge.notice.allowlist-enforced.proj-1', 'true');

    await render(<AllowlistEnforcementNotice projectId="proj-2" models={['gpt-4o']} />);

    expect(screen.getByText(NOTICE_TEXT)).toBeTruthy();
  });
});
