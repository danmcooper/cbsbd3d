// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

it('names the game', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"puzzles":[]}', { status: 200 })));
  render(<App />);
  expect(await screen.findByRole('heading', { name: /cbsbd3d/i })).toBeDefined();
});
