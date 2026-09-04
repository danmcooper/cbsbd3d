import { describe, expect, it } from 'vitest';
import {
  DIRS,
  LATTICE,
  addressOf,
  adjacent,
  colMembers,
  coreMembers,
  cornerMembers,
  edgeMembers,
  faceMembers,
  hNeighbors,
  indexOf,
  indexOfAddress,
  isConnected,
  reachMembers,
  rowMembers,
  segment,
  sliceMembers,
  vNeighbors,
  xOf,
  yOf,
  zOf,
} from './lattice';

const g = LATTICE;
const at = indexOfAddress;

describe('addresses', () => {
  it('places A1a at the near top left and C3c at the far bottom right', () => {
    expect(addressOf(0)).toBe('A1a');
    expect(addressOf(26)).toBe('C3c');
    expect(addressOf(indexOf(1, 1, 1))).toBe('B2b');
  });

  it('round-trips every cell', () => {
    for (let i = 0; i < 27; i++) expect(indexOfAddress(addressOf(i))).toBe(i);
  });

  it('runs left to right, then top to bottom, then front to back', () => {
    expect([0, 1, 2].map(addressOf)).toEqual(['A1a', 'B1a', 'C1a']);
    expect(addressOf(3)).toBe('A2a');
    expect(addressOf(9)).toBe('A1b');
  });

  it('decomposes an index into coordinates', () => {
    expect([xOf(13), yOf(13), zOf(13)]).toEqual([1, 1, 1]);
  });

  it('refuses an address outside the cube', () => {
    expect(() => indexOfAddress('D1a')).toThrow();
    expect(() => indexOfAddress('A4a')).toThrow();
    expect(() => indexOfAddress('A1d')).toThrow();
  });
});

describe('slabs', () => {
  it('gives nine members each', () => {
    for (const n of [1, 2, 3]) {
      expect(rowMembers(g, n)).toHaveLength(9);
      expect(colMembers(g, n)).toHaveLength(9);
      expect(sliceMembers(g, n)).toHaveLength(9);
    }
  });

  it('spans every depth in a row and every row in a slice', () => {
    expect(rowMembers(g, 1).map(addressOf)).toContain('C1c');
    expect(sliceMembers(g, 1).every((i) => zOf(i) === 0)).toBe(true);
    expect(colMembers(g, 1).every((i) => xOf(i) === 0)).toBe(true);
    expect(rowMembers(g, 1).every((i) => yOf(i) === 0)).toBe(true);
  });
});

describe('reach', () => {
  it('sees nine from the middle and eighteen from the far side', () => {
    expect(reachMembers(g, at('B2b'), DIRS.up)).toHaveLength(9);
    expect(reachMembers(g, at('B3b'), DIRS.up)).toHaveLength(18);
  });

  it('is empty at the edge it faces', () => {
    expect(reachMembers(g, at('B1b'), DIRS.up)).toEqual([]);
    expect(reachMembers(g, at('A2b'), DIRS.left)).toEqual([]);
    expect(reachMembers(g, at('B2a'), DIRS.front)).toEqual([]);
  });

  it('takes the whole slab regardless of the anchor column or depth', () => {
    expect(reachMembers(g, at('B2b'), DIRS.up)).toEqual(rowMembers(g, 1));
    expect(reachMembers(g, at('B2b'), DIRS.behind)).toEqual(sliceMembers(g, 3));
    expect(reachMembers(g, at('A1a'), DIRS.right)).toEqual(
      [...colMembers(g, 2), ...colMembers(g, 3)].sort((a, b) => a - b),
    );
  });
});

describe('neighbours', () => {
  it('gives a corner two horizontal and one vertical', () => {
    expect(hNeighbors(g, at('A1a')).map(addressOf)).toEqual(['B1a', 'A1b']);
    expect(vNeighbors(g, at('A1a')).map(addressOf)).toEqual(['A2a']);
  });

  it('gives the core four horizontal and two vertical', () => {
    expect(hNeighbors(g, at('B2b'))).toHaveLength(4);
    expect(vNeighbors(g, at('B2b'))).toHaveLength(2);
  });

  it('never returns a diagonal', () => {
    expect(adjacent(g, at('A1a'), at('B2a'))).toBe(false);
    expect(adjacent(g, at('A1a'), at('B1b'))).toBe(false);
    expect(adjacent(g, at('A1a'), at('A2a'))).toBe(true);
    expect(adjacent(g, at('A1a'), at('A1b'))).toBe(true);
  });

  it('is symmetric', () => {
    for (let i = 0; i < 27; i++) {
      for (const j of [...hNeighbors(g, i), ...vNeighbors(g, i)]) {
        expect(adjacent(g, j, i)).toBe(true);
      }
    }
  });
});

describe('position groups', () => {
  it('partitions all 27 cells', () => {
    const groups = [cornerMembers(g), edgeMembers(g), faceMembers(g), coreMembers(g)];
    expect(groups.map((m) => m.length)).toEqual([8, 12, 6, 1]);
    expect(new Set(groups.flat()).size).toBe(27);
  });

  it('puts B2b alone in the core', () => {
    expect(coreMembers(g).map(addressOf)).toEqual(['B2b']);
  });

  it('puts A1a in a corner and B1a on an edge', () => {
    expect(cornerMembers(g)).toContain(at('A1a'));
    expect(edgeMembers(g)).toContain(at('B1a'));
    expect(faceMembers(g)).toContain(at('B1b'));
  });
});

describe('segment', () => {
  it('runs along an axis and is empty otherwise', () => {
    expect(segment(g, at('A1a'), at('C1a')).map(addressOf)).toEqual(['A1a', 'B1a', 'C1a']);
    expect(segment(g, at('A1a'), at('A1c')).map(addressOf)).toEqual(['A1a', 'A1b', 'A1c']);
    expect(segment(g, at('A1a'), at('B2b'))).toEqual([]);
  });

  it('reads the same in either order', () => {
    expect(segment(g, at('C1a'), at('A1a'))).toEqual(segment(g, at('A1a'), at('C1a')));
  });
});

describe('isConnected', () => {
  it('reads a face-linked run as connected and a diagonal pair as not', () => {
    expect(isConnected(g, [at('A1a'), at('B1a'), at('C1a')])).toBe(true);
    expect(isConnected(g, [at('A1a'), at('B2a')])).toBe(false);
    expect(isConnected(g, [at('A1a')])).toBe(true);
  });
});
