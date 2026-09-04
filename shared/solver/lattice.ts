/**
 * The board: 27 suspects in a 3x3x3 cube.
 *
 * A cell is `(x, y, z)` with a flat index `i = z*9 + y*3 + x`, so index order
 * runs left to right, then top to bottom, then front to back — the order the
 * cast is dealt in. `x` renders A-C, `y` renders 1-3, `z` renders a-c, and an
 * address is the three of them run together: A1a near top left, B2b the core,
 * C3c far bottom right.
 *
 * This file is where the 2D game's `grid.ts` used to be. Everything above it in
 * the solver works on member index lists and never asks how many axes there
 * are, which is why the cube reaches the SAT core through this module alone.
 */

export interface Lattice {
  size: 27;
}

export const LATTICE: Lattice = { size: 27 };

/** A step of one cell along one axis. Only the six unit vectors are ever used. */
export type Dir = readonly [number, number, number];

export const DIRS = {
  up: [0, -1, 0],
  down: [0, 1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  front: [0, 0, -1],
  behind: [0, 0, 1],
} as const satisfies Record<string, Dir>;

export type DirName = keyof typeof DIRS;

export const xOf = (i: number): number => i % 3;
export const yOf = (i: number): number => Math.floor(i / 3) % 3;
export const zOf = (i: number): number => Math.floor(i / 9);
export const indexOf = (x: number, y: number, z: number): number => z * 9 + y * 3 + x;

export class AddressError extends Error {}

export function addressOf(i: number): string {
  return `${'ABC'[xOf(i)]}${yOf(i) + 1}${'abc'[zOf(i)]}`;
}

export function indexOfAddress(a: string): number {
  const x = 'ABC'.indexOf(a[0]);
  const y = Number(a[1]) - 1;
  const z = 'abc'.indexOf(a[2]);
  if (a.length !== 3 || x < 0 || z < 0 || !Number.isInteger(y) || y < 0 || y > 2) {
    throw new AddressError(`bad address: ${a}`);
  }
  return indexOf(x, y, z);
}

export function offsetIndex(g: Lattice, i: number, d: Dir): number | null {
  const x = xOf(i) + d[0];
  const y = yOf(i) + d[1];
  const z = zOf(i) + d[2];
  if (x < 0 || x > 2 || y < 0 || y > 2 || z < 0 || z > 2) return null;
  return indexOf(x, y, z);
}

/** n is 1-based, as in the 2D game. Every slab holds nine cells. */
export function rowMembers(g: Lattice, n: number): number[] {
  const y = n - 1;
  const out: number[] = [];
  for (let z = 0; z < 3; z++) for (let x = 0; x < 3; x++) out.push(indexOf(x, y, z));
  return out.sort((a, b) => a - b);
}

/** n is 1-based: column 1 is A. */
export function colMembers(g: Lattice, n: number): number[] {
  const x = n - 1;
  const out: number[] = [];
  for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) out.push(indexOf(x, y, z));
  return out.sort((a, b) => a - b);
}

/** n is 1-based: slice 1 is a, the front. */
export function sliceMembers(g: Lattice, n: number): number[] {
  const z = n - 1;
  const out: number[] = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) out.push(indexOf(x, y, z));
  return out.sort((a, b) => a - b);
}

/**
 * Everyone past `i` in direction `d`, whole slabs at a time: 18, 9 or none.
 *
 * "Above me" is every cell in the rows above, whatever their column or depth —
 * not the one cell directly overhead, which is what `offsetIndex` is for.
 */
export function reachMembers(g: Lattice, i: number, d: Dir): number[] {
  const step = d[0] || d[1] || d[2];
  const from = d[0] !== 0 ? xOf(i) : d[1] !== 0 ? yOf(i) : zOf(i);
  const slab = d[0] !== 0 ? colMembers : d[1] !== 0 ? rowMembers : sliceMembers;
  const out: number[] = [];
  for (let n = from + step; n >= 0 && n <= 2; n += step) out.push(...slab(g, n + 1));
  return out.sort((a, b) => a - b);
}

/** The face neighbours sharing a row: left, right, in front, behind. Up to 4. */
export function hNeighbors(g: Lattice, i: number): number[] {
  return [DIRS.left, DIRS.right, DIRS.front, DIRS.behind]
    .map((d) => offsetIndex(g, i, d))
    .filter((j): j is number => j !== null)
    .sort((a, b) => a - b);
}

/** The 1-2 cells directly over or under. */
export function vNeighbors(g: Lattice, i: number): number[] {
  return [DIRS.up, DIRS.down]
    .map((d) => offsetIndex(g, i, d))
    .filter((j): j is number => j !== null)
    .sort((a, b) => a - b);
}

/**
 * Face contact in any direction. The 2D game counted all eight surrounding
 * cells; a cube you look through reads diagonals as touching when they are not,
 * so this is six-connectivity and the clue vocabulary splits it in two.
 */
export const adjacent = (g: Lattice, i: number, j: number): boolean =>
  hNeighbors(g, i).includes(j) || vNeighbors(g, i).includes(j);

/** How many of a cell's coordinates sit at an extreme: 3 corner, 2 edge, 1 face, 0 core. */
const extremes = (i: number): number =>
  [xOf(i), yOf(i), zOf(i)].filter((v) => v === 0 || v === 2).length;

const withExtremes = (n: number): number[] =>
  Array.from({ length: 27 }, (_, i) => i).filter((i) => extremes(i) === n);

export const cornerMembers = (g: Lattice): number[] => withExtremes(3);
export const edgeMembers = (g: Lattice): number[] => withExtremes(2);
export const faceMembers = (g: Lattice): number[] => withExtremes(1);
export const coreMembers = (g: Lattice): number[] => withExtremes(0);

/**
 * Inclusive run between two cells, along whichever axis they differ on. Two
 * cells that differ on more than one axis have no run between them and give [],
 * as in the 2D game.
 */
export function segment(g: Lattice, a: number, b: number): number[] {
  const d = [xOf(b) - xOf(a), yOf(b) - yOf(a), zOf(b) - zOf(a)];
  const moving = d.filter((v) => v !== 0);
  if (moving.length !== 1) return [];
  const axis = d.findIndex((v) => v !== 0);
  const step = Math.sign(d[axis]);
  const at = [xOf(a), yOf(a), zOf(a)];
  const out: number[] = [];
  for (let n = at[axis]; ; n += step) {
    const c = [...at];
    c[axis] = n;
    out.push(indexOf(c[0], c[1], c[2]));
    if (n === at[axis] + d[axis]) break;
  }
  return out.sort((x, y) => x - y);
}

export function isConnected(g: Lattice, members: number[]): boolean {
  if (members.length <= 1) return true;
  const set = new Set(members);
  const seen = new Set<number>([members[0]]);
  const queue = [members[0]];
  while (queue.length > 0) {
    const i = queue.pop() as number;
    for (const j of [...hNeighbors(g, i), ...vNeighbors(g, i)]) {
      if (set.has(j) && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === set.size;
}
