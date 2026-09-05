import { LATTICE } from './lattice';
import type { Hint } from './hint';
import { type Board, evaluate, makeBoard } from './predicates';

export interface Shape {
  professions: string[];
}

/** Every board is the same cube, so the size is a constant rather than a field. */
export const SIZE = LATTICE.size;

export type Known = (boolean | null)[];

export class ContradictionError extends Error {}

export function maskOf(criminal: boolean[]): number {
  let mask = 0;
  for (let i = 0; i < criminal.length; i++) if (criminal[i]) mask |= 1 << i;
  return mask;
}

export function criminalOf(mask: number, size: number): boolean[] {
  return Array.from({ length: size }, (_, i) => (mask & (1 << i)) !== 0);
}

export function allMasks(shape: Shape, known: Known): Uint32Array {
  const size = SIZE;
  let base = 0;
  const free: number[] = [];
  for (let i = 0; i < size; i++) {
    if (known[i] === true) base |= 1 << i;
    else if (known[i] === null || known[i] === undefined) free.push(i);
  }
  const out = new Uint32Array(1 << free.length);
  for (let combo = 0; combo < out.length; combo++) {
    let mask = base;
    for (let k = 0; k < free.length; k++) if (combo & (1 << k)) mask |= 1 << free[k];
    out[combo] = mask;
  }
  return out;
}

export function filterMasks(shape: Shape, masks: Uint32Array, hints: Hint[]): Uint32Array {
  const size = SIZE;
  const criminal = new Array<boolean>(size).fill(false);
  const board: Board = makeBoard(shape.professions, criminal);
  let current = masks;
  for (const hint of hints) {
    let write = 0;
    for (let read = 0; read < current.length; read++) {
      const mask = current[read];
      for (let i = 0; i < size; i++) criminal[i] = (mask & (1 << i)) !== 0;
      if (evaluate(board, hint)) current[write++] = mask;
    }
    current = current.subarray(0, write);
  }
  return current;
}

export function survivors(shape: Shape, known: Known, hints: Hint[]): Uint32Array {
  return filterMasks(shape, allMasks(shape, known), hints);
}

export function forcedFromMasks(masks: Uint32Array, size: number): Known {
  if (masks.length === 0) throw new ContradictionError('no assignment satisfies the clue set');
  let and = -1;
  let or = 0;
  for (let k = 0; k < masks.length; k++) {
    and &= masks[k];
    or |= masks[k];
  }
  return Array.from({ length: size }, (_, i) => {
    if (and & (1 << i)) return true;
    if (!(or & (1 << i))) return false;
    return null;
  });
}
