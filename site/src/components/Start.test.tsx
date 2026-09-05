// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Puzzle } from '../../../shared/puzzle';
import Start, { formatDateOrdinal } from './Start';

const puzzle = { date: '2026-09-04', difficulty: 'Tricky' } as Puzzle;

it('bills the puzzle by date and difficulty', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const onStart = vi.fn();
  act(() => createRoot(host).render(<Start puzzle={puzzle} onStart={onStart} />));

  expect(host.textContent).toContain('Sep 4th 2026');
  expect(host.textContent).toContain('Tricky');

  act(() => host.querySelector<HTMLButtonElement>('.btn-start')!.click());
  expect(onStart).toHaveBeenCalled();
});

it('spells the ordinal the way English does', () => {
  expect(formatDateOrdinal('2026-09-01')).toBe('Sep 1st 2026');
  expect(formatDateOrdinal('2026-09-02')).toBe('Sep 2nd 2026');
  expect(formatDateOrdinal('2026-09-03')).toBe('Sep 3rd 2026');
  expect(formatDateOrdinal('2026-09-11')).toBe('Sep 11th 2026');
  expect(formatDateOrdinal('2026-09-21')).toBe('Sep 21st 2026');
});
