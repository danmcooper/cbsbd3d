// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Person } from '../../../shared/puzzle';
import Accuse from './Accuse';

const person: Person = {
  name: 'Cleo',
  profession: 'cook',
  gender: 'female',
  criminal: false,
  clue: null,
  origHint: null,
  paths: null,
};

it('names the suspect and offers both verdicts', async () => {
  const onChoose = vi.fn();
  render(<Accuse person={person} onChoose={onChoose} onCancel={() => {}} />);
  expect(screen.getByText(/cleo the cook is/i)).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: /criminal/i }));
  expect(onChoose).toHaveBeenCalledWith('criminal');
});

it('offers a way out that is not a verdict', async () => {
  // The prompt covers part of the cube, so there has to be a way to dismiss it
  // that does not cost a mistake.
  const onCancel = vi.fn();
  const onChoose = vi.fn();
  render(<Accuse person={person} onChoose={onChoose} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
  expect(onCancel).toHaveBeenCalled();
  expect(onChoose).not.toHaveBeenCalled();
});
