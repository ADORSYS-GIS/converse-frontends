import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pagination } from '@lightbridge/ui';

async function setup(overrides: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onNext = jest.fn();
  const onPrev = jest.fn();
  await render(
    <Pagination
      page={2}
      canPrev
      hasMore
      onNext={onNext}
      onPrev={onPrev}
      pageLabel="Page"
      previousLabel="Previous"
      nextLabel="Next"
      {...overrides}
    />,
  );
  return { onNext, onPrev };
}

describe('Pagination', () => {
  it('renders the page label with the current page number', async () => {
    await setup({ page: 3 });
    expect(screen.getByText('Page 3')).toBeTruthy();
    expect(screen.getByText('Previous')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('calls onNext / onPrev when the controls are enabled', async () => {
    const { onNext, onPrev } = await setup({ canPrev: true, hasMore: true });

    await fireEvent.press(screen.getByLabelText('Next'));
    await fireEvent.press(screen.getByLabelText('Previous'));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('disables Previous on the first page', async () => {
    const { onPrev } = await setup({ page: 1, canPrev: false, hasMore: true });

    const prev = screen.getByLabelText('Previous');
    expect(prev.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(prev);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('disables Next when there is no next page', async () => {
    const { onNext } = await setup({ canPrev: true, hasMore: false });

    const next = screen.getByLabelText('Next');
    expect(next.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(next);
    expect(onNext).not.toHaveBeenCalled();
  });
});
