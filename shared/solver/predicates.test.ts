import { describe, expect, it } from 'vitest';
import { ARG_KINDS, parseHint } from './hint';
import { addressOf, indexOfAddress } from './lattice';
import {
  type Board,
  countTrait,
  evaluate,
  EVALUATORS,
  makeBoard,
  unitMembers,
  unitsOfKind,
} from './predicates';

// Criminals at A1a, B1a, A2a, B2b and C3c — indices 0, 1, 3, 13, 26. Two in
// row 1 and in column A, three in slice a, one in each of the others, and the
// core is the only criminal in slice b.
const CRIMINALS = [0, 1, 3, 13, 26];
// cook, cop, pilot repeating, so the cooks are exactly column A.
const PROFS = Array.from({ length: 27 }, (_, i) => ['cook', 'cop', 'pilot'][i % 3]);

const board: Board = makeBoard(
  PROFS,
  Array.from({ length: 27 }, (_, i) => CRIMINALS.includes(i)),
);

const ok = (s: string) => evaluate(board, parseHint(s));
const at = indexOfAddress;

describe('unitMembers', () => {
  it('resolves every unit kind', () => {
    expect(unitMembers(board, { kind: 'row', n: 2 })).toEqual([3, 4, 5, 12, 13, 14, 21, 22, 23]);
    expect(unitMembers(board, { kind: 'col', n: 3 })).toEqual([2, 5, 8, 11, 14, 17, 20, 23, 26]);
    expect(unitMembers(board, { kind: 'slice', n: 2 })).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(unitMembers(board, { kind: 'hneighbor', i: at('B2b') })).toEqual([4, 12, 14, 22]);
    expect(unitMembers(board, { kind: 'vneighbor', i: at('A1a') })).toEqual([3]);
    expect(unitMembers(board, { kind: 'reach', i: at('B2b'), dir: [0, -1, 0] })).toEqual(
      unitMembers(board, { kind: 'row', n: 1 }),
    );
    expect(unitMembers(board, { kind: 'reach', i: at('A1a'), dir: [0, -1, 0] })).toEqual([]);
    expect(unitMembers(board, { kind: 'between', a: at('A1a'), b: at('C1a') })).toEqual([0, 1, 2]);
    expect(unitMembers(board, { kind: 'between', a: at('C1a'), b: at('C3c') })).toEqual([]);
    expect(unitMembers(board, { kind: 'corner' })).toEqual([0, 2, 6, 8, 18, 20, 24, 26]);
    expect(unitMembers(board, { kind: 'face' })).toEqual([4, 10, 12, 14, 16, 22]);
    expect(unitMembers(board, { kind: 'core' }).map(addressOf)).toEqual(['B2b']);
    expect(unitMembers(board, { kind: 'profession', name: 'cop' })).toEqual([
      1, 4, 7, 10, 13, 16, 19, 22, 25,
    ]);
  });
});

describe('unitsOfKind', () => {
  it('enumerates three units for each slab kind', () => {
    for (const kind of ['row', 'col', 'slice'] as const) {
      expect(unitsOfKind(board, kind), kind).toHaveLength(3);
    }
  });
  it('anchors a neighbourhood on every card', () => {
    expect(unitsOfKind(board, 'hneighbor')).toHaveLength(27);
    expect(unitsOfKind(board, 'vneighbor')).toHaveLength(27);
  });
  it('leaves the incomparable kinds empty', () => {
    expect(unitsOfKind(board, 'reach')).toEqual([]);
    expect(unitsOfKind(board, 'between')).toEqual([]);
  });
  it('gives the position groups one unit each', () => {
    expect(unitsOfKind(board, 'corner')).toEqual([{ kind: 'corner' }]);
    expect(unitsOfKind(board, 'edge')).toEqual([{ kind: 'edge' }]);
    expect(unitsOfKind(board, 'face')).toEqual([{ kind: 'face' }]);
    expect(unitsOfKind(board, 'core')).toEqual([{ kind: 'core' }]);
    expect(
      unitsOfKind(board, 'profession')
        .map((u) => (u as { name: string }).name)
        .sort(),
    ).toEqual(['cook', 'cop', 'pilot']);
  });
});

describe('countTrait', () => {
  it('counts both traits over a member list', () => {
    expect(countTrait(board, [0, 1, 2, 3], 'criminal')).toBe(3);
    expect(countTrait(board, [0, 1, 2, 3], 'innocent')).toBe(1);
  });
});

describe('counting predicates', () => {
  it('has_trait', () => {
    expect(ok('has_trait(0,criminal)')).toBe(true);
    expect(ok('has_trait(0,innocent)')).toBe(false);
    expect(ok('has_trait(2,innocent)')).toBe(true);
  });
  it('number_of_traits', () => {
    expect(ok('number_of_traits(criminal,5)')).toBe(true);
    expect(ok('number_of_traits(innocent,22)')).toBe(true);
    expect(ok('number_of_traits(criminal,4)')).toBe(false);
  });
  it('number_of_traits_in_unit', () => {
    expect(ok('number_of_traits_in_unit(unit(slice,1),criminal,3)')).toBe(true);
    expect(ok('number_of_traits_in_unit(unit(corner,void),criminal,2)')).toBe(true);
    expect(ok('number_of_traits_in_unit(unit(core,void),criminal,1)')).toBe(true);
    expect(ok('number_of_traits_in_unit(unit(between,pair(0,2)),criminal,2)')).toBe(true);
  });
  it('counts a trait across a whole reach', () => {
    // Everyone above B2b is row 1, which holds two criminals.
    expect(ok('number_of_traits_in_unit(unit(reach,13:0,-1,0),criminal,2)')).toBe(true);
    // Everyone behind B2b is slice c, which holds one.
    expect(ok('number_of_traits_in_unit(unit(reach,13:0,0,1),criminal,1)')).toBe(true);
  });
  it('min_number_of_traits_in_unit is >=', () => {
    expect(ok('min_number_of_traits_in_unit(unit(slice,1),criminal,3)')).toBe(true);
    expect(ok('min_number_of_traits_in_unit(unit(slice,1),criminal,2)')).toBe(true);
    expect(ok('min_number_of_traits_in_unit(unit(slice,1),criminal,4)')).toBe(false);
  });
  it('odd_number_of_traits_in_unit', () => {
    expect(ok('odd_number_of_traits_in_unit(unit(slice,1),criminal)')).toBe(true);
    expect(ok('odd_number_of_traits_in_unit(unit(row,1),criminal)')).toBe(false);
  });
  it('is_one_of_n_traits_in_unit requires membership and the trait', () => {
    expect(ok('is_one_of_n_traits_in_unit(unit(row,1),0,criminal,2)')).toBe(true);
    expect(ok('is_one_of_n_traits_in_unit(unit(row,1),2,criminal,2)')).toBe(false);
    expect(ok('is_one_of_n_traits_in_unit(unit(row,2),0,criminal,2)')).toBe(false);
  });
  it('is_not_only_trait_in_unit', () => {
    expect(ok('is_not_only_trait_in_unit(unit(row,1),0,criminal)')).toBe(true);
    expect(ok('is_not_only_trait_in_unit(unit(slice,2),13,criminal)')).toBe(false);
  });
  it('all_units_have_at_least_n_traits ranges over a bare kind', () => {
    expect(ok('all_units_have_at_least_n_traits(row,criminal,1)')).toBe(true);
    expect(ok('all_units_have_at_least_n_traits(row,criminal,2)')).toBe(false);
    expect(ok('all_units_have_at_least_n_traits(slice,criminal,1)')).toBe(true);
  });
  it('only_one_unit_has_exactly_n_traits', () => {
    expect(ok('only_one_unit_has_exactly_n_traits(row,criminal,1)')).toBe(true);
    expect(ok('only_one_unit_has_exactly_n_traits(row,criminal,2)')).toBe(false);
    expect(ok('only_one_unit_has_exactly_n_traits(slice,criminal,3)')).toBe(true);
  });
});

describe('comparison predicates', () => {
  it('more_traits_in_unit_than_unit is strict', () => {
    expect(ok('more_traits_in_unit_than_unit(unit(slice,1),unit(slice,2),criminal)')).toBe(true);
    expect(ok('more_traits_in_unit_than_unit(unit(slice,2),unit(slice,1),criminal)')).toBe(false);
    expect(ok('more_traits_in_unit_than_unit(unit(slice,2),unit(slice,3),criminal)')).toBe(false);
  });
  it('equal_number_of_traits_in_units', () => {
    expect(ok('equal_number_of_traits_in_units(unit(slice,2),unit(slice,3),criminal)')).toBe(true);
    expect(ok('equal_number_of_traits_in_units(unit(slice,1),unit(slice,2),criminal)')).toBe(false);
  });
  it('more_traits_than_traits_in_unit compares two traits inside one unit', () => {
    expect(ok('more_traits_than_traits_in_unit(unit(row,1),innocent,criminal)')).toBe(true);
    expect(ok('more_traits_than_traits_in_unit(unit(row,1),criminal,innocent)')).toBe(false);
  });
  it('equal_traits_and_traits_in_unit', () => {
    // A1a's horizontal neighbours are B1a (criminal) and A1b (innocent).
    expect(ok('equal_traits_and_traits_in_unit(unit(hneighbor,0),criminal,innocent)')).toBe(true);
    expect(ok('equal_traits_and_traits_in_unit(unit(row,1),criminal,innocent)')).toBe(false);
  });
  // The two comparisons above vary one thing each: same trait across two units,
  // or two traits inside one unit. These vary both, which the source never does
  // and which nothing about the game forbids: "there are as many innocent cooks
  // as criminal cops" is a perfectly ordinary deduction to hand a player.
  it('more_traits_in_unit_than_traits_in_unit compares across both units and traits', () => {
    expect(
      ok('more_traits_in_unit_than_traits_in_unit(unit(slice,1),criminal,unit(core,void),innocent)'),
    ).toBe(true);
    expect(
      ok('more_traits_in_unit_than_traits_in_unit(unit(core,void),innocent,unit(slice,1),criminal)'),
    ).toBe(false);
  });
  it('equal_traits_in_unit_and_traits_in_unit', () => {
    // A2a is A1a's only vertical neighbour and is criminal; so is the core.
    expect(
      ok('equal_traits_in_unit_and_traits_in_unit(unit(vneighbor,0),criminal,unit(core,void),criminal)'),
    ).toBe(true);
    expect(
      ok('equal_traits_in_unit_and_traits_in_unit(unit(vneighbor,0),criminal,unit(core,void),innocent)'),
    ).toBe(false);
  });
  it('has_most_traits is a strict maximum over the same kind', () => {
    expect(ok('has_most_traits(unit(slice,1),criminal)')).toBe(true);
    expect(ok('has_most_traits(unit(slice,2),criminal)')).toBe(false);
    // Rows 1 and 2 tie at two, so neither has the most.
    expect(ok('has_most_traits(unit(row,1),criminal)')).toBe(false);
  });
  it('only_unit_has_exactly_n_traits', () => {
    expect(ok('only_unit_has_exactly_n_traits(unit(slice,1),criminal,3)')).toBe(true);
    expect(ok('only_unit_has_exactly_n_traits(unit(row,1),criminal,2)')).toBe(false);
  });
  it('units_share_n_traits counts the intersection', () => {
    // Row 1 meets column A at A1a, A1b and A1c; only A1a is criminal.
    expect(ok('units_share_n_traits(unit(row,1),unit(col,1),criminal,1)')).toBe(true);
    expect(ok('units_share_n_traits(unit(row,1),unit(row,2),criminal,0)')).toBe(true);
  });
  it('units_share_odd_n_traits', () => {
    expect(ok('units_share_odd_n_traits(unit(row,1),unit(col,1),criminal)')).toBe(true);
    expect(ok('units_share_odd_n_traits(unit(row,1),unit(row,2),criminal)')).toBe(false);
  });
  it('unit_shares_n_out_of_n_traits_with_unit constrains total and overlap', () => {
    expect(ok('unit_shares_n_out_of_n_traits_with_unit(unit(row,1),unit(col,1),criminal,1,2)')).toBe(
      true,
    );
    expect(ok('unit_shares_n_out_of_n_traits_with_unit(unit(row,1),unit(col,1),criminal,1,1)')).toBe(
      false,
    );
    expect(ok('unit_shares_n_out_of_n_traits_with_unit(unit(row,1),unit(col,1),criminal,2,2)')).toBe(
      false,
    );
  });
});

describe('adjacency and direction predicates', () => {
  it('covers every predicate in the signature table', () => {
    expect(Object.keys(EVALUATORS).sort()).toEqual(Object.keys(ARG_KINDS).sort());
  });
  it('max_number_of_traits_in_neighbors_in_unit caps every member', () => {
    // Criminal-neighbour counts across row 1: A1a and B1b each touch two, the
    // rest touch one or none.
    expect(ok('max_number_of_traits_in_neighbors_in_unit(unit(row,1),criminal,2)')).toBe(true);
    expect(ok('max_number_of_traits_in_neighbors_in_unit(unit(row,1),criminal,1)')).toBe(false);
  });
  it('both_traits_are_neighbors_in_unit needs exactly two, adjacent', () => {
    expect(ok('both_traits_are_neighbors_in_unit(unit(row,1),criminal)')).toBe(true);
    expect(ok('both_traits_are_neighbors_in_unit(unit(col,1),criminal)')).toBe(true);
    // A1a and C3c are corners at opposite ends of the cube.
    expect(ok('both_traits_are_neighbors_in_unit(unit(corner,void),criminal)')).toBe(false);
  });
  it('reads adjacency as face contact, not diagonal', () => {
    const criminal = Array.from({ length: 27 }, (_, i) => i === at('A1a') || i === at('B2a'));
    const diag = makeBoard(PROFS, criminal);
    expect(
      evaluate(diag, parseHint('both_traits_are_neighbors_in_unit(unit(slice,1),criminal)')),
    ).toBe(false);
    expect(
      evaluate(diag, parseHint('all_traits_are_neighbors_in_unit(unit(slice,1),criminal)')),
    ).toBe(false);
  });
  it('all_traits_are_neighbors_in_unit is six-way connectivity', () => {
    expect(ok('all_traits_are_neighbors_in_unit(unit(slice,1),criminal)')).toBe(true);
    expect(ok('all_traits_are_neighbors_in_unit(unit(corner,void),criminal)')).toBe(false);
  });
  it('both_traits_in_unit_are_in_unit', () => {
    expect(ok('both_traits_in_unit_are_in_unit(unit(row,1),unit(slice,1),criminal)')).toBe(true);
    expect(ok('both_traits_in_unit_are_in_unit(unit(row,1),unit(col,1),criminal)')).toBe(false);
  });
  it('only_trait_in_unit_is_in_unit', () => {
    expect(ok('only_trait_in_unit_is_in_unit(unit(slice,2),unit(core,void),criminal)')).toBe(true);
    expect(ok('only_trait_in_unit_is_in_unit(unit(slice,2),unit(row,1),criminal)')).toBe(false);
  });
  it('only_one_person_in_unit_has_exactly_n_trait_neighbors', () => {
    // The core touches six innocents.
    expect(ok('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(core,void),criminal,0)')).toBe(
      true,
    );
    expect(ok('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(core,void),criminal,1)')).toBe(
      false,
    );
  });
  it('n_in_unit_have_trait_in_dir counts along the depth axis', () => {
    // Only C3b has a criminal directly behind them, C3c.
    expect(ok('n_in_unit_have_trait_in_dir(unit(slice,2),criminal,0,0,1,1)')).toBe(true);
    expect(ok('n_in_unit_have_trait_in_dir(unit(slice,2),criminal,0,0,1,2)')).toBe(false);
    // Nothing is behind the back slice at all.
    expect(ok('n_in_unit_have_trait_in_dir(unit(slice,3),criminal,0,0,1,0)')).toBe(true);
  });
  it('n_t_in_unit_have_trait_in_dir filters the source by trait too', () => {
    // The criminals in row 1 are A1a and B1a; to their right sit B1a (criminal)
    // and C1a (innocent).
    expect(ok('n_t_in_unit_have_trait_in_dir(unit(row,1),criminal,criminal,1,0,0,1)')).toBe(true);
    expect(ok('n_t_in_unit_have_trait_in_dir(unit(row,1),criminal,criminal,1,0,0,2)')).toBe(false);
  });
  it('n_professions_have_trait_in_dir ranges over a profession', () => {
    // The cooks are column A; directly above them sit A1a and A2a among others,
    // and those two are the criminals.
    expect(ok('n_professions_have_trait_in_dir(cook,criminal,0,-1,0,2)')).toBe(true);
    expect(ok('n_professions_have_trait_in_dir(cook,criminal,0,-1,0,3)')).toBe(false);
  });
});
