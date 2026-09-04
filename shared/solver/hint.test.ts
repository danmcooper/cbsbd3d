import { describe, expect, it } from 'vitest';
import { ARG_KINDS, formatHint, HintParseError, parseHint } from './hint';

describe('parseHint', () => {
  it('parses a unit with a pair argument', () => {
    expect(parseHint('all_traits_are_neighbors_in_unit(unit(between,pair(0,3)),criminal)')).toEqual({
      pred: 'all_traits_are_neighbors_in_unit',
      args: [
        { t: 'unit', unit: { kind: 'between', a: 0, b: 3 } },
        { t: 'trait', trait: 'criminal' },
      ],
    });
  });

  it('parses bare kinds, numbers and negative direction offsets', () => {
    expect(parseHint('all_units_have_at_least_n_traits(col,innocent,1)').args[0]).toEqual({
      t: 'kind',
      kind: 'col',
    });
    expect(parseHint('n_professions_have_trait_in_dir(cook,innocent,0,-1,0,1)').args).toEqual([
      { t: 'profession', name: 'cook' },
      { t: 'trait', trait: 'innocent' },
      { t: 'num', n: 0 },
      { t: 'num', n: -1 },
      { t: 'num', n: 0 },
      { t: 'num', n: 1 },
    ]);
  });

  it('parses void-argument units and person indices', () => {
    expect(parseHint('is_one_of_n_traits_in_unit(unit(edge,void),7,innocent,3)').args).toEqual([
      { t: 'unit', unit: { kind: 'edge' } },
      { t: 'index', i: 7 },
      { t: 'trait', trait: 'innocent' },
      { t: 'num', n: 3 },
    ]);
  });

  it('keeps the two neighbour kinds apart', () => {
    expect(
      parseHint('odd_number_of_traits_in_unit(unit(hneighbor,4),criminal)').args[0],
    ).toEqual({ t: 'unit', unit: { kind: 'hneighbor', i: 4 } });
    expect(
      parseHint('odd_number_of_traits_in_unit(unit(vneighbor,4),criminal)').args[0],
    ).toEqual({ t: 'unit', unit: { kind: 'vneighbor', i: 4 } });
  });

  it('carries three direction components', () => {
    expect(parseHint('n_professions_have_trait_in_dir(cook,criminal,1,0,0,1)').args).toHaveLength(6);
  });

  it('reads a reach as an anchor and a direction', () => {
    expect(parseHint('number_of_traits_in_unit(unit(reach,13:0,-1,0),criminal,2)').args[0]).toEqual({
      t: 'unit',
      unit: { kind: 'reach', i: 13, dir: [0, -1, 0] },
    });
  });

  it('rejects unknown predicates and wrong arity', () => {
    expect(() => parseHint('no_such_predicate(criminal)')).toThrow(HintParseError);
    expect(() => parseHint('number_of_traits(criminal)')).toThrow(HintParseError);
  });

  it('rejects a malformed kind literal', () => {
    expect(() => parseHint('all_units_have_at_least_n_traits(rowz,criminal,1)')).toThrow(
      HintParseError,
    );
  });

  it('rejects an unknown unit kind', () => {
    expect(() => parseHint('number_of_traits_in_unit(unit(diagonal,1),criminal,1)')).toThrow(
      HintParseError,
    );
  });

  it('rejects a malformed reach', () => {
    expect(() => parseHint('number_of_traits_in_unit(unit(reach,13:0,-1),criminal,1)')).toThrow(
      HintParseError,
    );
  });
});

describe('formatHint', () => {
  it('round-trips every signature shape', () => {
    for (const s of [
      'has_trait(11,innocent)',
      'number_of_traits(criminal,6)',
      'number_of_traits_in_unit(unit(between,pair(4,7)),innocent,2)',
      'number_of_traits_in_unit(unit(slice,2),criminal,1)',
      'number_of_traits_in_unit(unit(reach,13:0,-1,0),criminal,2)',
      'odd_number_of_traits_in_unit(unit(hneighbor,12),criminal)',
      'odd_number_of_traits_in_unit(unit(vneighbor,12),criminal)',
      'only_one_unit_has_exactly_n_traits(slice,criminal,2)',
      'unit_shares_n_out_of_n_traits_with_unit(unit(hneighbor,5),unit(row,3),criminal,1,2)',
      'n_t_in_unit_have_trait_in_dir(unit(edge,void),innocent,innocent,1,0,0,2)',
      'equal_number_of_traits_in_units(unit(profession,cook),unit(profession,cop),innocent)',
      'has_most_traits(unit(face,void),criminal)',
      'has_most_traits(unit(core,void),criminal)',
      'has_most_traits(unit(corner,void),criminal)',
    ]) {
      expect(formatHint(parseHint(s))).toBe(s);
    }
  });
});

describe('ARG_KINDS', () => {
  // 27 the 2D archive uses, plus the two cross-trait comparisons it never does —
  // see CROSS_TRAIT in corpus.ts.
  it('covers all 29 predicates', () => {
    expect(Object.keys(ARG_KINDS)).toHaveLength(29);
  });
});
