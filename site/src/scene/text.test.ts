import * as THREE from 'three';
import { expect, it } from 'vitest';
import { fitScale, uniformClueScale } from './text';

const box = (w: number, h: number) =>
  new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(w, h, 0));

it('fits to whichever dimension binds', () => {
  expect(fitScale(box(4, 1), 2, 1)).toBeCloseTo(0.5); // width binds
  expect(fitScale(box(1, 4), 2, 1)).toBeCloseTo(0.25); // height binds
});

it('gives every clue the tightest fit on the board, so no clue reads smaller', () => {
  expect(uniformClueScale([0.9, 0.4, 0.7])).toBeCloseTo(0.4);
});

it('falls back to 1 when nothing needs fitting', () => {
  expect(uniformClueScale([])).toBe(1);
});

it('does not divide by a zero-width box', () => {
  // An empty string measures as a zero box, and a cell whose name failed to
  // build should stay small rather than become an infinity.
  expect(Number.isFinite(fitScale(box(0, 0), 2, 1))).toBe(true);
});
