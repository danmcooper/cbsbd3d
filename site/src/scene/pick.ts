import * as THREE from 'three';

export interface Pickable {
  i: number;
  /** The invisible box that stands in for the cell. */
  hit: THREE.Object3D;
  /** The cell's group, whose `visible` says whether its slice is on screen. */
  group: THREE.Object3D;
}

/**
 * The cell under the pointer, or null.
 *
 * Hidden slices are not merely skipped for tidiness: a tap through the gap
 * where a hidden cell stands must reach whatever is behind it, so the ray is
 * filtered before nearest-first is taken, not after.
 */
export function pickCell(
  raycaster: THREE.Raycaster,
  cells: Pickable[],
  pointer: THREE.Vector2,
  camera: THREE.Camera,
): number | null {
  raycaster.setFromCamera(pointer, camera);
  const visible = cells.filter((c) => c.group.visible);
  const hits = raycaster.intersectObjects(
    visible.map((c) => c.hit),
    false,
  );
  const first = hits[0]?.object.userData.cell;
  return typeof first === 'number' ? first : null;
}
