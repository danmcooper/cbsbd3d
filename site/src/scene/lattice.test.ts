import { expect, it } from 'vitest';
import { indexOfAddress } from '../../../shared/solver/lattice';
import { cellPosition, framingDistance } from './lattice';

it('places A1a near, high and left, and C3c far, low and right', () => {
  expect(cellPosition(indexOfAddress('A1a'), 3)).toEqual([-3, 3, 3]);
  expect(cellPosition(indexOfAddress('C3c'), 3)).toEqual([3, -3, -3]);
  expect(cellPosition(indexOfAddress('B2b'), 3)).toEqual([0, 0, 0]);
});

it('frames for the rotated diagonal, not just the square face', () => {
  const wide = framingDistance(45, 2, 3);
  const tall = framingDistance(45, 0.5, 3);
  expect(tall).toBeGreaterThan(wide);
  // a cube turned 45 degrees is 1.415x as wide, and framing must already allow for it
  expect(wide).toBeGreaterThan((3 * 1.5 + 1.35) / Math.tan(((45 / 2) * Math.PI) / 180));
});
