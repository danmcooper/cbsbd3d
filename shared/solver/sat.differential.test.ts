import { describe, expect, it } from 'vitest';
import { forcedGivenSat, supports } from './backbone';
import { SUPPORTED } from './encode';
import { SIZE, type Shape } from './enumerate';
import { evaluate, makeBoard } from './predicates';
import { SAMPLED_PREDICATES, makeSampleCtx, randomTrueClue } from './sample';
import { type Clues, forcedGivenBrute } from './solve';

/**
 * `enumerate.ts` is the reference: it decides a card by looking at every
 * assignment, which is slow but obviously right. The SAT engine has to agree
 * with it exactly, on every card, for every position — a disagreement in either
 * direction is a bug that would silently corrupt hints and `paths`.
 *
 * Clues come from `sample.ts`, which builds them true-of-a-random-truth because
 * `forcedGiven`'s precondition is that the truth satisfies its own clues. Every
 * clue is then checked against the evaluator before use, so a builder that
 * guesses wrong costs coverage rather than correctness — which is why the run
 * also asserts that each supported predicate actually turned up.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROFESSIONS = ['cook', 'clerk', 'doctor', 'cop'];

function randomShape(rng: () => number): Shape {
  return {
    professions: Array.from(
      { length: SIZE },
      () => PROFESSIONS[Math.floor(rng() * PROFESSIONS.length)],
    ),
  };
}

/**
 * The reference walks 2^free, so the cube's 27 cards have to be cut down to
 * roughly what the 2D suite left open. Each position pins a random `count` of
 * them; 16 pinned leaves 11 free, or 2048 assignments rather than 134 million.
 */
function randomFlipped(rng: () => number, count: number): number[] {
  const idx = [...Array(SIZE).keys()];
  for (let i = SIZE - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count).sort((a, b) => a - b);
}

interface Case {
  shape: Shape;
  clues: Clues;
  truth: boolean[];
}

function randomCase(rng: () => number, seen?: Map<string, number>): Case {
  const shape = randomShape(rng);
  const truth = Array.from({ length: SIZE }, () => rng() < 0.35);
  const board = makeBoard(shape.professions, truth);
  const ctx = makeSampleCtx(rng, board, shape, truth);
  const clues: Clues = Array.from({ length: SIZE }, () => null);
  for (let i = 0; i < SIZE; i++) {
    if (rng() < 0.45) continue;
    const hint = randomTrueClue(ctx);
    // Anything that slipped through as false is dropped rather than trusted: a
    // false clue would break the precondition both engines may assume.
    if (hint && supports(hint) && evaluate(board, hint)) {
      clues[i] = hint;
      if (seen) seen.set(hint.pred, (seen.get(hint.pred) ?? 0) + 1);
    }
  }
  return { shape, clues, truth };
}

describe('SAT engine against the enumerator', () => {
  it('deduces exactly the same cards on random boards', () => {
    const rng = mulberry32(20260901);
    const seen = new Map<string, number>();
    let checked = 0;
    for (let trial = 0; trial < 60; trial++) {
      const { shape, clues, truth } = randomCase(rng, seen);
      for (let round = 0; round < 6; round++) {
        const flipped = randomFlipped(rng, 16);
        const expected = forcedGivenBrute(shape, clues, truth, flipped);
        const actual = forcedGivenSat(shape, clues, truth, flipped);
        expect(actual, `trial ${trial} round ${round} flipped ${flipped}`).toEqual(expected);
        checked++;
      }
    }
    expect(checked).toBe(360);
    // Agreement is only worth as much as the clues it ran on. A family that
    // stopped being generated would quietly stop being compared, so the loop
    // asserts its own coverage rather than trusting it.
    const thin = [...SUPPORTED].filter((p) => (seen.get(p) ?? 0) < 3);
    expect(thin, `too few clues compared for: ${thin}`).toEqual([]);
  });

  it('agrees on open positions, where the most is unknown', () => {
    // Slices b and c pinned leaves the front slice free, then one, two and
    // three more cards on top of it: 512 through 4096 assignments to walk.
    const back = [...Array(SIZE).keys()].filter((i) => i >= 9);
    const rng = mulberry32(77);
    for (let trial = 0; trial < 8; trial++) {
      const { shape, clues, truth } = randomCase(rng);
      for (const flipped of [back, back.slice(1), back.slice(2), back.slice(3)]) {
        expect(forcedGivenSat(shape, clues, truth, flipped)).toEqual(
          forcedGivenBrute(shape, clues, truth, flipped),
        );
      }
    }
  });

  it('agrees that a card is unforced when nothing constrains it', () => {
    const shape: Shape = { professions: Array(SIZE).fill('cook') };
    const truth = Array.from({ length: SIZE }, () => false);
    const clues: Clues = Array.from({ length: SIZE }, () => null);
    const flipped = [...Array(SIZE).keys()].filter((i) => i >= 10);
    expect(forcedGivenSat(shape, clues, truth, flipped)).toEqual(
      forcedGivenBrute(shape, clues, truth, flipped),
    );
  });

  it('has a builder for every predicate the encoder claims to support', () => {
    expect([...SAMPLED_PREDICATES].sort()).toEqual([...SUPPORTED].sort());
  });
});
