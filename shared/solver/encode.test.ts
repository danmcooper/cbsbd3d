import { describe, expect, it } from 'vitest';
import { MAX_ENUMERATED_UNIT, SUPPORTED, UnsupportedPredicateError, encode } from './encode';
import { SIZE } from './enumerate';
import { ARG_KINDS } from './hint';
import { DIRS, LATTICE, reachMembers } from './lattice';
import { EVALUATORS } from './predicates';

const shape = { professions: Array<string>(SIZE).fill('cook') };
const nothingKnown = Array<null>(SIZE).fill(null);

describe('predicate coverage', () => {
  it('encodes every predicate the game can express', () => {
    // The generator draws from `ARG_KINDS` and the archive parses into it, so a
    // predicate that exists there but not here is one that would reach the
    // solver and throw. Adding a predicate has to mean adding its encoding.
    const missing = Object.keys(ARG_KINDS).filter((p) => !SUPPORTED.has(p));
    expect(missing, `no encoding for: ${missing}`).toEqual([]);
  });

  it('claims nothing the evaluator cannot check', () => {
    const extra = [...SUPPORTED].filter((p) => !(p in EVALUATORS));
    expect(extra, `encoded but not evaluable: ${extra}`).toEqual([]);
  });
});

describe('encode', () => {
  it('refuses a predicate it has no encoding for', () => {
    expect(() => encode(shape, [{ pred: 'no_such_predicate', args: [] }], nothingKnown)).toThrow(
      UnsupportedPredicateError,
    );
  });

  it('refuses a connectivity clue over a unit too large to enumerate', () => {
    // The subset walk is exponential in the unit, so an oversized one has to be
    // refused rather than silently attempted: everything behind a card in the
    // front slice is two whole slabs, 18 cards.
    const behind = reachMembers(LATTICE, 0, DIRS.behind);
    expect(behind.length).toBeGreaterThan(MAX_ENUMERATED_UNIT);
    expect(() =>
      encode(
        shape,
        [
          {
            pred: 'all_traits_are_neighbors_in_unit',
            args: [
              { t: 'unit', unit: { kind: 'reach', i: 0, dir: DIRS.behind } },
              { t: 'trait', trait: 'criminal' },
            ],
          },
        ],
        nothingKnown,
      ),
    ).toThrow(UnsupportedPredicateError);
  });

  it('gives every card a variable, whatever the clues say', () => {
    const { vars } = encode(shape, [], nothingKnown);
    expect(new Set(vars).size).toBe(SIZE);
  });
});
