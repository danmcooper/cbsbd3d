// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import SliceSwitches from './SliceSwitches';

it('opens with only the front slice on, and toggles each independently', async () => {
  const onChange = vi.fn();
  render(<SliceSwitches value={[true, false, false]} onChange={onChange} />);
  const [near, mid] = screen.getAllByRole('switch');
  expect(near.getAttribute('aria-checked')).toBe('true');
  await userEvent.click(mid);
  expect(onChange).toHaveBeenCalledWith([true, true, false]);
});

it('turning the last slice off is allowed, and says so', async () => {
  // An empty cube is a legal thing to ask for and reads as a bug unless the
  // frame admits it, so the readout is part of the control, not decoration.
  const onChange = vi.fn();
  render(<SliceSwitches value={[true, false, false]} onChange={onChange} />);
  await userEvent.click(screen.getAllByRole('switch')[0]);
  expect(onChange).toHaveBeenCalledWith([false, false, false]);
});

it('names which slices are showing', () => {
  render(<SliceSwitches value={[true, false, true]} onChange={() => {}} />);
  expect(screen.getByRole('status').textContent).toMatch(/1.*3/);
});
