import { expect, it } from 'vitest';
import { applyDrag, applyZoom, INITIAL_VIEW } from './controls';

it('turns the cube sideways and slides the viewer vertically, without tilting', () => {
  const v = applyDrag({ ry: 0, camY: 0, zoom: 1 }, 100, 50);
  expect(v.ry).toBeCloseTo(0.6);
  expect(v.camY).toBeCloseTo(1);
  expect(v).not.toHaveProperty('rx');
});

it("holds the viewer inside the cube's height", () => {
  expect(applyDrag({ ry: 0, camY: 0, zoom: 1 }, 0, 10000).camY).toBe(6);
  expect(applyDrag({ ry: 0, camY: 0, zoom: 1 }, 0, -10000).camY).toBe(-6);
});

it('clamps zoom at both ends', () => {
  expect(applyZoom({ ry: 0, camY: 0, zoom: 1 }, 0.01).zoom).toBe(0.45);
  expect(applyZoom({ ry: 0, camY: 0, zoom: 1 }, 100).zoom).toBe(1.7);
});

it('opens square on to the front slice', () => {
  expect(INITIAL_VIEW).toEqual({ ry: 0, camY: 0, zoom: 1 });
});
