import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiKeysHygieneNotes } from './component';
import { apiKeysCleanHygiene, apiKeysHygiene } from './fixtures';

describe('ApiKeysHygieneNotes', () => {
  it('renders one line per non-zero count, singularising correctly', () => {
    render(<ApiKeysHygieneNotes hygiene={apiKeysHygiene} />);

    expect(screen.getByText('1 key expires in 6 days')).toBeInTheDocument();
    expect(screen.getByText('1 key never used since creation')).toBeInTheDocument();
    expect(screen.getByText('4 revoked keys retained for audit')).toBeInTheDocument();
  });

  it('renders nothing at all when every count is zero', () => {
    const { container } = render(<ApiKeysHygieneNotes hygiene={apiKeysCleanHygiene} />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
