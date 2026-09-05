import { describe, expect, it } from 'vitest';
import { ARG_KINDS, parseHint } from './hint';
import { canRender, dirPhrase, render, RENDERERS, UnsupportedShapeError, where, wherePerson } from './render';

const r = (s: string) => render(parseHint(s));

describe('the cube vocabulary', () => {
  it('names each slab by its address letter or digit', () => {
    expect(where({ kind: 'row', n: 2 })).toBe('in row 2');
    expect(where({ kind: 'col', n: 2 })).toBe('in column B');
    expect(where({ kind: 'slice', n: 2 })).toBe('in slice b');
  });

  // The position groups are counted in the plural and stood in singly: "3
  // criminals in the corners", but "only one person in a corner".
  it('names the position groups', () => {
    expect(where({ kind: 'corner' })).toBe('in the corners');
    expect(where({ kind: 'edge' })).toBe('on the edges');
    expect(where({ kind: 'face' })).toBe('at the face centers');
    expect(where({ kind: 'core' })).toBe('in the core');
    expect(wherePerson({ kind: 'corner' })).toBe('in a corner');
    expect(wherePerson({ kind: 'edge' })).toBe('on an edge');
    expect(wherePerson({ kind: 'face' })).toBe('at a face center');
    expect(wherePerson({ kind: 'core' })).toBe('in the core');
  });

  it('says the six single steps', () => {
    expect(dirPhrase(0, -1, 0)).toBe('directly above them');
    expect(dirPhrase(0, 1, 0)).toBe('directly below them');
    expect(dirPhrase(-1, 0, 0)).toBe('directly to the left of them');
    expect(dirPhrase(1, 0, 0)).toBe('directly to the right of them');
    expect(dirPhrase(0, 0, -1)).toBe('directly in front of them');
    expect(dirPhrase(0, 0, 1)).toBe('directly behind them');
    expect(() => dirPhrase(1, 1, 0)).toThrow(UnsupportedShapeError);
  });

  it('says the six wide reaches', () => {
    const reach = (dir: readonly [number, number, number]) => where({ kind: 'reach', i: 13, dir });
    expect(reach([0, -1, 0])).toBe('above #NAME:13');
    expect(reach([0, 1, 0])).toBe('below #NAME:13');
    expect(reach([-1, 0, 0])).toBe('to the left of #NAME:13');
    expect(reach([1, 0, 0])).toBe('to the right of #NAME:13');
    expect(reach([0, 0, -1])).toBe('in front of #NAME:13');
    expect(reach([0, 0, 1])).toBe('behind #NAME:13');
  });

  it('distinguishes the two neighbour kinds', () => {
    expect(where({ kind: 'hneighbor', i: 4 })).toBe('among the horizontal neighbors of #NAME:4');
    expect(where({ kind: 'vneighbor', i: 4 })).toBe('among the vertical neighbors of #NAME:4');
  });

  // The four predicates that use adjacency as a relation rather than as a unit
  // mean "shares a face", both axes together, and say plain "neighbor".
  it('leaves the adjacency relation unqualified', () => {
    expect(r('max_number_of_traits_in_neighbors_in_unit(unit(row,2),innocent,3)')).toBe(
      'No one in row 2 has more than 3 innocent neighbors',
    );
    expect(r('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(core,void),criminal,2)')).toBe(
      'Only one person in the core has exactly 2 criminal neighbors',
    );
  });
});

describe('counting clue templates', () => {
  it('has_trait', () => {
    expect(r('has_trait(11,innocent)')).toBe('#NAME:11 is innocent');
    expect(r('has_trait(11,criminal)')).toBe('#NAME:11 is a criminal');
  });
  it('number_of_traits', () => {
    expect(r('number_of_traits(criminal,6)')).toBe('There are 6 criminals in total');
  });
  it('number_of_traits_in_unit over a between segment', () => {
    expect(r('number_of_traits_in_unit(unit(between,pair(4,7)),innocent,1)')).toBe(
      'There is only one innocent #BETWEEN:pair(4,7)',
    );
    expect(r('number_of_traits_in_unit(unit(between,pair(4,7)),innocent,3)')).toBe(
      'There are exactly 3 innocents #BETWEEN:pair(4,7)',
    );
    expect(r('number_of_traits_in_unit(unit(between,pair(4,7)),criminal,0)')).toBe(
      'There are no criminals #BETWEEN:pair(4,7)',
    );
  });
  it('number_of_traits_in_unit over neighbours, slabs, reaches and position groups', () => {
    expect(r('number_of_traits_in_unit(unit(hneighbor,5),criminal,2)')).toBe(
      '#NAME:5 has exactly 2 criminal horizontal neighbors',
    );
    expect(r('number_of_traits_in_unit(unit(vneighbor,5),innocent,1)')).toBe(
      '#NAME:5 has only one innocent vertical neighbor',
    );
    expect(r('number_of_traits_in_unit(unit(hneighbor,5),criminal,0)')).toBe(
      '#NAME:5 has no criminal horizontal neighbors',
    );
    expect(r('number_of_traits_in_unit(unit(row,3),innocent,2)')).toBe(
      'There are exactly 2 innocents in row 3',
    );
    expect(r('number_of_traits_in_unit(unit(col,2),criminal,1)')).toBe(
      'There is only one criminal in column B',
    );
    expect(r('number_of_traits_in_unit(unit(slice,3),criminal,4)')).toBe(
      'There are exactly 4 criminals in slice c',
    );
    expect(r('number_of_traits_in_unit(unit(reach,4:0,0,1),criminal,5)')).toBe(
      'There are exactly 5 criminals behind #NAME:4',
    );
    expect(r('number_of_traits_in_unit(unit(edge,void),innocent,7)')).toBe(
      'There are exactly 7 innocents on the edges',
    );
    expect(r('number_of_traits_in_unit(unit(corner,void),innocent,3)')).toBe(
      'There are exactly 3 innocents in the corners',
    );
    expect(r('number_of_traits_in_unit(unit(face,void),criminal,2)')).toBe(
      'There are exactly 2 criminals at the face centers',
    );
    expect(r('number_of_traits_in_unit(unit(core,void),criminal,1)')).toBe(
      'There is only one criminal in the core',
    );
  });
  it('min_number_of_traits_in_unit', () => {
    expect(r('min_number_of_traits_in_unit(unit(col,2),innocent,3)')).toBe(
      'There are at least 3 innocents in column B',
    );
    expect(r('min_number_of_traits_in_unit(unit(between,pair(0,3)),innocent,1)')).toBe(
      'There is at least one innocent #BETWEEN:pair(0,3)',
    );
    expect(r('min_number_of_traits_in_unit(unit(reach,13:0,-1,0),criminal,2)')).toBe(
      'There are at least 2 criminals above #NAME:13',
    );
  });
  it('odd_number_of_traits_in_unit', () => {
    expect(r('odd_number_of_traits_in_unit(unit(vneighbor,12),innocent)')).toBe(
      "There's an odd number of innocents among the vertical neighbors of #NAME:12",
    );
    expect(r('odd_number_of_traits_in_unit(unit(col,3),criminal)')).toBe(
      "There's an odd number of criminals in column C",
    );
    expect(r('odd_number_of_traits_in_unit(unit(profession,singer),criminal)')).toBe(
      "There's an odd number of criminal #PROFS:singer",
    );
  });
  it('is_one_of_n_traits_in_unit', () => {
    expect(r('is_one_of_n_traits_in_unit(unit(hneighbor,9),4,innocent,3)')).toBe(
      '#NAME:4 is one of #NAMES:9 3 innocent horizontal neighbors',
    );
    expect(r('is_one_of_n_traits_in_unit(unit(between,pair(0,3)),1,criminal,2)')).toBe(
      '#NAME:1 is one of 2 criminals #BETWEEN:pair(0,3)',
    );
    expect(r('is_one_of_n_traits_in_unit(unit(edge,void),7,innocent,5)')).toBe(
      '#NAME:7 is one of 5 innocents on the edges',
    );
  });
  it('is_not_only_trait_in_unit', () => {
    expect(r('is_not_only_trait_in_unit(unit(row,2),5,innocent)')).toBe(
      '#NAME:5 is one of two or more innocents in row 2',
    );
  });
  it('all_units_have_at_least_n_traits', () => {
    expect(r('all_units_have_at_least_n_traits(col,innocent,2)')).toBe(
      'Each column has at least 2 innocents',
    );
    expect(r('all_units_have_at_least_n_traits(row,innocent,1)')).toBe(
      'Each row has at least one innocent',
    );
    expect(r('all_units_have_at_least_n_traits(slice,criminal,2)')).toBe(
      'Each slice has at least 2 criminals',
    );
    expect(r('all_units_have_at_least_n_traits(profession,criminal,1)')).toBe(
      'There is at least one criminal among all professions',
    );
    expect(r('all_units_have_at_least_n_traits(hneighbor,criminal,2)')).toBe(
      'Everyone has at least 2 criminal horizontal neighbors',
    );
  });
  it('only_one_unit_has_exactly_n_traits', () => {
    expect(r('only_one_unit_has_exactly_n_traits(row,criminal,2)')).toBe(
      'Only one row has exactly 2 criminals',
    );
    expect(r('only_one_unit_has_exactly_n_traits(slice,innocent,1)')).toBe(
      'Only one slice has exactly one innocent',
    );
    expect(r('only_one_unit_has_exactly_n_traits(col,criminal,0)')).toBe(
      'Only one column has no criminals',
    );
  });
});

describe('comparison clue templates', () => {
  it('more_traits_in_unit_than_unit', () => {
    expect(r('more_traits_in_unit_than_unit(unit(hneighbor,3),unit(hneighbor,9),criminal)')).toBe(
      '#NAME:3 has more criminal horizontal neighbors than #NAME:9',
    );
    expect(r('more_traits_in_unit_than_unit(unit(row,1),unit(row,3),innocent)')).toBe(
      'There are more innocents in row 1 than row 3',
    );
    expect(r('more_traits_in_unit_than_unit(unit(col,1),unit(col,3),criminal)')).toBe(
      'There are more criminals in column A than column C',
    );
    expect(r('more_traits_in_unit_than_unit(unit(slice,1),unit(slice,2),criminal)')).toBe(
      'There are more criminals in slice a than slice b',
    );
    expect(
      r('more_traits_in_unit_than_unit(unit(profession,cook),unit(profession,cop),criminal)'),
    ).toBe('There are more criminal #PROFS:cook than criminal #PROFS:cop');
    // Comparing a horizontal count with a vertical one is a sentence with two
    // different nouns in it; the pair has to be of one kind.
    expect(() =>
      r('more_traits_in_unit_than_unit(unit(hneighbor,3),unit(vneighbor,9),criminal)'),
    ).toThrow(UnsupportedShapeError);
  });
  it('equal_number_of_traits_in_units', () => {
    expect(r('equal_number_of_traits_in_units(unit(vneighbor,3),unit(vneighbor,9),criminal)')).toBe(
      '#NAME:3 and #NAME:9 have an equal number of criminal vertical neighbors',
    );
    expect(r('equal_number_of_traits_in_units(unit(row,1),unit(row,3),innocent)')).toBe(
      "There's an equal number of innocents in rows 1 and 3",
    );
    expect(r('equal_number_of_traits_in_units(unit(col,1),unit(col,3),criminal)')).toBe(
      "There's an equal number of criminals in columns A and C",
    );
    expect(r('equal_number_of_traits_in_units(unit(slice,1),unit(slice,3),criminal)')).toBe(
      "There's an equal number of criminals in slices a and c",
    );
    expect(
      r('equal_number_of_traits_in_units(unit(profession,cook),unit(profession,cop),innocent)'),
    ).toBe('There are as many innocent #PROFS:cook as there are innocent #PROFS:cop');
  });
  it('more_traits_than_traits_in_unit', () => {
    expect(r('more_traits_than_traits_in_unit(unit(between,pair(0,3)),innocent,criminal)')).toBe(
      'There are more innocents than criminals #BETWEEN:pair(0,3)',
    );
    expect(r('more_traits_than_traits_in_unit(unit(hneighbor,5),criminal,innocent)')).toBe(
      '#NAME:5 has more criminal than innocent horizontal neighbors',
    );
    expect(r('more_traits_than_traits_in_unit(unit(reach,4:1,0,0),criminal,innocent)')).toBe(
      'There are more criminals than innocents to the right of #NAME:4',
    );
  });
  it('equal_traits_and_traits_in_unit', () => {
    expect(r('equal_traits_and_traits_in_unit(unit(between,pair(0,3)),criminal,innocent)')).toBe(
      'There are as many criminals as innocents #BETWEEN:pair(0,3)',
    );
    expect(r('equal_traits_and_traits_in_unit(unit(profession,cop),innocent,criminal)')).toBe(
      "There's an equal number of innocent and criminal #PROFS:cop",
    );
  });
  it('more_traits_in_unit_than_traits_in_unit', () => {
    expect(
      r('more_traits_in_unit_than_traits_in_unit(unit(hneighbor,3),criminal,unit(hneighbor,9),innocent)'),
    ).toBe('#NAME:3 has more criminal horizontal neighbors than #NAME:9 has innocent ones');
    expect(r('more_traits_in_unit_than_traits_in_unit(unit(row,1),innocent,unit(row,3),criminal)')).toBe(
      'There are more innocents in row 1 than criminals in row 3',
    );
    expect(r('more_traits_in_unit_than_traits_in_unit(unit(slice,1),criminal,unit(slice,3),innocent)')).toBe(
      'There are more criminals in slice a than innocents in slice c',
    );
    expect(
      r('more_traits_in_unit_than_traits_in_unit(unit(profession,cook),innocent,unit(profession,cop),criminal)'),
    ).toBe('There are more innocent #PROFS:cook than criminal #PROFS:cop');
  });
  it('equal_traits_in_unit_and_traits_in_unit', () => {
    expect(
      r('equal_traits_in_unit_and_traits_in_unit(unit(vneighbor,3),criminal,unit(vneighbor,9),innocent)'),
    ).toBe('#NAME:3 has as many criminal vertical neighbors as #NAME:9 has innocent ones');
    expect(r('equal_traits_in_unit_and_traits_in_unit(unit(row,1),innocent,unit(row,3),criminal)')).toBe(
      'There are as many innocents in row 1 as criminals in row 3',
    );
    expect(r('equal_traits_in_unit_and_traits_in_unit(unit(col,1),criminal,unit(col,3),innocent)')).toBe(
      'There are as many criminals in column A as innocents in column C',
    );
    expect(
      r('equal_traits_in_unit_and_traits_in_unit(unit(profession,cook),innocent,unit(profession,cop),criminal)'),
    ).toBe('There are as many innocent #PROFS:cook as there are criminal #PROFS:cop');
  });
  it('has_most_traits', () => {
    expect(r('has_most_traits(unit(col,2),criminal)')).toBe(
      'Column B has more criminals than any other column',
    );
    expect(r('has_most_traits(unit(row,3),innocent)')).toBe(
      'Row 3 has more innocents than any other row',
    );
    expect(r('has_most_traits(unit(slice,1),innocent)')).toBe(
      'Slice a has more innocents than any other slice',
    );
    expect(r('has_most_traits(unit(hneighbor,7),innocent)')).toBe(
      '#NAME:7 has the most innocent horizontal neighbors',
    );
  });
  it('only_unit_has_exactly_n_traits', () => {
    expect(r('only_unit_has_exactly_n_traits(unit(row,2),innocent,3)')).toBe(
      'Row 2 is the only row with exactly 3 innocents',
    );
    expect(r('only_unit_has_exactly_n_traits(unit(col,3),criminal,1)')).toBe(
      'Column C is the only column with exactly one criminal',
    );
    expect(r('only_unit_has_exactly_n_traits(unit(slice,2),criminal,0)')).toBe(
      'Slice b is the only slice with no criminals',
    );
    expect(r('only_unit_has_exactly_n_traits(unit(vneighbor,4),criminal,2)')).toBe(
      '#NAME:4 is the only one with exactly 2 criminal vertical neighbors',
    );
    expect(r('only_unit_has_exactly_n_traits(unit(vneighbor,4),criminal,1)')).toBe(
      '#NAME:4 is the only one with exactly one criminal vertical neighbor',
    );
  });
  it('units_share_n_traits', () => {
    expect(r('units_share_n_traits(unit(hneighbor,3),unit(hneighbor,9),innocent,1)')).toBe(
      '#NAME:3 and #NAME:9 have only one innocent horizontal neighbor in common',
    );
    expect(r('units_share_n_traits(unit(hneighbor,3),unit(hneighbor,9),innocent,2)')).toBe(
      '#NAME:3 and #NAME:9 have 2 innocent horizontal neighbors in common',
    );
    expect(r('units_share_n_traits(unit(hneighbor,3),unit(hneighbor,9),criminal,0)')).toBe(
      '#NAME:3 and #NAME:9 have no criminal horizontal neighbors in common',
    );
    expect(r('units_share_n_traits(unit(between,pair(0,3)),unit(vneighbor,9),innocent,1)')).toBe(
      'Exactly 1 innocent #BETWEEN:pair(0,3) is #NAMES:9 vertical neighbor',
    );
    expect(r('units_share_n_traits(unit(between,pair(0,3)),unit(row,2),innocent,0)')).toBe(
      'No innocent #BETWEEN:pair(0,3) is in row 2',
    );
    // The 2D renderer refused a neighbour unit in first position, because the
    // archive phrased that shape three incompatible ways. The cube's neighbour
    // units carry their own locative phrase, so the generic form covers it.
    expect(r('units_share_n_traits(unit(hneighbor,5),unit(row,2),innocent,2)')).toBe(
      'Exactly 2 innocents among the horizontal neighbors of #NAME:5 are in row 2',
    );
  });
  it('units_share_odd_n_traits', () => {
    expect(r('units_share_odd_n_traits(unit(between,pair(0,3)),unit(hneighbor,9),innocent)')).toBe(
      'An odd number of innocents #BETWEEN:pair(0,3) horizontally neighbor #NAME:9',
    );
    expect(r('units_share_odd_n_traits(unit(vneighbor,9),unit(row,2),innocent)')).toBe(
      'An odd number of innocents in row 2 vertically neighbor #NAME:9',
    );
    expect(() => r('units_share_odd_n_traits(unit(row,1),unit(row,2),innocent)')).toThrow(
      UnsupportedShapeError,
    );
  });
  it('unit_shares_n_out_of_n_traits_with_unit', () => {
    expect(
      r('unit_shares_n_out_of_n_traits_with_unit(unit(hneighbor,5),unit(between,pair(0,3)),criminal,1,3)'),
    ).toBe(
      'Only 1 of the 3 criminals among the horizontal neighbors of #NAME:5 is #BETWEEN:pair(0,3)',
    );
    expect(
      r('unit_shares_n_out_of_n_traits_with_unit(unit(edge,void),unit(vneighbor,9),criminal,2,5)'),
    ).toBe('Exactly 2 of the 5 criminals on the edges are #NAMES:9 vertical neighbors');
    expect(
      r('unit_shares_n_out_of_n_traits_with_unit(unit(reach,4:0,0,-1),unit(row,3),criminal,2,4)'),
    ).toBe('Exactly 2 of the 4 criminals in front of #NAME:4 are in row 3');
  });
});

describe('adjacency and direction clue templates', () => {
  it('covers every predicate', () => {
    expect(Object.keys(RENDERERS).sort()).toEqual(Object.keys(ARG_KINDS).sort());
  });
  it('max_number_of_traits_in_neighbors_in_unit', () => {
    expect(r('max_number_of_traits_in_neighbors_in_unit(unit(corner,void),innocent,1)')).toBe(
      'No one in the corners has more than one innocent neighbor',
    );
  });
  it('both_traits_in_unit_are_in_unit', () => {
    expect(
      r('both_traits_in_unit_are_in_unit(unit(between,pair(0,3)),unit(hneighbor,9),criminal)'),
    ).toBe('Both criminals #BETWEEN:pair(0,3) are #NAMES:9 horizontal neighbors');
    expect(r('both_traits_in_unit_are_in_unit(unit(slice,1),unit(row,2),innocent)')).toBe(
      'Both innocents in slice a are in row 2',
    );
  });
  it('only_trait_in_unit_is_in_unit', () => {
    expect(r('only_trait_in_unit_is_in_unit(unit(row,2),unit(vneighbor,9),criminal)')).toBe(
      'The only criminal in row 2 is #NAMES:9 vertical neighbor',
    );
    expect(r('only_trait_in_unit_is_in_unit(unit(core,void),unit(between,pair(4,7)),criminal)')).toBe(
      'The only criminal in the core is #BETWEEN:pair(4,7)',
    );
  });
  it('both_traits_are_neighbors_in_unit and all_traits_are_neighbors_in_unit', () => {
    expect(r('both_traits_are_neighbors_in_unit(unit(between,pair(0,3)),innocent)')).toBe(
      'Both innocents #BETWEEN:pair(0,3) are connected',
    );
    expect(r('all_traits_are_neighbors_in_unit(unit(slice,2),criminal)')).toBe(
      'All criminals in slice b are connected',
    );
  });
  it('only_one_person_in_unit_has_exactly_n_trait_neighbors', () => {
    expect(r('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(row,2),innocent,3)')).toBe(
      'Only one person in row 2 has exactly 3 innocent neighbors',
    );
    expect(
      r('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(corner,void),criminal,0)'),
    ).toBe('Only one person in a corner has no criminal neighbors');
    expect(
      r('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(face,void),criminal,1)'),
    ).toBe('Only one person at a face center has exactly one criminal neighbor');
    expect(
      r('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(profession,mech),criminal,2)'),
    ).toBe('Only one #PROF:mech has exactly 2 criminal neighbors');
  });
  it('n_in_unit_have_trait_in_dir', () => {
    expect(r('n_in_unit_have_trait_in_dir(unit(profession,cook),criminal,1,0,0,1)')).toBe(
      'Only one #PROF:cook has a criminal directly to the right of them',
    );
    expect(r('n_in_unit_have_trait_in_dir(unit(corner,void),criminal,0,1,0,2)')).toBe(
      '2 persons in the corners have a criminal directly below them',
    );
    expect(r('n_in_unit_have_trait_in_dir(unit(edge,void),criminal,0,-1,0,1)')).toBe(
      'Only one person on an edge has a criminal directly above them',
    );
    expect(r('n_in_unit_have_trait_in_dir(unit(edge,void),criminal,0,0,1,3)')).toBe(
      '3 persons on the edges have a criminal directly behind them',
    );
    expect(r('n_in_unit_have_trait_in_dir(unit(profession,builder),innocent,0,0,-1,2)')).toBe(
      '2 #PROFS:builder have an innocent directly in front of them',
    );
  });
  it('n_t_in_unit_have_trait_in_dir', () => {
    expect(r('n_t_in_unit_have_trait_in_dir(unit(row,2),criminal,criminal,0,1,0,2)')).toBe(
      'Exactly 2 criminals in row 2 have a criminal directly below them',
    );
    expect(r('n_t_in_unit_have_trait_in_dir(unit(slice,3),criminal,innocent,0,0,-1,1)')).toBe(
      'Only one criminal in slice c has an innocent directly in front of them',
    );
  });
  it('n_professions_have_trait_in_dir', () => {
    expect(r('n_professions_have_trait_in_dir(painter,innocent,1,0,0,2)')).toBe(
      '2 #PROFS:painter have an innocent directly to the right of them',
    );
    expect(r('n_professions_have_trait_in_dir(cook,innocent,0,0,1,1)')).toBe(
      'Exactly 1 #PROF:cook has an innocent directly behind them',
    );
    expect(r('n_professions_have_trait_in_dir(singer,innocent,-1,0,0,0)')).toBe(
      'No #PROF:singer has an innocent directly to the left of them',
    );
  });
});

// Twenty-seven suspects is more than you can count at a glance, so generation
// turns `professionTotals` on: "Exactly 1 cook" leaves a player counting cooks
// before the clue is usable, and "Exactly 1 of 3 cooks" does not.
describe('profession totals', () => {
  const rt = (s: string) => render(parseHint(s), { professionTotals: true });

  it('says how many there are in total, in each shape that counts a profession', () => {
    expect(rt('n_professions_have_trait_in_dir(painter,innocent,1,0,0,2)')).toBe(
      'Exactly 2 of #PROFN:painter have an innocent directly to the right of them',
    );
    expect(rt('n_professions_have_trait_in_dir(cook,innocent,-1,0,0,1)')).toBe(
      'Exactly 1 of #PROFN:cook has an innocent directly to the left of them',
    );
    expect(rt('n_in_unit_have_trait_in_dir(unit(profession,cook),innocent,0,1,0,1)')).toBe(
      'Exactly 1 of #PROFN:cook has an innocent directly below them',
    );
    expect(
      rt('only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(profession,cook),innocent,2)'),
    ).toBe('Exactly 1 of #PROFN:cook has exactly 2 innocent neighbors');
  });

  it('says none rather than exactly zero', () => {
    expect(rt('n_professions_have_trait_in_dir(singer,innocent,-1,0,0,0)')).toBe(
      'None of #PROFN:singer has an innocent directly to the left of them',
    );
  });

  it('leaves profession comparisons and non-profession units untouched', () => {
    for (const hint of [
      // Comparisons: the claim is the difference, and two totals bury it.
      'more_traits_in_unit_than_unit(unit(profession,judge),unit(profession,mechanic),criminal)',
      'equal_number_of_traits_in_units(unit(profession,coder),unit(profession,cook),innocent)',
      // No count of one profession's members to put a total against.
      'odd_number_of_traits_in_unit(unit(profession,scientist),innocent)',
      // Same shapes as above, over units that are not professions at all.
      'n_in_unit_have_trait_in_dir(unit(row,2),innocent,0,1,0,2)',
      'only_one_person_in_unit_has_exactly_n_trait_neighbors(unit(col,1),innocent,2)',
    ]) {
      expect(rt(hint), hint).toBe(r(hint));
    }
  });
});

describe('unsupported shapes', () => {
  it('throws rather than inventing a phrasing', () => {
    expect(() => r('number_of_traits_in_unit(unit(profession,cook),innocent,2)')).toThrow(
      UnsupportedShapeError,
    );
    expect(canRender(parseHint('number_of_traits_in_unit(unit(profession,cook),innocent,2)'))).toBe(
      false,
    );
    expect(canRender(parseHint('number_of_traits_in_unit(unit(row,1),innocent,2)'))).toBe(true);
  });
});
