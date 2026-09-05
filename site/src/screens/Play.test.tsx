// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { validatePuzzle } from '../../../shared/puzzle';
import { Board } from './Play';

const puzzle = validatePuzzle(
  JSON.parse(readFileSync(path.join(process.cwd(), 'puzzles/2026-09-04.json'), 'utf8')),
);

afterEach(() => localStorage.clear());

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Board puzzle={puzzle} />));
  return host;
}

const button = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === label);

it('asks before throwing a game away', () => {
  const host = mount();
  act(() => button(host, 'reset')!.click());
  expect(button(host, 'start over?')).toBeDefined();

  act(() => button(host, 'keep')!.click());
  expect(button(host, 'start over?')).toBeUndefined();
  expect(button(host, 'reset')).toBeDefined();
});

it('puts the board back to its opening when the reset is confirmed', () => {
  // A game in progress, saved as the real one would be.
  localStorage.setItem(
    `cbsbd3d:game:${puzzle.id}`,
    JSON.stringify({
      flipped: [...puzzle.initialReveals, 0, 1],
      mistakes: [4, 5, 6],
      muted: [0],
      startedAt: 1000,
    }),
  );
  const host = mount();
  expect(host.textContent).toContain('3 wrong');

  act(() => button(host, 'reset')!.click());
  act(() => button(host, 'start over?')!.click());
  expect(host.textContent).toContain('0 wrong');
  expect(host.textContent).toContain(`${puzzle.initialReveals.length}/27`);
});
