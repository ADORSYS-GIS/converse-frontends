import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SessionClaims } from '../lib/auth';
import { SettingsCentre } from './settings-centre';

function baseClaims(overrides: Partial<SessionClaims> = {}): SessionClaims {
  return {
    sub: 'user-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe('SettingsCentre', () => {
  it('renders a not-signed-in row when there are no claims, never a fabricated identity', () => {
    render(<SettingsCentre claims={null} perms={[]} />);

    expect(screen.getByText('Not signed in')).toBeInTheDocument();
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('renders the real signed-in identity from the claims', () => {
    render(
      <SettingsCentre
        claims={baseClaims({
          name: 'Dev User',
          email: 'dev@lightbridge.test',
          preferred_username: 'dev',
        })}
        perms={[]}
      />
    );

    expect(screen.getByText('Dev User')).toBeInTheDocument();
    expect(screen.getByText('dev@lightbridge.test')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
    expect(screen.getByText('user-123')).toBeInTheDocument();
  });

  it('renders "No permissions in your token" rather than an empty value when perms is empty', () => {
    render(<SettingsCentre claims={baseClaims()} perms={[]} />);

    expect(screen.getByText('No permissions in your token')).toBeInTheDocument();
  });

  it('renders the real granted permissions, comma-joined', () => {
    render(<SettingsCentre claims={baseClaims()} perms={['repo:read', 'repo:approve']} />);

    expect(screen.getByText('repo:read, repo:approve')).toBeInTheDocument();
  });
});
