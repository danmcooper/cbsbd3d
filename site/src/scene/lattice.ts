import { xOf, yOf, zOf } from '../../../shared/solver/lattice';

/** World-space centre of cell `i`. x runs right, y up, z toward the viewer. */
export const cellPosition = (i: number, gap: number): [number, number, number] => [
  (xOf(i) - 1) * gap,
  (1 - yOf(i)) * gap,
  (1 - zOf(i)) * gap,
];

/**
 * Turning only happens about y, so the cube stays as tall as it is but grows to
 * its diagonal sideways. Frame for both, so nothing clips mid-rotation.
 */
export function framingDistance(fov: number, aspect: number, gap: number): number {
  const rv = gap * 1.5 + 1.35;
  const rh = gap * 1.5 * 1.415 + 1.35;
  const v = Math.tan((fov / 2) * (Math.PI / 180));
  return Math.max(rv / v, rh / (v * aspect)) * 1.04;
}
