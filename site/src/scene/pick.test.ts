import * as THREE from 'three';
import { beforeEach, expect, it } from 'vitest';
import { pickCell } from './pick';

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const raycaster = new THREE.Raycaster();
const centre = new THREE.Vector2(0, 0);

/** A cell standing at `z`, straight ahead of a camera looking down -z. */
function cellAt(i: number, z: number, visible = true) {
  const group = new THREE.Group();
  group.visible = visible;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.7));
  hit.userData.cell = i;
  group.add(hit);
  group.position.set(0, 0, z);
  group.updateMatrixWorld(true);
  return { i, hit, group };
}

beforeEach(() => {
  camera.position.set(0, 0, 20);
  camera.updateMatrixWorld(true);
});

it('returns the nearest visible cell', () => {
  const near = cellAt(4, 3);
  const far = cellAt(22, -3);
  expect(pickCell(raycaster, [far, near], centre, camera)).toBe(4);
});

it('ignores a hit on a hidden slice', () => {
  // A hidden slice is not on screen, so a tap through where it stands must
  // reach the cell behind it rather than selecting something invisible.
  const hiddenNear = cellAt(4, 3, false);
  const far = cellAt(22, -3);
  expect(pickCell(raycaster, [hiddenNear, far], centre, camera)).toBe(22);
});

it('returns null when the pointer is off the cube', () => {
  expect(pickCell(raycaster, [cellAt(4, 3)], new THREE.Vector2(0.99, 0.99), camera)).toBeNull();
});
