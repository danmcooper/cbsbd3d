import { expect, it } from 'vitest';
import { parseRoute } from './router';

it('routes a date to play and everything else to the archive', () => {
  expect(parseRoute('#/play/2026-09-04')).toEqual({ kind: 'play', date: '2026-09-04' });
  expect(parseRoute('#/')).toEqual({ kind: 'archive' });
  expect(parseRoute('#/play/nonsense')).toEqual({ kind: 'archive' });
});

it('rejects a date-shaped string that is not a date', () => {
  // The router is the only thing between a hand-typed address and a fetch, so
  // it checks the calendar rather than only the shape.
  expect(parseRoute('#/play/2026-13-01')).toEqual({ kind: 'archive' });
  expect(parseRoute('#/play/2026-02-30')).toEqual({ kind: 'archive' });
});
