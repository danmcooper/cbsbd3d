import { describe, expect, it } from 'vitest';
import { parseHint } from './hint';
import {
  type Shape,
  ContradictionError,
  SIZE,
  allMasks,
  criminalOf,
  filterMasks,
  forcedFromMasks,
  maskOf,
  survivors,
} from './enumerate';

const shape: Shape = {
  professions: Array.from({ length: SIZE }, (_, i) => (i % 2 === 0 ? 'cook' : 'cop')),
};
const unknown = () => Array.from({ length: SIZE }, () => null) as (boolean | null)[];

// The enumerator walks 2^free, and the cube's 27 cards are 134 million
// assignments -- past what a reference implementation is for. Every test that
// walks the space pins slice c, leaving the 18 cards of slices a and b free.
// That is 2^18, the same order as the space these tests covered on a 4x5.
function backPinned(): (boolean | null)[] {
  const known = unknown();
  for (let i = 18; i < SIZE; i++) known[i] = false;
  return known;
}

describe('mask conversion', () => {
  it('round-trips', () => {
    const criminal = Array.from({ length: SIZE }, (_, i) => i === 0 || i === 26);
    expect(maskOf(criminal)).toBe((1 << 0) | (1 << 26));
    expect(criminalOf(maskOf(criminal), SIZE)).toEqual(criminal);
  });
});

describe('allMasks', () => {
  it('enumerates every assignment the known cards leave open', () => {
    expect(allMasks(shape, backPinned()).length).toBe(2 ** 18);
  });
  it('fixes known cards', () => {
    const known = backPinned();
    known[0] = true;
    known[1] = false;
    const masks = allMasks(shape, known);
    expect(masks.length).toBe(2 ** 16);
    for (const m of masks) {
      expect(m & 1).toBe(1);
      expect(m & 2).toBe(0);
    }
  });
});

describe('filterMasks', () => {
  it('keeps only assignments satisfying every hint', () => {
    // 18 criminals with slice c pinned innocent leaves exactly one assignment:
    // every free card is a criminal.
    const hints = [parseHint('number_of_traits(criminal,18)')];
    const out = filterMasks(shape, allMasks(shape, backPinned()), hints);
    expect(out.length).toBe(1);
    expect(out[0]).toBe(2 ** 18 - 1);
  });
  it('runs a full-space pass in reasonable time', () => {
    const started = Date.now();
    const out = survivors(shape, backPinned(), [parseHint('number_of_traits(criminal,5)')]);
    expect(out.length).toBe(8568); // C(18,5)
    expect(Date.now() - started).toBeLessThan(20000);
  });
});

describe('forcedFromMasks', () => {
  it('marks cards that agree across every survivor', () => {
    // Row 1 spans slices a, b and c; three of its nine cards are pinned
    // innocent, so six criminals in it forces the other six criminal. Row 3 is
    // emptied outright. Row 2's free cards are left to say nothing about.
    const out = survivors(shape, backPinned(), [
      parseHint('number_of_traits_in_unit(unit(row,1),criminal,6)'),
      parseHint('number_of_traits_in_unit(unit(row,3),criminal,0)'),
    ]);
    const forced = forcedFromMasks(out, SIZE);
    expect(forced.slice(0, 3)).toEqual([true, true, true]);
    expect(forced.slice(9, 12)).toEqual([true, true, true]);
    expect(forced.slice(6, 9)).toEqual([false, false, false]);
    expect(forced[4]).toBeNull();
  });
  it('throws on an unsatisfiable clue set', () => {
    const out = survivors(shape, backPinned(), [
      parseHint('number_of_traits(criminal,3)'),
      parseHint('number_of_traits(criminal,4)'),
    ]);
    expect(() => forcedFromMasks(out, SIZE)).toThrow(ContradictionError);
  });
});
