// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Archive from './Archive';
import Play from './Play';

afterEach(() => vi.unstubAllGlobals());

const fetchReturns = (body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));

it('lists the manifest newest first', async () => {
  fetchReturns({
    puzzles: [
      { date: '2026-09-03', id: 'a1', difficulty: 'Medium' },
      { date: '2026-09-04', id: 'b2', difficulty: 'Hard' },
    ],
  });
  render(<Archive />);
  const links = await screen.findAllByRole('link');
  expect(links[0].textContent).toContain('2026-09-04');
  expect(links[0].getAttribute('href')).toBe('#/play/2026-09-04');
});

it('says so when the archive is empty rather than showing nothing', async () => {
  fetchReturns({ puzzles: [] });
  render(<Archive />);
  expect(await screen.findByText(/no puzzles yet/i)).toBeDefined();
});

it('says so when a puzzle file is malformed', async () => {
  fetchReturns({ formatVersion: 99 });
  render(<Play date="2026-09-04" />);
  expect((await screen.findByRole('alert')).textContent).toMatch(/could not be read/i);
});
