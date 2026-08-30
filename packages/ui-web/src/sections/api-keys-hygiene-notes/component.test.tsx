import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiKeysHygieneNotes } from './component';
import { apiKeysCleanHygiene, apiKeysHygiene } from './fixtures';
import type { ApiKeysHygiene } from './types';

describe('ApiKeysHygieneNotes', () => {
  it('renders one line per non-zero count, singularising correctly', () => {
    render(<ApiKeysHygieneNotes hygiene={apiKeysHygiene} />);

    expect(screen.getByText('1 key expires in 6 days')).toBeInTheDocument();
    expect(screen.getByText('1 key never used since creation')).toBeInTheDocument();
    expect(screen.getByText('4 revoked keys retained for audit')).toBeInTheDocument();
  });

  it('pluralises both the noun and the verb for more than one expiring key', () => {
    // Live findings #3 (2026-08-30): this used to render "2 keys expires in 30 days" — the noun
    // pluralised, the verb did not.
    const twoExpiring: ApiKeysHygiene = {
      ...apiKeysHygiene,
      expiringCount: 2,
      expiringInDays: 30,
    };
    render(<ApiKeysHygieneNotes hygiene={twoExpiring} />);

    expect(screen.getByText('2 keys expire in 30 days')).toBeInTheDocument();
    expect(screen.queryByText(/expires in 30 days/)).not.toBeInTheDocument();
  });

  it('renders nothing at all when every count is zero', () => {
    const { container } = render(<ApiKeysHygieneNotes hygiene={apiKeysCleanHygiene} />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
