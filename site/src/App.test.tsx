// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('names the game', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /cbsbd3d/i })).toBeDefined();
});
