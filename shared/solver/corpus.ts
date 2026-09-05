import { type Puzzle } from '../puzzle';
import { parseHint } from './hint';
import { type Board, makeBoard, unitMembers } from './predicates';

export function boardFor(puzzle: Puzzle): Board {
  return makeBoard(
    puzzle.people.map((p) => p.profession),
    puzzle.people.map((p) => p.criminal),
  );
}

/**
 * Predicates the generator may use that no archived clue does, each mapped to
 * the attested predicate whose rate sets its budget.
 *
 * The source compares one trait across two units ("more criminals in row 1 than
 * row 4") and two traits within one unit ("more criminals than innocents in row
 * 1"), and never both at once. That gap looks like an accident of what the
 * source happened to write rather than a rule of the game: "there are as many
 * innocent cooks as criminal cops" is an ordinary deduction, and the generator
 * is short of comparison shapes without it.
 *
 * A mix read straight off the 2D archive gives such a predicate share 0, and
 * `orderPool` multiplies by that share, so it would be generated never. Hence an
 * explicit budget rather than a measured one.
 */
export const CROSS_TRAIT: Record<string, string> = {
  more_traits_in_unit_than_traits_in_unit: 'more_traits_in_unit_than_unit',
  equal_traits_in_unit_and_traits_in_unit: 'equal_number_of_traits_in_units',
};

/** What fraction of its attested parent's rate each `CROSS_TRAIT` predicate
 * gets. A third puts the pair together at rather less than one clue per puzzle:
 * present, not a tic. */
export const CROSS_TRAIT_RATE = 1 / 3;

/** True when card `index` is a member of a unit its own clue talks about — the
 * source phrases these in the first person ("in my row"), which our renderer
 * deliberately does not produce. */
export function isSelfReferential(puzzle: Puzzle, index: number): boolean {
  const origHint = puzzle.people[index].origHint;
  if (!origHint) return false;
  const board = boardFor(puzzle);
  return parseHint(origHint).args.some(
    (a) => a.t === 'unit' && unitMembers(board, a.unit).includes(index),
  );
}
